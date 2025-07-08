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
        from openai import OpenAI
        from django.conf import settings
        import json
        import math

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        MAX_BATCH = 25
        total_batches = math.ceil(num_questions / MAX_BATCH)
        all_validated_questions = []
        current_question_number = 1

        logger.info(f"🔄 Generating {num_questions} questions in {total_batches} batch(es)...")

        for batch_index in range(total_batches):
            batch_question_count = min(MAX_BATCH, num_questions - len(all_validated_questions))
            logger.info(f"📦 Generating batch {batch_index+1} with {batch_question_count} questions...")

            try:
                batch_questions = self._generate_question_batch(
                    client=client,
                    text=text,
                    question_type=question_type,
                    quiz_type=quiz_type,
                    num_questions=batch_question_count,
                    start_question_number=current_question_number
                )

                if batch_questions:
                    all_validated_questions.extend(batch_questions)
                    current_question_number += len(batch_questions)

            except Exception as e:
                logger.error(f"❌ Batch {batch_index+1} failed: {str(e)}")
                continue

        logger.info(f"✅ Total generated questions: {len(all_validated_questions)} / {num_questions}")
        return all_validated_questions[:num_questions]

    def _generate_question_batch(self, client, text, question_type, quiz_type, num_questions, start_question_number=1):
        import re
        import json
        import logging
        logger = logging.getLogger(__name__)

        # Step 1: Text processing (same as before)
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

        sections_text = ""
        page_numbers = []
        for page_num, section_text in text_sections:
            sections_text += f"\nContent from page {page_num}:\n{section_text}\n"
            page_numbers.append(page_num)
        primary_page = page_numbers[0] if page_numbers else 'all'

        max_content_length = 4000
        if len(sections_text) > max_content_length:
            sections_text = sections_text[:max_content_length] + "\n[Content truncated]"
            logger.warning(f"Content truncated to {max_content_length} characters")

        if question_type == 'mixed':
            type_instruction = "a mix of 'mcq', 'fill', 'truefalse', 'oneline'"
            format_instruction = """
            Each question must have:
            - "question", "type", "options", "correct_answer", "explanation", "question_number", "source_page"
            For 'mcq', options should include "A", "B", "C", "D". For others, options should be empty.
            """
        else:
            type_instruction = f"only questions of type '{question_type}'"
            format_instruction = """
            Each question must include:
            - "question", "type", "options", "correct_answer", "explanation", "question_number", "source_page"
            For non-MCQ types, use empty options.
            """

        base_prompt = f"""
        You are an expert quiz generator. Based on the following content, generate exactly {num_questions} questions.
        Difficulty: {quiz_type}. Types: {type_instruction}.

        Content:
        {sections_text}

        {format_instruction}
        Format the output strictly as:
        {{
            "questions": [
                {{
                    "question": "...",
                    "type": "mcq",
                    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
                    "correct_answer": "...",
                    "explanation": "...",
                    "question_number": 1,
                    "source_page": "..."
                }},
                ...
            ]
        }}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates quiz questions strictly based on the provided content."},
                {"role": "user", "content": base_prompt}
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        if content.startswith("```json"):
            content = content[7:]
            if content.endswith("```"):
                content = content[:-3]

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            logger.error("Failed to parse JSON:\n" + content)
            raise

        questions = parsed.get('questions', [])
        validated_questions = []
        type_cycle = ['mcq', 'truefalse', 'fill', 'oneline']

        for i, q in enumerate(questions):
            qtype = q.get('type') or (type_cycle[i % len(type_cycle)] if question_type == 'mixed' else question_type)

            # Validate fields
            q['type'] = qtype
            q['options'] = q.get('options', {}) if qtype == 'mcq' else {}
            if qtype == 'mcq' and (not q.get('correct_answer') or q['correct_answer'] not in q['options']):
                q['correct_answer'] = next(iter(q['options']), "A")
            elif not q.get('correct_answer'):
                q['correct_answer'] = "Answer" if qtype != 'truefalse' else "True"
            q['explanation'] = q.get('explanation', "Based on the provided content.")
            q['question'] = q.get('question', f"Question {i+1}")
            q['question_number'] = start_question_number + i
            q['source_page'] = q.get('source_page', primary_page)

            validated_questions.append(q)

        logger.info(f"✅ Batch generated {len(validated_questions)} questions starting from #{start_question_number}")
        return validated_questions[:num_questions]


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
            from pypdf import PdfReader
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
