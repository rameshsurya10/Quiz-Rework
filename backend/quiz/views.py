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


class QuizFileUploadView(APIView):
    """
    API endpoint for managing files related to a quiz
    - POST: Upload a new file for a quiz
    - GET: List all files for a quiz
    - DELETE: Remove a file from a quiz
    """
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]

    def get_quiz(self, quiz_id):
        """Helper method to get quiz and check permissions"""
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        questions = Question.objects.filter(quiz_id=quiz.quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz, questions

    def post(self, request, quiz_id, format=None):
        """
        Upload a file and associate it with a quiz
        """
        quiz = self.get_quiz(quiz_id)
        
        if 'file' not in request.FILES:
            return Response(
                {"error": "No file was provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']
        
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
            'path': db_file_path
        }

        quiz.uploadedfiles.append(file_info)
        quiz.save()

        return Response({
            "message": "File uploaded successfully",
            "file": file_info,
            "quiz_id": quiz.quiz_id
        }, status=status.HTTP_201_CREATED)
    
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
        # Make a mutable copy of the request data
        data = request.data.copy()
        
        # Parse date strings to datetime objects if they exist
        date_fields = ['start_date', 'end_date']
        for field in date_fields:
            if field in data and data[field]:
                try:
                    data[field] = timezone.datetime.strptime(data[field], '%Y-%m-%dT%H:%M')
                except (ValueError, TypeError):
                    return Response(
                        {"error": f"Invalid date format for {field}. Use YYYY-MM-DDTHH:MM format."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Get serializer with context
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_create(serializer)
            
            # Get the created quiz with all fields
            quiz = Quiz.objects.get(pk=serializer.data['quiz_id'])
            
            # Generate questions for the quiz
            try:
                # Get settings from quiz object
                question_type = quiz.question_type.lower() if quiz.question_type else 'multiple_choice'
                num_questions = quiz.no_of_questions if quiz.no_of_questions else 5
                quiz_type = quiz.quiz_type.lower() if quiz.quiz_type else 'medium'
                
                # Initialize OpenAI client
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Prepare the prompt based on quiz type and question type
                if question_type == 'mixed':
                    base_prompt = f"""Generate {num_questions} questions for a {quiz_type} level quiz.
                    Include a mix of multiple choice, one-line, and fill-in-the-blank questions.
                    Each question should be in one of these formats:
                    
                    For multiple choice:
                    Question: [Your question here]
                    A: [Option A]
                    B: [Option B]
                    C: [Option C]
                    D: [Option D]
                    Answer: [Correct option letter]
                    Explanation: [Brief explanation of the answer]
                    
                    For one-line:
                    Question: [Your question here]
                    Answer: [Correct answer]
                    Explanation: [Brief explanation of the answer]
                    
                    For fill-in-the-blank:
                    Question: [Your question with [BLANK] where the answer should go]
                    Answer: [Correct answer]
                    Explanation: [Brief explanation of the answer]
                    
                    """
                else:
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
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a professional quiz question generator. Generate clear, well-structured questions with appropriate options and explanations."},
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
                            'type': 'multiple_choice'  # Default type
                        }
                    elif line.startswith(('A:', 'B:', 'C:', 'D:')):
                        option = line[0]
                        current_question['options'][option] = line[2:].strip()
                        current_question['type'] = 'multiple_choice'
                    elif line.startswith('Answer:'):
                        current_question['correct_answer'] = line.replace('Answer:', '').strip()
                    elif line.startswith('Explanation:'):
                        current_question['explanation'] = line.replace('Explanation:', '').strip()
                
                if current_question and 'text' in current_question:
                    questions.append(current_question)
                
                # Validate questions
                valid_questions = []
                for question in questions:
                    if all(key in question for key in ['text', 'correct_answer', 'explanation']):
                        # Determine question type if not specified
                        if 'type' not in question:
                            if '[BLANK]' in question['text']:
                                question['type'] = 'fill_in_blank'
                            elif len(question.get('options', {})) == 4:
                                question['type'] = 'multiple_choice'
                            else:
                                question['type'] = 'one_line'
                        valid_questions.append(question)
                
                if not valid_questions:
                    raise Exception("No valid questions were generated")
                
                # Store questions in the Question model
                stored_questions = []
                for question_data in valid_questions:
                    # Create the question text with all details
                    question_text = f"Question: {question_data['text']}\n"
                    if question_data['type'] == 'multiple_choice':
                        question_text += f"Options:\n"
                        for option, text in question_data['options'].items():
                            question_text += f"{option}: {text}\n"
                    question_text += f"Correct Answer: {question_data['correct_answer']}\n"
                    question_text += f"Explanation: {question_data['explanation']}"
                    
                    # Create and save the question
                    question = Question.objects.create(
                        quiz=quiz,
                        question=question_text,
                        question_type=question_data['type'],
                        difficulty=quiz_type,
                        correct_answer=question_data['correct_answer'],
                        explanation=question_data['explanation'],
                        options=json.dumps(question_data.get('options', {})) if question_data['type'] == 'multiple_choice' else None,
                        created_by=request.user.email,
                        last_modified_by=request.user.email
                    )
                    stored_questions.append({
                        'question_id': question.question_id,
                        'question': question.question,
                        'question_type': question.question_type
                    })
                
                # Add questions to response
                response_data = serializer.data
                response_data['message'] = 'Quiz created successfully'
                # response_data['questions'] = stored_questions
                
            except Exception as e:
                # If question generation fails, still return the created quiz
                response_data = serializer.data
                response_data['message'] = 'Quiz created successfully but question generation failed'
                response_data['error'] = str(e)
            
            # Add user references directly to the response
            response_data['creator'] = str(quiz.creator) if quiz.creator else None
            response_data['created_by'] = str(quiz.created_by) if quiz.created_by else None
            response_data['last_modified_by'] = str(quiz.last_modified_by) if quiz.last_modified_by else None
            
            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        """Set the creator and created_by fields"""
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
        
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()
        
        # Parse date strings to datetime objects if they exist
        date_fields = ['start_date', 'end_date']
        for field in date_fields:
            if field in data and data[field]:
                try:
                    data[field] = timezone.datetime.strptime(data[field], '%Y-%m-%dT%H:%M')
                except (ValueError, TypeError):
                    return Response(
                        {"error": f"Invalid date format for {field}. Use YYYY-MM-DDTHH:MM format."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Handle is_published and published_at
        if 'is_published' in data and data['is_published'] and not instance.published_at:
            data['published_at'] = timezone.now()
        
        # Set last_modified_by to current user
        data['last_modified_by'] = request.user.id
        
        # Get serializer with context
        serializer = self.get_serializer(instance, data=data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_update(serializer)
            # Get the updated instance with all fields
            updated_instance = self.get_queryset().get(pk=instance.pk)
            return Response(QuizSerializer(updated_instance).data)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def perform_update(self, serializer):
        """Update the quiz instance"""
        serializer.save()
    
    def perform_destroy(self, instance):
        """Soft delete the quiz"""
        instance.is_deleted = True
        instance.last_modified_by = self.request.user
        instance.save()


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
                model="gpt-3.5-turbo",
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
                            model="gpt-3.5-turbo",
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
            'path': db_file_path
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
                "quiz_id": quiz.quiz_id,
                "questions": generated_questions
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

    def extract_text_from_pdf(self, file_path):
        """Extract text from PDF file"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            raise Exception(f"Error reading PDF file: {str(e)}")

    def get_file_content(self, file_info):
        """Get content from file based on file type"""
        file_path = os.path.join(settings.BASE_DIR, 'backend', file_info['path'])
        
        if not os.path.exists(file_path):
            raise Exception("File not found on server")

        file_extension = os.path.splitext(file_path)[1].lower()
        if file_extension == '.pdf':
            return self.extract_text_from_pdf(file_path)
        else:
            # For text files
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()

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
                            model="gpt-3.5-turbo",
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
            
            return Response({
                "quiz_id": quiz.quiz_id,
                "quiz_type": quiz_type,
                "question_type": question_type,
                "num_questions": num_questions,
                "questions": questions,
                "quiz_title": quiz.title,
                "quiz_description": quiz.description
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
                "questions": questions
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
                model="gpt-3.5-turbo",
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
