from rest_framework import generics, status, viewsets,permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action,permission_classes
from django.shortcuts import get_object_or_404
from .models import Student
from .serializers import StudentSerializer
from .serializers import StudentBulkUploadSerializer
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
from teacher.models import Teacher
from django.views import View
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from departments.models import Department
from .utils import send_student_verification_email
from quiz.models import QuizAttempt,Quiz,Question
from django.core.mail import send_mail
from accounts.permissions import IsOwnerOrAdminOrReadOnly, IsTeacherOrAdmin
from django.utils import timezone
from datetime import timedelta
import json
from quiz.serializers import AvailableQuizSerializer
from quiz.models import QuizAttempt
from django.utils import timezone
from datetime import timedelta


class StudentViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing student instances.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'student_id'
    queryset = Student.objects.filter(is_deleted=False)

    @action(
        detail=False,
        methods=['post'],
        url_path='bulk_upload',
        permission_classes=[IsAuthenticated, IsTeacherOrAdmin]  # ✅ Apply here
    )
    def bulk_upload(self, request):
        serializer = StudentBulkUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'status': 'success',
                'message': result['message'],
                'data': {
                    'total_rows': result['total_rows'],
                    'success_count': result['success_count'],
                    'error_count': result['error_count'],
                    'errors': result['errors']
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'status': 'error',
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        # Create a sample Excel file
        data = {
            'register_number': ['1234567890', '9876543210'],
            'class_name': ['10'],
            'section': ['A'],
            'name': ['John Doe', 'Jane Smith'],
            'email': ['john@example.com', 'jane@example.com'],
            'phone': ['1234567890', '9876543210'],
            'department_id': [1, 2]
        }
        
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Students')
            worksheet = writer.sheets['Students']
            worksheet.set_column('A:D', 20)
        
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=student_upload_template.xlsx'
        return response
    
    def perform_update(self, serializer):
        # Update last_modified_by
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        serializer.save(last_modified_by=user_identifier)
    
    @action(detail=True, methods=['post'])
    def soft_delete(self, request, student_id=None):
        """Soft delete a student by setting is_deleted=True"""
        student = self.get_object()
        user_identifier = getattr(request.user, 'username', 
                               getattr(request.user, 'email', 'system'))
        student.is_deleted = True
        student.last_modified_by = user_identifier
        student.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """List all deleted students"""
        deleted_students = Student.objects.filter(is_deleted=True)
        page = self.paginate_queryset(deleted_students)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(deleted_students, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['post'])
    def filter_students(self, request):
        """
        Filter students by department_id and/or student_name
        Expected JSON payload:
        {
            "department_id": 1,  # optional
            "student_name": "deepika"  # optional
        }
        """
        try:
            department_id = request.data.get('department_id')
            student_name = request.data.get('student_name', '').strip()
            
            # If no filters provided, return all non-deleted students
            if department_id is None and not student_name:
                queryset = Student.objects.filter(is_deleted=False)
                serializer = self.get_serializer(queryset, many=True)
                return Response({
                    'status': 'success',
                    'message': 'All active students retrieved successfully',
                    'count': queryset.count(),
                    'data': serializer.data
                })
                
            # Start with base queryset (only non-deleted students)
            queryset = Student.objects.filter(is_deleted=False)
            
            # Apply department filter if provided
            if department_id is not None:
                queryset = queryset.filter(department_id=department_id)
            
            # Apply name filter if provided - using icontains for partial matching
            if student_name:
                queryset = queryset.filter(name__icontains=student_name)
                
            # Get the count before pagination
            total_count = queryset.count()
            
            # Apply pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'status': 'success',
                    'message': 'Students retrieved successfully',
                    'count': total_count,
                    'data': serializer.data
                })
                
            # If no pagination
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'status': 'success',
                'message': 'Students retrieved successfully',
                'count': total_count,
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StudentListView(generics.ListCreateAPIView):
    """
    View for listing all students or creating a new student.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    # def get_queryset(self):
    #     return Student.objects.filter(is_deleted=False)
    
    def get_queryset(self):
        user = self.request.user

        # Admin: See all students
        if hasattr(user, 'role') and user.role == 'ADMIN':
            return Student.objects.filter(is_deleted=False)

        # Teacher: See students in their departments
        elif hasattr(user, 'role') and user.role == 'TEACHER':
            teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
            
            if not teacher:
                return Student.objects.none()

            department_ids = teacher.department_ids or []

            return Student.objects.filter(is_deleted=False, department_id__in=department_ids)

        # Other users: return none
        else:
            return Student.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user.username,
            last_modified_by=self.request.user.username
        )

class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating or deleting a student instance.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'student_id'
    
    def get_queryset(self):
        return Student.objects.filter(is_deleted=False)
    
    def perform_update(self, serializer):
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        serializer.save(last_modified_by=user_identifier)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        instance.is_deleted = True
        instance.last_modified_by = user_identifier
        instance.save()
        return Response(
            {'status': 'success', 'message': 'Student deleted successfully'},
            status=status.HTTP_200_OK
        )

class StudentCreateView(generics.CreateAPIView):
    """
    View specifically for creating new students via the /create_student/ endpoint.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        student = serializer.save(
            created_by=user_identifier,
            last_modified_by=user_identifier
            )
        send_student_verification_email(student)

