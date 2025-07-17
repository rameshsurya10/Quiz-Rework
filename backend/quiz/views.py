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
import pypdf as PyPDF2
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
from quiz.utils import *
from openai import OpenAI
from django.utils import timezone

logger = logging.getLogger(__name__)

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
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
            supa = create_client(supabase_url, supabase_key)
            supa.storage.from_("fileupload").upload(file_path, compressed_file_data.read())

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

class QuizListCreateView(generics.ListCreateAPIView):
    """API endpoint for listing and creating quizzes"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    pagination_class = None 

    # MAX_QUESTIONS = 35

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
                class_name = str(teacher.class_name).strip() if teacher.class_name else None
                section = str(teacher.section).strip() if teacher.section else None

                quiz_queryset = base_queryset.filter(
                    department_id__in=department_ids
                )

                if class_name:
                    quiz_queryset = quiz_queryset.filter(class_name__iexact=class_name)
                if section:
                    quiz_queryset = quiz_queryset.filter(section__iexact=section)
     
            elif role == 'STUDENT':
                students = Student.objects.filter(email=user.email, is_deleted=False).all()
                if not students.exists():
                    return Response({"message": "Student record not found"}, status=404)

                all_quizzes = Quiz.objects.none()  # start with empty queryset

                for student in students:
                    quiz_filter = {
                        'department_id': student.department_id,
                        'class_name': student.class_name,
                        'is_published': True,
                    }
                    if student.section:
                        quiz_filter['section'] = student.section

                    matched_quizzes = base_queryset.filter(**quiz_filter)
                    all_quizzes = all_quizzes.union(matched_quizzes)

                if not all_quizzes.exists():
                    return Response({"message": "No quizzes available for this student"}, status=200)

                # serialize and return the quizzes
                serializer = QuizSerializer(all_quizzes, many=True, context={'request': request})
                return Response(serializer.data, status=200)

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
            data = request.data.copy()
            user = request.user
   
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

            # ✅ Handle book_name and quiz_type, class_name, section transformation
            book_name = data.get('book_name')
            if book_name:
                data['book_name'] = book_name
            
            class_name = data.get('class_name')
            if class_name:
                data['class_name'] = class_name
            
            section = data.get('section')
            if not section:  # Handles '', None, etc.
                data['section'] = None
            else:
                data['section'] = section

            quiz_type = data.get('quiz_type')
            if isinstance(quiz_type, dict):
                data['quiz_type'] = json.dumps(quiz_type)

            # ✅ Continue with quiz creation
            serializer = self.get_serializer(data=data)
            
            serializer.is_valid(raise_exception=True)
            
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
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return QuizUpdateSerializer
        return QuizSerializer
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a quiz and list structured questions from JSON field."""
        instance = self.get_object()
        from datetime import datetime, timedelta
        serializer = self.get_serializer(instance)
        data = serializer.data
        user = request.user
        role = getattr(user, 'role', '').upper()

        # 🚫 Restrict access time for STUDENT role
        if role == 'STUDENT':
            student = Student.objects.filter(email=user.email, is_deleted=False).first()
            now = datetime.now()
            quiz_time = instance.quiz_date
            access_window_minutes = instance.time_limit_minutes or 0
            quiz_end_time = quiz_time + timedelta(minutes=access_window_minutes)

            if not (quiz_time <= now <= quiz_end_time):
                return Response({
                    "status": "error",
                    "message": f"⏳ Quiz is not available right now. Please check your scheduled quiz time in your local timezone: {quiz_time}."
                }, status=403)

        # 📥 Fetch and prepare all questions
        all_questions = Question.objects.filter(quiz=instance).order_by('question_id')
        max_questions = instance.no_of_questions or 0

        def clean_question_data(item, question_id):
            """Clean a single question item based on role."""
            base = {
                "question_id": question_id,
                "question_number": item.get("question_number", ""),
                "question_type": item.get("type", "mcq"),
                "question": item.get("question", ""),
                "options": item.get("options", {}) if item.get("type") == "mcq" else {},
                "column_left_labels": item.get("column_left_labels", {}),
                "column_right_labels": item.get("column_right_labels", {}),
            }

            if role != "STUDENT":
                base.update({
                    "correct_answer": item.get("correct_answer", ""),
                    "explanation": item.get("explanation", ""),
                    "source_page": item.get("source_page", ""),
                })

            return base

        def extract_questions(q):
            """Parse question field (could be JSON string, dict, or list)."""
            result = []
            try:
                question_data = q.question
                if isinstance(question_data, str):
                    question_data = json.loads(question_data)

                if isinstance(question_data, list):
                    for item in question_data:
                        result.append(clean_question_data(item, q.question_id))
                elif isinstance(question_data, dict):
                    result.append(clean_question_data(question_data, q.question_id))
            except (ValueError, TypeError, json.JSONDecodeError):
                pass  # skip if not valid JSON

            return result

        # 🧾 Flatten all parsed questions
        flattened = []
        for q in all_questions:
            flattened.extend(extract_questions(q))

        # ✂️ Split current vs additional questions
        current_questions = flattened[:max_questions]
        additional_questions = flattened[max_questions:]

        # 📤 Final response structure
        data.update({
            "current_questions": current_questions,
            "additional_question_list": additional_questions,
            "total_questions": len(flattened),
            "returned_questions": len(current_questions),
            "balance_questions": len(additional_questions),
        })

        # Remove raw questions field if it's just a JSON string
        data.pop("questions", None)

        return Response(data)
        
    def put(self, request, quiz_id):
        try:
            quiz = get_object_or_404(Quiz, quiz_id=quiz_id, is_deleted=False)
            # 1. Track initial publish state
            was_unpublished = not quiz.is_published 
            add_question = request.data.get("add_question", False)

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

            # 2. Load all existing questions and calculate max question number
            existing_questions = Question.objects.filter(quiz=quiz)
            current_max_number = 0
            for q in existing_questions:
                try:
                    q_data = json.loads(q.question)
                    if isinstance(q_data, list):
                        for item in q_data:
                            q_num = item.get("question_number")
                            if isinstance(q_num, int):
                                current_max_number = max(current_max_number, q_num)
                    elif isinstance(q_data, dict):
                        q_num = q_data.get("question_number")
                        if isinstance(q_num, int):
                            current_max_number = max(current_max_number, q_num)
                except json.JSONDecodeError:
                    continue

            # 3. Update matching questions
            incoming_questions = request.data.get("questions", [])
            updated_numbers = []

            for new_q in incoming_questions:
                q_num = new_q.get("question_number")
                if q_num is None:
                    continue

                for question in existing_questions:
                    try:
                        q_list = json.loads(question.question)
                        if isinstance(q_list, list):
                            for idx, item in enumerate(q_list):
                                if str(item.get("question_number")) == str(q_num):
                                    item["explanation"] = new_q.get("explanation", item.get("explanation"))
                                    item["options"] = new_q.get("options", item.get("options"))
                                    item["question_number"] = q_num
                                    q_list[idx] = item
                                    question.question = json.dumps(q_list)
                                    question.save(update_fields=["question"])
                                    updated_numbers.append(q_num)
                                    break
                    except json.JSONDecodeError:
                        continue

            # 4. Add new questions to the same `mixed` question row
            if add_question:
                mixed_q = existing_questions.filter(question_type="mixed").first()

                if mixed_q:
                    try:
                        existing_q_data = json.loads(mixed_q.question)
                        if not isinstance(existing_q_data, list):
                            existing_q_data = [existing_q_data]
                    except Exception:
                        existing_q_data = []
                else:
                    # Edge case: if mixed question does not exist, create it ONCE
                    mixed_q = Question.objects.create(
                        quiz=quiz, question_type="mixed", question="[]"
                    )
                    existing_q_data = []

                for new_q in incoming_questions:
                    q_num = new_q.get("question_number")
                    if q_num and str(q_num) in [str(qn) for qn in updated_numbers]:
                        continue  # already updated above

                    current_max_number += 1
                    new_q["question_number"] = current_max_number
                    existing_q_data.append(new_q)

                mixed_q.question = json.dumps(existing_q_data)
                mixed_q.save(update_fields=["question"])  

            # 6. ✅ Only send mail if quiz is published now but wasn't before
            if was_unpublished and quiz.is_published:
                if not quiz.published_at:
                    quiz.published_at = timezone.now()
                    quiz.save(update_fields=["published_at"])

                students = Student.objects.filter(
                    department_id=quiz.department_id,
                    is_verified=True,
                    is_deleted=False,
                    class_name=quiz.class_name,
                    section=quiz.section    
                )

                domain = get_current_site(request).domain
                full_url = f"student/quiz/{quiz.quiz_id}/join/"
                quiz.url_link = full_url

                subject = f"Quiz Assigned: {quiz.title}"
                from_email = settings.DEFAULT_FROM_EMAIL

                for student in students:
                    if student.email:
                        message = f""" 
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="UTF-8">
                                    <style>
                                        body {{
                                            font-family: "Segoe UI", sans-serif;
                                            background-color: #f3f7fa;
                                            padding: 30px;
                                            color: #333;
                                        }}
                                        .email-container {{
                                            max-width: 600px;
                                            margin: auto;
                                            background-color: #ffffff;
                                            border-radius: 10px;
                                            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                                            padding: 30px;
                                            border-left: 6px solid #4a90e2;
                                        }}
                                        h2 {{
                                            color: #2c3e50;
                                            margin-top: 0;
                                        }}
                                        .info-box {{
                                            background-color: #e8f0fe;
                                            border: 1px solid #cfe2ff;
                                            border-radius: 8px;
                                            padding: 12px 16px;
                                            margin: 20px 0;
                                            font-size: 14px;
                                        }}
                                        .copy-link-box {{
                                            background-color: #f3e5f5;
                                            border: 1px dashed #ba68c8;
                                            font-family: monospace;
                                            font-size: 13px;
                                            padding: 8px 12px;
                                            margin: 10px 0;
                                            border-radius: 6px;
                                            word-break: break-word;
                                            user-select: all;
                                            color: #6a1b9a;
                                            display: inline-block;
                                        }}
                                    </style>
                                </head>
                                <body>
                                    <div class="email-container">
                                        <h2>Hello {student.name},</h2>
                                        <p>A new quiz has been assigned to you!</p>

                                        <div class="info-box">
                                            <strong>Quiz Title:</strong> {quiz.title}<br>
                                            <strong>Assigned On:</strong> {quiz.published_at.strftime('%Y-%m-%d %I:%M %p')}
                                        </div>

                                        <p>👉 Copy the link below to join your quiz:</p>
                                        <div class="copy-link-box">{quiz.url_link}</div>

                                        <p style="margin-top: 30px;">Best regards,<br>Redlitmus Team</p>
                                    </div>
                                </body>
                                </html>
                                """

                        send_mail(
                            subject,
                            message,
                            from_email,
                            [student.email],
                            fail_silently=False,
                            html_message=message,
                        )       

            return Response({
                "message": "Quiz and matching questions updated successfully.",
                "updated_question_numbers": updated_numbers,
                "quiz_id": quiz.quiz_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def destroy(self, request, *args, **kwargs):
        """
        Soft delete the quiz (set is_deleted=True),
        but hard delete all related data like questions and attempts.
        """
        try:
            quiz = self.get_object()

            # 1. Delete associated files from Supabase Storage
            supabase = create_client(supabase_url, supabase_key)

            documents = Document.objects.filter(quiz=quiz)
            file_paths_to_delete = [doc.storage_path for doc in documents if doc.storage_path]

            if file_paths_to_delete:
                for path in file_paths_to_delete:
                    supabase.storage.from_(SUPABASE_BUCKET).remove([path])

            # 1. Hard delete all related Question entries
            questions_deleted, _ = Question.objects.filter(quiz=quiz).delete()

            # 2. Hard delete all related QuizAttempt entries
            attempts_deleted, _ = QuizAttempt.objects.filter(quiz=quiz).delete()

            # 3. Hard delete all related StudentQuizAttempt entries
            student_attempts_deleted, _ = documents.delete()

            # 4. Soft delete the quiz
            quiz.is_deleted = True
            quiz.is_published = False
            quiz.save()

            return Response({
                "message": "Quiz soft-deleted successfully. Related data removed.",
                "files_deleted": len(file_paths_to_delete),
                "questions_deleted": questions_deleted,
                "quiz_attempts_deleted": attempts_deleted,
                "student_quiz_attempts_deleted": student_attempts_deleted,
                "quiz_id": quiz.quiz_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR )

class QuizQuestionGenerateView(APIView):
    """
    API endpoint to generate questions for a quiz. 
    This now uses the centralized DocumentProcessingService.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, quiz_id):
        # Step 1: Retrieve the quiz object
        quiz = get_object_or_404(Quiz, quiz_id=quiz_id)

        # Step 2: Get parameters from the request body
        num_questions = request.data.get('num_questions', 10)
        quiz_type = request.data.get('quiz_type', 'mixed')  # 'mixed', 'mcq', etc.
        question_type = request.data.get('question_type', 'mcq') # Fallback for non-mixed

        # Step 3: Find the associated document and extract its text
        # This assumes the document text is stored in a related model or needs to be extracted
        # from a file. For this example, we'll look for a Document associated with the quiz.
        document = Document.objects.filter(quiz=quiz).first()
        if not document or not document.extracted_text:
            # As a fallback, try to extract text from the first uploaded file if not already processed
            if quiz.uploadedfiles and len(quiz.uploadedfiles) > 0:
                try:
                    service = DocumentProcessingService()
                    # This is a simplified call; in a real scenario, you might need the file object
                    # For now, we assume the text can be extracted or is already there.
                    # This part might need more robust implementation based on file storage.
                    # Let's assume the text is in `document.extracted_text` for now.
                    return Response({"error": "Document text not processed. Please upload the document again."}, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    return Response({"error": f"Could not process document: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response({"error": "No document or extracted text found for this quiz."}, status=status.HTTP_404_NOT_FOUND)

        file_content = document.extracted_text

        # Step 4: Use the DocumentProcessingService to generate questions
        try:
            service = DocumentProcessingService()
            generated_questions = service.generate_questions_from_text(
                text=file_content,
                question_type=question_type,
                quiz_type=quiz_type,
                num_questions=num_questions
            )

            if not generated_questions:
                return Response({"error": "Failed to generate questions. The document might not have enough content."}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error during question generation for quiz {quiz_id}: {str(e)}")
            return Response({"error": f"An error occurred during question generation: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Step 5: Save the generated questions to the quiz
        # This assumes `quiz.questions` is a JSONField or similar
        if isinstance(quiz.questions, list):
            # Append new questions to existing ones if needed, or replace
            quiz.questions.extend(generated_questions)
        else:
            quiz.questions = generated_questions
        
        quiz.save()

        # Step 6: Return the newly generated questions
        return Response({
            "quiz_id": quiz.quiz_id,
            "message": f"{len(generated_questions)} questions generated and saved successfully.",
            "questions": generated_questions
        }, status=status.HTTP_200_OK)

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

                # ✅ Generate and save full join URL
                domain = get_current_site(request).domain
                full_url = f"student/quiz/{quiz.quiz_id}/join/"
                quiz.url_link = full_url

                # ✅ Fetch valid students in the same department/class/section
                student_filter = {
                    'department_id': quiz.department_id,
                    'class_name': quiz.class_name,
                    'is_verified': True,
                    'is_deleted': False,
                }

                if quiz.section:
                    student_filter['section'] = quiz.section  # ✅ only include if section exists

                students = Student.objects.filter(**student_filter)

                subject = f"Quiz Assigned: {quiz.title}"
                from_email = settings.DEFAULT_FROM_EMAIL

                for student in students:
                    if student.email:
                        message = f""" 
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body {{
                                    font-family: "Segoe UI", sans-serif;
                                    background-color: #f3f7fa;
                                    padding: 30px;
                                    color: #333;
                                }}
                                .email-container {{
                                    max-width: 600px;
                                    margin: auto;
                                    background-color: #ffffff;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                                    padding: 30px;
                                    border-left: 6px solid #4a90e2;
                                }}
                                h2 {{
                                    color: #2c3e50;
                                    margin-top: 0;
                                }}
                                .info-box {{
                                    background-color: #e8f0fe;
                                    border: 1px solid #cfe2ff;
                                    border-radius: 8px;
                                    padding: 12px 16px;
                                    margin: 20px 0;
                                    font-size: 14px;
                                }}
                                .copy-link-box {{
                                    background-color: #f3e5f5;
                                    border: 1px dashed #ba68c8;
                                    font-family: monospace;
                                    font-size: 13px;
                                    padding: 8px 12px;
                                    margin: 10px 0;
                                    border-radius: 6px;
                                    word-break: break-word;
                                    user-select: all;
                                    color: #6a1b9a;
                                    display: inline-block;
                                }}
                            </style>
                        </head>
                        <body>
                            <div class="email-container">
                                <h2>Hello {student.name},</h2>
                                <p>A new quiz has been assigned to you!</p>

                                <div class="info-box">
                                    <strong>Quiz Title:</strong> {quiz.title}<br>
                                    <strong>Assigned On:</strong> {quiz.published_at.strftime('%Y-%m-%d %I:%M %p')}
                                </div>

                                <p>👉 Copy the link below to join your quiz:</p>
                                <div class="copy-link-box">{quiz.url_link}</div>

                                <p style="margin-top: 30px;">Best regards,<br>Redlitmus Team</p>
                            </div>
                        </body>
                        </html>
                        """

                        send_mail(
                            subject,
                            message,
                            from_email,
                            [student.email],
                            fail_silently=False,
                            html_message=message,
                        )

            elif not quiz.is_published:
                # ✅ If unpublishing, clear these fields
                quiz.published_at = None
                quiz.url_link = None

            # Make sure `quiz_date` is timezone-aware
            if quiz.quiz_date and timezone.is_naive(quiz.quiz_date):
                quiz.quiz_date = timezone.make_aware(quiz.quiz_date)

            quiz.save()

            return Response({
                'status': 'success',
                'quiz_id': quiz.quiz_id,
                'is_published': quiz.is_published,
                'published_at': quiz.published_at,
                'quiz_url': quiz.url_link
            })

        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=500)

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
            'file_type': uploaded_file.content_type,
            'storage_path': f"{quiz.quiz_id}/{filename}",
            'file': filename
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
        'match': {
                'easy': "Use simple and well-known examples (like country-capital, fruit-color). Do not use uncommon items.",
                'medium': "Use academic-level pairings, like authors and their books, or scientific terms and definitions.",
                'hard': "Use technical or subject-specific match sets (e.g., algorithms and their time complexity, laws and discoverers)."
                }, 
        'mixed': {
            'easy': """
                Generate a mix of easy questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line, match questions
                2. Test basic understanding of concepts
                3. Have clear and unambiguous answers
                4. Are suitable for beginners
                5. Distribute questions evenly among different types
                """,
            'medium': """
                Generate a mix of medium difficulty questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line, match questions
                2. Test intermediate understanding of concepts
                3. May include some complex scenarios
                4. Require some analytical thinking
                5. Distribute questions evenly among different types
                """,
            'hard': """
                Generate a mix of hard questions about code that:
                1. Include multiple choice, fill-in-the-blank, true/false, and one-line, match questions
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
            
            # Generate questions using the document processing service
            service = DocumentProcessingService()
            questions = service.generate_questions_from_text(content, question_type, quiz_type, num_questions)
            
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
            
            # Generate questions using the document processing service
            service = DocumentProcessingService()
            questions = service.generate_questions_from_text(content, question_type, quiz_type, num_questions)
            
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
        'match': """Generate a 'match the following' question.
        Requirements:
        - Return ONLY a valid JSON list of 1 object.
        - Use 'question' for the question text.
        - Use 'column_left_labels' for the first column (e.g., {"A": "...", "B": "..."}).
        - Use 'column_right_labels' for the second column (e.g., {"1": "...", "2": "..."}).
        - Use 'correct_answer' as a dictionary that maps terms to their matched descriptions.
        - Use 'options': {} exactly.
        - Include 'explanation', 'source_page', and 'question_number' fields.
        Respond only with JSON.
        """

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
                                
                                # ✅ Handle Match the Following
                                if q.get('type') == 'match':
                                    if 'column_left_labels' not in q and 'correct_answer' in q:
                                        q['column_left_labels'] = {k: f"Item {k}" for k in q['correct_answer'].keys()}
                                    if 'column_right_labels' not in q and 'correct_answer' in q:
                                        q['column_right_labels'] = {v: f"Item {v}" for v in q['correct_answer'].values()}
                                    if 'options' not in q:
                                        q['options'] = {}
                                        
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

                        if q.get("type") == "match":
                            if not all(k in q for k in ["column_left_labels", "column_right_labels", "correct_answer"]):
                                return Response({"error": "Invalid match question structure."}, status=400)
                
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