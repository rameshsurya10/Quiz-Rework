import json
from rest_framework import status, permissions, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Quiz
from .serializers import QuizSerializer, QuizCreateSerializer, QuizUpdateSerializer
import os
from datetime import datetime
from accounts.permissions import IsTeacherOrAdmin, IsOwnerOrAdminOrReadOnly
from openai import OpenAI
import PyPDF2
import io
from rest_framework.decorators import action


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
        self.check_object_permissions(self.request, quiz)
        return quiz

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
        # This line ensures only non-deleted quizzes are fetched
        queryset = Quiz.objects.filter(is_deleted=False) 
        
        # If the user is authenticated and is not a staff/superuser (admin),
        # filter quizzes to show only those they created (matched by email).
        if self.request.user and self.request.user.is_authenticated and not self.request.user.is_staff and not self.request.user.is_superuser:
            queryset = queryset.filter(created_by=self.request.user.email)
        
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
            
            # Prepare the response data with the quiz details and success message
            response_data = serializer.data
            response_data['message'] = 'Quiz created successfully'
            
            # Add user references directly to the response
            response_data['creator'] = str(quiz.creator) if quiz.creator else None
            response_data['created_by'] = str(quiz.created_by) if quiz.created_by else None
            response_data['last_modified_by'] = str(quiz.last_modified_by) if quiz.last_modified_by else None
            
            headers = self.get_success_headers(serializer.data)
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        """Set the creator and created_by fields using the authenticated user's details."""
        user = self.request.user
        # Use get_full_name() for the creator's name and email for created_by
        creator_name = user.get_full_name() if hasattr(user, 'get_full_name') else str(user) 
        created_by_email = user.email
        
        # Pass these directly to save, they will be included in the instance creation.
        serializer.save(creator=creator_name, created_by=created_by_email)


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


