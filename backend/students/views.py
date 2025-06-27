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
        print("user:",user)

        # Admin: See all students
        if hasattr(user, 'role') and user.role == 'ADMIN':
            print("Admin")
            return Student.objects.filter(is_deleted=False)

        # Teacher: See students in their departments
        elif hasattr(user, 'role') and user.role == 'TEACHER':
            print("Teacher")
            teacher = Teacher.objects.filter(email=user.email, is_deleted=False).first()
            
            if not teacher:
                print("No matching teacher found.")
                return Student.objects.none()  # Return empty queryset if no teacher found

            department_ids = teacher.department_ids or []
            print("department_ids:", department_ids)

            return Student.objects.filter(is_deleted=False, department_id__in=department_ids)

        # Other users: return none
        else:
            print("Unauthorized or unknown role.")
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

            if student.is_verified:
                return HttpResponse("""
                    <html>
                        <body>
                            <p>You have already verified your enrollment.</p>
                            <button disabled style="padding: 10px 20px; background-color: #ccc; color: white; border-radius: 5px;">Verified</button>
                        </body>
                    </html>
                """)

            # ✅ 1. Mark student as verified
            student.is_verified = True
            student.save()

           # ✅ 2. Get department and teacher
            department = Department.objects.filter(department_id=student.department_id, is_deleted=False).first()
            department_name = department.name if department else "Unknown"
            teacher = Teacher.objects.filter(department_ids__contains=[student.department_id], is_deleted=False).first()
            
            if teacher:
                teacher_email = teacher.email
                subject = f"Student {student.name} Verified"
                plain_message = (
                    f"Dear {teacher.name if teacher.name else 'Teacher'},\n\n"
                    f"The student {student.name} has successfully verified their enrollment in the {department_name} department.\n\n"
                    f"Details:\n"
                    f"- Name: {student.name}\n"
                    f"- Email: {student.email}\n"
                    f"- Department: {department_name}\n\n"
                    f"Regards,\nRedlitmus teams"
                )

                html_message = f"""
                <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <p>Dear {teacher.name if teacher.name else "Teacher"},</p>
                    <p>The student <strong>{student.name}</strong> has successfully 
                    <strong>verified </strong> their enrollment in the <strong>{department_name}</strong> department.</p>

                    <p><strong>Student Details:</strong></p>
                    <ul>
                    <li><strong>Name:</strong> {student.name}</li>
                    <li><strong>Email:</strong> {student.email}</li>
                    <li><strong>Department:</strong> {department_name}</li>
                    </ul>

                    <p>You may now proceed with any onboarding or academic actions required for this student.</p>

                    <p>Best regards,<br>
                    <em>Redlitmus teams</em></p>
                </body>
                </html>
                """

                send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[teacher.email],
                    html_message=html_message 
                )

            # ✅ 3. Show disabled "Verified" button to student
            return HttpResponse(f"""
                <html>
                    <body>
                        <p>Thank you {student.name}, you have successfully confirmed your enrollment.</p>
                        <button disabled style="padding: 10px 15px; background-color: #ccc; 
                                                color: white; border-radius: 5px;">
                            Verified
                        </button>
                    </body>
                </html>
            """)

        except Student.DoesNotExist:
            return HttpResponse("Invalid or expired verification link.")

class SubmitQuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data
        quiz_id = data.get("quiz_id")
        question_entries = data.get("questions")

        if not quiz_id or not isinstance(question_entries, list):
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        student = Student.objects.filter(email=user.email, is_deleted=False).first()
        quiz = Quiz.objects.filter(quiz_id=quiz_id, is_deleted=False).first()

        if not student or not quiz:
            return Response({"error": "Invalid student or quiz"}, status=status.HTTP_400_BAD_REQUEST)

        score = 0
        total = 0
        stored_answers = []

        for q in question_entries:
            question_id = q.get("question_id")
            question_number = q.get("question_number")
            answer = q.get("answer")

            if not question_id or answer is None or question_number is None:
                continue

            try:
                question_obj = Question.objects.get(question_id=question_id)
                subquestions = question_obj.question

                # ✅ Ensure subquestions is a list
                if isinstance(subquestions, str):
                    subquestions = json.loads(subquestions)

                if not isinstance(subquestions, list):
                    continue

                # ✅ Match subquestion by question_number (ensure type consistency)
                matched = next(
                    (subq for subq in subquestions if int(subq.get("question_number", -1)) == int(question_number)),
                    None
                )

                if not matched:
                    continue

                correct_answer = str(matched.get("correct_answer", "")).strip().lower()
                submitted_answer = str(answer).strip().lower()

                is_correct = (correct_answer == submitted_answer)
                if is_correct:
                    score += 1

                total += 1

                stored_answers.append({
                    "question_id": question_id,
                    "question_number": question_number,
                    "answer": answer,
                    "is_correct": is_correct
                })

            except Exception as e:
                print(f"[ERROR] While processing question {question_id} - {e}")
                continue

        passing_score = quiz.passing_score or (quiz.no_of_questions * 0.5)
        result = "pass" if score >= passing_score else "fail"

        QuizAttempt.objects.create(
            student=student,
            quiz=quiz,
            question_answer=stored_answers,
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
            "total_questions": total,
            "result": result
        }, status=status.HTTP_201_CREATED)

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
                sub_questions = question_obj.question

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

            except Question.DoesNotExist:
                continue

        try:
            question_obj = Question.objects.get(question_id=attempt.question_answer[0]["question_id"])
            all_questions = question_obj.question
            all_question_numbers = {q.get("question_number") for q in all_questions}
        except:
            all_question_numbers = set()

        total_questions = len(all_question_numbers)
        attended_questions = len(answered_question_numbers)
        not_answered_questions = total_questions - attended_questions

        percentage = (attempt.score / total_questions) * 100 if total_questions > 0 else 0

        # 🟡 Only calculate rank if passed
        rank = None
        if attempt.result.lower() == "pass":
            all_attempts = QuizAttempt.objects.filter(
                quiz__quiz_id=quiz_id, result__iexact="pass"
            ).order_by("-score", "created_at")

            for idx, a in enumerate(all_attempts, start=1):
                if a.student_id == student.student_id:
                    rank = idx
                    break

        return Response({
            "attempt_id": attempt.attempt_id,
            "quiz_id": attempt.quiz.quiz_id,
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

            # Only quizzes created by this teacher
            # teacher_full_name = teacher.name.strip()
            attempts = QuizAttempt.objects.filter(
                quiz__is_deleted=False  # or use quiz__creator=teacher.get_full_name()
            ).select_related('quiz', 'student').order_by('-created_at')
            # attempts = QuizAttempt.objects.select_related('quiz', 'student')\
            #     .filter(quiz__is_deleted=False, quiz__created_by=teacher_full_name)\
            #     .order_by('-created_at')

        elif role == "STUDENT":
            student = Student.objects.filter(email=user.email, is_deleted=False).first()
            if not student:
                return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

            attempts = QuizAttempt.objects.select_related('quiz')\
                .filter(student=student, quiz__isnull=False)\
                .order_by('-created_at')

        else:
            return Response({"error": "Invalid role"}, status=status.HTTP_403_FORBIDDEN)

        result_data = []

        for attempt in attempts:
            if not attempt.quiz:
                continue  # skip broken data

            quiz_id = attempt.quiz.quiz_id

            # Calculate rank only if result is pass
            rank = None
            if attempt.result.lower() == "pass":
                all_quiz_attempts = QuizAttempt.objects.filter(
                    quiz__quiz_id=quiz_id,
                    result__iexact="pass"
                ).order_by('-score', 'created_at')

                for idx, a in enumerate(all_quiz_attempts, start=1):
                    if a.student_id == attempt.student_id:
                        rank = idx
                        break

            # Total questions from any one question_id inside question_answer
            try:
                question_entry = attempt.question_answer[0]
                question_obj = Question.objects.get(question_id=question_entry["question_id"])
                question_list = question_obj.question
                if isinstance(question_list, str):
                    import json
                    question_list = json.loads(question_list)
                total_questions = len(question_list)
                print("total_questions:",total_questions)
            except:
                total_questions = 0

            percentage = (attempt.score / total_questions) * 100 if total_questions else 0

            data = {
                "quiz_id": quiz_id,
                "quiz_title": attempt.quiz.title,
                "score": attempt.score,
                "percentage": round(percentage, 2),
                "rank": rank,
                "result": attempt.result,
                "attempted_at": attempt.created_at,
                "total_questions" : total_questions
            }

            if role in ["ADMIN", "TEACHER"]:
                data["student_name"] = attempt.student.name

            result_data.append(data)

        return Response(result_data, status=status.HTTP_200_OK)

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
            print("teacher:",teacher)
            if not teacher:
                return Response({"error": "Teacher not found."}, status=status.HTTP_404_NOT_FOUND)

            days_before = int(request.data.get("day", 3))
            print("days_before:",days_before)

            # Convert now to UTC to match quiz_date timezone
            now_utc = timezone.now().astimezone(timezone.utc).date()
            print("now_utc:",now_utc)
            target_date = now_utc + timedelta(days=days_before)
            print("target_date:",target_date)

            # Get quizzes whose date (only date portion) is exactly `days_before` ahead
            department_ids = teacher.department_ids if isinstance(teacher.department_ids, list) else [teacher.department_ids]
            print("department_ids:",department_ids)
            quizzes = Quiz.objects.filter(
                department_id__in=department_ids,
                is_deleted=False,
            )
            print("len quizess:",len(quizzes))
            # Filter quizzes manually by checking date difference
            quizzes_to_remind = []
            for quiz in quizzes:
                quiz_date = quiz.quiz_date.astimezone(timezone.utc).date()
                print("quiz_date:",quiz_date)
                if quiz_date == target_date:
                    quizzes_to_remind.append(quiz)

            if not quizzes_to_remind:
                return Response({"message": f"No quizzes scheduled in {days_before} days."}, status=200)

            # Notify students
            students = Student.objects.filter(department_id__in=department_ids, is_deleted=False)
            print("students:",students)

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