class StudentVerificationView(View):
    def get(self, request, student_id):
        try:
            student = Student.objects.get(student_id=student_id)
            
            # Check if already verified
            if student.is_verified:
                return HttpResponse(
                    '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">'
                    '<h2>Verification Link Expired</h2>'
                    '<p>This verification link has already been used or is no longer valid.</p>'
                    '</div>',
                    status=410
                )

            # Mark student as verified
            student.is_verified = True
            student.save()
            
            # Optionally, you can log the user in here
            # login(request, student.user)  # If you have a user object linked to the student

            return HttpResponse(
                '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">'
                '<h1>Verification Successful!</h1>'
                '<p>Your account has been successfully verified. You can now log in.</p>'
                '</div>'
            )
        except Student.DoesNotExist:
            return HttpResponse(
                '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">'
                '<h2>Invalid Verification Link</h2>'
                '<p>The verification link is invalid or has expired. Please request a new one.</p>'
                '</div>',
                status=404
            )
        except Exception as e:
            # Generic error for any other issues
            return HttpResponse(
                f'<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">'
                f'<h2>Verification Failed</h2>'
                f'<p>An unexpected error occurred: {str(e)}</p>'
                f'</div>',
                status=500
            )

class AvailableQuizzesView(generics.ListAPIView):
    """
    View to list available quizzes for a student.
    - Quizzes are filtered based on the student's department.
    - Quizzes that the student has already attempted are excluded.
    """
    serializer_class = AvailableQuizSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            student = Student.objects.get(email=user.email)
        except Student.DoesNotExist:
            return Quiz.objects.none()

        # Get IDs of quizzes already attempted by the student
        attempted_quiz_ids = QuizAttempt.objects.filter(student=student).values_list('quiz__quiz_id', flat=True)

        # Filter quizzes for the student's department, not yet attempted
        now = timezone.now()
        return Quiz.objects.filter(
            department=student.department,
            is_published=True,
            is_deleted=False,
            quiz_date__lte=now 
        ).exclude(
            quiz_id__in=attempted_quiz_ids
        )

class SubmitQuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = request.data
            quiz_id = data.get("quiz_id")
            submitted_questions = data.get("questions")

            if not quiz_id or not isinstance(submitted_questions, list):
                return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

            user = request.user
            student = Student.objects.filter(email=user.email, is_deleted=False).first()
            quiz = Quiz.objects.filter(quiz_id=quiz_id, is_deleted=False).first()

            if not student or not quiz:
                return Response({"error": "Invalid student or quiz"}, status=status.HTTP_400_BAD_REQUEST)

            # Get all question objects for the quiz and build a lookup of subquestions
            all_question_objs = Question.objects.filter(quiz=quiz)
            question_map = {}

            for q_obj in all_question_objs:
                try:
                    sub_questions = json.loads(q_obj.question)
                    for sub_q in sub_questions:
                        key = (q_obj.question_id, sub_q.get("question_number"))
                        question_map[key] = {
                            "correct_answer": str(sub_q.get("correct_answer")).strip().lower(),
                            "type": sub_q.get("type"),
                            "question": sub_q.get("question"),
                            "options": sub_q.get("options", {}),
                            "explanation": sub_q.get("explanation", "")
                        }
                except Exception:
                    continue

            # Evaluate each submitted answer
            evaluated_answers = []
            score = 0

            for submitted in submitted_questions:
                qid = submitted.get("question_id")
                qnum = submitted.get("question_number")
                student_answer = str(submitted.get("answer", "")).strip().lower()
                key = (qid, qnum)

                correct = question_map.get(key)
                if correct:
                    correct_answer = correct.get("correct_answer", "")
                    is_correct = student_answer == correct_answer
                    if is_correct:
                        score += 1

                    evaluated_answers.append({
                        "question_id": qid,
                        "question_number": qnum,
                        "question": correct.get("question"),
                        "question_type": correct.get("type"),
                        "options": correct.get("options"),
                        "answer": submitted.get("answer"),
                        "correct_answer": correct_answer,
                        "explanation": correct.get("explanation"),
                        "is_correct": is_correct
                    })
                else:
                    # fallback if question not found
                    evaluated_answers.append({
                        "question_id": qid,
                        "question_number": qnum,
                        "question": submitted.get("question", ""),
                        "question_type": submitted.get("question_type", ""),
                        "options": submitted.get("options", {}),
                        "answer": submitted.get("answer"),
                        "correct_answer": "N/A",
                        "explanation": "Not found",
                        "is_correct": False
                    })

            passing_score = quiz.passing_score or int(quiz.no_of_questions * 0.5)
            result = "pass" if score >= passing_score else "fail"

            QuizAttempt.objects.create(
                student=student,
                quiz=quiz,
                question_answer=evaluated_answers,
                score=score,
                result=result,
                created_by=student.email,
                last_modified_by=student.email
            )

            return Response({
                "message": "Quiz submitted successfully",
                "quiz_id": quiz.quiz_id,
                "student_id": student.student_id,
                "score": score,
                "total_questions": len(evaluated_answers),
                "result": result
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "error": "Something went wrong",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RetrieveQuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, quiz_id):
        user = request.user
        student = Student.objects.filter(email=user.email, is_deleted=False).first()
        if not student:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        attempt = (
            QuizAttempt.objects.filter(student_id=student.student_id, quiz__quiz_id=quiz_id)
            .order_by("-created_at")
            .first()
        )

        if not attempt:
            return Response({"error": "No attempt found for this quiz"}, status=status.HTTP_404_NOT_FOUND)

        detailed_answers = []
        answered_question_numbers = set()
        correct_answer_count = 0
        wrong_answer_count = 0

        for item in attempt.question_answer:
            question_id = item.get("question_id")
            question_number = item.get("question_number")
            student_answer = item.get("answer")
            is_correct = item.get("is_correct", False)

            if question_number is not None:
                answered_question_numbers.add(question_number)

            if is_correct:
                correct_answer_count += 1
            else:
                wrong_answer_count += 1

            try:
                question_obj = Question.objects.get(question_id=question_id)
                try:
                    sub_questions = json.loads(question_obj.question)
                except Exception:
                    sub_questions = []

                matched = next(
                    (q for q in sub_questions if q.get("question_number") == question_number),
                    None
                )

                if matched:
                    detailed_answers.append({
                        "question_number": question_number,
                        "question": matched.get("question"),
                        "type": matched.get("type"),
                        "options": matched.get("options"),
                        "correct_answer": matched.get("correct_answer"),
                        "student_answer": student_answer,
                        "explanation": matched.get("explanation", ""),
                        "is_correct": is_correct
                    })
                else:
                    # Fallback if no matching subquestion
                    detailed_answers.append({
                        "question_number": question_number,
                        "question": item.get("question", "N/A"),
                        "type": item.get("question_type", "unknown"),
                        "options": item.get("options", {}),
                        "correct_answer": "N/A",
                        "student_answer": student_answer,
                        "explanation": "Question details not found",
                        "is_correct": is_correct
                    })
            except Question.DoesNotExist:
                continue

        # Get all question numbers from this quiz
        try:
            question_obj = Question.objects.get(question_id=attempt.question_answer[0]["question_id"])
            all_questions_json = json.loads(question_obj.question)
            all_question_numbers = {q.get("question_number") for q in all_questions_json}
        except Exception:
            all_question_numbers = set()

        total_questions = len(all_question_numbers)
        attended_questions = len(answered_question_numbers)
        not_answered_questions = total_questions - attended_questions

        # Avoid negative values
        if not_answered_questions < 0:
            not_answered_questions = 0

        percentage = (attempt.score / total_questions) * 100 if total_questions > 0 else 0

        # Calculate rank only if result is 'pass'
        rank = None
        if attempt.result and attempt.result.lower() == "pass":
            all_attempts = QuizAttempt.objects.filter(
                quiz__quiz_id=quiz_id, result__iexact="pass"
            ).order_by("-score", "created_at")

            for idx, a in enumerate(all_attempts, start=1):
                if a.student_id == student.student_id:
                    rank = idx
                    break

        # You may have a started_at and ended_at or timer field — this is placeholder
        attempt_duration = 0  # TODO: Replace with actual duration if you have it
        # ✅ Duration logic (replace with actual if you store start and end time)
        if hasattr(attempt, 'started_at') and hasattr(attempt, 'ended_at') and attempt.started_at and attempt.ended_at:
            attempt_duration = attempt.ended_at - attempt.started_at
        else:
            attempt_duration = timedelta(minutes=attempt.quiz.time_limit_minutes)

        return Response({
            "attempt_id": attempt.attempt_id,
            "student_register_number": student.register_number,
            "class_name": student.class_name,
            "section" : student.section,
            "attempt_date": attempt.created_at.date(),
            "attempt_time": str(attempt.created_at.time()),
            "quiz_attempt_question" : attempt.question_answer,
            "attempt_duration": str(attempt_duration),
            "quiz_duration": attempt.quiz.time_limit_minutes,
            "total_duration": f"{attempt.quiz.time_limit_minutes} mins",
            "student_attend_email": student.email,
            "student_attend_name": student.name,
            "total_time": attempt.created_at,  # can be replaced with timer/ending timestamp
            "quiz_id": attempt.quiz.quiz_id,
            "quiz_name": attempt.quiz.title,
            "score": attempt.score,
            "result": attempt.result,
            "total_questions": total_questions,
            "attended_questions": attended_questions,
            "not_answered_questions": not_answered_questions,
            "correct_answer_count": correct_answer_count,
            "wrong_answer_count": wrong_answer_count,
            "percentage": round(percentage, 2),
            "rank": rank,
            "detailed_answers": detailed_answers
        }, status=status.HTTP_200_OK)

class ListStudentQuizResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = getattr(user, "role", None)

        if role == "ADMIN":
            attempts = QuizAttempt.objects.select_related('quiz', 'student')\
                .filter(quiz__isnull=False)\
                .order_by('-created_at')

        elif role == "TEACHER":
            teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
            if not teacher:
                return Response({"error": "Teacher not found"}, status=status.HTTP_404_NOT_FOUND)

            attempts = QuizAttempt.objects.filter(
                quiz__is_deleted=False
            ).select_related('quiz', 'student').order_by('-created_at')

        elif role == "STUDENT":
            student = Student.objects.filter(email=user.email, is_deleted=False).first()
            if not student:
                return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

            attempts = QuizAttempt.objects.select_related('quiz')\
                .filter(student=student, quiz__isnull=False)\
                .order_by('-created_at')

        else:
            return Response({"error": "Invalid role"}, status=status.HTTP_403_FORBIDDEN)

        # ✅ No quiz attempts found
        if not attempts.exists():
            return Response({"message": "No quiz attempts found."}, status=status.HTTP_200_OK)

        result_data = []

        for attempt in attempts:
            if not attempt.quiz:
                continue

            answered_question_numbers = set()
            correct_answer_count = 0
            wrong_answer_count = 0
            atempt_question=attempt.question_answer
            if not atempt_question:
                continue

            for item in attempt.question_answer:
                question_number = item.get("question_number")
                is_correct = item.get("is_correct", False)
                if question_number is not None:
                    answered_question_numbers.add(question_number)
                if is_correct:
                    correct_answer_count += 1
                else:
                    wrong_answer_count += 1

            # total questions
            try:
                question_id = attempt.question_answer[0]["question_id"]
                question_obj = Question.objects.get(question_id=question_id)
                question_data = json.loads(question_obj.question) if isinstance(question_obj.question, str) else question_obj.question
                total_questions = len(question_data)
            except Exception:
                total_questions = 0

            attended_questions = len(answered_question_numbers)
            not_answered_questions = max(total_questions - attended_questions, 0)
            percentage = (attempt.score / total_questions) * 100 if total_questions else 0
            # Calculate rank
            rank = None
            if attempt.result and attempt.result.lower() == "pass":
                quiz_id = attempt.quiz.quiz_id
                passed_attempts = QuizAttempt.objects.filter(
                    quiz__quiz_id=quiz_id,
                    result__iexact="pass"
                ).order_by("-score", "created_at")

                for idx, a in enumerate(passed_attempts, start=1):
                    if a.student_id == attempt.student_id:
                        rank = idx
                        break

            # Duration
            if hasattr(attempt, 'started_at') and hasattr(attempt, 'ended_at') and attempt.started_at and attempt.ended_at:
                attempt_duration = attempt.ended_at - attempt.started_at
            else:
                attempt_duration = timedelta(minutes=attempt.quiz.time_limit_minutes)
            
            data = {
                "quiz_id": attempt.quiz.quiz_id,
                "quiz_title": attempt.quiz.title,
                "student_id" : attempt.student_id,
                "student_name" : attempt.student.name,
                "score": attempt.score,
                "student_mail" : attempt.student.email,
                "percentage": round(percentage, 2),
                "rank": rank,
                "result": attempt.result,
                "attempted_at": attempt.created_at,
                "total_questions": total_questions,
                "attended_questions": attended_questions,
                "not_answered_questions": not_answered_questions,
                "correct_answer_count": correct_answer_count,
                "wrong_answer_count": wrong_answer_count,
                "quiz_duration": attempt.quiz.time_limit_minutes,
                "attempt_duration": str(attempt_duration),
                "total_duration": f"{attempt.quiz.time_limit_minutes} mins",
                "attempt_time": str(attempt.created_at.time()),
                "attempt_date": attempt.created_at.date(),
                "total_time": attempt.created_at,
            }

            if role in ["ADMIN", "TEACHER"]:
                data["student_name"] = attempt.student.name
                data["class_name"] = attempt.student.class_name
                data["section"] = attempt.student.section
                data["register_number"] = attempt.student.register_number
           
            result_data.append(data)

        return Response(result_data, status=status.HTTP_200_OK)

class AdminTeacherViewReport(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, quiz_id):
        user = request.user
        role = getattr(user, 'role', None)

        if role not in ("ADMIN", "TEACHER"):
            return Response({"error": "Access denied. Only Admin and Teacher allowed."}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.query_params.get("student_id")
        if not student_id:
            return Response({"error": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        student = Student.objects.filter(student_id=student_id, is_deleted=False).first()
        if not student:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        attempt = QuizAttempt.objects.filter(student=student, quiz__quiz_id=quiz_id).order_by("-created_at").first()
        if not attempt:
            return Response({"error": "No attempt found for this quiz"}, status=status.HTTP_404_NOT_FOUND)

        detailed_answers = []
        correct_answer_count = 0
        wrong_answer_count = 0

        # Fetch all questions for this quiz once
        question_map = {}
        question_objs = Question.objects.filter(quiz__quiz_id=quiz_id)
        for q_obj in question_objs:
            qid = q_obj.question_id
            try:
                q_list = json.loads(q_obj.question) if isinstance(q_obj.question, str) else q_obj.question
                for q in q_list:
                    key = (qid, q.get("question_number"))
                    question_map[key] = q
            except Exception:
                continue

        # Process only questions the student answered
        for a in attempt.question_answer:
            qid = a.get("question_id")
            q_no = a.get("question_number")
            key = (qid, q_no)

            question_data = question_map.get(key)
            if not question_data:
                continue  # skip if the question content is missing

            is_correct = a.get("is_correct", False)
            student_answer = a.get("answer")

            if is_correct:
                correct_answer_count += 1
            else:
                wrong_answer_count += 1

            detailed_answers.append({
                "question_number": q_no,
                "question": question_data.get("question"),
                "type": question_data.get("type"),
                "options": question_data.get("options", {}),
                "correct_answer": question_data.get("correct_answer"),
                "student_answer": student_answer,
                "explanation": question_data.get("explanation", ""),
                "is_correct": is_correct
            })

        total_questions = len(Question.objects.filter(quiz__quiz_id=quiz_id).values_list("question", flat=True))  # optional logic here
        attended_questions = len(detailed_answers)
        not_answered_questions = max(0, total_questions - attended_questions)
        percentage = (attempt.score / total_questions) * 100 if total_questions else 0

        # Rank logic (only for pass)    
        rank = None
        if attempt.result.lower() == "pass":
            all_attempts = QuizAttempt.objects.filter(quiz__quiz_id=quiz_id, result__iexact="pass").order_by("-score", "created_at")
            for idx, a in enumerate(all_attempts, start=1):
                if a.student_id == student.student_id:
                    rank = idx
                    break

        # Duration calculation
        if hasattr(attempt, 'started_at') and hasattr(attempt, 'ended_at') and attempt.started_at and attempt.ended_at:
            attempt_duration = attempt.ended_at - attempt.started_at
        else:
            attempt_duration = timedelta(minutes=attempt.quiz.time_limit_minutes)

        return Response({
            "attempt_id": attempt.attempt_id,
            "quiz_id": attempt.quiz.quiz_id,
            "quiz_name": attempt.quiz.title,
            "student_id": student.student_id,
            "student_class": student.class_name,
            "student_section": student.section,
            "student_register_number": student.register_number,
            "student_attend_email": student.email,
            "student_attend_name": student.name,
            "attempt_date": attempt.created_at.date(),
            "attempt_time": str(attempt.created_at.time()),
            "attempt_duration": str(attempt_duration),
            "quiz_duration": attempt.quiz.time_limit_minutes,
            "total_time": attempt.created_at,
            "score": attempt.score,
            "result": attempt.result,
            "total_questions": total_questions,
            "attended_questions": attended_questions,
            "not_answered_questions": not_answered_questions,
            "correct_answer_count": correct_answer_count,
            "wrong_answer_count": wrong_answer_count,
            "percentage": round(percentage, 2),
            "rank": rank,
            "detailed_answers": detailed_answers
        }, status=status.HTTP_200_OK)

class FetchQuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, quiz_id):
        user = request.user
        student = Student.objects.filter(email=user.email, is_deleted=False).first()
        quiz = Quiz.objects.filter(quiz_id=quiz_id, is_deleted=False).first()

        if not student or not quiz:
            return Response({"error": "Invalid student or quiz"}, status=status.HTTP_400_BAD_REQUEST)

        attempt = QuizAttempt.objects.filter(student=student, quiz=quiz).order_by("-created_at").first()
        if not attempt:
            return Response({"error": "No attempt found for this quiz"}, status=status.HTTP_404_NOT_FOUND)

        # Get all questions from the question_id used in this attempt
        try:
            q_entry = attempt.question_answer[0]
            question_obj = Question.objects.get(question_id=q_entry["question_id"])
            question_list = question_obj.question
            if isinstance(question_list, str):
                question_list = json.loads(question_list)
        except:
            question_list = []

        total_questions = len(question_list)
        percentage = (attempt.score / total_questions) * 100 if total_questions > 0 else 0

        # Calculate rank
        rank = None
        if attempt.result.lower() == "pass":
            all_attempts = QuizAttempt.objects.filter(quiz=quiz, result__iexact="pass").order_by("-score", "created_at")
            for idx, a in enumerate(all_attempts, start=1):
                if a.student_id == student.student_id:
                    rank = idx
                    break

        # Build a mapping from question_number to answer
        answer_map = {
            (int(a["question_number"])): a for a in attempt.question_answer
        }

        # Build detailed_answers: include all questions, mark unanswered if not in answer_map
        detailed_answers = []
        for q in question_list:
            q_num = int(q.get("question_number"))
            q_data = {
                "question_number": q_num,
                "question": q.get("question"),
                "type": q.get("type"),
                "options": q.get("options") or {},
                "correct_answer": q.get("correct_answer"),
                "explanation": q.get("explanation", ""),
            }

            if q_num in answer_map:
                ans = answer_map[q_num]
                q_data["student_answer"] = ans.get("answer")
                q_data["is_correct"] = ans.get("is_correct", False)
            else:
                q_data["student_answer"] = None
                q_data["is_correct"] = False

            detailed_answers.append(q_data)
        # # ✅ Conditionally show result only after quiz ends
        # quiz_end_time = attempt.quiz.quiz_date + timedelta(minutes=attempt.quiz.time_limit_minutes)
        # now = timezone.now()
        # # show_result = now >= quiz_end_time
        # if now >= quiz_end_time and attempt.created_at >= quiz.quiz_date:
        #     show_result = True
        # else:
        #     show_result = False
        # print("attempt.quiz.quiz_date:",attempt.quiz.quiz_date)
        # print("attempt.quiz.time_limit_minutes:",attempt.quiz.time_limit_minutes)
        # print("attempt.created_at:",attempt.created_at)
        # print("now:",now)
        # print("quiz_end_time:",quiz_end_time)
        # print("show_result:",show_result)
        # if show_result:
        return Response({
            "attempt_id": attempt.attempt_id,
            "quiz_id": quiz.quiz_id,
            "quiz_name": quiz.title,
            "student_id": student.student_id,
            "student_name": student.name,
            "student_register_number": student.register_number,
            "score": attempt.score,
            "total_questions": total_questions,
            "result": attempt.result,
            "question_answer": attempt.question_answer,
            "detailed_answers": detailed_answers,
            "percentage": round(percentage, 2),
            "rank": rank,
            "attempt_date": attempt.created_at.date(),
            "attempt_time": str(attempt.created_at.time()),
            "quiz_duration": quiz.time_limit_minutes,
            "total_time": attempt.created_at,
        }, status=status.HTTP_200_OK)
        # else:
        #     return Response({
        #         "quiz_id": attempt.quiz.quiz_id,
        #         "quiz_title": attempt.quiz.title,
        #         "message": "The quiz time is not finished. Result will be available after quiz end time."
        #     }, status=status.HTTP_200_OK)

class QuizReminderStudent(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]

    def post(self, request):
        """
        Send email reminders to students X days before the quiz quiz_date.
        Payload: { "day": 3 }
        """
        try:
            user = request.user
            if not hasattr(user, "role") or user.role != "TEACHER":
                return Response({"error": "Only teachers can send reminders."}, status=status.HTTP_403_FORBIDDEN)

            teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
            if not teacher:
                return Response({"error": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

            days_before = int(request.data.get("day", 3))

            # Convert now to UTC to match quiz_date timezone
            now_utc = timezone.now().astimezone(timezone.utc).date()
            target_date = now_utc + timedelta(days=days_before)

            # Get quizzes whose date (only date portion) is exactly `days_before` ahead
            department_ids = teacher.department_ids if isinstance(teacher.department_ids, list) else [teacher.department_ids]
            quizzes = Quiz.objects.filter(
                department_id__in=department_ids,
                is_deleted=False,
            )
            # Filter quizzes manually by checking date difference
            quizzes_to_remind = []
            for quiz in quizzes:
                quiz_date = quiz.quiz_date.astimezone(timezone.utc).date()
                if quiz_date == target_date:
                    quizzes_to_remind.append(quiz)

            if not quizzes_to_remind:
                return Response({"message": f"No quizzes scheduled in {days_before} days."}, status=200)

            # Notify students
            students = Student.objects.filter(department_id__in=department_ids, is_deleted=False)

            for student in students:
                for quiz in quizzes_to_remind:
                    send_mail(
                        subject=f"Reminder: Upcoming Quiz - {quiz.title}",
                        message=(
                            f"Hi {student.name},\n\n"
                            f"This is a reminder that your quiz \"{quiz.title}\" is scheduled on {quiz.quiz_date.strftime('%Y-%m-%d %H:%M')}.\n\n"
                            f"Please be prepared!"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[student.email],
                        fail_silently=True,
                    )

            return Response({
                "message": f"Reminder sent to {students.count()} students for {len(quizzes_to_remind)} quiz/quizzes happening in {days_before} days."
            }, status=200)

        except Exception as e:
            return Response({"error": "Failed to send reminders", "details": str(e)}, status=500)