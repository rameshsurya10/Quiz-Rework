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
        """Extract text from a file, using the appropriate method based on file type"""
        logging.info(f"Extracting text from file: {file.name}")
        
        try:
            from documents.utils import extract_text_from_file
            
            # Reset file position
            file.seek(0)
            
            # Extract text using centralized utility
            extracted_text = extract_text_from_file(file)
            
            # Log the first 200 characters of extracted text
            if extracted_text:
                preview = extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text
                logging.info(f"Successfully extracted text ({len(extracted_text)} chars). Preview: {preview}")
            else:
                logging.warning(f"No text extracted from file: {file.name}")
                
            return extracted_text
        except Exception as e:
            logging.error(f"Error extracting text from file: {e}")
            return f"[Error extracting text from file: {str(e)}]"


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
            - page_ranges: Comma-separated string specifying page ranges (e.g., "1-5,7,10-15") (optional)
            
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
            logging.info(f"Found quiz: {quiz.title} (ID: {quiz_id})")
            
            # Debug: Check if quiz has metadata
            if hasattr(quiz, 'metadata') and quiz.metadata:
                logging.info(f"Quiz metadata: {quiz.metadata}")
            else:
                logging.info("Quiz has no metadata")
                
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
        
        # Parse page ranges if provided (format: "1-5,7,10-15")
        page_ranges_str = request.data.get('page_ranges', '')
        
        # Check multiple places for page ranges
        if not page_ranges_str:
            # Check JSON data
            if 'data' in request.data:
                try:
                    data_json = json.loads(request.data['data'])
                    page_ranges_str = data_json.get('page_ranges', '')
                    logging.info(f"Found page ranges in data JSON: {page_ranges_str}")
                except (json.JSONDecodeError, TypeError):
                    pass
                    
            # Check formData
            if not page_ranges_str and 'formData' in request.data:
                try:
                    form_data = json.loads(request.data['formData'])
                    page_ranges_str = form_data.get('page_ranges', '')
                    logging.info(f"Found page ranges in formData: {page_ranges_str}")
                except (json.JSONDecodeError, TypeError):
                    pass
                    
            # Check quiz metadata
            if not page_ranges_str and hasattr(quiz, 'metadata') and quiz.metadata:
                page_ranges_str = quiz.metadata.get('page_ranges_str', '')
                logging.info(f"Found page ranges in quiz metadata: {page_ranges_str}")
        
        logging.info(f"Final page ranges string: '{page_ranges_str}'")
        
        # Determine file type
        file_type = self._determine_file_type(file)
        logging.info(f"Detected file type: {file_type}")
        
        page_ranges = None
        if page_ranges_str and file_type == 'pdf':
            page_ranges = self._parse_page_ranges(page_ranges_str)
            logging.info(f"Parsed page ranges: {page_ranges}")
            
            # Store the page ranges in the quiz metadata for future reference
            if not hasattr(quiz, 'metadata') or not quiz.metadata:
                quiz.metadata = {}
            quiz.metadata['page_ranges_str'] = page_ranges_str
            quiz.save(update_fields=['metadata'])
            logging.info(f"Updated quiz metadata with page_ranges_str: {page_ranges_str}")
        elif page_ranges_str and file_type != 'pdf':
            logging.warning(f"Page ranges provided but file is not a PDF: {file_type}")
        
        try:
            # Generate a unique document ID
            doc_uuid = str(uuid.uuid4())
            
            # Extract text from the file, using page ranges if specified
            extracted_text = self._extract_text_from_file(file, page_ranges)
            
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
                'file_type': file_type,
                'user_id': str(request.user.id),
                'quiz_id': quiz_id,
                'quiz_type': quiz_type,
                'question_type': question_type,
                'question_count': question_count
            }
            
            # Add page ranges to metadata if provided
            if page_ranges_str:
                metadata['page_ranges_str'] = page_ranges_str
            
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
                # Save metadata including page ranges
                metadata=metadata
            )
            document.save()
            
            # Save binary embedding to DocumentVector if available
            if embedding:
                try:
                    binary_embedding = pickle.dumps(embedding)
                    document_vector = DocumentVector(
                        document=document,
                        vector_uuid=uuid.UUID(doc_uuid),
                        embedding=binary_embedding,
                        is_indexed=True,
                        metadata=metadata
                    )
                    document_vector.save()
                except Exception as e:
                    logging.error(f"Error saving document vector: {e}")
            
            # Update quiz uploadedfiles field for backward compatibility
            if not isinstance(quiz.uploadedfiles, list):
                quiz.uploadedfiles = []
                
            file_info = {
                'name': file.name,
                'path': file_path,
                'document_id': document.id,
                'vector_uuid': doc_uuid,
                'file_size': file.size,
                'file_type': file.content_type
            }
            
            # Add page ranges to file info if provided
            if page_ranges_str:
                file_info['page_ranges'] = page_ranges_str
                
            quiz.uploadedfiles.append(file_info)
            
            # Update quiz metadata with page ranges if provided
            if page_ranges_str and (not quiz.metadata or 'page_ranges_str' not in quiz.metadata):
                if not quiz.metadata:
                    quiz.metadata = {}
                quiz.metadata['page_ranges_str'] = page_ranges_str
                
            quiz.save()
            
            # Generate questions based on the extracted text
            questions = self._generate_questions(extracted_text, question_count, question_type, quiz_type, document)
            
            # Verify that questions are generated from the selected pages
            if page_ranges and questions:
                logging.info("Verifying questions are from selected pages...")
                
                # Get all selected page numbers
                selected_pages = set()
                for pr in page_ranges:
                    if isinstance(pr, tuple):
                        selected_pages.update(range(pr[0], pr[1] + 1))
                    else:
                        selected_pages.add(pr)
                
                logging.info(f"Selected pages: {sorted(selected_pages)}")
                
                # Extract page numbers from the text
                import re
                page_markers = re.findall(r"==================== PAGE (\d+) ====================", extracted_text)
                page_numbers = [int(p) for p in page_markers]
                logging.info(f"Found page markers for pages: {page_numbers}")
                
                # If we found fewer questions than requested, try regenerating with more specific instructions
                if len(questions) < int(question_count):
                    logging.warning(f"Only generated {len(questions)} questions, needed {question_count}")
                    
                    # Try regenerating with more specific instructions
                    additional_questions_needed = int(question_count) - len(questions)
                    if additional_questions_needed > 0:
                        logging.info(f"Attempting to generate {additional_questions_needed} more questions")
                        
                        # Create a more specific prompt focusing on the page content
                        more_questions = self._generate_questions(
                            extracted_text, 
                            additional_questions_needed, 
                            question_type, 
                            quiz_type, 
                            document
                        )
                        
                        if more_questions:
                            questions.extend(more_questions)
                            logging.info(f"Successfully generated {len(more_questions)} additional questions")
            
            # Store the questions in the database
            if questions:
                # Create a single Question object with the questions as JSON
                question = Question(
                    quiz=quiz,
                    question=json.dumps(questions),
                    question_type='mixed',
                    difficulty=quiz_type,
                    created_by=request.user.email,
                    document=document
                )
                question.save()
                
                # Log success
                logging.info(f"Successfully created question with {len(questions)} sub-questions")
            
            # Close vector database connection if it was opened
            if vector_db:
                try:
                    vector_db.close()
                except:
                    pass
            
            # Return success response
            return Response({
                'document_id': document.id,
                'uuid': doc_uuid,
                'title': title,
                'status': 'success',
                'message': 'Document uploaded and questions generated successfully',
                'questions_count': len(questions),
                'questions': questions
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logging.error(f"Error processing document: {str(e)}")
            import traceback
            logging.error(traceback.format_exc())
            return Response({
                'error': f'Error processing document: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def _extract_text_from_file(self, file, page_ranges=None):
        """Extract text from a file, using the appropriate method based on file type"""
        logging.info(f"Extracting text from file: {file.name}, page_ranges: {page_ranges}")
        
        try:
            from documents.utils import extract_text_from_file
            
            # Reset file position
            file.seek(0)
            
            # Extract text using centralized utility
            extracted_text = extract_text_from_file(file, page_ranges)
            
            # Log the first 200 characters of extracted text
            if extracted_text:
                preview = extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text
                logging.info(f"Successfully extracted text ({len(extracted_text)} chars). Preview: {preview}")
            else:
                logging.warning(f"No text extracted from file: {file.name}")
                
            return extracted_text
        except Exception as e:
            logging.error(f"Error extracting text from file: {e}")
            return f"[Error extracting text from file: {str(e)}]"
        
    def _determine_file_type(self, file):
        """
        Determine the file type based on content type and extension.
        
        Args:
            file: Uploaded file
            
        Returns:
            str: File type
        """
        content_type = file.content_type
        file_name = file.name.lower()
        file_extension = os.path.splitext(file_name)[1].lower()
        
        # Check by content type first
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
        elif content_type in ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
            return 'excel'
            
        # Fall back to extension if content type is generic
        if file_extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']:
            return 'image'
        elif file_extension == '.pdf':
            return 'pdf'
        elif file_extension == '.csv':
            return 'csv'
        elif file_extension in ['.txt', '.text', '.md']:
            return 'text'
        elif file_extension in ['.doc', '.docx']:
            return 'docx'
        elif file_extension in ['.xls', '.xlsx']:
            return 'excel'
            
        # Default
        return 'other'
            
    def _parse_page_ranges(self, page_ranges_str):
        """
        Parse page ranges string in format "1-5,7,10-15" into a list of ranges.
        
        Args:
            page_ranges_str: String with page ranges (e.g., "1-5,7,10-15")
            
        Returns:
            list: List of integers and tuples representing page ranges, e.g., 
                  [(1, 5), 7, (10, 15)]
        """
        if not page_ranges_str:
            return None
            
        result = []
        parts = page_ranges_str.split(',')
        
        for part in parts:
            part = part.strip()
            if not part:
                continue
                
            # Check if it's a range (contains '-')
            if '-' in part:
                try:
                    start, end = part.split('-', 1)
                    start = int(start.strip())
                    end = int(end.strip())
                    
                    # Validate range
                    if start <= 0 or end <= 0:
                        raise ValueError("Page numbers must be positive")
                    if start > end:
                        raise ValueError(f"Invalid range: {start}-{end}")
                    
                    result.append((start, end))
                except ValueError as e:
                    logging.warning(f"Invalid page range format: '{part}' - {str(e)}")
            else:
                # Single page
                try:
                    page = int(part)
                    if page <= 0:
                        raise ValueError("Page numbers must be positive")
                    result.append(page)
                except ValueError as e:
                    logging.warning(f"Invalid page number: '{part}' - {str(e)}")
        
        return result if result else None
            
    def _generate_questions(self, extracted_text, question_count, question_type, quiz_type, document, strict_page_filtering=False):
        """
        Generate questions based on the extracted text.
        
        Args:
            extracted_text: Extracted text from the document
            question_count: Number of questions to generate
            question_type: Type of questions to generate
            quiz_type: Quiz difficulty level
            document: Document object
            strict_page_filtering: Whether to add extra instructions to focus on selected pages
            
        Returns:
            list: Generated questions
        """
        try:
            if not extracted_text or extracted_text.startswith('[No text extracted'):
                logging.warning("No text extracted, cannot generate questions")
                
                # Special handling for images with OCR errors
                if document.file_type and document.file_type.startswith('image/'):
                    logging.info("Document is an image. Using special image handling.")
                    return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
                return []
            
            # Check if the document has page ranges in its metadata
            page_ranges_str = ""
            if hasattr(document, 'metadata') and document.metadata:
                page_ranges_str = document.metadata.get('page_ranges_str', '')
                
            # Log page ranges information
            if page_ranges_str:
                logging.info(f"Document has page ranges: {page_ranges_str}")
            else:
                logging.info("Document does not have specific page ranges")
                
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
                
            # Check if the text contains page markers
            page_specific_instruction = ""
            if "==================== PAGE " in extracted_text:
                # Extract page numbers from the text
                import re
                page_numbers = re.findall(r"==================== PAGE (\d+) ====================", extracted_text)
                if page_numbers:
                    page_list = ", ".join(page_numbers)
                    page_specific_instruction = f"""
                    IMPORTANT: This content is from page(s) {page_list} ONLY. 
                    You MUST ONLY generate questions based on content from these specific pages.
                    Do NOT use any information outside these pages.
                    All questions and answers MUST be verifiable from the provided content.
                    """
                    
                    # Add extra emphasis for strict filtering
                    if strict_page_filtering:
                        page_specific_instruction += f"""
                        CRITICAL: In your explanation for each question, explicitly mention which page(s) 
                        the information comes from. For example: "This information appears on page {page_numbers[0]}."
                        """
            
            # Special handling for images
            file_type_instruction = ""
            if document.file_type and document.file_type.startswith('image/'):
                file_type_instruction = """
                IMPORTANT: The content is from an image processed with OCR. 
                Focus on generating questions about the clearly visible content.
                Avoid questions about small details that might be misinterpreted by OCR.
                """
            
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
                {page_specific_instruction}
                {file_type_instruction}
                CRITICAL: ONLY generate questions based on the EXACT content provided above. Do NOT use any external knowledge or information not present in the provided content.
                If the content appears to be from specific pages of a document, restrict your questions STRICTLY to the information contained in those pages.
                
                Format each question EXACTLY as follows:
                Question: [Your question text here]
                Type: [mcq|fill|truefalse|oneline]
                A: [Option A text] (include options A through D only for mcq type)
                B: [Option B text]
                C: [Option C text]
                D: [Option D text]
                Answer: [For mcq: A, B, C, or D; for truefalse: True or False; for others: the correct answer]
                Explanation: [Brief explanation of why this is the correct answer]

                IMPORTANT: Make sure each question has all required fields and follows this format EXACTLY.
                For fill-in-blank questions, use [BLANK] to indicate where the answer should go.
                Ensure all questions are answerable from the provided content.
            """
            
            # Generate questions using OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """You are a professional quiz generator specialized in creating high-quality educational questions.
                    
For images: When working with image content, focus on creating questions about clearly visible elements and major themes rather than fine details that might be missed by OCR.
                    
For documents: Pay attention to page numbers if specified and only create questions from the requested pages.

Your questions must be:
1. Clear and unambiguous
2. Based ONLY on the provided content
3. Properly formatted according to their type
4. Include thorough explanations

For multiple choice questions, ensure all options are plausible but only one is clearly correct.
For fill-in-blank questions, use [BLANK] exactly once in each question.
For true/false questions, make statements that can be clearly verified as true or false.
For one-line questions, ensure the answer can be expressed in a single short phrase."""},
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
                    if "multiple choice" in type_value or "mcq" in type_value:
                        current['type'] = "mcq"
                    elif "fill" in type_value:
                        current['type'] = "fill"
                    elif "true" in type_value and "false" in type_value or "truefalse" in type_value:
                        current['type'] = "truefalse"
                    elif "one" in type_value and "line" in type_value or "oneline" in type_value:
                        current['type'] = "oneline"
                    else:
                        current['type'] = "mcq"  # Default to MCQ
                elif line.startswith("A:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["A"] = line.replace("A:", "").strip()
                elif line.startswith("B:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["B"] = line.replace("B:", "").strip()
                elif line.startswith("C:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["C"] = line.replace("C:", "").strip()
                elif line.startswith("D:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["D"] = line.replace("D:", "").strip()
                elif line.startswith("Answer:"):
                    current['correct_answer'] = line.replace("Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    current['explanation'] = line.replace("Explanation:", "").strip()
                elif current.get('explanation'):
                    # Append to existing explanation
                    current['explanation'] += " " + line
            
            # Add the last question if not empty
            if current.get("question"):
                questions.append(current)
            
            # Validate questions
            valid_questions = []
            for q in questions:
                if not q.get('question'):
                    logging.warning("Skipping question without question text")
                    continue
                    
                if q.get('type') == 'mcq' and (not q.get('options') or len(q.get('options', {})) < 4):
                    logging.warning(f"Skipping MCQ without enough options: {q.get('question')}")
                    # Try to fix by adding missing options if at least some are present
                    if q.get('options') and len(q.get('options', {})) >= 2:
                        options = q.get('options', {})
                        for opt in ["A", "B", "C", "D"]:
                            if opt not in options:
                                options[opt] = f"[Missing option {opt}]"
                        q['options'] = options
                    else:
                        continue
                    
                if not q.get('correct_answer'):
                    logging.warning(f"Skipping question without correct answer: {q.get('question')}")
                    continue
                    
                # For MCQs, ensure the correct answer is one of the options
                if q.get('type') == 'mcq':
                    correct_answer = q.get('correct_answer', '').strip()
                    if correct_answer not in q.get('options', {}):
                        # Try to match by first letter (e.g., "A" vs "A: Option text")
                        if correct_answer and len(correct_answer) == 1 and correct_answer in q.get('options', {}):
                            pass  # This is fine
                        else:
                            logging.warning(f"MCQ correct answer '{correct_answer}' not in options: {q.get('options')}")
                            # Try to fix by using the first option as the answer
                            if q.get('options'):
                                q['correct_answer'] = list(q.get('options').keys())[0]
                                logging.warning(f"Fixed by setting answer to {q['correct_answer']}")
                            else:
                                continue
                
                # Ensure explanation exists
                if not q.get('explanation'):
                    q['explanation'] = "No explanation provided."
                
                valid_questions.append(q)
            
            if len(valid_questions) < len(questions):
                logging.warning(f"Filtered out {len(questions) - len(valid_questions)} invalid questions")
            
            # If no valid questions were generated, create fallback questions
            if not valid_questions:
                logging.warning("No valid questions generated, creating fallback questions")
                return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
            
            return valid_questions
            
        except Exception as e:
            logging.error(f"Error generating questions: {e}")
            import traceback
            logging.error(traceback.format_exc())
            return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
    
    def _generate_fallback_questions(self, document, question_count, question_type, quiz_type):
        """Generate fallback questions when normal generation fails"""
        try:
            logging.info("Generating fallback questions")
            
            # Get file type and title
            file_type = document.file_type or "unknown"
            title = document.title or "document"
            
            # Create basic questions based on document metadata
            questions = []
            
            # For images, create image-specific questions
            if file_type.startswith('image/'):
                questions.append({
                    "question": f"What is shown in this image?",
                    "type": "oneline",
                    "options": {},
                    "correct_answer": "The image content is not clearly visible.",
                    "explanation": "This is a basic question about the image content."
                })
                
                questions.append({
                    "question": f"The image shows [BLANK].",
                    "type": "fill",
                    "options": {},
                    "correct_answer": "content",
                    "explanation": "This is a fill-in-the-blank question about the image."
                })
                
                questions.append({
                    "question": f"This image is related to the topic of the quiz.",
                    "type": "truefalse",
                    "options": {},
                    "correct_answer": "True",
                    "explanation": "The image was uploaded as part of this quiz content."
                })
                
                questions.append({
                    "question": "Which of the following best describes this image?",
                    "type": "mcq",
                    "options": {
                        "A": "A visual representation related to the quiz topic",
                        "B": "An unrelated stock photo",
                        "C": "A chart or graph",
                        "D": "A text document"
                    },
                    "correct_answer": "A",
                    "explanation": "The image was uploaded as part of this quiz content."
                })
            else:
                # For other document types
                questions.append({
                    "question": f"What is the main topic of this {file_type.split('/')[1] if '/' in file_type else 'document'}?",
                    "type": "oneline",
                    "options": {},
                    "correct_answer": title,
                    "explanation": "This question is based on the document title."
                })
                
                questions.append({
                    "question": f"This document contains information about [BLANK].",
                    "type": "fill",
                    "options": {},
                    "correct_answer": title,
                    "explanation": "This is a fill-in-the-blank question about the document content."
                })
                
                questions.append({
                    "question": f"This document is titled '{title}'.",
                    "type": "truefalse",
                    "options": {},
                    "correct_answer": "True",
                    "explanation": "This statement is based on the document's title."
                })
                
                questions.append({
                    "question": "Which of the following best describes this document?",
                    "type": "mcq",
                    "options": {
                        "A": f"A {file_type.split('/')[1] if '/' in file_type else 'document'} about {title}",
                        "B": "An unrelated reference material",
                        "C": "A blank template",
                        "D": "A different topic entirely"
                    },
                    "correct_answer": "A",
                    "explanation": "This is based on the document's title and type."
                })
            
            # Limit to requested number of questions
            return questions[:question_count]
            
        except Exception as e:
            logging.error(f"Error generating fallback questions: {e}")
            # Return a single generic question if all else fails
            return [{
                "question": "What is this document about?",
                "type": "oneline",
                "options": {},
                "correct_answer": "Please review the document to answer this question.",
                "explanation": "This is a generic question about the document content."
            }]


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
                
                # Special handling for images with OCR errors
                if document.file_type and document.file_type.startswith('image/'):
                    logging.info("Document is an image. Using special image handling.")
                    return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
                return []
            
            # Check if the document has page ranges in its metadata
            page_ranges_str = ""
            if hasattr(document, 'metadata') and document.metadata:
                page_ranges_str = document.metadata.get('page_ranges_str', '')
                
            # Log page ranges information
            if page_ranges_str:
                logging.info(f"Document has page ranges: {page_ranges_str}")
            else:
                logging.info("Document does not have specific page ranges")
                
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
                
            # Check if the text contains page markers
            page_specific_instruction = ""
            if "==================== PAGE " in extracted_text:
                # Extract page numbers from the text
                import re
                page_numbers = re.findall(r"==================== PAGE (\d+) ====================", extracted_text)
                if page_numbers:
                    page_list = ", ".join(page_numbers)
                    page_specific_instruction = f"""
                    IMPORTANT: This content is from page(s) {page_list} ONLY. 
                    You MUST ONLY generate questions based on content from these specific pages.
                    Do NOT use any information outside these pages.
                    All questions and answers MUST be verifiable from the provided content.
                    """
                    
                    # Add extra emphasis for strict filtering
                    if strict_page_filtering:
                        page_specific_instruction += f"""
                        CRITICAL: In your explanation for each question, explicitly mention which page(s) 
                        the information comes from. For example: "This information appears on page {page_numbers[0]}."
                        """
            
            # Special handling for images
            file_type_instruction = ""
            if document.file_type and document.file_type.startswith('image/'):
                file_type_instruction = """
                IMPORTANT: The content is from an image processed with OCR. 
                Focus on generating questions about the clearly visible content.
                Avoid questions about small details that might be misinterpreted by OCR.
                """
            
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
                {page_specific_instruction}
                {file_type_instruction}
                CRITICAL: ONLY generate questions based on the EXACT content provided above. Do NOT use any external knowledge or information not present in the provided content.
                If the content appears to be from specific pages of a document, restrict your questions STRICTLY to the information contained in those pages.
                
                Format each question EXACTLY as follows:
                Question: [Your question text here]
                Type: [mcq|fill|truefalse|oneline]
                A: [Option A text] (include options A through D only for mcq type)
                B: [Option B text]
                C: [Option C text]
                D: [Option D text]
                Answer: [For mcq: A, B, C, or D; for truefalse: True or False; for others: the correct answer]
                Explanation: [Brief explanation of why this is the correct answer]

                IMPORTANT: Make sure each question has all required fields and follows this format EXACTLY.
                For fill-in-blank questions, use [BLANK] to indicate where the answer should go.
                Ensure all questions are answerable from the provided content.
            """
            
            # Generate questions using OpenAI
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": """You are a professional quiz generator specialized in creating high-quality educational questions.
                    
For images: When working with image content, focus on creating questions about clearly visible elements and major themes rather than fine details that might be missed by OCR.
                    
For documents: Pay attention to page numbers if specified and only create questions from the requested pages.

Your questions must be:
1. Clear and unambiguous
2. Based ONLY on the provided content
3. Properly formatted according to their type
4. Include thorough explanations

For multiple choice questions, ensure all options are plausible but only one is clearly correct.
For fill-in-blank questions, use [BLANK] exactly once in each question.
For true/false questions, make statements that can be clearly verified as true or false.
For one-line questions, ensure the answer can be expressed in a single short phrase."""},
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
                    if "multiple choice" in type_value or "mcq" in type_value:
                        current['type'] = "mcq"
                    elif "fill" in type_value:
                        current['type'] = "fill"
                    elif "true" in type_value and "false" in type_value or "truefalse" in type_value:
                        current['type'] = "truefalse"
                    elif "one" in type_value and "line" in type_value or "oneline" in type_value:
                        current['type'] = "oneline"
                    else:
                        current['type'] = "mcq"  # Default to MCQ
                elif line.startswith("A:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["A"] = line.replace("A:", "").strip()
                elif line.startswith("B:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["B"] = line.replace("B:", "").strip()
                elif line.startswith("C:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["C"] = line.replace("C:", "").strip()
                elif line.startswith("D:"):
                    if 'options' not in current:
                        current['options'] = {}
                    current['options']["D"] = line.replace("D:", "").strip()
                elif line.startswith("Answer:"):
                    current['correct_answer'] = line.replace("Answer:", "").strip()
                elif line.startswith("Explanation:"):
                    current['explanation'] = line.replace("Explanation:", "").strip()
                elif current.get('explanation'):
                    # Append to existing explanation
                    current['explanation'] += " " + line
            
            # Add the last question if not empty
            if current.get("question"):
                questions.append(current)
            
            # Validate questions
            valid_questions = []
            for q in questions:
                if not q.get('question'):
                    logging.warning("Skipping question without question text")
                    continue
                    
                if q.get('type') == 'mcq' and (not q.get('options') or len(q.get('options', {})) < 4):
                    logging.warning(f"Skipping MCQ without enough options: {q.get('question')}")
                    # Try to fix by adding missing options if at least some are present
                    if q.get('options') and len(q.get('options', {})) >= 2:
                        options = q.get('options', {})
                        for opt in ["A", "B", "C", "D"]:
                            if opt not in options:
                                options[opt] = f"[Missing option {opt}]"
                        q['options'] = options
                    else:
                        continue
                    
                if not q.get('correct_answer'):
                    logging.warning(f"Skipping question without correct answer: {q.get('question')}")
                    continue
                    
                # For MCQs, ensure the correct answer is one of the options
                if q.get('type') == 'mcq':
                    correct_answer = q.get('correct_answer', '').strip()
                    if correct_answer not in q.get('options', {}):
                        # Try to match by first letter (e.g., "A" vs "A: Option text")
                        if correct_answer and len(correct_answer) == 1 and correct_answer in q.get('options', {}):
                            pass  # This is fine
                        else:
                            logging.warning(f"MCQ correct answer '{correct_answer}' not in options: {q.get('options')}")
                            # Try to fix by using the first option as the answer
                            if q.get('options'):
                                q['correct_answer'] = list(q.get('options').keys())[0]
                                logging.warning(f"Fixed by setting answer to {q['correct_answer']}")
                            else:
                                continue
                
                # Ensure explanation exists
                if not q.get('explanation'):
                    q['explanation'] = "No explanation provided."
                
                valid_questions.append(q)
            
            if len(valid_questions) < len(questions):
                logging.warning(f"Filtered out {len(questions) - len(valid_questions)} invalid questions")
            
            # If no valid questions were generated, create fallback questions
            if not valid_questions:
                logging.warning("No valid questions generated, creating fallback questions")
                return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
            
            return valid_questions
            
        except Exception as e:
            logging.error(f"Error generating questions: {e}")
            import traceback
            logging.error(traceback.format_exc())
            return self._generate_fallback_questions(document, question_count, question_type, quiz_type)
    
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
                model="gpt-4",
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
