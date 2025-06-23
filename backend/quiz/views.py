import json
from rest_framework import status, permissions, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Quiz, Question
from .serializers import QuizSerializer, QuizCreateSerializer, QuizUpdateSerializer
import os
from datetime import datetime
from accounts.permissions import IsTeacherOrAdmin, IsOwnerOrAdminOrReadOnly
from openai import OpenAI
import PyPDF2
import io
from rest_framework.decorators import action
import random
import fitz  # PyMuPDF for PDF text extraction


class QuizFileUploadView(APIView):
    """
    API endpoint for managing files related to a quiz:
    - POST: Upload a new file for a quiz and generate questions from its content
    """
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]

    # Maximum file size (60MB)
    MAX_FILE_SIZE = 60 * 1024 * 1024  # 60MB in bytes

    def get_quiz(self, quiz_id):
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        questions = Question.objects.filter(quiz_id=quiz.quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz, questions

    def extract_text_from_pdf(self, file_path):
        try:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            return text.strip()
        except Exception as e:
            print(f"PDF extraction failed: {e}")
            return ""

    def post(self, request, quiz_id, format=None):
        quiz, _ = self.get_quiz(quiz_id)

        if 'file' not in request.FILES:
            return Response({"error": "No file was provided"}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES['file']
        if uploaded_file.size > self.MAX_FILE_SIZE:
            return Response({
                "error": f"File size exceeds {self.MAX_FILE_SIZE // (1024*1024)}MB",
                "message": f"The uploaded file is too large. Maximum file size allowed is {self.MAX_FILE_SIZE // (1024*1024)}MB.",
                "title": "File Size Limit Exceeded"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate a unique ID for the file
        import uuid
        from django.utils.text import slugify
        
        doc_uuid = str(uuid.uuid4())
        filename = uploaded_file.name
        ext = os.path.splitext(filename)[1].lower()
        new_filename = f"{slugify(doc_uuid)}{ext}"
        
        # Create a virtual file path (not saved to disk)
        db_file_path = f"vector_documents/{new_filename}"
        
        # Import document models and utils
        from documents.models import Document, DocumentVector  
        from documents.utils import extract_text_from_file
        from config.vector_db import VectorDB
        import pickle
        
        # Extract text from the file using our centralized utility
        extracted_text = extract_text_from_file(uploaded_file)
        
        # Create document in the database
        document = Document(
            title=filename,
            description=f"Uploaded for quiz {quiz_id}",
            extracted_text=extracted_text,
            user=request.user,
            is_processed=True,
            file_size=uploaded_file.size,
            storage_type='vector_db',
            storage_path=db_file_path,
            file_type=uploaded_file.content_type,
            quiz=quiz  # Associate with the quiz directly
        )
        document.save()
        
        # Store in vector database
        try:
            metadata = {
                'title': filename,
                'description': f"Uploaded for quiz {quiz_id}",
                'original_filename': filename,
                'file_size': uploaded_file.size,
                'content_type': uploaded_file.content_type,
                'user_id': str(request.user.id),
                'quiz_id': quiz_id,
            }
            
            # Initialize vector database
            vector_db = VectorDB()
            
            # Generate embedding
            embedding = vector_db.generate_embedding(extracted_text)
            
            if embedding:
                # Store in vector database
                vector_db.upsert_file(doc_uuid, db_file_path, extracted_text, metadata)
                
                # Create DocumentVector record
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
            logger.error(f"Error storing in vector database: {e}")
        
        # Update quiz uploadedfiles field for backward compatibility
        if not isinstance(quiz.uploadedfiles, list):
            quiz.uploadedfiles = []

        file_info = {
            'name': filename,
            'path': db_file_path,
            'document_id': document.id,
            'vector_uuid': doc_uuid,
            'file_size': uploaded_file.size,
            'file_type': uploaded_file.content_type
        }
        quiz.uploadedfiles.append(file_info)
        quiz.save()

        # Text extraction is already done, use extracted_text variable
        file_text = extracted_text
        if not file_text:
            return Response({"error": "Failed to read file content for question generation."}, status=500)

        try:
            question_type = quiz.question_type.lower()
            num_questions = quiz.no_of_questions
            quiz_type = quiz.quiz_type.lower()

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

            base_prompt = f"""
                You are a professional quiz generator. Based on the content below, generate {num_questions} questions for a {quiz_type}-level quiz.

                Content:
                {file_text[:3000]}

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

            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4",
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

            # === JSON Parsing Section ===
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
                print("Warning: Failed to parse questions from AI response. Using fallback questions.")
                
                # Create simple default questions based on file content
                default_questions = []
                
                # Extract some text to use for questions
                content_lines = file_text.split('\n')
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

            # Make question type validation optional
            # Only check for required types if question_type is 'mixed'
            if question_type == 'mixed':
                included_types = {q['type'].lower() for q in questions if 'type' in q}
                # Make the check more flexible by not requiring all types
                if not included_types:
                    raise Exception("No question types specified in generated questions")
                
                # Just log missing types instead of raising an error
                required_types = {'oneline', 'fill', 'truefalse', 'mcq'}
                missing_types = required_types - included_types
                if missing_types:
                    print(f"Note: Some question types are missing: {', '.join(missing_types)}")
            
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

            # Save as grouped question with JSON body
            Question.objects.create(
                quiz=quiz,
                question=json.dumps(questions, indent=2),
                question_type=question_type,
                difficulty=quiz_type,
                correct_answer=None,
                explanation=None,
                options=None,
                created_by=request.user.email,
                last_modified_by=request.user.email
            )

            return Response({
                "message": "File uploaded and questions generated successfully.",
                "file": file_info,
                "file_size": uploaded_file.size,
                "file_type": uploaded_file.content_type,
                "quiz_id": quiz.quiz_id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Question generation failed: {str(e)}"}, status=500)
        
    def get(self, request, quiz_id, file_id=None, format=None):
        """
        List all files for a quiz or get a specific file
        """
        quiz = self.get_quiz(quiz_id)
        
        if file_id:
            # Return specific file
            if not quiz.uploadedfiles:
                return Response(
                    {"error": "No files found for this quiz"},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            file_info = next((f for f in quiz.uploadedfiles if f.get('id') == file_id), None)
            if not file_info:
                return Response(
                    {"error": "File not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(file_info)
        else:
            # Return all files
            return Response({
                "quiz_id": quiz.quiz_id,
                "files": quiz.uploadedfiles or []
            })
    
    def delete(self, request, quiz_id, file_id, format=None):
        """
        Delete a file from a quiz and remove it from the upload folder
        """
        quiz = self.get_quiz(quiz_id)
        
        if not quiz.uploadedfiles:
            return Response(
                {"error": "No files found for this quiz"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Find the file to delete
        file_to_delete = None
        updated_files = []
        
        for file_info in quiz.uploadedfiles:
            if str(file_info.get('id')) == str(file_id):
                file_to_delete = file_info
            else:
                updated_files.append(file_info)
        
        if not file_to_delete:
            return Response(
                {"error": "File not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete the file from the filesystem
        try:
            # Get the filename from the path (format: upload/filename.pdf)
            filename = file_to_delete['path'].split('/')[-1]  # Get the filename
            file_path = os.path.join(settings.BASE_DIR, 'backend', 'upload', filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                    
        except Exception as e:
            return Response(
                {"error": f"Error deleting file: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update the quiz with the remaining files
        quiz.uploadedfiles = updated_files
        quiz.save()
        
        return Response({
            "message": "File deleted successfully",
            "deleted_file": file_to_delete
        }, status=status.HTTP_200_OK)


class QuizListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating quizzes"""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    # Maximum number of questions allowed
    MAX_QUESTIONS = 35

    def get_queryset(self):
        """Return quizzes created by the user or all quizzes for admins"""
        queryset = Quiz.objects.filter(is_deleted=False)
        if not self.request.user.is_admin:
            queryset = queryset.filter(creator=self.request.user)
        
        # Add department filter if provided
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
            
        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuizCreateSerializer
        return QuizSerializer

    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
        
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Validate number of questions - handle both string and integer inputs
        try:
            no_of_questions = int(data.get('no_of_questions', 0))
            if no_of_questions > self.MAX_QUESTIONS:
                return Response({
                    "error": f"Number of questions cannot exceed {self.MAX_QUESTIONS}",
                    "message": f"You've requested {no_of_questions} questions, but the maximum allowed is {self.MAX_QUESTIONS}. Please reduce the number of questions.",
                    "title": "Question Limit Exceeded"
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            # If the value can't be converted to int, let the serializer handle it
            pass
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
            quiz = Quiz.objects.get(pk=serializer.data['quiz_id'])

            response_data = serializer.data
            response_data['creator'] = str(quiz.creator)
            response_data['created_by'] = str(quiz.created_by)
            response_data['last_modified_by'] = str(quiz.last_modified_by)
            response_data['message'] = "Quiz created successfully"
            
            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        """Set the creator and created_by fields"""
        # Make sure the user is set as the creator
        if self.request.user.is_authenticated:
            serializer.save(
                creator=self.request.user.get_full_name() or self.request.user.username,
                created_by=self.request.user.email,
                last_modified_by=self.request.user.email
            )
        else:
            serializer.save()


class QuizRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating, and deleting a quiz"""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    lookup_field = 'quiz_id'
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    
    def get_queryset(self):
        queryset = Quiz.objects.filter(is_deleted=False)
        if not self.request.user.is_admin:
            queryset = queryset.filter(creator=self.request.user)
        return queryset
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return QuizUpdateSerializer
        return QuizSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to include questions in the response"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Get questions for this quiz
        questions = Question.objects.filter(quiz=instance)
        
        # Process the questions
        processed_questions = []
        
        for question in questions:
            if question.question_type == 'mixed' or question.question_type == 'true_false' or question.question_type == 'mcq':
                try:
                    # Try to parse the JSON for mixed question types
                    parsed_json = json.loads(question.question)
                    
                    # Check if the parsed result is a list or a single object
                    if isinstance(parsed_json, list):
                        # Add the parsed questions to the processed_questions list
                        # Include the full quiz data with the questions
                        data['questions'] = parsed_json
                        return Response(data)
                    else:
                        # If it's a single object, wrap it in a list
                        data['questions'] = [parsed_json]
                        return Response(data)
                except (json.JSONDecodeError, TypeError):
                    # If parsing fails, add the raw question
                    question_data = {
                        "question_id": question.question_id,
                        "question_type": question.question_type,
                        "question": question.question
                    }
                    processed_questions.append(question_data)
            else:
                # For non-mixed questions, include all fields
                question_data = {
                    "question_id": question.question_id,
                    "question_type": question.question_type,
                    "question": question.question,
                    "options": question.options,
                    "correct_answer": question.correct_answer,
                    "explanation": question.explanation
                }
                processed_questions.append(question_data)
        
        # Add the processed questions to the response
        if not data.get('questions'):
            data['questions'] = processed_questions
        
        return Response(data)
        
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()

        # Handle is_published and published_at
        if data.get('is_published') and not instance.published_at:
            data['published_at'] = timezone.now()

        # Set last_modified_by to current user
        data['last_modified_by'] = request.user.id

        # Get serializer with context
        serializer = self.get_serializer(instance, data=data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_update(serializer)
            updated_instance = self.get_queryset().get(pk=instance.pk)
            return Response(QuizSerializer(updated_instance).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_update(self, serializer):
        """Update the quiz instance"""
        serializer.save()
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: set is_deleted=True for the quiz instead of deleting from DB.
        Return a success message in the response.
        """
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({'message': 'Quiz deleted successfully'}, status=status.HTTP_200_OK)


class QuizQuestionGenerateView(APIView):
    """
    API endpoint to generate questions for a quiz using OpenAI and LangGraph
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, quiz_id):
        import openai
        import os
        try:
            from langgraph.graph import Graph
        except ImportError:
            return Response({"error": "LangGraph not installed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Set OpenAI API key (for openai>=1.0.0, pass to client)
        api_key = os.environ.get('OPENAI_API_KEY')
        print("API Key: ", api_key)
        if not api_key:
            return Response({"error": "OpenAI API key not set in environment."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        client = openai.OpenAI(api_key=api_key)
        print("Client: ", client)

        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        if not quiz.uploadedfiles or len(quiz.uploadedfiles) == 0:
            return Response({"error": "No uploaded files found for this quiz."}, status=status.HTTP_404_NOT_FOUND)

        # For simplicity, use the first uploaded file
        file_info = quiz.uploadedfiles[0]
        print("File Info: ", file_info)
        file_path = file_info.get('path')
        print("File Path: ", file_path)
        if not file_path:
            return Response({"error": "File path not found in uploaded file info."}, status=status.HTTP_404_NOT_FOUND)

        # Try to read the file content (always look in backend/upload/)
        abs_file_path = os.path.join(settings.BASE_DIR, 'backend', file_path)
        print("Absolute File Path: ", abs_file_path)
        if not os.path.exists(abs_file_path):
            return Response({"error": f"File does not exist on server: {abs_file_path}"}, status=status.HTTP_404_NOT_FOUND)
        import os
        file_ext = os.path.splitext(abs_file_path)[1].lower()
        print("File Extension: ", file_ext)
        try:
            if file_ext == '.pdf':
                from PyPDF2 import PdfReader
                pdf = PdfReader(abs_file_path)
                print("PDF: ", pdf)
                file_content = "\n".join(page.extract_text() or '' for page in pdf.pages)
                print("if File Content: ", file_content)
            elif file_ext == '.txt':
                with open(abs_file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
                print("else File Content: ", file_content)
            else:
                return Response({"error": f"Unsupported file type: {file_ext}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Could not read file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Use OpenAI to generate questions
        try:
            prompt = f"Generate 5 quiz questions based on the following content:\n{file_content}"
            print("Prompt: ", prompt)
            client = openai.OpenAI()
            print("Client: ", client)
            print("success")
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "system", "content": "You are a quiz generator."},
                          {"role": "user", "content": prompt}]
            )
            print("Response: ", response)
            questions = response.choices[0].message.content
            print("Questions: ", questions)
        except Exception as e:
            return Response({"error": f"OpenAI API error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "quiz_id": quiz.quiz_id,
            "questions": questions
        })


class QuizPublishView(APIView):
    """
    API endpoint to publish/unpublish a quiz and store generated questions
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def post(self, request, quiz_id):
        try:
            quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
            self.check_object_permissions(request, quiz)
            
            # Toggle publish status
            quiz.is_published = not quiz.is_published
            
            if quiz.is_published:
                # Set published date if publishing
                if not quiz.published_at:
                    quiz.published_at = timezone.now()
                
                # Generate questions if they don't exist
                if not quiz.quiz_questions.exists():  # Check if questions already exist
                    try:
                        # Get settings from quiz object
                        question_type = quiz.question_type.lower() if quiz.question_type else 'multiple_choice'
                        num_questions = quiz.no_of_questions if quiz.no_of_questions else 5
                        quiz_type = quiz.quiz_type.lower() if quiz.quiz_type else 'medium'
                        
                        # Initialize OpenAI client
                        client = OpenAI(api_key=settings.OPENAI_API_KEY)
                        
                        # Prepare the prompt based on quiz type and question type
                        base_prompt = f"""Generate {num_questions} {question_type} questions for a {quiz_type} level quiz.
                        Each question should be in the following format:
                        
                        Question: [Your question here]
                        A: [Option A]
                        B: [Option B]
                        C: [Option C]
                        D: [Option D]
                        Answer: [Correct option letter]
                        Explanation: [Brief explanation of the answer]
                        
                        """
                        
                        if quiz.description:
                            base_prompt += f"Topic: {quiz.description}\n"
                        
                        # Generate questions using OpenAI
                        response = client.chat.completions.create(
                            model="gpt-4",
                            messages=[
                                {"role": "system", "content": "You are a professional quiz question generator. Generate clear, well-structured questions with exactly 4 options and a clear explanation."},
                                {"role": "user", "content": base_prompt}
                            ],
                            temperature=0.7,
                            max_tokens=2000
                        )
                        
                        # Process the generated questions
                        generated_text = response.choices[0].message.content
                        
                        # Parse questions
                        questions = []
                        current_question = {}
                        
                        for line in generated_text.split('\n'):
                            line = line.strip()
                            if not line:
                                if current_question and 'text' in current_question:
                                    questions.append(current_question)
                                    current_question = {}
                                continue
                            
                            if line.startswith('Question:'):
                                if current_question and 'text' in current_question:
                                    questions.append(current_question)
                                current_question = {
                                    'text': line.replace('Question:', '').strip(),
                                    'options': {},
                                    'type': question_type
                                }
                            elif line.startswith(('A:', 'B:', 'C:', 'D:')):
                                option = line[0]
                                current_question['options'][option] = line[2:].strip()
                            elif line.startswith('Answer:'):
                                current_question['correct_answer'] = line.replace('Answer:', '').strip()
                            elif line.startswith('Explanation:'):
                                current_question['explanation'] = line.replace('Explanation:', '').strip()
                        
                        if current_question and 'text' in current_question:
                            questions.append(current_question)
                        
                        # Validate questions
                        valid_questions = []
                        for question in questions:
                            if all(key in question for key in ['text', 'options', 'correct_answer', 'explanation']):
                                valid_questions.append(question)
                        
                        if not valid_questions:
                            raise Exception("No valid questions were generated")
                        
                        # Store questions in the Question model
                        stored_questions = []
                        for question_data in valid_questions:
                            # Create the question text with all details
                            question_text = f"Question: {question_data['text']}\n"
                            question_text += f"Options:\n"
                            for option, text in question_data['options'].items():
                                question_text += f"{option}: {text}\n"
                            question_text += f"Correct Answer: {question_data['correct_answer']}\n"
                            question_text += f"Explanation: {question_data['explanation']}"
                            
                            # Create and save the question
                            question = Question.objects.create(
                                quiz=quiz,
                                question=question_text,
                                created_by=request.user.email,
                                last_modified_by=request.user.email
                            )
                            stored_questions.append({
                                'question_id': question.question_id,
                                'question': question.question
                            })
                            
                    except Exception as e:
                        # If question generation fails, unpublish the quiz
                        quiz.is_published = False
                        quiz.published_at = None
                        quiz.save()
                        return Response({
                            'status': 'error',
                            'message': f'Failed to generate questions: {str(e)}'
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                # Clear published date if unpublishing
                quiz.published_at = None
            
            # Ensure quiz_date is timezone-aware
            if quiz.quiz_date and timezone.is_naive(quiz.quiz_date):
                quiz.quiz_date = timezone.make_aware(quiz.quiz_date)
            
            quiz.save()
            
            # Get all questions for the quiz
            questions = quiz.quiz_questions.all().values('question_id', 'question')
            
            return Response({
                'status': 'success',
                'quiz_id': quiz.quiz_id,
                'is_published': quiz.is_published,
                'published_at': quiz.published_at,
                'questions_count': quiz.quiz_questions.count(),
                'questions': list(questions)  # Include the questions in the response
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizQuestionGenerateFromPromptView(APIView):
    """
    API endpoint to generate questions for a quiz using a prompt and uploaded file
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_quiz(self, quiz_id):
        """Helper method to get quiz and check permissions"""
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz

    def post(self, request, quiz_id, format=None):
        """
        Generate questions based on a prompt and uploaded file
        """
        quiz = self.get_quiz(quiz_id)
        
        # Validate required fields
        if 'file' not in request.FILES:
            return Response(
                {"error": "No file was provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if 'prompt' not in request.data:
            return Response(
                {"error": "No prompt was provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']
        prompt = request.data['prompt']
        
        # Validate file size (10MB limit)
        max_size = 10 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {"error": "File size exceeds the maximum allowed size of 10MB"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(settings.BASE_DIR, 'backend', 'upload')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Keep the original filename
        filename = uploaded_file.name
        
        # Create the relative path for database (upload/filename.pdf)
        db_file_path = f"upload/{filename}"
        
        # Create the full absolute path for saving the file
        abs_upload_dir = os.path.join(settings.BASE_DIR, 'backend', 'upload')
        abs_file_path = os.path.join(abs_upload_dir, filename)
        
        # Save the file
        with open(abs_file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Initialize uploadedfiles as a list if it's None
        if quiz.uploadedfiles is None:
            quiz.uploadedfiles = []

        # Store file info in the database
        file_info = {
            'name': filename,
            'path': db_file_path,
            'file_size': uploaded_file.size,
            'file_type': uploaded_file.content_type
        }

        quiz.uploadedfiles.append(file_info)
        quiz.save()

        try:
            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Read the file content
            with open(abs_file_path, 'r', encoding='utf-8') as file:
                file_content = file.read()

            # Prepare the prompt for question generation
            system_prompt = f"""
            Generate quiz questions based on the following content and prompt:
            
            Content:
            {file_content}
            
            Prompt:
            {prompt}
            
            Return the questions as a JSON array where each question is an object with the following structure:
            {{
                "question_type": "multiple_choice",
                "question_text": "The question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "The correct option (exact text)",
                "explanation": "Explanation of why this is the correct answer"
            }}
            """
            print("System Prompt: ", system_prompt)
            print("testinggg")
            print("client_one: ", client)
            # Generate questions using OpenAI
            response = client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate questions based on the provided content and prompt."}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the generated questions
            generated_questions = json.loads(response.choices[0].message.content)
            print("Generated Questions: ", generated_questions)

            return Response({
                "message": "Questions generated successfully",
                "file": file_info,
                "file_size": uploaded_file.size,
                "file_type": uploaded_file.content_type,
                "quiz_id": quiz.quiz_id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Error generating questions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizQuestionGenerateFromExistingFileView(APIView):
    """
    API endpoint to generate questions from code test files
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    parser_classes = (JSONParser,)

    # Question type specific prompts with difficulty levels
    QUESTION_TYPE_PROMPTS = {
        'multiple_choice': {
            'easy': """
                Generate easy multiple choice questions about code that:
                1. Test basic understanding of concepts
                2. Have clear and unambiguous answers
                3. Include one correct answer and three plausible distractors
                4. Are suitable for beginners
                """,
            'medium': """
                Generate medium difficulty multiple choice questions about code that:
                1. Test intermediate understanding of concepts
                2. May include some complex scenarios
                3. Have one correct answer and three plausible distractors
                4. Require some analytical thinking
                """,
            'hard': """
                Generate hard multiple choice questions about code that:
                1. Test advanced understanding of concepts
                2. Include complex scenarios and edge cases
                3. Have one correct answer and three plausible distractors
                4. Require deep analytical thinking
                """
        },
        'fill_in_blank': {
            'easy': """
                Generate easy fill-in-the-blank questions about code that:
                1. Test basic syntax and common patterns
                2. Have clear and unambiguous answers
                3. Include [BLANK] in appropriate places
                4. Are suitable for beginners
                """,
            'medium': """
                Generate medium difficulty fill-in-the-blank questions about code that:
                1. Test intermediate syntax and patterns
                2. May include some complex scenarios
                3. Have clear answers with some flexibility
                4. Require some analytical thinking
                """,
            'hard': """
                Generate hard fill-in-the-blank questions about code that:
                1. Test advanced syntax and patterns
                2. Include complex scenarios and edge cases
                3. May have multiple valid answers
                4. Require deep analytical thinking
                """
        },
        'true_false': {
            'easy': """
                Generate easy true/false questions about code that:
                1. Test basic understanding of concepts
                2. Have clear and unambiguous answers
                3. Are suitable for beginners
                4. Focus on fundamental concepts
                """,
            'medium': """
                Generate medium difficulty true/false questions about code that:
                1. Test intermediate understanding of concepts
                2. May include some complex scenarios
                3. Require some analytical thinking
                4. Focus on practical applications
                """,
            'hard': """
                Generate hard true/false questions about code that:
                1. Test advanced understanding of concepts
                2. Include complex scenarios and edge cases
                3. Require deep analytical thinking
                4. Focus on nuanced technical details
                """
        },
        'one_line': {
            'easy': """
                Generate easy one-line answer questions about code that:
                1. Test basic understanding of concepts
                2. Have clear and concise answers
                3. Are suitable for beginners
                4. Focus on fundamental concepts
                """,
            'medium': """
                Generate medium difficulty one-line answer questions about code that:
                1. Test intermediate understanding of concepts
                2. May include some complex scenarios
                3. Require some analytical thinking
                4. Focus on practical applications
                """,
            'hard': """
                Generate hard one-line answer questions about code that:
                1. Test advanced understanding of concepts
                2. Include complex scenarios and edge cases
                3. Require deep analytical thinking
                4. Focus on nuanced technical details
                """
        },
        'mixed': {
            'easy': """
                Generate a mix of easy questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line questions
                2. Test basic understanding of concepts
                3. Have clear and unambiguous answers
                4. Are suitable for beginners
                5. Distribute questions evenly among different types
                """,
            'medium': """
                Generate a mix of medium difficulty questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line questions
                2. Test intermediate understanding of concepts
                3. May include some complex scenarios
                4. Require some analytical thinking
                5. Distribute questions evenly among different types
                """,
            'hard': """
                Generate a mix of hard questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line questions
                2. Test advanced understanding of concepts
                3. Include complex scenarios and edge cases
                4. Require deep analytical thinking
                5. Distribute questions evenly among different types
                """
        }
    }

    def get_quiz(self, quiz_id):
        """Helper method to get quiz and check permissions"""
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz

    def get_file_content(self, file_info):
        """Get content from file based on file type"""
        file_path = os.path.join(settings.BASE_DIR, 'backend', file_info['path'])
        
        if not os.path.exists(file_path):
            raise Exception("File not found on server")
            
        # Use the centralized text extraction utility
        from documents.utils import extract_text_from_file
        
        # Open the file
        with open(file_path, 'rb') as file:
            # Create a file-like object that mimics Django's UploadedFile
            from django.core.files.uploadedfile import InMemoryUploadedFile
            import io
            
            # Read the file content
            file_content = file.read()
            file_name = os.path.basename(file_path)
            file_size = len(file_content)
            
            # Create a file-like object
            file_obj = InMemoryUploadedFile(
                io.BytesIO(file_content),
                'file',
                file_name,
                'application/octet-stream',
                file_size,
                None
            )
            
            # Use the centralized utility
            return extract_text_from_file(file_obj)

    def generate_questions_from_content(self, content, question_type, quiz_type, num_questions):
        try:
            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Define format based on question type
            format_examples = {
                'multiple_choice': {
                    "question_id": 1,
                    "question": "What is the purpose of the CustomPagination class?",
                    "A": "To define the structure of API responses",
                    "B": "To customize the pagination behavior for quizzes",
                    "C": "To handle user authentication in API requests",
                    "D": "To validate input data for quiz creation",
                    "answer": "B",
                    "explanation": "The CustomPagination class is created to customize the pagination behavior specifically for quizzes, setting the page size and other parameters for paginated responses."
                },
                'fill_in_blank': {
                    "question_id": 1,
                    "question": "In Django REST Framework, to serialize multiple objects you use: serializer = QuizSerializer([BLANK])",
                    "correct_answer": "page, many=True",
                    "explanation": "The correct answer is 'page, many=True' because when serializing multiple objects in DRF, we need to specify 'many=True' to indicate we're serializing a collection of objects."
                },
                'true_false': {
                    "question_id": 1,
                    "question": "The CustomPagination class is used to handle user authentication in Django REST Framework.",
                    "answer": "False",
                    "explanation": "False. The CustomPagination class is used to customize how quiz results are paginated, not for authentication. It controls the number of items per page and maximum page size."
                },
                'one_line': {
                    "question_id": 1,
                    "question": "What is the main purpose of Django REST Framework's serializers?",
                    "correct_answer": "To convert complex data types to Python data types that can be easily rendered into JSON",
                    "explanation": "Serializers in DRF are used to convert complex data types (like Django models) into Python data types that can be easily converted to JSON, and vice versa."
                }
            }
            
            # Define all possible question types and difficulties
            all_question_types = ['multiple_choice', 'fill_in_blank', 'true_false', 'one_line']
            all_difficulties = ['easy', 'medium', 'hard']
            
            # Initialize list to store all questions
            all_questions = []
            max_retries = 3  # Maximum number of retries for generating questions
            
            def generate_single_question(q_type, difficulty):
                """Helper function to generate a single question with retries"""
                for attempt in range(max_retries):
                    try:
                        prompt = f"""Generate 1 {q_type} question based on the following code content.
                        
                        Code Content:
                        {content[:2000]}
                        
                        Question Type: {q_type}
                        Number of Questions: 1
                        Quiz Difficulty: {difficulty}
                        
                        Guidelines:
                        {self.QUESTION_TYPE_PROMPTS[q_type][difficulty]}
                        
                        Use this format:
                        {json.dumps(format_examples[q_type], indent=2)}
                        
                        Your response must be a valid JSON object with a 'questions' array containing exactly 1 question.
                        The question should be at {difficulty} difficulty level.
                        """
                        
                        response = client.chat.completions.create(
                            model="gpt-4",
                            messages=[
                                {"role": "system", "content": f"You are a professional quiz question generator. Generate exactly 1 {q_type} question at {difficulty} difficulty level."},
                                {"role": "user", "content": prompt}
                            ],
                            temperature=0.7,
                            max_tokens=2000
                        )
                        
                        try:
                            response_data = json.loads(response.choices[0].message.content.strip())
                            questions = response_data.get('questions', []) if isinstance(response_data, dict) else response_data
                            
                            if not questions:
                                continue
                                
                            # Add difficulty level and question type to each question
                            for question in questions:
                                question['difficulty'] = difficulty
                                question['question_type'] = q_type
                            
                            return questions
                        except json.JSONDecodeError:
                            import re
                            json_match = re.search(r'\[.*\]', response.choices[0].message.content.strip(), re.DOTALL)
                            if json_match:
                                try:
                                    questions = json.loads(json_match.group())
                                    if not questions:
                                        continue
                                    # Add difficulty level and question type to each question
                                    for question in questions:
                                        question['difficulty'] = difficulty
                                        question['question_type'] = q_type
                                    return questions
                                except json.JSONDecodeError:
                                    cleaned_text = re.sub(r'[\n\r\t]', '', json_match.group())
                                    questions = json.loads(cleaned_text)
                                    if not questions:
                                        continue
                                    # Add difficulty level and question type to each question
                                    for question in questions:
                                        question['difficulty'] = difficulty
                                        question['question_type'] = q_type
                                    return questions
                    except Exception as e:
                        if attempt == max_retries - 1:
                            raise e
                        continue
                return None
            
            # If quiz type is mixed, we need to distribute questions across difficulties
            if quiz_type == 'mixed':
                # Calculate base number of questions per difficulty
                base_questions = num_questions // 3
                remaining = num_questions % 3
                
                # Create a list of difficulties with their target counts
                difficulty_counts = {
                    'easy': base_questions,
                    'medium': base_questions,
                    'hard': base_questions
                }
                
                # Distribute remaining questions
                for i in range(remaining):
                    difficulty = all_difficulties[i]
                    difficulty_counts[difficulty] += 1
                
                # Generate questions for each difficulty level
                for difficulty, count in difficulty_counts.items():
                    questions_generated = 0
                    while questions_generated < count:
                        # If question_type is specified, use that type for all questions
                        q_type = question_type if question_type != 'mixed' else random.choice(all_question_types)
                        questions = generate_single_question(q_type, difficulty)
                        if questions:
                            all_questions.extend(questions)
                            questions_generated += len(questions)
            else:
                # If quiz type is not mixed, generate all questions at the specified difficulty
                while len(all_questions) < num_questions:
                    # If question_type is specified, use that type for all questions
                    q_type = question_type if question_type != 'mixed' else random.choice(all_question_types)
                    questions = generate_single_question(q_type, quiz_type)
                    if questions:
                        all_questions.extend(questions)
            
            # Shuffle the questions to mix difficulty levels
            random.shuffle(all_questions)
            
            # Ensure we have exactly the requested number of questions
            if len(all_questions) > num_questions:
                all_questions = all_questions[:num_questions]
            
            # Validate questions
            validated_questions = []
            
            for question in all_questions:
                if not question or not isinstance(question, dict):
                    continue

                # Common fields for all types
                if 'question_id' not in question or 'question' not in question:
                    continue

                # Get the actual question type for this question
                actual_question_type = question.get('question_type', question_type)

                # Type-specific validation
                if actual_question_type == 'multiple_choice':
                    required_fields = ['A', 'B', 'C', 'D', 'answer']
                    if not all(field in question for field in required_fields):
                        continue
                    if question['answer'] not in ['A', 'B', 'C', 'D']:
                        continue

                elif actual_question_type == 'fill_in_blank':
                    if '[BLANK]' not in question['question']:
                        continue
                    if 'correct_answer' not in question:
                        continue

                elif actual_question_type == 'true_false':
                    if 'answer' not in question:
                        continue
                    answer = str(question['answer']).strip().capitalize()
                    if answer not in ['True', 'False']:
                        continue
                    question['answer'] = answer

                elif actual_question_type == 'one_line':
                    if 'correct_answer' not in question:
                        continue

                # All types need explanation
                if 'explanation' not in question:
                    continue

                # Validate question_id is numeric
                if not isinstance(question['question_id'], int):
                    question['question_id'] = len(validated_questions) + 1

                validated_questions.append(question)

            if not validated_questions:
                raise ValueError("No valid questions found in response")

            # If we don't have enough validated questions, try generating more
            while len(validated_questions) < num_questions:
                # Try generating one more question
                if quiz_type == 'mixed':
                    # Count current questions by difficulty
                    difficulty_counts = {'easy': 0, 'medium': 0, 'hard': 0}
                    for q in validated_questions:
                        difficulty_counts[q['difficulty']] += 1
                    
                    # Find the difficulty with the least questions
                    min_difficulty = min(difficulty_counts.items(), key=lambda x: x[1])[0]
                    difficulty = min_difficulty
                else:
                    difficulty = quiz_type
                
                # If question_type is specified, use that type for all questions
                q_type = question_type if question_type != 'mixed' else random.choice(all_question_types)
                questions = generate_single_question(q_type, difficulty)
                
                if questions:
                    for question in questions:
                        # Validate the new question
                        if not question or not isinstance(question, dict):
                            continue
                        if 'question_id' not in question or 'question' not in question:
                            continue
                        
                        actual_question_type = question.get('question_type', question_type)
                        
                        # Type-specific validation
                        if actual_question_type == 'multiple_choice':
                            required_fields = ['A', 'B', 'C', 'D', 'answer']
                            if not all(field in question for field in required_fields):
                                continue
                            if question['answer'] not in ['A', 'B', 'C', 'D']:
                                continue
                        elif actual_question_type == 'fill_in_blank':
                            if '[BLANK]' not in question['question']:
                                continue
                            if 'correct_answer' not in question:
                                continue
                        elif actual_question_type == 'true_false':
                            if 'answer' not in question:
                                continue
                            answer = str(question['answer']).strip().capitalize()
                            if answer not in ['True', 'False']:
                                continue
                            question['answer'] = answer
                        elif actual_question_type == 'one_line':
                            if 'correct_answer' not in question:
                                continue
                        
                        if 'explanation' not in question:
                            continue
                        
                        question['question_id'] = len(validated_questions) + 1
                        validated_questions.append(question)
                        
                        if len(validated_questions) >= num_questions:
                            break

            # Ensure question IDs are sequential
            for i, question in enumerate(validated_questions, 1):
                question['question_id'] = i

            return validated_questions

        except Exception as e:
            raise Exception(f"Error generating questions: {str(e)}")

    def get(self, request, quiz_id, format=None):
        """
        Generate questions from the most recently uploaded file using quiz settings
        """
        quiz = self.get_quiz(quiz_id)
        
        # Get settings from quiz object
        question_type = quiz.question_type.lower() if quiz.question_type else 'multiple_choice'
        num_questions = quiz.no_of_questions if quiz.no_of_questions else 5
        quiz_type = quiz.quiz_type.lower() if quiz.quiz_type else 'medium'
        
        # Validate question type
        if question_type not in self.QUESTION_TYPE_PROMPTS:
            return Response(
                {"error": f"Invalid question type in quiz settings. Must be one of: {', '.join(self.QUESTION_TYPE_PROMPTS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate quiz type
        if quiz_type not in ['easy', 'medium', 'hard', 'mixed']:
            return Response(
                {"error": "Invalid quiz type in quiz settings. Must be one of: easy, medium, hard, mixed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get file content
        if not quiz.uploadedfiles:
            return Response(
                {"error": "No files found for this quiz. Please upload a file first."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Get the most recently uploaded file
            file_info = quiz.uploadedfiles[-1]  # Get the last uploaded file

            # Get file content
            content = self.get_file_content(file_info)
            
            # Generate questions using quiz settings
            questions = self.generate_questions_from_content(content, question_type, quiz_type, num_questions)
            
            # Get file info
            file_info = quiz.uploadedfiles[-1]  # Get the last uploaded file
            
            return Response({
                "quiz_id": quiz.quiz_id,
                "quiz_type": quiz_type,
                "question_type": question_type,
                "num_questions": num_questions,
                "quiz_title": quiz.title,
                "quiz_description": quiz.description,
                "file": file_info
            })

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, quiz_id, format=None):
        """
        Generate questions from code test file
        """
        quiz = self.get_quiz(quiz_id)
        
        # Get parameters from request
        question_type = request.data.get('question_type', 'fill_in_blank').lower()
        num_questions = request.data.get('num_questions', 5)
        quiz_type = request.data.get('quiz_type', 'hard').lower()
        
        # Validate question type
        if question_type not in self.QUESTION_TYPE_PROMPTS:
            return Response(
                {"error": f"Invalid question type. Must be one of: {', '.join(self.QUESTION_TYPE_PROMPTS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate quiz type
        if quiz_type not in ['easy', 'medium', 'hard', 'mixed']:
            return Response(
                {"error": "Invalid quiz type. Must be one of: easy, medium, hard, mixed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get file content
        if not quiz.uploadedfiles:
            return Response(
                {"error": "No code test file found for this quiz"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Get the code test file
            file_info = next((f for f in quiz.uploadedfiles if f['name'] == 'code.pdf'), None)
            if not file_info:
                return Response(
                    {"error": "Code test file not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get file content
            content = self.get_file_content(file_info)
            
            # Generate questions
            questions = self.generate_questions_from_content(content, question_type, quiz_type, num_questions)
            
            return Response({
                "quiz_id": quiz.quiz_id,
                "quiz_type": quiz_type,
                "question_type": question_type,
                "num_questions": num_questions,
                "file": file_info
            })

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.filter(is_deleted=False)
    serializer_class = QuizSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Add created_by from request user
        if request.user.is_authenticated:
            serializer.validated_data['created_by'] = request.user.email
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(
            last_modified_by=serializer.validated_data.get('created_by'),
            is_active=True
        )


class QuizQuestionGenerateByTypeView(APIView):
    """
    API endpoint to generate questions based on quiz type and question type
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    parser_classes = (JSONParser,)

    # Question type specific prompts
    QUESTION_TYPE_PROMPTS = {
        'multiple_choice': "Generate a multiple choice question with 4 options and one correct answer.",
        'true_false': "Generate a true/false question with a clear correct answer.",
        'fill_in_blank': "Generate a fill in the blank question with the correct answer.",
        'short_answer': "Generate a short answer question with a detailed answer.",
        'essay': "Generate an essay question that requires detailed explanation."
    }

    def get_quiz(self, quiz_id):
        """Helper method to get quiz and check permissions"""
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz

    def post(self, request, quiz_id, format=None):
        """
        Generate questions based on quiz type and question type
        """
        quiz = self.get_quiz(quiz_id)
        
        # Get the number of questions to generate (default to quiz's no_of_questions)
        num_questions = request.data.get('num_questions', quiz.no_of_questions)
        
        # Get the question type (default to quiz's question_type)
        question_type = request.data.get('question_type', quiz.question_type)
        
        if question_type not in self.QUESTION_TYPE_PROMPTS:
            return Response(
                {"error": f"Invalid question type. Must be one of: {', '.join(self.QUESTION_TYPE_PROMPTS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Initialize OpenAI client
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Prepare the prompt based on quiz type and question type
            base_prompt = f"Generate {num_questions} {question_type} questions for a {quiz.quiz_type} level quiz. "
            base_prompt += self.QUESTION_TYPE_PROMPTS[question_type]
            
            if quiz.description:
                base_prompt += f" Topic: {quiz.description}"
            
            # Generate questions using OpenAI
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional quiz question generator."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Process the generated questions
            generated_questions = response.choices[0].message.content
            
            return Response({
                "quiz_id": quiz.quiz_id,
                "quiz_type": quiz.quiz_type,
                "question_type": question_type,
                "num_questions": num_questions,
                "generated_questions": generated_questions
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Error generating questions: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuizQuestionsView(APIView):
    """
    API endpoint to get or create questions for a specific quiz
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    
    def get(self, request, quiz_id):
        """
        Get questions for a specific quiz
        """
        try:
            # Get the quiz
            quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
            
            # Get all questions for the quiz
            questions = Question.objects.filter(quiz=quiz)
            
            if not questions.exists():
                return Response({
                    "quiz_id": quiz_id,
                    "title": quiz.title,
                    "message": "No questions found for this quiz",
                    "questions": []
                })
            
            # Process the questions
            processed_questions = []
            
            for question in questions:
                question_data = {
                    "question_id": question.question_id,
                    "question_type": question.question_type,
                    "difficulty": question.difficulty
                }
                
                # If the question type is mixed, try to parse the JSON
                if question.question_type == 'mixed':
                    try:
                        parsed_json = json.loads(question.question)
                        
                        # Validate the parsed JSON structure
                        if isinstance(parsed_json, list):
                            # Ensure each question has the required fields
                            for q in parsed_json:
                                if not isinstance(q, dict):
                                    continue
                                    
                                # Make sure required fields exist
                                if 'question' not in q:
                                    q['question'] = "Missing question text"
                                if 'type' not in q:
                                    q['type'] = "oneline"
                                if 'correct_answer' not in q:
                                    q['correct_answer'] = "Unknown"
                                if 'explanation' not in q:
                                    q['explanation'] = "No explanation provided"
                                    
                                # Ensure MCQ questions have options
                                if q.get('type') == 'mcq' and (not q.get('options') or len(q.get('options', {})) < 4):
                                    q['options'] = {
                                        "A": "Option A",
                                        "B": "Option B",
                                        "C": "Option C",
                                        "D": "Option D"
                                    }
                                    
                                # Ensure fill questions have [BLANK] in the question
                                if q.get('type') == 'fill' and '[BLANK]' not in q.get('question', ''):
                                    q['question'] = q.get('question', '') + " [BLANK]"
                        
                        # Return the parsed and validated JSON
                        return Response({
                            "quiz_id": quiz_id,
                            "title": quiz.title,
                            "questions": parsed_json
                        })
                    except (json.JSONDecodeError, TypeError) as e:
                        # If parsing fails, log the error and return the raw question
                        import logging
                        logging.error(f"Error parsing question JSON: {str(e)}")
                        question_data["question"] = question.question
                        question_data["error"] = "Failed to parse question JSON"
                else:
                    # For non-mixed questions, include all fields
                    question_data["question"] = question.question
                    question_data["options"] = question.options
                    question_data["correct_answer"] = question.correct_answer
                    question_data["explanation"] = question.explanation
                
                processed_questions.append(question_data)
            
            return Response({
                "quiz_id": quiz_id,
                "title": quiz.title,
                "questions": processed_questions
            })
            
        except Exception as e:
            return Response({
                "error": f"Error retrieving questions: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, quiz_id):
        """
        Create questions for a quiz
        """
        try:
            # Get the quiz
            quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
            
            # Get the questions data from the request
            questions_data = request.data.get('questions')
            
            if not questions_data:
                return Response({
                    "error": "No questions provided"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # For mixed question types, store as JSON
            if quiz.question_type == 'mixed':
                # Validate the structure of the questions
                if isinstance(questions_data, list):
                    for i, q in enumerate(questions_data):
                        # Ensure each question has the required fields
                        if not isinstance(q, dict):
                            return Response({
                                "error": f"Question {i+1} is not a valid object"
                            }, status=status.HTTP_400_BAD_REQUEST)
                            
                        # Check for required fields
                        if 'question' not in q:
                            return Response({
                                "error": f"Question {i+1} is missing the 'question' field"
                            }, status=status.HTTP_400_BAD_REQUEST)
                            
                        if 'type' not in q:
                            return Response({
                                "error": f"Question {i+1} is missing the 'type' field"
                            }, status=status.HTTP_400_BAD_REQUEST)
                            
                        if 'correct_answer' not in q:
                            return Response({
                                "error": f"Question {i+1} is missing the 'correct_answer' field"
                            }, status=status.HTTP_400_BAD_REQUEST)
                            
                        # Validate MCQ questions have options
                        if q.get('type') == 'mcq' and not q.get('options'):
                            return Response({
                                "error": f"MCQ question {i+1} is missing 'options'"
                            }, status=status.HTTP_400_BAD_REQUEST)
                
                # Store the questions as a JSON string
                question = Question.objects.create(
                    quiz=quiz,
                    question=json.dumps(questions_data),
                    question_type='mixed',
                    difficulty=quiz.quiz_type,
                    created_by=request.user.email,
                    last_modified_by=request.user.email
                )
                
                # Update quiz metadata if it contains page_ranges_str
                if hasattr(quiz, 'metadata') and quiz.metadata:
                    if 'page_ranges_str' in quiz.metadata:
                        # Store the page ranges in the question's metadata if needed
                        pass
                
                return Response({
                    "message": "Questions created successfully",
                    "quiz_id": quiz_id,
                    "question_id": question.question_id,
                    "questions_count": len(questions_data)
                }, status=status.HTTP_201_CREATED)
            else:
                # For other question types, create individual questions
                created_questions = []
                
                for q_data in questions_data:
                    question = Question.objects.create(
                        quiz=quiz,
                        question=q_data.get('question'),
                        question_type=quiz.question_type,
                        difficulty=quiz.quiz_type,
                        options=q_data.get('options'),
                        correct_answer=q_data.get('correct_answer'),
                        explanation=q_data.get('explanation'),
                        created_by=request.user.email,
                        last_modified_by=request.user.email
                    )
                    created_questions.append(question.question_id)
                
                return Response({
                    "message": "Questions created successfully",
                    "quiz_id": quiz_id,
                    "question_ids": created_questions,
                    "questions_count": len(created_questions)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                "error": f"Error creating questions: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuizShareView(APIView):
    """
    API endpoint for accessing a quiz via its share URL
    - GET: Retrieve a quiz using its share token
    """
    permission_classes = [permissions.AllowAny]  # Allow public access for shared quizzes
    
    def get(self, request, quiz_id):
        try:
            # Get the quiz by ID
            quiz = Quiz.objects.get(quiz_id=quiz_id, is_published=True)
            
            # If the quiz is not published or doesn't have a share URL, return 404
            if not quiz.is_published or not quiz.share_url:
                return Response(
                    {"error": "This quiz is not available for public access."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Return the quiz data with its questions
            questions = Question.objects.filter(quiz=quiz)
            quiz_data = QuizSerializer(quiz).data
            
            # Remove sensitive information
            if 'created_by' in quiz_data:
                quiz_data['created_by'] = None
            if 'last_modified_by' in quiz_data:
                quiz_data['last_modified_by'] = None
                
            # Add questions data
            quiz_data['questions'] = []
            for question in questions:
                question_data = {
                    'question_id': question.question_id,
                    'question': question.question,
                    'question_type': question.question_type,
                    'difficulty': question.difficulty,
                    'options': question.options,
                    # Don't include correct answer in the response
                    'explanation': None  # Don't show explanation initially
                }
                quiz_data['questions'].append(question_data)
            
            return Response(quiz_data, status=status.HTTP_200_OK)
            
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found or not available."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
