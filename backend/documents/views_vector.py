"""
Views for vector database operations with document files.
"""

import os
import uuid
import logging
import pickle
import json
from io import BytesIO
from datetime import datetime

from django.conf import settings
from django.utils.text import slugify
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import models
from django.utils import timezone

# Import Document model
from .models import Document, DocumentVector

# Import text extraction utilities
try:
    import pytesseract
    from PIL import Image
    from PyPDF2 import PdfReader
    TEXT_EXTRACTION_AVAILABLE = True
except ImportError:
    TEXT_EXTRACTION_AVAILABLE = False
    logging.warning("Text extraction packages not available. Install with: pip install pytesseract pillow PyPDF2")

# Import vector database utilities
from config.vector_db import VectorDB

class VectorDocumentUploadView(APIView):
    """API view for uploading documents and storing them in the vector database."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """
        Upload a document and store it in the vector database.
        
        Request:
            - file: Document file (image, PDF, text, etc.)
            - title: Document title (optional)
            - description: Document description (optional)
            
        Response:
            - document_id: Document ID
            - uuid: Document UUID
            - title: Document title
            - status: Success status
        """
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        title = request.data.get('title', file.name)
        description = request.data.get('description', '')
        
        try:
            # Generate a unique document ID
            doc_uuid = str(uuid.uuid4())
            
            # Extract text from the file
            extracted_text = self._extract_text_from_file(file)
            
            # If text extraction failed, log a warning but continue with empty text
            if not extracted_text:
                logging.warning(f"Could not extract text from file: {file.name}. Proceeding with empty text.")
                extracted_text = f"[No text extracted from {file.name}]"
            
            # Prepare metadata
            metadata = {
                'title': title,
                'description': description,
                'original_filename': file.name,
                'file_size': file.size,
                'content_type': file.content_type,
                'user_id': str(request.user.id)
            }
            
            # Generate a virtual file path reference
            file_path = self._save_file(file, doc_uuid)
            
            # Save to Django database without storing the actual file locally
            document = Document(
                title=title,
                description=description,
                # Don't save the actual file, just set field attributes
                extracted_text=extracted_text,
                user=request.user,
                is_processed=True,
                file_size=file.size,
                # Set storage type to vector DB
                storage_type='vector_db',
                # Store reference path instead of actual file
                storage_path=file_path,
                # Set file metadata
                file_type=file.content_type
            )
            document.save()
            
            # Generate embedding and store in vector database
            embedding = None
            vector_db = None
            try:
                # Initialize vector database
                vector_db = VectorDB()
                
                # Generate embedding directly
                embedding = vector_db.generate_embedding(extracted_text)
                
                # Store in vector database
                if embedding:
                    success = vector_db.upsert_file(doc_uuid, file_path, extracted_text, metadata)
                    
                    # Save embedding to DocumentVector model
                    # Serialize the embedding
                    binary_embedding = pickle.dumps(embedding)
                    
                    # Create DocumentVector
                    document_vector = DocumentVector(
                        document=document,
                        vector_uuid=uuid.UUID(doc_uuid),
                        embedding=binary_embedding,
                        is_indexed=True,
                        metadata=metadata
                    )
                    document_vector.save()
                else:
                    # If embedding generation failed, try again with OpenAI directly
                    try:
                        from openai import OpenAI
                        client = OpenAI(api_key=settings.OPENAI_API_KEY)
                        
                        # Handle large documents by chunking
                        # Approximate token count (1 token ~= 4 chars in English)
                        text_for_embedding = extracted_text
                        approx_tokens = len(text_for_embedding) / 4
                        
                        if approx_tokens > 8000:  # Close to the 8192 limit
                            logging.warning(f"Text too long (approx {approx_tokens:.0f} tokens), truncating to first 8000 tokens")
                            # Truncate to approximately 8000 tokens (32000 chars)
                            text_for_embedding = text_for_embedding[:32000]
                        
                        response = client.embeddings.create(
                            input=text_for_embedding,
                            model="text-embedding-ada-002"
                        )
                        embedding = response.data[0].embedding
                        
                        # Save embedding to DocumentVector model
                        binary_embedding = pickle.dumps(embedding)
                        document_vector = DocumentVector(
                            document=document,
                            vector_uuid=uuid.UUID(doc_uuid),
                            embedding=binary_embedding,
                            is_indexed=True,
                            metadata=metadata
                        )
                        document_vector.save()
                        
                        # Try to store in vector database again
                        if vector_db:
                            vector_db.upsert_file(doc_uuid, file_path, extracted_text, metadata)
                    except Exception as e:
                        logging.error(f"Error with direct OpenAI embedding: {e}")
                
            except Exception as e:
                logging.error(f"Error with vector database: {e}")
                # No local file storage, just log the error
                logging.warning("Vector database error but proceeding with vector DB reference")
                success = True
            finally:
                # Close vector database connection if it was opened
                if vector_db:
                    try:
                        vector_db.close()
                    except:
                        pass
            
            if success:
                return Response({
                    'uuid': doc_uuid,
                    'document_id': document.id,
                    'title': title,
                    'status': 'success',
                    'message': 'Document uploaded and processed successfully',
                    'text_extracted': bool(extracted_text != f"[No text extracted from {file.name}]"),
                    'file_path': file_path,
                    'vector_created': embedding is not None
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Failed to store document in vector database',
                    'file_saved': True,
                    'document_id': document.id,
                    'file_path': file_path
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logging.error(f"Error processing document: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _save_file(self, file, doc_uuid):
        """
        Generate a file path reference for vector database without saving locally.
        
        Args:
            file: Uploaded file
            doc_uuid: Document UUID
            
        Returns:
            str: Virtual file path reference
        """
        # Generate a unique filename
        ext = os.path.splitext(file.name)[1].lower()
        filename = f"{slugify(doc_uuid)}{ext}"
        
        # Create a virtual file path (not saved to disk)
        file_path = os.path.join('vector_documents', filename)
                
        return file_path
    
    def _extract_text_from_file(self, file):
        """
        Extract text from a file based on its content type.
        
        Args:
            file: Uploaded file
            
        Returns:
            str: Extracted text
        """
        # Use centralized text extraction utility
        from documents.utils import extract_text_from_file
        return extract_text_from_file(file)


class VectorSearchView(APIView):
    """API view for searching documents using vector similarity."""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Search for documents similar to the query text.
        
        Request:
            - query: Query text to search for
            - limit: Maximum number of results to return (optional)
            - filters: Metadata filters to apply (optional)
            
        Response:
            - results: List of search results
            - count: Number of results
        """
        query = request.data.get('query', '')
        limit = int(request.data.get('limit', 5))
        filters = request.data.get('filters', {})
        
        if not query:
            return Response({'error': 'Query text is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Search vector database
            vector_db_available = False
            results = []
            
            try:
                vector_db = VectorDB()
                results = vector_db.search(query, limit=limit, filters=filters)
                vector_db.close()
                vector_db_available = True
            except Exception as e:
                logging.error(f"Error searching vector database: {e}")
                results = []
                
            # If vector database search failed or returned no results, try searching in Django database
            if not vector_db_available or not results:
                logging.info("Searching in Django database")
                # Get documents that contain the query in title, description, or extracted_text
                documents = Document.objects.filter(
                    models.Q(title__icontains=query) | 
                    models.Q(description__icontains=query) | 
                    models.Q(extracted_text__icontains=query)
                ).order_by('-created_at')[:limit]
                
                # Format results
                results = []
                for doc in documents:
                    result = {
                        'uuid': str(doc.vector.vector_uuid) if hasattr(doc, 'vector') else None,
                        'similarity': 0.5,  # Default similarity for text search
                        'metadata': {
                            'title': doc.title,
                            'description': doc.description,
                            'file_path': doc.file.name,
                            'text_preview': doc.extracted_text[:1000] + "..." if len(doc.extracted_text) > 1000 else doc.extracted_text
                        }
                    }
                    results.append(result)
                
            return Response({
                'results': results,
                'count': len(results),
                'vector_db_available': vector_db_available
            })
        except Exception as e:
            logging.error(f"Error searching documents: {e}")
            return Response({
                'error': str(e),
                'vector_db_available': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizDocumentUploadView(APIView):
    """API view for uploading documents for a specific quiz, storing them in the vector database,
    and generating questions based on the document content."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, quiz_id):
        """
        Upload a document for a specific quiz, store it in the vector database, and generate questions.
        
        Args:
            quiz_id: ID of the quiz to associate with the document
            
        Request:
            - file: Document file (image, PDF, text, etc.)
            - title: Document title (optional)
            - description: Document description (optional)
            - question_count: Number of questions to generate (optional, defaults to quiz setting)
            - question_type: Type of questions to generate (optional, defaults to quiz setting)
            
        Response:
            - document_id: Document ID
            - uuid: Document UUID
            - title: Document title
            - status: Success status
            - questions: Generated questions
        """
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the quiz
        try:
            from quiz.models import Quiz, Question
            quiz = Quiz.objects.get(quiz_id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({'error': f'Quiz with ID {quiz_id} not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check permissions - only quiz owner or admin can upload documents
        if not request.user.is_staff:
            # Check if the current user created the quiz
            if hasattr(quiz, 'created_by'):
                if isinstance(quiz.created_by, str) and quiz.created_by != request.user.email:
                    return Response({'error': 'You do not have permission to upload documents for this quiz'}, 
                                  status=status.HTTP_403_FORBIDDEN)
                elif hasattr(quiz.created_by, 'id') and quiz.created_by.id != request.user.id:
                    return Response({'error': 'You do not have permission to upload documents for this quiz'}, 
                                  status=status.HTTP_403_FORBIDDEN)
        
        file = request.FILES['file']
        title = request.data.get('title', file.name)
        description = request.data.get('description', '')
        
        # Get question generation parameters
        question_count = request.data.get('question_count', quiz.no_of_questions)
        question_type = request.data.get('question_type', quiz.question_type)
        quiz_type = quiz.quiz_type
        
        try:
            # Generate a unique document ID
            doc_uuid = str(uuid.uuid4())
            
            # Extract text from the file
            extracted_text = self._extract_text_from_file(file)
            
            # If text extraction failed, log a warning but continue with empty text
            if not extracted_text:
                logging.warning(f"Could not extract text from file: {file.name}. Proceeding with empty text.")
                extracted_text = f"[No text extracted from {file.name}]"
            
            # Determine file type
            file_type = self._determine_file_type(file)
            
            # Prepare metadata
            metadata = {
                'title': title,
                'description': description,
                'original_filename': file.name,
                'file_size': file.size,
                'content_type': file.content_type,
                'file_type': file_type,
                'user_id': str(request.user.id),
                'quiz_id': quiz_id,
                'quiz_type': quiz_type,
                'question_type': question_type,
                'question_count': question_count
            }
            
            # Save to vector database only
            vector_db = None
            embedding = None
            
            # Generate virtual file path reference
            file_path = self._save_file(file, doc_uuid)
            storage_path = f"vector_db:{doc_uuid}"
            storage_url = f"vector_db:{doc_uuid}"
            
            try:
                # Initialize vector database
                vector_db = VectorDB()
                
                # Generate embedding directly
                embedding = vector_db.generate_embedding(extracted_text)
                
                # Store in vector database
                if embedding:
                    # Store file content in vector DB
                    vector_db.upsert_file(doc_uuid, file.name, extracted_text, metadata)
                else:
                    # If embedding generation failed, try again with OpenAI directly
                    try:
                        from openai import OpenAI
                        client = OpenAI(api_key=settings.OPENAI_API_KEY)
                        
                        # Handle large documents by chunking
                        # Approximate token count (1 token ~= 4 chars in English)
                        text_for_embedding = extracted_text
                        approx_tokens = len(text_for_embedding) / 4
                        
                        if approx_tokens > 8000:  # Close to the 8192 limit
                            logging.warning(f"Text too long (approx {approx_tokens:.0f} tokens), truncating to first 8000 tokens")
                            # Truncate to approximately 8000 tokens (32000 chars)
                            text_for_embedding = text_for_embedding[:32000]
                        
                        response = client.embeddings.create(
                            input=text_for_embedding,
                            model="text-embedding-ada-002"
                        )
                        embedding = response.data[0].embedding
                        
                        # Try to store in vector database again
                        if vector_db:
                            vector_db.upsert_file(doc_uuid, file.name, extracted_text, metadata)
                    except Exception as e:
                        logging.error(f"Error with direct OpenAI embedding: {e}")
                        # Log the error but don't fall back to local storage
                        logging.warning("Failed to generate embedding but proceeding with vector DB storage")
                
            except Exception as e:
                logging.error(f"Error with vector database: {e}")
                logging.warning("Vector database error but proceeding with vector DB reference")
            
            # Save to Django database without storing file locally
            document = Document(
                title=title,
                description=description,
                # Don't save the actual file, just metadata
                extracted_text=extracted_text,
                user=request.user,
                quiz=quiz,  # Associate with the quiz
                is_processed=True,
                file_size=file.size,
                file_type=file_type,
                # Always set storage_type to vector_db
                storage_type='vector_db',
                storage_path=file_path,
                storage_url=storage_url,
                question_count=question_count,
                question_types=[question_type],
                generation_status='processing'
            )
            document.save()
            
            # Save embedding to DocumentVector model if available
            if embedding:
                # Serialize the embedding
                binary_embedding = pickle.dumps(embedding)
                
                # Create DocumentVector
                document_vector = DocumentVector(
                    document=document,
                    vector_uuid=uuid.UUID(doc_uuid),
                    embedding=binary_embedding,
                    is_indexed=True,
                    metadata=metadata
                )
                document_vector.save()
            
            # Generate questions based on the extracted text
            questions = self._generate_questions(
                extracted_text=extracted_text,
                question_count=question_count,
                question_type=question_type,
                quiz_type=quiz_type,
                document=document
            )
            
            # Save questions to the Question model
            if questions:
                user_email = getattr(request.user, 'email', str(request.user))
                Question.objects.create(
                    quiz=quiz,
                    question=json.dumps(questions, indent=2),
                    question_type=question_type,
                    difficulty=quiz_type,
                    correct_answer=None,
                    explanation=None,
                    options=None,
                    created_by=user_email,
                    last_modified_by=user_email,
                    document=document  # Link to the document
                )
                
                # Update document status
                document.questions_generated = True
                document.generation_status = 'completed'
                document.save()
                
                return Response({
                    'uuid': doc_uuid,
                    'document_id': document.id,
                    'quiz_id': quiz_id,
                    'title': title,
                    'status': 'success',
                    'message': 'Document uploaded and questions generated successfully',
                    'text_extracted': bool(extracted_text != f"[No text extracted from {file.name}]"),
                    'storage_type': 'vector_db',
                    'vector_created': embedding is not None,
                    'question_count': len(questions),
                    'file_size': file.size,
                    'file_type': file.content_type
                }, status=status.HTTP_201_CREATED)
            else:
                # Update document status to failed
                document.generation_status = 'failed'
                document.save()
                
                return Response({
                    'uuid': doc_uuid,
                    'document_id': document.id,
                    'quiz_id': quiz_id,
                    'title': title,
                    'status': 'partial_success',
                    'message': 'Document uploaded but question generation failed',
                    'text_extracted': bool(extracted_text != f"[No text extracted from {file.name}]"),
                    'storage_type': 'vector_db',
                    'vector_created': embedding is not None
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logging.error(f"Error processing document: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Close vector database connection if it was opened
            if 'vector_db' in locals() and vector_db:
                try:
                    vector_db.close()
                except:
                    pass
    
    def _save_file(self, file, doc_uuid):
        """
        Generate a file path reference for vector database without saving locally.
        
        Args:
            file: Uploaded file
            doc_uuid: Document UUID
            
        Returns:
            str: Virtual file path reference
        """
        # Generate a unique filename
        ext = os.path.splitext(file.name)[1].lower()
        filename = f"{slugify(doc_uuid)}{ext}"
        
        # Create a virtual file path (not saved to disk)
        file_path = os.path.join('vector_documents', filename)
                
        return file_path
    
    def _extract_text_from_file(self, file):
        """
        Extract text from a file based on its content type.
        
        Args:
            file: Uploaded file
            
        Returns:
            str: Extracted text
        """
        # Use centralized text extraction utility
        from documents.utils import extract_text_from_file
        return extract_text_from_file(file)
        
    def _determine_file_type(self, file):
        """
        Determine the file type based on content type.
        
        Args:
            file: Uploaded file
            
        Returns:
            str: File type
        """
        content_type = file.content_type
        
        if content_type.startswith('image/'):
            return 'image'
        elif content_type == 'application/pdf':
            return 'pdf'
        elif content_type.startswith('text/'):
            if content_type == 'text/csv':
                return 'csv'
            else:
                return 'text'
        elif content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return 'docx'
        elif content_type == 'application/vnd.ms-excel' or content_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return 'excel'
        else:
            return 'other'
            
    def _generate_questions(self, extracted_text, question_count, question_type, quiz_type, document):
        """
        Generate questions based on the extracted text.
        
        Args:
            extracted_text: Extracted text from the document
            question_count: Number of questions to generate
            question_type: Type of questions to generate
            quiz_type: Quiz difficulty level
            document: Document object
            
        Returns:
            list: Generated questions
        """
        try:
            if not extracted_text or extracted_text.startswith('[No text extracted'):
                logging.warning("No text extracted, cannot generate questions")
                return []
                
            # Prepare prompt based on question type
            if question_type == "mixed":
                mixed_note = """
                Include a mix of these question types:
                - Multiple Choice (type: mcq) - with options A, B, C, D
                - Fill-in-the-blank (type: fill) - include [BLANK] in the question
                - True/False (type: truefalse) - with answer True or False
                - One-line answer (type: oneline) - short answer questions
                
                Try to include at least one of each type if possible.
                """
            else:
                mixed_note = f"Use question type: {question_type}."
                
            # Truncate text if too long
            max_text_length = 3000
            if len(extracted_text) > max_text_length:
                logging.info(f"Text too long ({len(extracted_text)} chars), truncating to {max_text_length} chars")
                extracted_text = extracted_text[:max_text_length]
                
            base_prompt = f"""
                You are a professional quiz generator. Based on the content below, generate {question_count} questions for a {quiz_type}-level quiz.

                Content:
                {extracted_text}

                Instructions:
                {mixed_note}
                Format each question like:
                Question: ...
                Type: [mcq|fill|truefalse|oneline]
                A: ... (include options A through D only for mcq type)
                B: ...
                C: ...
                D: ...
                Answer: ... (for mcq: A, B, C, or D; for truefalse: True or False; for others: the correct answer)
                Explanation: ... (brief explanation of why this is the correct answer)
            """
            
            # Generate questions using OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a quiz generator."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            generated_text = response.choices[0].message.content
            if not generated_text.strip():
                raise Exception("Empty response from OpenAI")
                
            # Parse generated questions
            questions = []
            current = {}
            
            for line in generated_text.split('\n'):
                line = line.strip()
                if not line:
                    if current.get("question"):
                        questions.append(current)
                        current = {}
                    continue
                
                if line.startswith("Q") and ":" in line:
                    current['question'] = line.split(":", 1)[1].strip()
                    current['options'] = {}
                elif line.startswith("Question:"):
                    current['question'] = line.replace("Question:", "").strip()
                    current['options'] = {}
                elif line.startswith("Type:"):
                    # Normalize the type when parsing
                    type_value = line.replace("Type:", "").strip().lower()
                    
                    # Map to standard types
                    if type_value in ['multiple_choice', 'multiple-choice', 'multiplechoice', 'multiple choice']:
                        current['type'] = 'mcq'
                    elif type_value in ['fill_in_blank', 'fill-in-blank', 'fillinblank', 'fill_in_the_blank', 'fill in the blank']:
                        current['type'] = 'fill'
                    elif type_value in ['true_false', 'true-false', 'trueorfalse', 'true or false']:
                        current['type'] = 'truefalse'
                    elif type_value in ['one_line', 'one-line', 'short_answer', 'short-answer', 'one line']:
                        current['type'] = 'oneline'
                    else:
                        current['type'] = type_value  # Keep as is if not recognized
                elif line.startswith(("A:", "B:", "C:", "D:")):
                    key = line[0]
                    value = line[2:].strip()
                    if 'options' not in current:
                        current['options'] = {}
                    current['options'][key] = value
                elif line.startswith("Answer:"):
                    current['correct_answer'] = line.replace("Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    current['explanation'] = line.replace("Explanation:", "").strip()
                    
            if current.get("question"):
                questions.append(current)
                
            if not questions:
                # Fallback - create simple questions if parsing failed
                logging.warning("Failed to parse questions from AI response. Using fallback questions.")
                
                # Create simple default questions based on file content
                default_questions = []
                
                # Extract some text to use for questions
                content_lines = extracted_text.split('\n')
                content_chunks = [line for line in content_lines if len(line.strip()) > 30][:10]  # Get first 10 substantial lines
                
                # Create a mix of question types
                if question_type == 'mixed':
                    # Create one of each type
                    if len(content_chunks) >= 1:
                        default_questions.append({
                            "question": f"What is the main topic discussed in this document?",
                            "type": "oneline",
                            "correct_answer": content_chunks[0][:30] + "...",
                            "explanation": "This is based on the first paragraph of the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 2:
                        default_questions.append({
                            "question": f"The document discusses {content_chunks[1][:20]}...",
                            "type": "truefalse",
                            "correct_answer": "True",
                            "explanation": "This statement is taken directly from the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 3:
                        default_questions.append({
                            "question": f"The document mentions [BLANK] as an important concept.",
                            "type": "fill",
                            "correct_answer": content_chunks[2].split()[0] if content_chunks[2].split() else "concept",
                            "explanation": "This term appears in the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 4:
                        default_questions.append({
                            "question": "Which of the following is mentioned in the document?",
                            "type": "mcq",
                            "options": {
                                "A": content_chunks[3][:20] + "...",
                                "B": "Unrelated topic 1",
                                "C": "Unrelated topic 2",
                                "D": "Unrelated topic 3"
                            },
                            "correct_answer": "A",
                            "explanation": "Option A is directly mentioned in the document."
                        })
                else:
                    # Create questions of the specified type
                    for i in range(min(4, len(content_chunks))):
                        if question_type == 'mcq':
                            default_questions.append({
                                "question": f"Which of the following is mentioned in part {i+1} of the document?",
                                "type": "mcq",
                                "options": {
                                    "A": content_chunks[i][:20] + "...",
                                    "B": "Unrelated topic 1",
                                    "C": "Unrelated topic 2",
                                    "D": "Unrelated topic 3"
                                },
                                "correct_answer": "A",
                                "explanation": "Option A is directly mentioned in the document."
                            })
                        elif question_type == 'fill':
                            default_questions.append({
                                "question": f"According to the document, [BLANK] is mentioned in part {i+1}.",
                                "type": "fill",
                                "correct_answer": content_chunks[i].split()[0] if content_chunks[i].split() else "concept",
                                "explanation": "This term appears in the document.",
                                "options": {}
                            })
                        elif question_type == 'truefalse':
                            default_questions.append({
                                "question": f"The document mentions: {content_chunks[i][:30]}...",
                                "type": "truefalse",
                                "correct_answer": "True",
                                "explanation": "This statement is taken directly from the document.",
                                "options": {}
                            })
                        else:  # oneline or default
                            default_questions.append({
                                "question": f"What is mentioned in part {i+1} of the document?",
                                "type": "oneline",
                                "correct_answer": content_chunks[i][:30] + "...",
                                "explanation": "This is based on the content of the document.",
                                "options": {}
                            })
                
                # Use the fallback questions
                if default_questions:
                    questions = default_questions
                else:
                    raise Exception("Failed to parse any valid questions and couldn't create fallback questions.")
                    
            # Normalize question types if needed
            for q in questions:
                if 'type' in q:
                    q_type = q['type'].lower()
                    # Map variations to standard types
                    if q_type in ['multiple_choice', 'multiple-choice', 'multiplechoice']:
                        q['type'] = 'mcq'
                    elif q_type in ['fill_in_blank', 'fill-in-blank', 'fillinblank', 'fill_in_the_blank']:
                        q['type'] = 'fill'
                    elif q_type in ['true_false', 'true-false', 'trueorfalse']:
                        q['type'] = 'truefalse'
                    elif q_type in ['one_line', 'one-line', 'short_answer']:
                        q['type'] = 'oneline'
                        
            return questions
            
        except Exception as e:
            logging.error(f"Error generating questions: {e}")
            return []


class DocumentAnalysisWebhookView(APIView):
    """API view for receiving webhooks from n8n to analyze documents and generate JSON structure."""
    permission_classes = []  # Allow public access for webhooks
    
    def post(self, request):
        """
        Receive webhook from n8n to analyze a document and generate JSON structure.
        
        Request:
            - document_id: ID of the document to analyze
            - webhook_key: Security key to verify the webhook (optional)
            - analysis_type: Type of analysis to perform (default: 'question_generation')
            
        Response:
            - status: Success status
            - document_id: Document ID
            - analysis_result: JSON structure with analysis results
        """
        # Validate webhook key if configured
        webhook_key = request.data.get('webhook_key')
        if hasattr(settings, 'WEBHOOK_SECRET_KEY') and settings.WEBHOOK_SECRET_KEY:
            if webhook_key != settings.WEBHOOK_SECRET_KEY:
                return Response({'error': 'Invalid webhook key'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get document ID
        document_id = request.data.get('document_id')
        if not document_id:
            return Response({'error': 'Document ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get analysis type
        analysis_type = request.data.get('analysis_type', 'question_generation')
        
        try:
            # Get the document
            document = Document.objects.get(id=document_id)
            
            # Check if document has extracted text
            if not document.extracted_text or document.extracted_text.startswith('[No text extracted'):
                return Response({
                    'error': 'No text extracted from document',
                    'document_id': document_id,
                    'status': 'failed'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Analyze document based on analysis type
            if analysis_type == 'question_generation':
                # Get quiz if document is associated with one
                quiz = document.quiz
                if not quiz:
                    return Response({
                        'error': 'Document is not associated with a quiz',
                        'document_id': document_id,
                        'status': 'failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get question generation parameters
                question_count = request.data.get('question_count', quiz.no_of_questions)
                question_type = request.data.get('question_type', quiz.question_type)
                quiz_type = quiz.quiz_type
                
                # Generate questions
                questions = self._generate_questions(
                    extracted_text=document.extracted_text,
                    question_count=question_count,
                    question_type=question_type,
                    quiz_type=quiz_type,
                    document=document
                )
                
                if questions:
                    # Update document status
                    document.questions_generated = True
                    document.generation_status = 'completed'
                    document.save()
                    
                    # Save questions to database if requested
                    if request.data.get('save_to_database', True):
                        from quiz.models import Question
                        user_email = request.data.get('user_email', 'webhook@system.com')
                        
                        Question.objects.create(
                            quiz=quiz,
                            question=json.dumps(questions, indent=2),
                            question_type=question_type,
                            difficulty=quiz_type,
                            correct_answer=None,
                            explanation=None,
                            options=None,
                            created_by=user_email,
                            last_modified_by=user_email,
                            document=document
                        )
                    
                    return Response({
                        'status': 'success',
                        'document_id': document_id,
                        'quiz_id': quiz.quiz_id,
                        'question_count': len(questions),
                        'analysis_result': {
                            'metadata': {
                                'document_title': document.title,
                                'quiz_title': quiz.title,
                                'question_type': question_type,
                                'quiz_type': quiz_type,
                                'generated_at': timezone.now().isoformat(),
                                'file_size': document.file_size,
                                'file_type': document.file_type
                            }
                        }
                    }, status=status.HTTP_200_OK)
                else:
                    # Update document status
                    document.generation_status = 'failed'
                    document.save()
                    
                    return Response({
                        'status': 'failed',
                        'document_id': document_id,
                        'error': 'Failed to generate questions',
                        'analysis_result': None
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            elif analysis_type == 'content_summary':
                # Generate a summary of the document content
                summary = self._generate_summary(document.extracted_text)
                
                return Response({
                    'status': 'success',
                    'document_id': document_id,
                    'analysis_result': {
                        'summary': summary,
                        'metadata': {
                            'document_title': document.title,
                            'document_type': document.file_type,
                            'generated_at': timezone.now().isoformat()
                        }
                    }
                }, status=status.HTTP_200_OK)
            
            elif analysis_type == 'metadata_extraction':
                # Extract metadata from the document
                metadata = self._extract_metadata(document)
                
                return Response({
                    'status': 'success',
                    'document_id': document_id,
                    'analysis_result': {
                        'metadata': metadata
                    }
                }, status=status.HTTP_200_OK)
            
            else:
                return Response({
                    'error': f'Unsupported analysis type: {analysis_type}',
                    'document_id': document_id,
                    'status': 'failed'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Document.DoesNotExist:
            return Response({
                'error': f'Document with ID {document_id} not found',
                'status': 'failed'
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            logging.error(f"Error processing webhook: {e}")
            return Response({
                'error': str(e),
                'document_id': document_id,
                'status': 'failed'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_questions(self, extracted_text, question_count, question_type, quiz_type, document):
        """Generate questions from extracted text - reusing existing implementation"""
        try:
            if not extracted_text or extracted_text.startswith('[No text extracted'):
                logging.warning("No text extracted, cannot generate questions")
                return []
                
            # Prepare prompt based on question type
            if question_type == "mixed":
                mixed_note = """
                Include a mix of these question types:
                - Multiple Choice (type: mcq) - with options A, B, C, D
                - Fill-in-the-blank (type: fill) - include [BLANK] in the question
                - True/False (type: truefalse) - with answer True or False
                - One-line answer (type: oneline) - short answer questions
                
                Try to include at least one of each type if possible.
                """
            else:
                mixed_note = f"Use question type: {question_type}."
                
            # Truncate text if too long
            max_text_length = 3000
            if len(extracted_text) > max_text_length:
                logging.info(f"Text too long ({len(extracted_text)} chars), truncating to {max_text_length} chars")
                extracted_text = extracted_text[:max_text_length]
                
            base_prompt = f"""
                You are a professional quiz generator. Based on the content below, generate {question_count} questions for a {quiz_type}-level quiz.

                Content:
                {extracted_text}

                Instructions:
                {mixed_note}
                Format each question like:
                Question: ...
                Type: [mcq|fill|truefalse|oneline]
                A: ... (include options A through D only for mcq type)
                B: ...
                C: ...
                D: ...
                Answer: ... (for mcq: A, B, C, or D; for truefalse: True or False; for others: the correct answer)
                Explanation: ... (brief explanation of why this is the correct answer)
            """
            
            # Generate questions using OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a quiz generator."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            generated_text = response.choices[0].message.content
            if not generated_text.strip():
                raise Exception("Empty response from OpenAI")
                
            # Parse generated questions
            questions = []
            current = {}
            
            for line in generated_text.split('\n'):
                line = line.strip()
                if not line:
                    if current.get("question"):
                        questions.append(current)
                        current = {}
                    continue
                
                if line.startswith("Q") and ":" in line:
                    current['question'] = line.split(":", 1)[1].strip()
                    current['options'] = {}
                elif line.startswith("Question:"):
                    current['question'] = line.replace("Question:", "").strip()
                    current['options'] = {}
                elif line.startswith("Type:"):
                    # Normalize the type when parsing
                    type_value = line.replace("Type:", "").strip().lower()
                    
                    # Map to standard types
                    if type_value in ['multiple_choice', 'multiple-choice', 'multiplechoice', 'multiple choice']:
                        current['type'] = 'mcq'
                    elif type_value in ['fill_in_blank', 'fill-in-blank', 'fillinblank', 'fill_in_the_blank', 'fill in the blank']:
                        current['type'] = 'fill'
                    elif type_value in ['true_false', 'true-false', 'trueorfalse', 'true or false']:
                        current['type'] = 'truefalse'
                    elif type_value in ['one_line', 'one-line', 'short_answer', 'short-answer', 'one line']:
                        current['type'] = 'oneline'
                    else:
                        current['type'] = type_value  # Keep as is if not recognized
                elif line.startswith(("A:", "B:", "C:", "D:")):
                    key = line[0]
                    value = line[2:].strip()
                    if 'options' not in current:
                        current['options'] = {}
                    current['options'][key] = value
                elif line.startswith("Answer:"):
                    current['correct_answer'] = line.replace("Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    current['explanation'] = line.replace("Explanation:", "").strip()
                    
            if current.get("question"):
                questions.append(current)
                
            if not questions:
                # Fallback - create simple questions if parsing failed
                logging.warning("Failed to parse questions from AI response. Using fallback questions.")
                
                # Create simple default questions based on file content
                default_questions = []
                
                # Extract some text to use for questions
                content_lines = extracted_text.split('\n')
                content_chunks = [line for line in content_lines if len(line.strip()) > 30][:10]  # Get first 10 substantial lines
                
                # Create a mix of question types
                if question_type == 'mixed':
                    # Create one of each type
                    if len(content_chunks) >= 1:
                        default_questions.append({
                            "question": f"What is the main topic discussed in this document?",
                            "type": "oneline",
                            "correct_answer": content_chunks[0][:30] + "...",
                            "explanation": "This is based on the first paragraph of the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 2:
                        default_questions.append({
                            "question": f"The document discusses {content_chunks[1][:20]}...",
                            "type": "truefalse",
                            "correct_answer": "True",
                            "explanation": "This statement is taken directly from the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 3:
                        default_questions.append({
                            "question": f"The document mentions [BLANK] as an important concept.",
                            "type": "fill",
                            "correct_answer": content_chunks[2].split()[0] if content_chunks[2].split() else "concept",
                            "explanation": "This term appears in the document.",
                            "options": {}
                        })
                    
                    if len(content_chunks) >= 4:
                        default_questions.append({
                            "question": "Which of the following is mentioned in the document?",
                            "type": "mcq",
                            "options": {
                                "A": content_chunks[3][:20] + "...",
                                "B": "Unrelated topic 1",
                                "C": "Unrelated topic 2",
                                "D": "Unrelated topic 3"
                            },
                            "correct_answer": "A",
                            "explanation": "Option A is directly mentioned in the document."
                        })
                else:
                    # Create questions of the specified type
                    for i in range(min(4, len(content_chunks))):
                        if question_type == 'mcq':
                            default_questions.append({
                                "question": f"Which of the following is mentioned in part {i+1} of the document?",
                                "type": "mcq",
                                "options": {
                                    "A": content_chunks[i][:20] + "...",
                                    "B": "Unrelated topic 1",
                                    "C": "Unrelated topic 2",
                                    "D": "Unrelated topic 3"
                                },
                                "correct_answer": "A",
                                "explanation": "Option A is directly mentioned in the document."
                            })
                        elif question_type == 'fill':
                            default_questions.append({
                                "question": f"According to the document, [BLANK] is mentioned in part {i+1}.",
                                "type": "fill",
                                "correct_answer": content_chunks[i].split()[0] if content_chunks[i].split() else "concept",
                                "explanation": "This term appears in the document.",
                                "options": {}
                            })
                        elif question_type == 'truefalse':
                            default_questions.append({
                                "question": f"The document mentions: {content_chunks[i][:30]}...",
                                "type": "truefalse",
                                "correct_answer": "True",
                                "explanation": "This statement is taken directly from the document.",
                                "options": {}
                            })
                        else:  # oneline or default
                            default_questions.append({
                                "question": f"What is mentioned in part {i+1} of the document?",
                                "type": "oneline",
                                "correct_answer": content_chunks[i][:30] + "...",
                                "explanation": "This is based on the content of the document.",
                                "options": {}
                            })
                
                # Use the fallback questions
                if default_questions:
                    questions = default_questions
                else:
                    raise Exception("Failed to parse any valid questions and couldn't create fallback questions.")
                    
            # Normalize question types if needed
            for q in questions:
                if 'type' in q:
                    q_type = q['type'].lower()
                    # Map variations to standard types
                    if q_type in ['multiple_choice', 'multiple-choice', 'multiplechoice']:
                        q['type'] = 'mcq'
                    elif q_type in ['fill_in_blank', 'fill-in-blank', 'fillinblank', 'fill_in_the_blank']:
                        q['type'] = 'fill'
                    elif q_type in ['true_false', 'true-false', 'trueorfalse']:
                        q['type'] = 'truefalse'
                    elif q_type in ['one_line', 'one-line', 'short_answer']:
                        q['type'] = 'oneline'
                        
            return questions
            
        except Exception as e:
            logging.error(f"Error generating questions: {e}")
            return []
    
    def _generate_summary(self, text):
        """Generate a summary of the document content"""
        try:
            # Truncate text if too long
            max_text_length = 4000
            if len(text) > max_text_length:
                text = text[:max_text_length]
                
            # Generate summary using OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a document summarizer."},
                    {"role": "user", "content": f"Summarize the following text in about 3-5 paragraphs:\n\n{text}"}
                ],
                temperature=0.5,
                max_tokens=500
            )
            
            summary = response.choices[0].message.content
            return summary
            
        except Exception as e:
            logging.error(f"Error generating summary: {e}")
            return "Failed to generate summary."
    
    def _extract_metadata(self, document):
        """Extract metadata from the document"""
        try:
            metadata = {
                'document_id': document.id,
                'title': document.title,
                'description': document.description,
                'file_type': document.file_type,
                'file_size': document.file_size,
                'file_size_display': document.get_file_size_display(),
                'created_at': document.created_at.isoformat(),
                'updated_at': document.updated_at.isoformat(),
                'storage_type': document.storage_type,
                'is_processed': document.is_processed,
                'questions_generated': document.questions_generated,
                'generation_status': document.generation_status,
            }
            
            # Add quiz information if available
            if document.quiz:
                metadata['quiz'] = {
                    'quiz_id': document.quiz.quiz_id,
                    'title': document.quiz.title,
                    'quiz_type': document.quiz.quiz_type,
                    'question_type': document.quiz.question_type,
                    'no_of_questions': document.quiz.no_of_questions,
                }
                
            # Add vector information if available
            try:
                vector = document.vector
                metadata['vector'] = {
                    'vector_uuid': str(vector.vector_uuid),
                    'is_indexed': vector.is_indexed,
                    'created_at': vector.created_at.isoformat(),
                }
            except:
                metadata['vector'] = None
                
            # Extract text statistics
            if document.extracted_text:
                word_count = len(document.extracted_text.split())
                metadata['text_stats'] = {
                    'word_count': word_count,
                    'character_count': len(document.extracted_text),
                    'has_extracted_text': True
                }
            else:
                metadata['text_stats'] = {
                    'word_count': 0,
                    'character_count': 0,
                    'has_extracted_text': False
                }
                
            return metadata
            
        except Exception as e:
            logging.error(f"Error extracting metadata: {e}")
            return {
                'error': str(e),
                'document_id': document.id,
                'title': document.title
            } 