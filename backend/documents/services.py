import logging
from typing import Dict, Any, Optional, List, Union, Tuple
from PyPDF2 import PdfReader
import re
import io
from django.conf import settings
from .models import Document
from quiz.models import Question
from .utils import extract_text_from_file, _extract_text_from_pdf_content, _parse_page_ranges_str, extract_single_page_content, validate_page_range
from openai import OpenAI
import json
from supabase import create_client, Client


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

    def generate_questions_from_text(self, text, question_type, quiz_type, num_questions):
        """
        Generate questions from text using OpenAI API.
        """
        from openai import OpenAI
        from django.conf import settings
        import json

        try:
            logger.info(f"Attempting to initialize OpenAI client with API key: {'present' if settings.OPENAI_API_KEY else 'missing'}")
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Make the prompt more specific for 'mixed' type
            if question_type == 'mixed':
                type_instruction = "a mix of question types, including 'mcq', 'fill', 'truefalse', 'oneline', and 'match-the-following'"
                format_instruction = """
                For mixed questions, ensure each question object has:
                - "question": The question text
                - "type": The specific type ('mcq', 'fill', 'truefalse', 'oneline', 'match-the-following')
                - "options": For MCQ, an object with keys "A", "B", "C", "D". For others, empty object {}
                - "correct_answer": The correct answer (for MCQ, use the key like "A" or "B")
                - "explanation": Brief explanation
                
                Generate approximately:
                - 30% MCQ questions
                - 25% True/False questions  
                - 20% Fill-in-the-blank questions
                - 15% One-line answer questions
                - 10% Match-the-following questions
                """
            else:
                type_instruction = f"the question type should be '{question_type}'"
                format_instruction = """
                Ensure each question object has:
                - "question": The question text
                - "type": The question type
                - "options": For MCQ, an object with keys "A", "B", "C", "D". For others, empty object {}
                - "correct_answer": The correct answer
                - "explanation": Brief explanation
                """

            # Parse text to identify pages and their content
            text_sections = []
            current_section = []
            current_page = None
            
            for line in text.split('\n'):
                if line.startswith('==================== PAGE '):
                    if current_section and current_page:
                        text_sections.append((current_page, '\n'.join(current_section)))
                    current_section = []
                    # Extract page number more reliably
                    page_match = re.search(r'PAGE (\d+)', line)
                    if page_match:
                        current_page = page_match.group(1)
                elif line.startswith('==================== END OF PAGE'):
                    continue
                else:
                    current_section.append(line)
            
            # Add the last section if it exists
            if current_section and current_page:
                text_sections.append((current_page, '\n'.join(current_section)))
            
            # If no page markers found, treat as single text block
            if not text_sections:
                text_sections = [('all', text)]

            # Log page analysis
            logger.info(f"Found {len(text_sections)} page sections")
            for page_num, content in text_sections:
                logger.info(f"Page {page_num}: {len(content)} characters")

            # Prepare content for question generation
            if len(text_sections) == 1:
                # Single page or no page markers - use all content
                page_num, page_content = text_sections[0]
                sections_text = f"Content from page {page_num}:\n{page_content}\n"
                primary_page = page_num
            else:
                # Multiple pages - include all but note primary pages
                sections_text = ""
                page_numbers = []
                for page_num, section_text in text_sections:
                    sections_text += f"\nContent from page {page_num}:\n{section_text}\n"
                    page_numbers.append(page_num)
                primary_page = page_numbers[0] if page_numbers else 'all'

            # Truncate text if too long for API
            max_content_length = 4000
            if len(sections_text) > max_content_length:
                sections_text = sections_text[:max_content_length] + "\n[Content truncated for API limits]"
                logger.warning(f"Content truncated from {len(sections_text)} to {max_content_length} characters")

            base_prompt = f"""
            You are an expert quiz creator. Based on the following text content, generate {num_questions} high-quality questions.
            The quiz difficulty should be '{quiz_type}' and you should generate {type_instruction}.

            Text content to analyze:
            ---
            {sections_text}
            ---

            {format_instruction}

            IMPORTANT REQUIREMENTS:
            1. Each question MUST be based directly on the content provided above
            2. Questions should test understanding of the specific concepts, facts, or procedures mentioned in the text
            3. Avoid generic questions that could apply to any document
            4. For single page content, all questions should reference that specific page
            5. Ensure questions are at '{quiz_type}' difficulty level

            Please format the output as a JSON object with a "questions" key containing an array of question objects.
            Each question object must have the following keys:
            - "question": The question text based on the specific content provided (string)
            - "type": The type of question. Must be one of 'mcq', 'fill', 'truefalse', 'oneline', 'match-the-following' (string)
            - "options": An object with keys "A", "B", "C", "D" for 'mcq' type, otherwise an empty object {{}}
            - "correct_answer": The correct answer (string)
            - "explanation": A brief explanation for the answer (string).
            - "question_number": The question number (integer)
            - "source_page": The page number where this question's content comes from (string)

            Return only valid JSON in this format:
            {{
                "questions": [
                    {{
                        "question": "Based on the content, what is...",
                        "type": "mcq",
                        "options": {{"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"}},
                        "correct_answer": "A",
                        "explanation": "Explanation here",
                        "question_number": 1
                    }}
                ]
            }}
            """

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates quiz questions specifically from the provided content. All questions must be directly based on the given text."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent results
            )
            
            content = response.choices[0].message.content
            logger.info(f"Generated content from OpenAI: {len(content)} characters")
            
            try:
                # Clean the content by stripping markdown JSON markers
                if content.startswith("```json"):
                    content = content[7:]
                    if content.endswith("```"):
                        content = content[:-3]
                
                generated_data = json.loads(content)
            except json.JSONDecodeError:
                logger.error(f"Raw OpenAI output:\n{content}")
                raise ValueError("OpenAI response was not valid JSON. Please check formatting.")
                        
            questions = []
            # Handle different response formats
            if isinstance(generated_data, dict):
                # Check for questions key first
                if 'questions' in generated_data and isinstance(generated_data['questions'], list):
                    questions = generated_data['questions']
                else:
                    # Fallback: look for any list value
                    for key, value in generated_data.items():
                        if isinstance(value, list) and len(value) > 0:
                            questions = value
                            break
            elif isinstance(generated_data, list):
                questions = generated_data

            # Validate and fix questions
            validated_questions = []
            for i, q in enumerate(questions):
                if not isinstance(q, dict) or 'question' not in q:
                    logger.warning(f"Skipping invalid question {i+1}: {q}")
                    continue
                
                # Set default type if missing
                if 'type' not in q:
                    if question_type == 'mixed':
                        # Assign types in a balanced way for mixed quizzes
                        type_cycle = ['mcq', 'truefalse', 'fill', 'oneline', 'match-the-following']
                        q['type'] = type_cycle[i % len(type_cycle)]
                    else:
                        q['type'] = question_type
                
                # Ensure options exist for MCQ
                if q['type'] == 'mcq':
                    if 'options' not in q or not isinstance(q['options'], dict) or len(q['options']) < 2:
                        q['options'] = {
                            "A": "Option A",
                            "B": "Option B", 
                            "C": "Option C",
                            "D": "Option D"
                        }
                    if 'correct_answer' not in q or q['correct_answer'] not in q['options']:
                        q['correct_answer'] = list(q['options'].keys())[0]  # Default to first option
                else:
                    q['options'] = {}
                    if 'correct_answer' not in q:
                        if q['type'] == 'truefalse':
                            q['correct_answer'] = "True"
                        else:
                            q['correct_answer'] = "Answer"
                
                # Ensure explanation exists
                if 'explanation' not in q:
                    q['explanation'] = "Based on the provided content."
                
                # Clean question text
                if not q['question'] or q['question'].strip() == "":
                    q['question'] = f"Question {i+1} content missing"
                
                # Ensure source_page exists
                if 'source_page' not in q or not q['source_page']:
                    q['source_page'] = primary_page
                
                validated_questions.append(q)
                logger.info(f"Validated question {len(validated_questions)}: {q['type']} - {q['question'][:50]}... (Page: {q['source_page']})")
            
            logger.info(f"Successfully generated and validated {len(validated_questions)} questions")
            return validated_questions[:num_questions] if validated_questions else []

        except Exception as e:
            logger.error(f"Error in generate_questions_from_text: {str(e)}")
            logger.error(f"OpenAI API Key present: {'Yes' if settings.OPENAI_API_KEY else 'No'}")
            logger.error(f"Text length: {len(text)}")
            logger.error(f"Question type: {question_type}")
            logger.error(f"Quiz type: {quiz_type}")
            logger.error(f"Num questions: {num_questions}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return None

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
            supabase_url = "https://jlrirnwhigtmognookoe.supabase.co"
            supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscmlybndoaWd0bW9nbm9va29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjA3MjcsImV4cCI6MjA2MzM5NjcyN30.sqDr7maHEmd2xKoH3JA5UoUddcQaWrj8Lab6AMdDLSk"
            supabase = create_client(supabase_url, supabase_key)
            file_path = f"{quiz.quiz_id}/{uploaded_file.name}"
            file_data = supabase.storage.from_("fileupload").download(file_path)
            
            # Get total pages for validation
            from PyPDF2 import PdfReader
            import io
            pdf_reader = PdfReader(io.BytesIO(file_data))
            total_pages = len(pdf_reader.pages)
            logger.info(f"PDF has {total_pages} total pages")
            
            # Validate page ranges if provided
            if page_range:
                validation_result = validate_page_range(page_range, total_pages)
                if not validation_result['valid']:
                    logger.error(f"Page validation failed: {validation_result['message']}")
                    document.processing_status = 'failed'
                    document.processing_error = validation_result['message']
                    document.save()
                    return {"success": False, "error": validation_result['message']}
                
                # Use adjusted ranges if available
                page_range = validation_result['adjusted_ranges'] or page_range
                logger.info(f"Using validated page range: {page_range}")
            
            # Parse page ranges first
            page_ranges = _parse_page_ranges_str(page_range) if page_range else None
            logger.info(f"Parsed page ranges: {page_ranges}")
            
            # Extract text using the PDF-specific function with page ranges
            logger.info(f"Extracting text with page range: {page_range}")
            extracted_text = _extract_text_from_pdf_content(file_data, page_ranges)
            
            if not extracted_text or extracted_text.startswith('[Error'):
                logger.error("Text extraction failed - no text extracted")
                document.processing_status = 'failed'
                document.processing_error = 'Failed to extract text from file.'
                document.save()
                return {"success": False, "error": "Failed to extract text."}

            # Validate that text contains page markers for the requested pages
            if page_range:
                # Check if the extracted text contains the requested page content
                requested_pages = []
                if page_ranges:
                    for page_item in page_ranges:
                        if isinstance(page_item, tuple):
                            start, end = page_item
                            requested_pages.extend(range(start, end + 1))
                        else:
                            requested_pages.append(page_item)
                
                # Verify that at least one requested page has content
                found_pages = []
                for page_num in requested_pages:
                    if f"==================== PAGE {page_num} ====================" in extracted_text:
                        found_pages.append(page_num)
                
                if not found_pages:
                    logger.error(f"No content found for requested pages: {page_range}")
                    document.processing_status = 'failed'
                    document.processing_error = f'No content found for requested pages: {page_range}'
                    document.save()
                    return {"success": False, "error": f"No content found for requested pages: {page_range}"}
                
                logger.info(f"Successfully found content for pages: {found_pages}")

            # Clean the extracted text but preserve page markers for question generation
            document.extracted_text = extracted_text
            document.save()
            logger.info(f"Successfully extracted {len(extracted_text)} characters of text from specified pages")

            # Step 3: Generate questions from the extracted text
            target_questions = quiz.no_of_questions or 5
            total_questions_to_generate = target_questions + 5

            logger.info(f"Generating {total_questions_to_generate} questions for quiz {quiz.quiz_id}")

            # 🔁 Scale quiz_type (difficulty breakdown) if it's a dict
            if isinstance(quiz.quiz_type, dict):
                original_total = sum(quiz.quiz_type.values())
                scaled_quiz_type = {}

                for level, count in quiz.quiz_type.items():
                    scaled = round((count / original_total) * total_questions_to_generate)
                    scaled_quiz_type[level] = scaled

                # 🎯 Adjust rounding to match total exactly
                diff = total_questions_to_generate - sum(scaled_quiz_type.values())
                if diff != 0:
                    key_to_adjust = max(scaled_quiz_type, key=scaled_quiz_type.get)
                    scaled_quiz_type[key_to_adjust] += diff
            else:
                    # Fallback if just a string like "easy"
                scaled_quiz_type = {quiz.quiz_type: total_questions_to_generate}

            logger.info(f"Final scaled difficulty distribution: {scaled_quiz_type}")

            # Generate questions with page-specific context
            questions = self.generate_questions_from_text(
                extracted_text,
                question_type=quiz.question_type,
                quiz_type=scaled_quiz_type, 
                num_questions=total_questions_to_generate
            )

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
