import json
from rest_framework import status, permissions, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Quiz, Question, User
from students.models import Student
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
from django.core.mail import send_mail
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from teacher.models import Teacher
from students.models import Student
from django.db.models import Q
from documents.utils import extract_text_from_file
import logging
from .serializers import QuizSerializer, QuestionSerializer,SlimQuestionSerializer
from accounts.models import User
from django.db import transaction
import json
from rest_framework.response import Response
from quiz.models import QuizAttempt
from documents.models import Document, DocumentVector

from documents.services import DocumentProcessingService
from django.utils.dateparse import parse_datetime
from supabase import create_client, Client
from quiz.utils import compress_file_if_needed

logger = logging.getLogger(__name__)

supabase_url = "https://jlrirnwhigtmognookoe.supabase.co"
print("supabase_url:",supabase_url)
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscmlybndoaWd0bW9nbm9va29lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjA3MjcsImV4cCI6MjA2MzM5NjcyN30.sqDr7maHEmd2xKoH3JA5UoUddcQaWrj8Lab6AMdDLSk"
print("supabase_key:",supabase_key)
SUPABASE_BUCKET = "fileupload"  # Your bucket name

def get_supabase_client():
    return create_client(supabase_url, supabase_key)

def chunk_text(text: str, max_tokens: int = 500) -> list[str]:
    enc = tiktoken.encoding_for_model("gpt-4o")
    tokens = enc.encode(text)
    chunks, i = [], 0
    while i < len(tokens):
        chunk = tokens[i:i + max_tokens]
        chunks.append(enc.decode(chunk))
        i += max_tokens
    return chunks

class QuizFileUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_quiz(self, quiz_id):
        return Quiz.objects.filter(pk=quiz_id).first()
    def post(self, request, quiz_id, format=None):
        logger.info(f"📥 Processing file upload for quiz {quiz_id}")
        quiz = self.get_quiz(quiz_id)
        if not quiz:
            return Response({"error": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = request.FILES.get('file')
        page_range = request.POST.get('page_range')  # Optional

        if not uploaded_file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # ✅ Compress file if needed
            compressed_file_data, new_file_name = compress_file_if_needed(uploaded_file)
            compressed_file_data.seek(0)

            # ✅ Upload to Supabase
            file_path = f"{quiz.quiz_id}/{new_file_name}"
            logger.info(f"📤 Uploading file to Supabase path: {file_path}")
            supa = create_client(supabase_url, supabase_key)
            supa.storage.from_("fileupload").upload(file_path, compressed_file_data.read())
            logger.info("✅ File successfully uploaded to Supabase")

            # Reset pointer before processing
            compressed_file_data.seek(0)

            # ✅ Process the file: extract text & generate questions
            service = DocumentProcessingService()
            processing_result = service.process_single_document(
                uploaded_file=compressed_file_data,
                quiz=quiz,
                user=request.user,
                page_range=page_range  # This can be None or "3-5"
            )

            if not processing_result or not processing_result.get("success", False):
                return Response(
                    {"error": processing_result.get("error", "Failed to process file.")},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # ✅ Print page extraction result
            print("✅ Text extraction result:")
            print(" - Pages extracted:", processing_result.get("pages_processed"))
            print(" - Page ranges used:", processing_result.get("page_ranges_used"))
            print(" - Questions generated:", processing_result.get("questions_generated"))
            print(" - Questions with page attribution:", processing_result.get("questions_with_page_attribution"))

            return Response({
                "message": "File uploaded and processed successfully",
                "quiz_id": quiz_id,
                "document_id": processing_result.get("document_id"),
                "questions_generated": processing_result.get("questions_generated", 0),
                "pages_used": processing_result.get("page_ranges_used"),
                "extracted_pages": processing_result.get("pages_processed"),
                "questions_with_page_attribution": processing_result.get("questions_with_page_attribution"),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ Unexpected error during file upload: {str(e)}", exc_info=True)
            return Response(
                {"error": f"An unexpected error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

#     def post(self, request, quiz_id, format=None):
#         logger.info(f"Processing file upload for quiz {quiz_id}")
#         quiz = self.get_quiz(quiz_id)
#         if not quiz:
#             return Response({"error": "Quiz not found"}, status=status.HTTP_404_NOT_FOUND)

#         uploaded_file = request.FILES.get('file')
#         print("uploaded_file:",uploaded_file)
#         page_range = request.POST.get('page_range')  # Optional
#         print("page_range:",page_range)

#         if not uploaded_file:
#             return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             # Construct Supabase client
#             supa = create_client(supabase_url, supabase_key)
#             print("supa:",supa)

#             # ✅ Compress file if it's >50MB
#             compressed_file_data, new_file_name = compress_file_if_needed(uploaded_file)
#             print("compressed_file_data:",compressed_file_data)
#             print("new_file_name:",new_file_name)
#             file_path = f"{quiz.quiz_id}/{new_file_name}"


#             # Create a storage path in Supabase bucket
#             # file_name = uploaded_file.name
#             # print("file_name:",file_name)
#             # file_path = f"{quiz.quiz_id}/{file_name}"  # e.g., "239/python.pdf"
#             print("file_path:",file_path)

#         #    # Upload directly to Supabase (no local save)
#         #     file_content = uploaded_file.read()  # This returns bytes
#             # supa.storage.from_("fileupload").upload(file_path, compressed_file_data)
#             supa.storage.from_("fileupload").upload(file_path, compressed_file_data.read())
#             print(f"Uploaded file to Supabase: {file_path}")

#             # Step 2: Use DocumentProcessingService to extract text and generate questions
#             service = DocumentProcessingService()
#             processing_result = service.process_single_document(
#                 uploaded_file=uploaded_file,
#                 quiz=quiz,
#                 user=request.user,
#                 page_range=page_range
#             )

#             if not processing_result or not processing_result.get('success', False):
#                 return Response(
#                     {"error": processing_result.get('error', 'Failed to process file.')},
#                     status=status.HTTP_500_INTERNAL_SERVER_ERROR
#                 )

#             return Response({
#                 "message": "File uploaded and processed successfully",
#                 "quiz_id": quiz_id,
#                 "document_id": processing_result.get('document_id'),
#                 "questions_generated": processing_result.get('questions_generated', 0)
#             }, status=status.HTTP_201_CREATED)

#         except Exception as e:
#             logger.error(f"Unexpected error during file upload: {str(e)}", exc_info=True)
#             return Response(
#                 {"error": f"An unexpected error occurred: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )

class QuizListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating quizzes"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    pagination_class = None 

    MAX_QUESTIONS = 35

    def get_queryset(self):
        return Quiz.objects.filter(is_deleted=False)
    
    def list(self, request, *args, **kwargs):
        try:
            user = self.request.user
            now = timezone.now()
            base_queryset = Quiz.objects.filter(is_deleted=False)
            role = getattr(user, 'role', '').upper()

            if role == 'ADMIN':
                quiz_queryset = base_queryset

            elif role == 'TEACHER':
                teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
                if not teacher:
                    return Response({"message": "Teacher record not found"}, status=404)
                department_ids = teacher.department_ids or []
                quiz_queryset = base_queryset.filter(
                    Q(creator=user.get_full_name()) | Q(department_id__in=department_ids)
                )

            elif role == 'STUDENT':
                student = Student.objects.filter(email=user.email, is_deleted=False).first()
                if not student:
                    return Response({"message": "Student record not found"}, status=404)
                quiz_queryset = base_queryset.filter(department_id=student.department_id, is_published=True)

            else:
                return Response({"message": "Unauthorized role"}, status=403)

            # Make sure all quiz dates are timezone-aware
            def get_aware_date(quiz_date):
                if quiz_date and timezone.is_naive(quiz_date):
                    return timezone.make_aware(quiz_date)
                return quiz_date

            # Get current date without time for date comparison
            current_date = now.date()

            # Filter quizzes with proper date handling
            current_quizzes = []
            upcoming_quizzes = []
            past_quizzes = []

            for quiz in quiz_queryset:
                quiz_date = get_aware_date(quiz.quiz_date)
                if not quiz_date:
                    continue

                quiz_date_only = quiz_date.date()
                
                if quiz_date_only == current_date:
                    current_quizzes.append(quiz)
                elif quiz_date_only > current_date:
                    upcoming_quizzes.append(quiz)
                else:
                    past_quizzes.append(quiz)

            # Sort the lists
            current_quizzes.sort(key=lambda x: x.quiz_date)
            upcoming_quizzes.sort(key=lambda x: x.quiz_date)
            past_quizzes.sort(key=lambda x: x.quiz_date, reverse=True)

            # Serialize the quizzes
            serializer = QuizSerializer()
            response_data = {
                "current_quizzes": [
                    serializer.to_representation(quiz) 
                    for quiz in current_quizzes
                ],
                "upcoming_quizzes": [
                    serializer.to_representation(quiz)
                    for quiz in upcoming_quizzes
                ],
                "past_quizzes": [
                    serializer.to_representation(quiz)
                    for quiz in past_quizzes
                ]
            }

            return Response(response_data)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in quiz listing: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching quizzes. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"Received quiz creation request")
            logger.info(f"Request method: {request.method}")
            logger.info(f"Content type: {request.content_type}")
            logger.info(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'No keys'}")
            logger.info(f"Request FILES: {list(request.FILES.keys()) if hasattr(request, 'FILES') else 'No FILES'}")
            
            data = request.data.copy()
            user = request.user
            
            logger.info(f"User: {user}, Role: {getattr(user, 'role', 'No role')}")

            # ✅ Check quiz creation limit for both TEACHER and ADMIN
            role = getattr(user, 'role', '').upper()
            if role in ['TEACHER', 'ADMIN']:
                # Optional: Validate existence for teacher/admin record if needed
                if role == 'TEACHER':
                    teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
                    if not teacher:
                        return Response({"message": "Teacher record not found"}, status=404)
                elif role == 'ADMIN':
                    admin = User.objects.filter(email=user.email).first()
                    if not admin:
                        return Response({"message": "Admin record not found"}, status=404)

                # # Count how many quizzes this user has created
                # quiz_count = Quiz.objects.filter(created_by=user.email, is_deleted=False).count()
                # if quiz_count >= 5:
                #     return Response({
                #         "error": "Quiz creation limit reached",
                #         "message": "You have reached the limit of 5 quizzes. Please subscribe to create more quizzes.",
                #         "title": "Limit Exceeded"
                #     }, status=status.HTTP_403_FORBIDDEN)

            # ✅ Validate number of questions
            # try:
            #     no_of_questions = int(data.get('no_of_questions', 0))
            #     if no_of_questions > self.MAX_QUESTIONS:
            #         return Response({
            #             "error": f"Number of questions cannot exceed {self.MAX_QUESTIONS}",
            #             "message": f"You've requested {no_of_questions} questions, but the maximum allowed is {self.MAX_QUESTIONS}. Please reduce the number of questions.",
            #             "title": "Question Limit Exceeded"
            #         }, status=status.HTTP_400_BAD_REQUEST)
            # except (ValueError, TypeError):
            #     pass  # Let the serializer handle invalid inputs

            # ✅ Handle book_name and quiz_type transformation
            book_name = data.get('book_name')
            if book_name:
                data['book_name'] = book_name

            quiz_type = data.get('quiz_type')
            if isinstance(quiz_type, dict):
                data['quiz_type'] = json.dumps(quiz_type)

            logger.info("About to create serializer")

            # ✅ Continue with quiz creation
            serializer = self.get_serializer(data=data)
            
            logger.info("About to validate serializer")
            serializer.is_valid(raise_exception=True)
            
            logger.info("Serializer is valid, about to perform create")

            self.perform_create(serializer)
            quiz = Quiz.objects.get(pk=serializer.data['quiz_id'])

            response_data = serializer.data
            response_data['creator'] = str(quiz.creator)
            response_data['created_by'] = str(quiz.created_by)
            response_data['last_modified_by'] = str(quiz.last_modified_by)
            response_data['message'] = "Quiz created successfully"

            headers = self.get_success_headers(serializer.data)
            logger.info("Quiz created successfully")
            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            logger.error(f"Error in create method: {str(e)}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
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

class StudentQuestionView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating, and deleting a quiz"""
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    lookup_field = 'quiz_id'
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_queryset(self):
        return Quiz.objects.filter(is_deleted=False)

    def retrieve(self, request, *args, **kwargs):
        quiz = get_object_or_404(Quiz, quiz_id=kwargs['quiz_id'], is_deleted=False)

        user = request.user
        role = getattr(user, 'role', '').upper()

        # ✅ Only allow published quizzes for students
        if role == 'STUDENT':
            student = Student.objects.filter(email=user.email, is_deleted=False).first()
            if not student:
                return Response({"message": "Student record not found"}, status=404)
            if not quiz.is_published or quiz.department_id != student.department_id:
                return Response({"message": "Unauthorized or quiz not available"}, status=403)

        # ✅ Serialize quiz
        quiz_data = QuizSerializer(quiz).data

        # ✅ Fetch and shuffle questions
        questions = list(quiz.db_questions.all())
        random.shuffle(questions)

        serialized_questions = SlimQuestionSerializer(questions, many=True).data
        random.shuffle(serialized_questions)

        quiz_data['questions'] = serialized_questions

        return Response(quiz_data)

class QuizRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating, and deleting a quiz"""
    # permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'quiz_id'
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    
    def get_queryset(self):
        return Quiz.objects.filter(is_deleted=False)
    
    def list(self, request, *args, **kwargs):
        try:
            user = self.request.user
            now = timezone.now()
            base_queryset = Quiz.objects.filter(is_deleted=False)
            role = getattr(user, 'role', '').upper()

            if role == 'ADMIN':
                quiz_queryset = base_queryset

            elif role == 'TEACHER':
                teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
                if not teacher:
                    return Response({"message": "Teacher record not found"}, status=404)
                department_ids = teacher.department_ids or []
                quiz_queryset = base_queryset.filter(
                    Q(creator=user.get_full_name()) | Q(department_id__in=department_ids)
                )

            elif role == 'STUDENT':
                student = Student.objects.filter(email=user.email, is_deleted=False).first()
                if not student:
                    return Response({"message": "Student record not found"}, status=404)
                quiz_queryset = base_queryset.filter(department_id=student.department_id, is_published=True)

            else:
                return Response({"message": "Unauthorized role"}, status=403)

            # Make sure all quiz dates are timezone-aware
            def get_aware_date(quiz_date):
                if quiz_date and timezone.is_naive(quiz_date):
                    return timezone.make_aware(quiz_date)
                return quiz_date

            # Get current date without time for date comparison
            current_date = now.date()

            # Filter quizzes with proper date handling
            current_quizzes = []
            upcoming_quizzes = []
            past_quizzes = []

            for quiz in quiz_queryset:
                quiz_date = get_aware_date(quiz.quiz_date)
                if not quiz_date:
                    continue

                quiz_date_only = quiz_date.date()
                
                if quiz_date_only == current_date:
                    current_quizzes.append(quiz)
                elif quiz_date_only > current_date:
                    upcoming_quizzes.append(quiz)
                else:
                    past_quizzes.append(quiz)

            # Sort the lists
            current_quizzes.sort(key=lambda x: x.quiz_date)
            upcoming_quizzes.sort(key=lambda x: x.quiz_date)
            past_quizzes.sort(key=lambda x: x.quiz_date, reverse=True)

            # Serialize the quizzes
            serializer = QuizSerializer()
            response_data = {
                "current_quizzes": [
                    serializer.to_representation(quiz) 
                    for quiz in current_quizzes
                ],
                "upcoming_quizzes": [
                    serializer.to_representation(quiz)
                    for quiz in upcoming_quizzes
                ],
                "past_quizzes": [
                    serializer.to_representation(quiz)
                    for quiz in past_quizzes
                ]
            }

            return Response(response_data)

        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in quiz listing: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching quizzes. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
        """Retrieve quiz with limited questions and show extra ones in additional_question_list"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        all_questions = Question.objects.filter(quiz=instance).order_by('question_id')
        total_questions_count = all_questions.count()
        max_questions = instance.no_of_questions or 0

        def serialize_question(q):
            # For mixed type questions, the question field contains JSON with multiple questions
            if q.question_type == 'mixed':
                try:
                    parsed = json.loads(q.question)
                    if isinstance(parsed, list):
                        # Ensure each question has all required fields
                        for question_item in parsed:
                            # Add missing fields with defaults
                            if 'question_id' not in question_item:
                                question_item['question_id'] = q.question_id
                            if 'question_type' not in question_item and 'type' in question_item:
                                question_item['question_type'] = question_item['type']
                            elif 'question_type' not in question_item:
                                question_item['question_type'] = 'mcq'  # default
                            
                            # Ensure the actual question content exists
                            if 'question' not in question_item:
                                question_item['question'] = 'Missing question text'
                            
                            # Ensure options is properly formatted for MCQ questions
                            if question_item.get('question_type') == 'mcq' or question_item.get('type') == 'mcq':
                                if 'options' not in question_item or not question_item['options']:
                                    question_item['options'] = {
                                        "A": "Option A",
                                        "B": "Option B",
                                        "C": "Option C", 
                                        "D": "Option D"
                                    }
                            else:
                                question_item['options'] = {}
                            
                            # Ensure correct_answer exists
                            if 'correct_answer' not in question_item:
                                question_item['correct_answer'] = ''
                            
                            # Ensure explanation exists
                            if 'explanation' not in question_item:
                                question_item['explanation'] = ''
                        
                        return parsed
                    else:
                        # Single question object
                        if 'question_id' not in parsed:
                            parsed['question_id'] = q.question_id
                        if 'question_type' not in parsed and 'type' in parsed:
                            parsed['question_type'] = parsed['type']
                        elif 'question_type' not in parsed:
                            parsed['question_type'] = 'mcq'
                        
                        # Ensure the actual question content exists
                        if 'question' not in parsed:
                            parsed['question'] = 'Missing question text'
                        
                        if parsed.get('question_type') == 'mcq' or parsed.get('type') == 'mcq':
                            if 'options' not in parsed or not parsed['options']:
                                parsed['options'] = {
                                    "A": "Option A",
                                    "B": "Option B",
                                    "C": "Option C",
                                    "D": "Option D"
                                }
                        else:
                            parsed['options'] = {}
                        
                        if 'correct_answer' not in parsed:
                            parsed['correct_answer'] = ''
                        if 'explanation' not in parsed:
                            parsed['explanation'] = ''
                        
                        return [parsed]
                except (json.JSONDecodeError, TypeError):
                    # Fallback if JSON parsing fails
                    return [{
                        "question_id": q.question_id,
                        "question_type": q.question_type,
                        "question": q.question,
                        "options": q.options or {},
                        "correct_answer": q.correct_answer or '',
                        "explanation": q.explanation or ''
                    }]
            else:
                # For non-mixed questions, return standard format
                return [{
                    "question_id": q.question_id,
                    "question_type": q.question_type,
                    "question": q.question,
                    "options": q.options or {},
                    "correct_answer": q.correct_answer or '',
                    "explanation": q.explanation or ''
                }]

        # Collect all serialized questions
        all_serialized_questions = []
        for q in all_questions:
            serialized_questions = serialize_question(q)
            all_serialized_questions.extend(serialized_questions)

        # Add question numbers
        # for i, question in enumerate(all_serialized_questions, 1):
        #     question['question_number'] = i

        # Split based on required number
        current_questions = all_serialized_questions[:max_questions]
        additional_questions = all_serialized_questions[max_questions:]

        # Build response
        data['current_questions'] = current_questions
        data['total_questions'] = total_questions_count
        data['returned_questions'] = len(current_questions)
        data['balance_questions'] = len(additional_questions)
        data['additional_question_list'] = additional_questions

        # Clean up any previously present 'questions'
        data.pop('questions', None)

        return Response(data)
        
    def put(self, request, quiz_id):
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id, is_deleted=False)
        print("quiz:", quiz)
        # 1. Update quiz fields
        quiz.title = request.data.get("title", quiz.title)
        quiz.description = request.data.get("description", quiz.description)
        quiz.is_published = request.data.get("is_published", quiz.is_published)
        quiz.time_limit_minutes = request.data.get("time_limit_minutes", quiz.time_limit_minutes)
        quiz.passing_score = request.data.get("passing_score", quiz.passing_score)

        quiz_date_str = request.data.get("quiz_date")
        if quiz_date_str:
            parsed_date = parse_datetime(quiz_date_str)
            if parsed_date:
                quiz.quiz_date = parsed_date

        quiz.save()

        # 2. Load existing questions for this quiz
        existing_questions = Question.objects.filter(quiz=quiz)
        question_map = {}

        for q in existing_questions:
            try:
                q_data = json.loads(q.question)
                print("q_data:", q_data)
                if isinstance(q_data, dict):
                    q_num = q_data.get("question_number")
                    if q_num is not None:
                        question_map[str(q_num)] = q
            except json.JSONDecodeError:
                continue  # skip corrupted data

        # 3. Update matching questions from incoming payload
        incoming_questions = request.data.get("questions", [])
        updated_numbers = []

        for new_q in incoming_questions:
            q_num = new_q.get("question_number")
            print("q_num:", q_num)
            if q_num is None:
                continue

            existing = question_map.get(str(q_num))
            print("existing:", existing)
            if existing:
                # Update only the fields you want
                existing.question = json.dumps({
                    "question": new_q.get("question"),
                    "options": new_q.get("options", {}),
                    "type": new_q.get("type"),
                    "correct_answer": new_q.get("correct_answer"),
                    "explanation": new_q.get("explanation"),
                    "question_number": q_num
                })
                existing.question_type = new_q.get("question_type", existing.question_type)
                existing.correct_answer = new_q.get("correct_answer")
                existing.explanation = new_q.get("explanation")
                existing.options = new_q.get("options", {})
                existing.save()
                updated_numbers.append(q_num)

        return Response({
            "message": "Quiz and matching questions updated successfully.",
            "updated_question_numbers": updated_numbers,
            "quiz_id": quiz.quiz_id
        }, status=status.HTTP_200_OK)

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
        if not api_key:
            return Response({"error": "OpenAI API key not set in environment."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        client = openai.OpenAI(api_key=api_key)

        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
        if not quiz.uploadedfiles or len(quiz.uploadedfiles) == 0:
            return Response({"error": "No uploaded files found for this quiz."}, status=status.HTTP_404_NOT_FOUND)

        # For simplicity, use the first uploaded file
        file_info = quiz.uploadedfiles[0]
        file_path = file_info.get('path')
        if not file_path:
            return Response({"error": "File path not found in uploaded file info."}, status=status.HTTP_404_NOT_FOUND)

        # Try to read the file content (always look in backend/upload/)
        abs_file_path = os.path.join(settings.BASE_DIR, 'backend', file_path)
        if not os.path.exists(abs_file_path):
            return Response({"error": f"File does not exist on server: {abs_file_path}"}, status=status.HTTP_404_NOT_FOUND)
        import os
        file_ext = os.path.splitext(abs_file_path)[1].lower()
        try:
            if file_ext == '.pdf':
                from PyPDF2 import PdfReader
                pdf = PdfReader(abs_file_path)
                file_content = "\n".join(page.extract_text() or '' for page in pdf.pages)
            elif file_ext == '.txt':
                with open(abs_file_path, 'r', encoding='utf-8') as f:
                    file_content = f.read()
            else:
                return Response({"error": f"Unsupported file type: {file_ext}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Could not read file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Use OpenAI to generate questions
        try:
            prompt = f"Generate 5 quiz questions based on the following content:\n{file_content}"
            client = openai.OpenAI()
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": "You are a quiz generator."},
                          {"role": "user", "content": prompt}]
            )
            questions = response.choices[0].message.content
        except Exception as e:
            return Response({"error": f"OpenAI API error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "quiz_id": quiz.quiz_id,
            "questions": questions
        })

class QuizPublishView(APIView):
    """
    API endpoint to publish/unpublish a quiz, save URL, and notify students via email.
    """
    # permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, quiz_id):
        try:
            quiz = get_object_or_404(Quiz, quiz_id=quiz_id)
            self.check_object_permissions(request, quiz)

            # Toggle publish status
            quiz.is_published = not quiz.is_published

            if quiz.is_published:
                # Set published date
                if not quiz.published_at:
                    quiz.published_at = timezone.now()

                # ✅ Generate URL and save in model
                domain = get_current_site(request).domain
                full_url = f"http://{domain}/student/quiz/{quiz.quiz_id}/join/"
                # test_path = reverse('quiz-join', kwargs={'quiz_id': quiz.quiz_id})
                # full_url = f"http://{domain}{test_path}"
                quiz.url_link = full_url

                # ✅ Fetch department students
                department = quiz.department_id
                students = Student.objects.filter(department_id=department,is_verified=True)

                # Email content
                subject = f"Quiz Assigned: {quiz.title}"
                from_email = settings.DEFAULT_FROM_EMAIL

                for student in students:
                    if student.email:
                        message = f"""
                            Hello {student.name},

                            A new quiz titled "{quiz.title}" has been assigned to you.

                            Date Assigned: {quiz.published_at.strftime('%Y-%m-%d %I:%M %p')}

                            👉 Click the link below to join your quiz:
                            {quiz.url_link}

                            Best Regards,
                            Redlitmus teams
                            """.strip()
                        send_mail(
                            subject,
                            message,
                            from_email,
                            [student.email],
                            fail_silently=False
                        )

            else:
                # Unpublishing: clear fields
                quiz.published_at = None
                quiz.url_link = None

            # Ensure quiz_date is timezone-aware
            if quiz.quiz_date and timezone.is_naive(quiz.quiz_date):
                quiz.quiz_date = timezone.make_aware(quiz.quiz_date)

            quiz.save()

            return Response({
                'status': 'success',
                'quiz_id': quiz.quiz_id,
                'is_published': quiz.is_published,
                'published_at': quiz.published_at,
                'quiz_url': quiz.share_url
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
            # Generate questions using OpenAI
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": "Generate questions based on the provided content and prompt."}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the generated questions
            generated_questions = json.loads(response.choices[0].message.content)

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
            Generate EASY fill-in-the-blank questions directly based on the provided content.

            Requirements:
            - Format the question as a sentence (not a question).
            - Use a single blank written as "_______".
            - Do NOT end the sentence with a question mark.
            - Ensure the blank replaces a KEY concept, fact, or value directly from the text.
            - Only one blank per question.
            - Must include the following fields:
                - "question": sentence with one blank ("_______")
                - "type": always "fill"
                - "correct_answer": the exact word or phrase that fills the blank
                - "explanation": short explanation for why the answer is correct
                - "question_number": integer starting from 1
                - "source_page": page number or "all"

            Return the result in the following JSON format:
            {
                "question": "Python uses the ________ statement for loops.",
                "type": "fill",
                "correct_answer": "for",
                "explanation": "The 'for' statement is used for looping in Python.",
                "question_number": 1,
                "source_page": "5"
            }
            """,
                'medium': """
            Generate MEDIUM-difficulty fill-in-the-blank questions based on the provided content.

            Requirements:
            - Format the question as a sentence (not a question).
            - Use a single blank written as "_______".
            - Do NOT end the sentence with a question mark.
            - Ensure the blank replaces a KEY concept or technical term from the passage.
            - Include:
                - "question"
                - "type": "fill"
                - "correct_answer"
                - "explanation"
                - "question_number"
                - "source_page"

            Return the result in this format:
            {
                "question": "The atomic number increases by _______ when a beta particle is emitted.",
                "type": "fill",
                "correct_answer": "1",
                "explanation": "Beta emission increases atomic number by 1.",
                "question_number": 2,
                "source_page": "6"
            }
            """,
                'hard': """
            Generate HARD-level fill-in-the-blank questions directly from the provided content.

            Requirements:
            - Use sentence format with one blank ("_______")
            - Do NOT end with a question mark
            - The blank must replace an advanced or technical term or value
            - Provide these fields:
                - "question": sentence with a blank
                - "type": "fill"
                - "correct_answer": correct word/phrase from text
                - "explanation": reasoning behind the answer
                - "question_number": numeric ID
                - "source_page": page number (e.g., "7")

            JSON format example:
            {
                "question": "Curie is defined as the quantity of a radioactive substance that undergoes _______ disintegrations per second.",
                "type": "fill",
                "correct_answer": "3.7 × 10¹⁰",
                "explanation": "Curie equals 3.7 × 10¹⁰ disintegrations per second.",
                "question_number": 3,
                "source_page": "6"
            }
            """
        },  
        'true_false': {
            'easy': """
                Generate easy true/false questions about code that:
                1. Test basic understanding of programming concepts.
                2. Have clear and unambiguous true or false answers.
                3. Are suitable for beginners.
                4. Focus on fundamental principles or simple facts.
                5. Avoid trick questions or ambiguity.
                """,
            'medium': """
                Generate medium difficulty true/false questions about code that:
                1. Test intermediate understanding of programming concepts.
                2. Include moderately complex scenarios or use cases.
                3. Require some reasoning or analytical thinking.
                4. Focus on practical coding applications and common mistakes.
                5. Ensure the answer can be definitively true or false.
                """,
            'hard': """
                Generate hard true/false questions about code that:
                1. Test advanced understanding of programming concepts.
                2. Include complex scenarios, tricky edge cases, or uncommon behaviors.
                3. Require deep analysis and technical insight to answer correctly.
                4. Focus on nuanced language features or subtle logic.
                5. Avoid vague or opinion-based statements; answers must be objectively true or false.
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
        "match-the-following": {
        "easy": """
            Generate ONE easy match-the-following question.

            Return format:
            {
            "question": "Match the following scientists with their discoveries.
            "J. J. Thomson - Electrons",
            "Ernest Rutherford - Protons",
            "James Chadwick - Neutrons",
            "Democritus - Atoms",
            "type": "match-the-following",
            "correct_answer": {
                "A": "J. J. Thomson - Electrons",
                "B": "Ernest Rutherford - Protons",
                "C": "James Chadwick - Neutrons",
                "D": "Democritus - Atoms"
            },
            "explanation": "Each scientist is credited with discovering one of the components of the atom.",
            "source_page": "<optional>"
            }
            """,
                    "medium": """
            Generate ONE medium-level match-the-following question.

            Return format:
            {
            "question": "Match the following elements with their atomic numbers.
            "Hydrogen - 1",
            "Carbon - 6",
            "Oxygen - 8",
            "Calcium - 20",
            "type": "match-the-following",
            "correct_answer": {
                "A": "Hydrogen - 1",
                "B": "Carbon - 6",
                "C": "Oxygen - 8",
                "D": "Calcium - 20"
            },
            "explanation": "Each element is matched with its atomic number.",
            "source_page": "<optional>"
            }
            """,
                    "hard": """
            Generate ONE hard match-the-following question.

            Return format:
            {
            "question": "Match the following processes with their corresponding scientific principles.
            "Beta Decay - Neutron to proton conversion",
            "Alpha Emission - Helium nucleus release",
            "Gamma Emission - Energy release",
            "Positron Emission - Proton to neutron conversion",
            "type": "match-the-following",
            "correct_answer": {
                "A": "Beta Decay - Neutron to proton conversion",
                "B": "Alpha Emission - Helium nucleus release",
                "C": "Gamma Emission - Energy release",
                "D": "Positron Emission - Proton to neutron conversion"
            },
            "explanation": "Each nuclear process is paired with its correct description.",
            "source_page": "<optional>"
            }
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
                },
                'match-the-following': {
                    "question_id": 1,
                    "question": "What is the main purpose of Django REST Framework's serializers?",
                    "correct_answer": "To convert complex data types to Python data types that can be easily rendered into JSON",
                    "explanation": "Serializers in DRF are used to convert complex data types (like Django models) into Python data types that can be easily converted to JSON, and vice versa."
                }
            }
            
            # Define all possible question types and difficulties
            all_question_types = ['multiple_choice', 'fill_in_blank', 'true_false', 'one_line', 'match-the-following']
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
                            model="gpt-4o",
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

                elif actual_question_type == 'match-the-following':
                    if 'answer' not in question:
                        continue
                    answer = str(question['answer']).strip().capitalize()
                    if answer not in ['A', 'B', 'C', 'D']:
                        continue
                    question['answer'] = answer

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
                        elif actual_question_type == 'match-the-following':
                            if 'answer' not in question:
                                continue
                            answer = str(question['answer']).strip().capitalize()
                            if answer not in ['A', 'B', 'C', 'D']:
                                continue
                            question['answer'] = answer
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
        'essay': "Generate an essay question that requires detailed explanation.",
        'match-the-following': "Generate a match-the-following question with the correct answer."
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
                model="gpt-4o",
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
                                
                                # Ensure match-the-following questions have correct answer
                                if q.get('type') == 'match-the-following' and 'answer' not in q:
                                    q['answer'] = "Unknown"
                        
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
                    question_data["question_number"] = question.question_number
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
                        question_number=q_data.get('question_number'),
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
                    'explanation': None,  # Don't show explanation initially
                    'question_number': question.question_number,
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

def ensure_list(data):
    """
    Converts a stringified list or actual list into a valid list of dicts.
    """
    if isinstance(data, list):
        return data
    if isinstance(data, str):
        try:
            loaded = json.loads(data)
            if isinstance(loaded, list):
                return loaded
        except json.JSONDecodeError:
            pass
    return []


class ReplaceQuizQuestionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, quiz_id):
        payload = request.data

        # Step 1: Validate input
        question_number_to_remove_str = payload.get("question_number")
        if question_number_to_remove_str is None:
            return Response({"error": "question_number is required."}, status=400)
        
        try:
            question_number_to_remove = int(question_number_to_remove_str)
        except (TypeError, ValueError):
            return Response({"error": "question_number must be an integer."}, status=400)

        # Step 2: Get quiz
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id, is_deleted=False)

        # Step 3: Get the Question object OR load from quiz.questions
        question_obj = Question.objects.filter(quiz=quiz).first()
        question_list_source = 'model'

        if not question_obj:
            # Fallback to the quiz.questions field if it exists and is not empty
            if quiz.questions and isinstance(quiz.questions, (str, list, dict)):
                question_list_source = 'field'
                raw_data = quiz.questions
            else:
                return Response({"error": "No question data found for this quiz."}, status=404)
        else:
            raw_data = question_obj.question


        # Step 4: Safely parse the question list
        try:
            if isinstance(raw_data, str):
                question_list = json.loads(raw_data)
            else:
                question_list = raw_data

            if isinstance(question_list, str): # Handle double-encoding
                question_list = json.loads(question_list)

            if isinstance(question_list, dict): # Handle dict of questions
                question_list = list(question_list.values())

        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"Error decoding question data for quiz {quiz_id}: {e}")
            return Response({"error": "Failed to decode question data."}, status=500)

        if not isinstance(question_list, list):
            return Response({"error": "Stored question data is not in a valid list format."}, status=500)

        # Step 5: Remove the target question
        original_len = len(question_list)
        # Ensure consistent key access, checking for both 'question_number' and 'id'
        question_list = [
            q for q in question_list
            if q and int(q.get("question_number", q.get("id", -1))) != question_number_to_remove
        ]
        
        if len(question_list) == original_len:
            return Response({
                "error": f"Question number {question_number_to_remove} not found in the quiz."
            }, status=404)

        # Step 6: Save updated list back to the correct source
        updated_question_json = json.dumps(question_list)

        if question_list_source == 'model':
            question_obj.question = updated_question_json
            question_obj.save()
        
        # Always update the quiz.questions field for consistency
        quiz.questions = updated_question_json
        quiz.save()

        return Response(question_list, status=200)


# class TamilImageUploadView(APIView):
#     parser_classes = (MultiPartParser, FormParser, JSONParser)
#     permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
#     # parser_classes = [MultiPartParser]
#     # permission_classes = [IsAuthenticated]

#     def post(self, request, format=None):
#         image_file = request.FILES.get("file")
#         if not image_file:
#             return Response({"error": "No image file uploaded."}, status=400)

#         # Step 1: OCR
#         try:
#             image = Image.open(image_file)
#             extracted_text = pytesseract.image_to_string(image, lang="tam")
#         except Exception as e:
#             return Response({"error": f"Text extraction failed: {str(e)}"}, status=500)

#         if not extracted_text.strip():
#             return Response({"error": "No text found in image."}, status=400)

#         # Step 2: Detect language (optional validation)
#         try:
#             language = detect(extracted_text)
#             if language != "ta":
#                 return Response({"error": "Uploaded image does not contain Tamil text."}, status=400)
#         except:
#             pass  # proceed anyway

#         # Step 3: Generate questions
#         prompt = f"""
#         நீங்கள் ஒரு வினாத்தாள் உருவாக்கும் நிபுணர். கீழே உள்ள தமிழ் உரையைப் பார்த்து 5 வினாக்கள் உருவாக்கவும்.
#         வினாக்கள் கலந்தவையாக (MCQ, பூர்த்தி, உண்மை/தவறு, ஒரு வரி பதில்) இருக்க வேண்டும்.

#         உரை:
#         {extracted_text[:1000]}

#         ஒவ்வொரு வினாவையும் இவ்வாறு வடிவமைக்கவும்:
#         Question: ...
#         Type: [mcq|fill|truefalse|oneline]
#         A: ...
#         B: ...
#         C: ...
#         D: ...
#         Answer: ...
#         Explanation: ...
#         """

#         try:
#             client = OpenAI(api_key=settings.OPENAI_API_KEY)
#             response = client.chat.completions.create(
#                 model="gpt-4o",
#                 messages=[
#                     {"role": "system", "content": "You are a Tamil quiz generator."},
#                     {"role": "user", "content": prompt}
#                 ],
#                 temperature=0.5,
#                 max_tokens=1500
#             )
#             output = response.choices[0].message.content
#         except Exception as e:
#             return Response({"error": f"AI request failed: {str(e)}"}, status=500)

#         return Response({
#             "message": "Questions generated successfully from image.",