import logging
from typing import Dict, Any, Optional, List, Union, Tuple
from pypdf import PdfReader
import re
import io
from django.conf import settings
from .models import Document
from quiz.models import Question
from .utils import extract_text_from_file, _extract_text_from_pdf_content, _parse_page_ranges_str, extract_single_page_content, validate_page_range
from openai import OpenAI
import json
from supabase import create_client, Client
import random
import os
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

logger = logging.getLogger(__name__)

class DocumentProcessingService:
    """Service for processing uploaded documents"""
    
    @staticmethod
    def extract_text_from_pdf(document: Document, page_ranges: List[Union[int, Tuple[int, int]]] = None) -> bool:
        """
        Extract text from a PDF document and update the document's extracted_text field
        
        Args:
            document: The Document model instance to extract text from
            page_ranges: Optional list of page ranges to extract. Format:
                        - [1, 5, 10] - Extract pages 1, 5, and 10 (1-indexed)
                        - [(1, 5), 10, (20, 30)] - Extract pages 1-5, 10, and 20-30
            
        Returns:
            bool: True if extraction was successful, False otherwise
        """
        try:
            # Use the centralized text extraction utility
            if document.file:
                # Reset file position
                document.file.seek(0)
                
                # Get the file content and page count
                file_content = document.file.read()
                document.file.seek(0)  # Reset file pointer
                
                pdf_reader = PdfReader(io.BytesIO(file_content))
                document.page_count = len(pdf_reader.pages)
                
                # Store the page ranges in document metadata if provided
                if page_ranges:
                    if not hasattr(document, 'metadata') or document.metadata is None:
                        document.metadata = {}
                    document.metadata['selected_pages'] = page_ranges
                
                # Extract text using centralized utility with page ranges
                extracted_text = extract_text_from_file(document.file, page_ranges)
                
                # Clean and preprocess text
                cleaned_text = DocumentProcessingService._clean_text(extracted_text)
                
                # Update document with the extracted text and metadata
                document.extracted_text = cleaned_text
                document.is_processed = True
                document.save()
                
                logger.info(f"Successfully processed document: {document.title}")
                return True
            else:
                logger.error(f"No file available for document {document.title}")
                document.is_processed = False
                document.save()
                return False
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {document.title}: {str(e)}")
            document.is_processed = False
            document.extracted_text = f"[Error processing document: {str(e)}]"
            document.save()
            return False
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize extracted text"""
        if not text or text.startswith('['):
            return text  # Don't clean error messages
            
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters (keep basic punctuation)
        text = re.sub(r'[^\w\s.,?!:;()\[\]{}\-\'"]', '', text)
        # Replace multiple periods with single periods
        text = re.sub(r'\.{2,}', '.', text)
        return text.strip()
    
    @staticmethod
    def get_document_metadata(document: Document) -> Dict[str, Any]:
        """
        Get metadata for a document
        
        Args:
            document: The Document model instance
            
        Returns:
            Dict with metadata about the document
        """
        return {
            'id': document.id,
            'title': document.title,
            'page_count': document.page_count,
            'file_size': document.file_size,
            'file_size_display': document.get_file_size_display(),
            'is_processed': document.is_processed,
            'storage_type': document.storage_type,
            'created_at': document.created_at,
            'updated_at': document.updated_at,
        }

    def shuffle_match_right_labels(column_left_labels, column_right_labels, correct_answer):
        """
        Shuffle only the values of column_right_labels.
        Then remap correct_answer using values instead of keys.
        """
        # Extract original right values
        right_values = list(column_right_labels.values())
        random.shuffle(right_values)

        # Build new right column with shuffled values
        shuffled_column_right = {str(i + 1): val for i, val in enumerate(right_values)}

        # Reverse map of new right column: value -> new key
        value_to_key = {v: k for k, v in shuffled_column_right.items()}

        # Build new correct_answer mapping actual terms
        new_correct_answer = {}
        for left_key, left_term in column_left_labels.items():
            original_right_value = correct_answer.get(left_term)
            if original_right_value not in value_to_key:
                continue  # skip if unmatched
            new_correct_answer[left_term] = original_right_value

        return shuffled_column_right, new_correct_answer

    def generate_questions_from_text(self, text, question_type, quiz_type, num_questions, existing_questions: set = None):
        import math
        import logging
        import re
        from openai import OpenAI
        from django.conf import settings

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        logger = logging.getLogger(__name__)

        if existing_questions is None:
            existing_questions = set()

        all_questions = []
        start_question_number = 1

        if quiz_type == 'mixed' or question_type == 'mixed':
            question_types_to_generate = self.QUESTION_TYPES_ROTATION
            num_question_types = len(question_types_to_generate)
            
            for i in range(num_questions):
                q_type = question_types_to_generate[i % num_question_types]
                batch = self._generate_question_batch(
                    client,
                    text,
                    q_type, 
                    quiz_type, # This is the difficulty dict
                    1, # Generate 1 question at a time
                    existing_questions=existing_questions,
                    start_question_number=start_question_number + i
                )
                if batch:
                    all_questions.extend(batch)
        else:
            all_questions = self._generate_question_batch(
                client, 
                text, 
                question_type, 
                quiz_type, 
                num_questions,
                existing_questions=existing_questions,
                start_question_number=start_question_number
            )

        return all_questions

    QUESTION_TYPES_ROTATION = ["mcq", "fill", "truefalse", "oneline", "match"]

    @staticmethod
    def get_prompt_for_question_type_and_difficulty(content, question_type, difficulty, language):
        # This is now a simple, static method for generating a prompt string.
        # All complex logic has been moved to other methods.
        return f"""Generate one {question_type} question in {language} from the following content with {difficulty} difficulty:

        Content:
        {content}

        Respond in JSON format:
        {{
        "question_type": "{question_type}",
        "question": "...",
        "options": {{}},
        "correct_answer": "...",
        "explanation": "...",
        "question_number": 1
        }}"""

    @staticmethod
    def _detect_language(text: str) -> str:
        """Detects the language of a given text snippet."""
        try:
            from langdetect import detect
            lang_code = detect(text)
            return "Tamil" if lang_code == "ta" else "English"
        except Exception:
            return "English"

    @staticmethod
    def _split_text_by_page(text: str) -> list[tuple[str, str]]:
        """Splits the extracted text into a list of (page_number, page_content) tuples."""
        pages = []
        # Regex to find page markers and capture the page number and the content until the next marker
        pattern = re.compile(r"==================== PAGE (\d+) ====================(.*?)(?=(?:==================== PAGE|==================== END OF DOCUMENT))", re.DOTALL)
        matches = pattern.finditer(text)
        for match in matches:
            page_number = match.group(1).strip()
            page_content = match.group(2).strip()
            if page_content:
                pages.append((page_number, page_content))
        return pages

    @staticmethod
    def _is_valid_question(q: dict) -> bool:
        """Validates the structure and content of a generated question dictionary."""
        if not isinstance(q, dict):
            return False
        if "question" not in q or not q["question"]:
            return False
        if q.get("question_type") == "truefalse":
            return q.get("correct_answer") in ["True", "False"]
        if q.get("question_type") == "match":
            return (
                isinstance(q.get("column_left_labels"), dict) and
                isinstance(q.get("column_right_labels"), dict) and
                isinstance(q.get("correct_answer"), dict)
            )
        return True

    def _generate_question_batch(self, client, text, question_type, quiz_type, num_questions, existing_questions: set, start_question_number=1, override_source_page=None):
        import re
        import json
        import logging
        logger = logging.getLogger(__name__)

        # Handle multi-page text
        text_sections = []
        current_section = []
        current_page = None

        for line in text.split('\n'):
            if line.startswith('==================== PAGE '):
                if current_section and current_page:
                    text_sections.append((current_page, '\n'.join(current_section)))
                current_section = []
                page_match = re.search(r'PAGE (\d+)', line)
                if page_match:
                    current_page = page_match.group(1)
            elif line.startswith('==================== END OF PAGE'):
                continue
            else:
                current_section.append(line)

        if current_section and current_page:
            text_sections.append((current_page, '\n'.join(current_section)))
        if not text_sections:
            text_sections = [('all', text)]

        # Sample pages from start, middle, and end
        num_samples = 3
        total_sections = len(text_sections)
        if total_sections <= num_samples:
            sampled_sections = text_sections
        else:
            indices = [0, total_sections // 2, total_sections - 1]
            sampled_sections = [text_sections[i] for i in indices]

        sections_text = ""
        page_numbers = []
        for page_num, section_text in sampled_sections:
            sections_text += f"\nContent from page {page_num}:\n{section_text}\n"
            page_numbers.append(page_num)

        primary_page = override_source_page if override_source_page else 'all'

        max_content_length = 10000
        if len(sections_text) > max_content_length:
            sections_text = sections_text[:max_content_length] + "\n[Content truncated]"
            logger.warning(f"Content truncated to {max_content_length} characters")

        # Determine difficulty from the quiz_type dictionary, defaulting to 'easy'
        difficulty = next(iter(quiz_type)) if isinstance(quiz_type, dict) and quiz_type else 'easy'

        # Build prompt for a single question
        base_prompt = f"""
        You are an expert quiz generator. Based on the following content, generate exactly ONE question.
        The question type must be: '{question_type}'.
        The difficulty must be: '{difficulty}'.

        Content:
        {sections_text}

        The question must include:
        - "question", "type", "options", "correct_answer", "explanation", "question_number", "source_page"

        Specific formatting per question type:
        🔹 For 'mcq':
        - "options" must be a dict with 4 choices (e.g., {{"A": "...", "B": "...", "C": "...", "D": "..."}})
        - "correct_answer" must be the full text of the correct option, not just the letter (e.g., "Magnesium oxide").

        🔹 For 'fill':
        - The question text MUST include a blank space for the answer, like '_____________'.
        - "options" must be {{}}
        - "correct_answer" is the string that fills the blank.
 
        🔹 For 'truefalse', 'oneline':
        - "options" must be {{}}
        - "correct_answer" is a string answer.

        🔹 For 'match':
        - "type" must be exactly 'match'
        - "options" must be an empty dictionary {{}}
        - "column_left_labels": dict of labeled terms to match from (e.g., {{"A": "Oxygen", "B": "Hydrogen"}})
        - "column_right_labels": dict of labeled matching items (e.g., {{"1": "Gas", "2": "Metal"}})
        - "correct_answer": dict mapping left label values to right label values (e.g., {{"Oxygen": "Gas"}})
        - "explanation" should explain how the matches are related.

        Format the output strictly as a single JSON object inside a 'questions' list:
        {{
            "questions": [ {{...}} ]
        }}
        """

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional quiz question generator that outputs in JSON format."},
                {"role": "user", "content": base_prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        logger.info("--- Received raw response from OpenAI ---")
        logger.info(content)

        if content.startswith("```json"):
            content = content[7:]
            if content.endswith("```"):
                content = content[:-3]

        try:
            parsed = json.loads(content)
            questions = parsed.get('questions', [])
            final_questions = []
            for i, q in enumerate(questions):
                question_text = q.get("question", "").strip()
                if question_text in existing_questions:
                    logger.warning(f"Skipping duplicate question: {question_text}")
                    continue

                if self._is_valid_question(q):
                    q['question_number'] = start_question_number + i
                    if 'source_page' not in q or not q['source_page']:
                        q['source_page'] = primary_page
                    final_questions.append(q)
                    existing_questions.add(question_text)
                else:
                    logger.warning(f"Skipping invalid question from batch: {q}")
        
            return final_questions

        except json.JSONDecodeError:
            logger.error("Failed to parse JSON:\n" + content)
            return []

    def process_single_document(self, uploaded_file, quiz, user, page_range=None):
        """
        Process a single uploaded file, generate questions, and associate with a quiz.

        Args:
            uploaded_file: The uploaded file object
            quiz: Quiz instance to associate document with
            user: User who uploaded the file
            page_range: Optional string specifying page ranges (e.g., "1-5,7,10-15") or single page number (e.g., "3")

        Returns:
            Dict containing processing results
        """
        import json
        import logging
        from .utils import _extract_text_from_pdf_content, _parse_page_ranges_str
        logger = logging.getLogger(__name__)

        document = None  # Initialize document to None
        try:
            # Step 1: Create a Document record
            logger.info(f"Creating document record for {uploaded_file.name}")
            document = Document.objects.create(
                title=uploaded_file.name,
                file_size=uploaded_file.size,
                file_type=uploaded_file.content_type,
                quiz=quiz,
                user=user,
                storage_type='supabase',
                metadata={'page_range': page_range} if page_range else {}
            )

            # Load file from Supabase bucket
            logger.info(f"Downloading file from Supabase bucket")
            supabase_url = os.environ.get('SUPABASE_URL')
            supabase_key = os.environ.get('SUPABASE_KEY')
            supabase = create_client(supabase_url, supabase_key)
            file_path = f"{quiz.quiz_id}/{uploaded_file.name}"
            file_data = supabase.storage.from_("fileupload").download(file_path)

            # Get total pages for validation
            from pypdf import PdfReader
            import io
            pdf_reader = PdfReader(io.BytesIO(file_data))
            total_pages = len(pdf_reader.pages)
            logger.info(f"PDF has {total_pages} total pages")

            # Validate page ranges if provided
            if page_range:
                validation_result = validate_page_range(page_range, total_pages)
                if not validation_result['valid']:
                    raise ValueError(validation_result['message'])
                page_range = validation_result['adjusted_ranges'] or page_range
                logger.info(f"Using validated page range: {page_range}")

            # Parse page ranges
            page_ranges = _parse_page_ranges_str(page_range) if page_range else None
            logger.info(f"Parsed page ranges: {page_ranges}")

            # Extract text
            logger.info(f"Extracting text with page range: {page_range}")
            extracted_text = _extract_text_from_pdf_content(file_data, page_ranges)
            if not extracted_text or extracted_text.startswith('[Error'):
                raise ValueError('Failed to extract text from file.')

            document.extracted_text = extracted_text
            document.save()
            logger.info(f"Successfully extracted {len(extracted_text)} characters of text.")

            # Step 3: Generate questions
            # Add 5 additional questions as requested
            target_questions = (quiz.no_of_questions or 0) + 5
            logger.info(f"Targeting {target_questions} questions for quiz {quiz.quiz_id}")

            pages = self._split_text_by_page(extracted_text)
            if not pages:
                raise ValueError('Failed to parse pages from extracted text.')

            logger.info(f"Split text into {len(pages)} pages. Randomizing for question generation.")
            random.shuffle(pages)

            questions = []
            existing_questions = set()
            current_question_number = 1
            question_types_to_generate = self.QUESTION_TYPES_ROTATION if quiz.question_type == 'mixed' else [quiz.question_type]
            type_index = 0

            for page_num, page_content in pages:
                if len(questions) >= target_questions:
                    logger.info(f"Reached target of {target_questions} questions.")
                    break

                q_type = question_types_to_generate[type_index % len(question_types_to_generate)]
                type_index += 1

                logger.info(f"Generating one '{q_type}' question from page {page_num}")
                batch = self._generate_question_batch(
                    client=openai_client,
                    text=page_content,
                    question_type=q_type,
                    quiz_type=quiz.quiz_type,
                    num_questions=1,
                    existing_questions=existing_questions,
                    start_question_number=current_question_number,
                    override_source_page=page_num
                )

                if batch:
                    questions.extend(batch)
                    current_question_number += len(batch)
                    logger.info(f"Successfully generated question #{len(questions)} from page {page_num}")

            if len(questions) > target_questions:
                questions = questions[:target_questions]

            if not questions:
                raise ValueError('Failed to generate any questions from the text.')

            # Step 4: Save questions
            logger.info(f"Saving {len(questions)} questions to the database.")
            Question.objects.create(
                quiz=quiz,
                document=document,
                question=json.dumps(questions),
                question_type=quiz.question_type,
                difficulty=quiz.quiz_type,
                created_by=user.email
            )

            document.is_processed = True
            document.processing_status = 'success'
            document.storage_path = f"{quiz.quiz_id}/{uploaded_file.name}"
            document.save()

            return {
                "success": True,
                "document_id": document.id,
                "questions_generated": len(questions),
                "pages_processed": page_range,
                "page_ranges_used": str(page_ranges) if page_ranges else "all",
            }

        except Exception as e:
            logger.error(f"Error processing document {uploaded_file.name}: {str(e)}", exc_info=True)
            if document:
                document.processing_status = 'failed'
                document.processing_error = str(e)
                document.save()
            return {"success": False, "error": str(e)}

            # Trim questions to the exact target number
            if len(questions) > target_questions:
                questions = questions[:target_questions]

            if not questions:
                logger.error("Question generation failed - no questions returned")
                document.processing_status = 'failed'
                document.processing_error = 'Failed to generate questions from text.'
                document.save()
                return {"success": False, "error": "Failed to generate questions."}

            # Validate that questions are properly attributed to pages
            questions_with_pages = 0
            for q in questions:
                if 'source_page' in q and q['source_page']:
                    questions_with_pages += 1
                else:
                    # If no source page specified, try to determine from page range
                    if page_range and len(page_ranges) == 1 and isinstance(page_ranges[0], int):
                        q['source_page'] = str(page_ranges[0])
                        questions_with_pages += 1
                    else:
                        q['source_page'] = page_range if page_range else 'all'

            logger.info(f"Successfully generated {len(questions)} questions ({questions_with_pages} with page attribution) from specified pages")

            # Step 4: Save the generated questions
            try:
                logger.info("Saving all questions in a single row")
                Question.objects.create(
                    quiz=quiz,
                    document=document,
                    question=json.dumps(questions),  # Store all questions as JSON string
                    question_type=quiz.question_type,
                    options={},  # Options will be stored in the JSON
                    correct_answer='',  # Answers will be stored in the JSON
                    explanation='',  # Explanations will be stored in the JSON
                    difficulty=quiz.quiz_type,
                    created_by=user.email
                )
            except Exception as e:
                logger.error(f"Error saving questions to database: {str(e)}")
                return {"success": False, "error": f"Failed to save questions: {str(e)}"}

            document.is_processed = True
            document.processing_status = 'success'
            document.storage_path = f"{quiz.quiz_id}/{uploaded_file.name}"
            document.file = uploaded_file.name
            document.save()

            return {
                "success": True, 
                "document_id": document.id,
                "questions_generated": len(questions),
                "pages_processed": page_range,
                "page_ranges_used": str(page_ranges) if page_ranges else "all",
                "questions_with_page_attribution": questions_with_pages
            }

        except Exception as e:
            logger.error(f"Error processing document {uploaded_file.name}: {str(e)}")
            logger.error(f"Full error details:", exc_info=True)
            return {"success": False, "error": str(e)}

    def generate_questions_from_single_page(self, uploaded_file, quiz, user, page_number):
        """
        Generate questions from a specific single page of a document.
        
        Args:
            uploaded_file: The uploaded file object
            quiz: Quiz instance to associate document with
            user: User who uploaded the file
            page_number: Single page number (1-indexed) as integer or string
            
        Returns:
            Dict containing processing results
        """
        try:
            # Convert page_number to string for consistency
            page_range = str(page_number)
            logger.info(f"Generating questions from single page {page_number}")
            
            # Use the existing process_single_document method
            result = self.process_single_document(uploaded_file, quiz, user, page_range)
            
            if result.get('success'):
                logger.info(f"Successfully generated questions from page {page_number}")
                result['single_page_mode'] = True
                result['target_page'] = page_number
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating questions from single page {page_number}: {str(e)}")
            return {"success": False, "error": str(e)}

def process_uploaded_documents(files_data, quiz, user):
    """
    Process multiple uploaded documents with individual page ranges
    
    Args:
        files_data: List of dictionaries containing file and page_range info
                   Format: [{'file': file_obj, 'page_range': '1-5,7'}, ...]
        quiz: Quiz instance to associate documents with
        user: User who uploaded the files
        
    Returns:
        Dict containing processing results and extracted text
    """
    logger.info(f"Processing {len(files_data)} documents for quiz {quiz.quiz_id}")
    
    processed_documents = []
    all_extracted_text = ""
    errors = []
    
    try:
        for idx, file_data in enumerate(files_data):
            file_obj = file_data.get('file')
            page_range_str = file_data.get('page_range', '')
            
            if not file_obj:
                errors.append(f"No file provided for document {idx + 1}")
                continue
                
            # Extract text with page ranges if specified
            try:
                extracted_text = extract_text_from_file(file_obj, page_range_str)
                
                if not extracted_text or extracted_text.startswith('[Error'):
                    errors.append(f"Failed to extract text from {file_obj.name}")
                    continue
                
                # Create document record
                document = Document.objects.create(
                    title=file_obj.name,
                    description=f"Uploaded for quiz {quiz.quiz_id}",
                    extracted_text=extracted_text,
                    user=user,
                    is_processed=True,
                    file_size=file_obj.size,
                    storage_type='local',
                    file_type=file_obj.content_type,
                    quiz=quiz,
                    storage_path=f"{quiz.quiz_id}/{file_obj.name}",
                    file=file_obj.name,
                    metadata={
                        'page_range': page_range_str,
                        'processing_order': idx + 1
                    }
                )
                
                processed_documents.append({
                    'document_id': document.id,
                    'filename': file_obj.name,
                    'page_range': page_range_str,
                    'text_length': len(extracted_text),
                    'success': True
                })
                
                # Accumulate all extracted text
                all_extracted_text += f"\n\n=== Document: {file_obj.name} ===\n"
                if page_range_str:
                    all_extracted_text += f"=== Pages: {page_range_str} ===\n"
                all_extracted_text += extracted_text
                
                logger.info(f"Successfully processed {file_obj.name} with page range: {page_range_str}")
                
            except Exception as e:
                error_msg = f"Error processing {file_obj.name}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
                
                processed_documents.append({
                    'filename': file_obj.name,
                    'page_range': page_range_str,
                    'success': False,
                    'error': str(e)
                })
        
        return {
            'success': len(processed_documents) > 0 and not errors,
            'processed_documents': processed_documents,
            'extracted_text': all_extracted_text.strip(),
            'errors': errors,
            'total_processed': len([d for d in processed_documents if d.get('success', False)])
        }
        
    except Exception as e:
        logger.error(f"Critical error in process_uploaded_documents: {str(e)}")
        return {
            'success': False,
            'processed_documents': [],
            'extracted_text': '',
            'errors': [f"Critical processing error: {str(e)}"],
            'total_processed': 0
        }