class QuizPublishView(APIView):
    """
    API endpoint to publish/unpublish a quiz
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def post(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        self.check_object_permissions(request, quiz)
        
        # Toggle publish status
        quiz.is_published = not quiz.is_published
        if quiz.is_published and not quiz.published_at:
            quiz.published_at = timezone.now()
        elif not quiz.is_published:
            quiz.published_at = None
        
        quiz.save()
        
        return Response({
            'status': 'success',
            'quiz_id': quiz.quiz_id,
            'is_published': quiz.is_published,
            'published_at': quiz.published_at
        })


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
            print("Response: ", response)
            print("Response Choices: ", response.choices)
            print("Response Choices[0]: ", response.choices[0])
            print("Response Choices[0].message: ", response.choices[0].message)
            print("Response Choices[0].message.content: ", response.choices[0].message.content)


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
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuizQuestionGenerateFromExistingFileView(APIView):
    """
    API endpoint to generate questions for a quiz using an existing file.
    GET: Generates questions based on quiz_type and no_of_questions.
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    parser_classes = (JSONParser,)

    DEFAULT_PROMPTS = {
        'easy': """
            Generate {num_questions} easy multiple choice questions that:
            - Focus on basic comprehension and recall
            - Use straightforward language
            - Test fundamental concepts
            - Make options clearly distinct
            - Include simple explanations
        """,
        'medium': """
            Generate {num_questions} medium difficulty multiple choice questions that:
            - Test understanding and application
            - Include some analytical thinking
            - Use moderate technical language
            - Require connecting multiple concepts
            - Provide detailed explanations
        """,
        'hard': """
            Generate {num_questions} challenging multiple choice questions that:
            - Focus on advanced analysis and synthesis
            - Use complex scenarios and edge cases
            - Include technical terminology
            - Require deep understanding
            - Test problem-solving abilities
            - Provide comprehensive explanations
        """,
        'mixed': """
            Generate {num_questions} multiple choice questions with a mix of difficulties (easy, medium, hard) that:
            - Cover a range of cognitive skills from recall to analysis
            - Vary in complexity and language
            - Test both fundamental and advanced concepts
            - Provide appropriate explanations for each question based on its difficulty
        """
    }

    def get_quiz(self, quiz_id):
        """Helper method to get quiz and check permissions"""
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        self.check_object_permissions(self.request, quiz)
        return quiz

    def extract_text_from_pdf(self, file_path):
        """Helper method to extract text from a PDF file."""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    extracted_page_text = page.extract_text()
                    if extracted_page_text:
                        text += extracted_page_text + "\n"
                return text
        except Exception as e:
            # Log the exception for debugging
            print(f"Error reading PDF file {file_path}: {str(e)}")
            # It's often better to return None or empty string and handle it in the calling function
            # rather than raising a generic Exception that might be caught unintentionally.
            # For now, let's keep the raise to see if it's handled, but this could be refined.
            raise Exception(f"Error reading PDF file. Please ensure it's a valid PDF.")

    def get(self, request, quiz_id, format=None):
        """
        Generate questions based on quiz_type and no_of_questions using the stored file.
        """
        quiz = self.get_quiz(quiz_id)
        
        quiz_type = quiz.quiz_type.lower() if quiz.quiz_type else 'easy'
        num_questions = quiz.no_of_questions if quiz.no_of_questions and quiz.no_of_questions > 0 else 5 # Default to 5 questions

        prompt_template = self.DEFAULT_PROMPTS.get(quiz_type, self.DEFAULT_PROMPTS['easy'])
        prompt = prompt_template.format(num_questions=num_questions)
        
        if not quiz.uploadedfiles:
            return Response(
                {"error": "No files found for this quiz. Please upload a file first."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Use the first file in the uploadedfiles list (consider enhancing for multiple files)
        file_info = quiz.uploadedfiles[0]
        if not file_info or 'path' not in file_info:
            return Response(
                {"error": "Invalid file information associated with the quiz."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Construct the full absolute file path
            # Assuming file_info['path'] is relative like 'upload/filename.pdf'
            abs_file_path = os.path.join(settings.BASE_DIR, 'backend', file_info['path'])
            
            if not os.path.exists(abs_file_path):
                return Response(
                    {"error": f"File not found on server at path: {abs_file_path}"},
                    status=status.HTTP_404_NOT_FOUND
                )

            file_extension = os.path.splitext(abs_file_path)[1].lower()
            file_content = ""
            if file_extension == '.pdf':
                file_content = self.extract_text_from_pdf(abs_file_path)
            elif file_extension in ['.txt', '.md']:
                with open(abs_file_path, 'r', encoding='utf-8') as file:
                    file_content = file.read()
            else:
                return Response(
                    {"error": f"Unsupported file type: {file_extension}. Please use PDF, TXT, or MD."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not file_content.strip():
                 return Response(
                    {"error": "Could not extract text from the file or the file is empty."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # The 'prompt' variable already contains the difficulty-specific guidelines and num_questions.
            # The system_prompt_for_api will be the main instruction to OpenAI.
            system_prompt_for_api = f"""
            You are a helpful AI assistant that generates quiz questions.
            Your task is to generate multiple-choice questions based *only* on the provided text content, adhering to the user's guidelines for difficulty, number of questions, and format.
            
            Guidelines for question generation (from user):
            {prompt}
            
            Text content to use for generating questions:
            ---BEGIN TEXT CONTENT---
            {file_content}
            ---END TEXT CONTENT---
            
            You MUST output a single JSON object. This JSON object must have a key named "questions", and its value must be an array of question objects.
            Each question object in the "questions" array must have the following structure:
            - "question_type": "multiple_choice" (string)
            - "question_text": "The question itself, derived from the text content." (string)
            - "options": An array of 4 strings representing the choices. (array of strings)
            - "correct_answer": The exact string of the correct option. (string)
            - "explanation": "A brief explanation of why the answer is correct, based on the text content." (string)
            
            Example of the expected JSON object output:
            {{ 
              "questions": [
                {{ 
                  "question_type": "multiple_choice",
                  "question_text": "What is the capital of France?",
                  "options": ["Berlin", "Madrid", "Paris", "Rome"],
                  "correct_answer": "Paris",
                  "explanation": "Paris is the capital and most populous city of France."
                }},
                {{ 
                  "question_type": "multiple_choice",
                  "question_text": "Another question?",
                  "options": ["Opt1", "Opt2", "Opt3", "Opt4"],
                  "correct_answer": "Opt2",
                  "explanation": "Explanation here."
                }}
              ]
            }}
            Generate the questions now based on the provided text content and guidelines, ensuring your entire response is this single JSON object.
            """
            
            client = OpenAI(api_key=settings.OPENAI_API_KEY) # Initialize OpenAI client
            print("System Prompt Sent to OpenAI: ", system_prompt_for_api) # For debugging

            try:
                # Test API key with a simple request first (optional, can be removed for production)
                # test_response = client.chat.completions.create(
                #     model="gpt-3.5-turbo",
                #     messages=[{"role": "user", "content": "Say hello"}],
                #     max_tokens=5
                # )
                # print("Test API call successful")

                # Generate questions using OpenAI
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_prompt_for_api}
                        # No user message needed if system prompt is comprehensive
                    ],
                    temperature=0.5,
                    max_tokens=1500, # Increased max_tokens slightly
                    response_format={"type": "json_object"}
                )
                print("Response: ", response)
                print("Response Choices: ", response.choices)
                print("Response Choices[0]: ", response.choices[0])
                print("Response Choices[0].message: ", response.choices[0].message)
                print("Response Choices[0].message.content: ", response.choices[0].message.content)

                # Parse the generated questions
                response_content = response.choices[0].message.content
                print("Raw Response Content: ", response_content)
                
                # Try to parse the JSON response
                try:
                    generated_questions = json.loads(response_content)
                    if isinstance(generated_questions, dict) and 'questions' in generated_questions:
                        generated_questions = generated_questions['questions']
                except json.JSONDecodeError:
                    # If direct parsing fails, try to extract JSON from the response
                    import re
                    json_match = re.search(r'\[.*\]', response_content)
                    if json_match:
                        generated_questions = json.loads(json_match.group())
                    else:
                        raise Exception("Could not parse questions from response")

                print("Generated Questions: ", generated_questions)

                return Response({
                    "message": "Questions generated successfully",
                    "file": file_info,
                    "quiz_id": quiz.quiz_id,
                    "quiz_type": quiz_type, # Use quiz_type which is defined
                    "num_questions_generated": len(generated_questions) if isinstance(generated_questions, list) else 0,
                    "questions": generated_questions
                }, status=status.HTTP_200_OK)

            except Exception as openai_error:
                print(f"OpenAI API Error: {str(openai_error)}")
                print(f"Error type: {type(openai_error)}")
                print(f"Error details: {openai_error.__dict__}")
                return Response(
                    {"error": f"Error with OpenAI API: {str(openai_error)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            print(f"General Error: {str(e)}")
            print(f"Error type: {type(e)}")
            print(f"Error details: {e.__dict__}")
            return Response(
                {"error": f"Error generating questions: {str(e)}"},
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
