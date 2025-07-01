import logging
from typing import Dict, Any, Optional, List, Union, Tuple
from PyPDF2 import PdfReader
import re
import io
from django.conf import settings
from .models import Document
from quiz.models import Question
from .utils import extract_text_from_file

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
                type_instruction = "a mix of question types, including 'mcq', 'fill', 'truefalse', and 'oneline'"
                format_instruction = """
                For mixed questions, ensure each question object has:
                - "question": The question text
                - "type": The specific type ('mcq', 'fill', 'truefalse', 'oneline')
                - "options": For MCQ, an object with keys "A", "B", "C", "D". For others, empty object {}
                - "correct_answer": The correct answer (for MCQ, use the key like "A" or "B")
                - "explanation": Brief explanation
                
                Generate approximately:
                - 40% MCQ questions
                - 25% True/False questions  
                - 20% Fill-in-the-blank questions
                - 15% One-line answer questions
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

            # Prepare the prompt for the API
            base_prompt = f"""
            You are an expert quiz creator. Based on the following text, generate {num_questions} questions.
            The quiz difficulty should be '{quiz_type}' and you should generate {type_instruction}.

            Text:
            ---
            {text[:4000]}
            ---

            {format_instruction}

            Please format the output as a JSON object with a "questions" key containing an array of question objects.
            Each question object must have the following keys:
            - "question": The question text (string).
            - "type": The type of question. Must be one of 'mcq', 'fill', 'truefalse', 'oneline' (string).
            - "options": An object with keys "A", "B", "C", "D" for 'mcq' type, otherwise an empty object {{}}.
            - "correct_answer": The correct answer (string).
            - "explanation": A brief explanation for the answer (string).

            Return only valid JSON in this format:
            {{
                "questions": [
                    {{
                        "question": "Your question text here",
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
                    {"role": "system", "content": "You are a helpful assistant that generates a diverse set of quiz questions in a strict JSON format."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.5,
            )
            
            content = response.choices[0].message.content
            generated_data = json.loads(content)
            
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
                        type_cycle = ['mcq', 'truefalse', 'fill', 'oneline']
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
                    q['explanation'] = "No explanation provided."
                
                # Clean question text
                if not q['question'] or q['question'].strip() == "":
                    q['question'] = f"Question {i+1} content missing"
                
                validated_questions.append(q)
                logger.info(f"Validated question {len(validated_questions)}: {q['type']} - {q['question'][:50]}...")
            
            # If we don't have enough questions, try to generate more
            if len(validated_questions) < num_questions:
                additional_needed = num_questions - len(validated_questions)
                logger.warning(f"Only generated {len(validated_questions)} questions, need {additional_needed} more")
                
                # Generate additional questions with a simpler approach
                for attempt in range(min(additional_needed, 3)):  # Max 3 additional attempts
                    try:
                        simple_prompt = f"""
                        Generate 1 quiz question about: {text[:1500]}
                        
                        Return as JSON object:
                        {{
                            "questions": [
                                {{
                                    "question": "Your question here", 
                                    "type": "{'mcq' if question_type == 'mixed' else question_type}", 
                                    "options": {{"A": "opt1", "B": "opt2", "C": "opt3", "D": "opt4"}}, 
                                    "correct_answer": "A", 
                                    "explanation": "explanation here",
                                    "question_number": 1
                                }}
                            ]
                        }}
                        """
                        
                        additional_response = client.chat.completions.create(
                            model="gpt-4",
                            messages=[
                                {"role": "system", "content": "Generate quiz questions in JSON format."},
                                {"role": "user", "content": simple_prompt}
                            ],
                            temperature=0.7,
                        )
                        
                        additional_content = additional_response.choices[0].message.content
                        additional_data = json.loads(additional_content)
                        
                        if isinstance(additional_data, dict) and 'questions' in additional_data:
                            for add_q in additional_data['questions']:
                                if len(validated_questions) >= num_questions:
                                    break
                                # Apply same validation
                                if 'question' in add_q:
                                    if 'type' not in add_q:
                                        add_q['type'] = 'mcq'
                                    if add_q['type'] == 'mcq' and 'options' not in add_q:
                                        add_q['options'] = {"A": "Option A", "B": "Option B", "C": "Option C", "D": "Option D"}
                                    if 'correct_answer' not in add_q:
                                        add_q['correct_answer'] = "A" if add_q['type'] == 'mcq' else "Answer"
                                    if 'explanation' not in add_q:
                                        add_q['explanation'] = "No explanation provided."
                                    validated_questions.append(add_q)
                                    logger.info(f"Added additional question: {add_q['type']} - {add_q['question'][:50]}...")
                                    
                    except Exception as e:
                        logger.warning(f"Failed to generate additional question {attempt+1}: {str(e)}")

            logger.info(f"Final question count: {len(validated_questions)}")
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
            page_range: Optional string specifying page ranges (e.g., "1-5,7,10-15")
            
        Returns:
            Dict containing processing results
        """
        import json
        import logging
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
                storage_type='local', # Or determine based on settings
                metadata={'page_range': page_range} if page_range else {}
            )

            # Step 2: Extract text from the file
            logger.info("Starting text extraction")
            logger.info(f"Extracting text with page range: {page_range}")
            extracted_text = extract_text_from_file(uploaded_file, page_range)
            if not extracted_text:
                logger.error("Text extraction failed - no text extracted")
                document.processing_status = 'failed'
                document.processing_error = 'Failed to extract text from file.'
                document.save()
                return {"success": False, "error": "Failed to extract text."}

            document.extracted_text = extracted_text
            document.save()
            logger.info(f"Successfully extracted {len(extracted_text)} characters of text")

            # Step 3: Generate questions from the extracted text
            target_questions = quiz.no_of_questions or 5
            total_questions_to_generate = max(target_questions + 5, 10)  # Generate at least 5 extra
            
            logger.info(f"Attempting to generate {total_questions_to_generate} questions")
            logger.info(f"Quiz type: {quiz.quiz_type}, Question type: {quiz.question_type}")
            
            questions = self.generate_questions_from_text(
                document.extracted_text,
                quiz.question_type,
                quiz.quiz_type,
                total_questions_to_generate
            )

            if not questions:
                logger.error("Question generation failed - no questions returned")
                document.processing_status = 'failed'
                document.processing_error = 'Failed to generate questions from text.'
                document.save()
                return {"success": False, "error": "Failed to generate questions."}

            logger.info(f"Successfully generated {len(questions)} questions")

            # Step 4: Save the generated questions
            try:
                if quiz.question_type == 'mixed':
                    # For mixed type, store all questions as a single JSON object
                    logger.info("Saving mixed type questions")
                    Question.objects.create(
                        quiz=quiz,
                        document=document,
                        question=json.dumps(questions),  # Store as JSON string
                        question_type='mixed',
                        options={},
                        correct_answer='',
                        explanation='',
                        difficulty=quiz.quiz_type,
                        created_by=user.email
                    )
                else:
                    # For single type questions, store individually
                    logger.info("Saving individual questions")
                    for q_data in questions:
                        Question.objects.create(
                            quiz=quiz,
                            document=document,
                            question=q_data.get('question', ''),
                            question_type=q_data.get('type', quiz.question_type),
                            options=q_data.get('options', {}),
                            correct_answer=q_data.get('correct_answer', ''),
                            explanation=q_data.get('explanation', ''),
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
                "questions_generated": len(questions)
            }

        except Exception as e:
            logger.error(f"Error processing document {uploaded_file.name}: {str(e)}")
            logger.error(f"Full error details:", exc_info=True)
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
