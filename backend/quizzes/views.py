from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Avg, Max, Q

from .models import Quiz, QuizAttempt, QuizQuestionResponse
from .serializers import (
    QuizSerializer, 
    QuizDetailSerializer,
    QuizAttemptSerializer, 
    QuizAttemptDetailSerializer,
    QuizQuestionResponseSerializer
)
from accounts.permissions import IsTeacherOrAdmin, IsOwnerOrAdminOrReadOnly


class QuizViewSet(viewsets.ModelViewSet):
    """API endpoint for Quiz management with preview and publishing"""
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        """Publish a quiz to selected departments and notify students"""
        quiz = self.get_object()
        
        if quiz.is_published:
            return Response(
                {'detail': 'Quiz is already published'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if departments are specified
        department_ids = request.data.get('department_ids')
        if not department_ids:
            return Response(
                {'detail': 'No departments specified for publishing'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Set departments
        from departments.models import Department
        departments = Department.objects.filter(id__in=department_ids)
        quiz.departments.set(departments)
        
        # Publish and notify students
        notification_count = quiz.publish()
        
        return Response({
            'detail': f'Quiz published successfully to {len(departments)} departments',
            'notifications_sent': notification_count
        })
    
    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        """Preview quiz questions before publishing"""
        quiz = self.get_object()
        
        from ai_processing.serializers import QuestionSerializer
        questions = quiz.question_batch.questions.all()
        serializer = QuestionSerializer(questions, many=True)
        
        return Response({
            'quiz': {
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'time_limit_minutes': quiz.time_limit_minutes,
                'passing_score': quiz.passing_score
            },
            'questions': serializer.data,
            'question_count': questions.count()
        })
        
    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """Generate a new quiz from AI with specified parameters"""
        # Required params
        document_id = request.data.get('document_id')
        title = request.data.get('title')
        question_count = request.data.get('question_count', 10)
        difficulty = request.data.get('difficulty', 'medium')
        
        if not document_id or not title:
            return Response(
                {'detail': 'document_id and title are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Generate questions using AI
        from ai_processing.services import generate_quiz_questions
        question_batch = generate_quiz_questions(
            document_id=document_id,
            user_id=request.user.id,
            question_count=question_count,
            difficulty_level=difficulty,
            title=title
        )
        
        # Create the quiz
        quiz = Quiz.objects.create(
            title=title,
            description=request.data.get('description', ''),
            question_batch=question_batch,
            creator=request.user,
            time_limit_minutes=request.data.get('time_limit_minutes', 30),
            passing_score=request.data.get('passing_score', 70)
        )
        
        # Return the quiz with preview
        from .serializers import QuizSerializer
        serializer = QuizSerializer(quiz)
        
        return Response(serializer.data)


class QuizAttemptViewSet(viewsets.ModelViewSet):
    """API view for retrieving a quiz attempt"""
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset


class QuizListCreateView(generics.ListCreateAPIView):
    """API view for listing and creating quizzes"""
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = Quiz.objects.all()
        
        # Department filtering
        department_id = self.request.query_params.get('api/department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API view for retrieving, updating, or deleting a quiz"""
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    queryset = Quiz.objects.all()
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return QuizDetailSerializer
        return QuizSerializer
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset


class QuizAttemptsListView(generics.ListAPIView):
    """API view for listing quiz attempts by quiz"""
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset


class UserQuizAttemptsListView(generics.ListAPIView):
    """API view for listing all attempts by a user across all quizzes"""
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset


class StartQuizView(generics.CreateAPIView):
    """API view for starting a quiz attempt"""
    serializer_class = QuizAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Add the quiz ID from the URL to the request data
        quiz_id = self.kwargs.get('quiz_id')
        data = request.data.copy()
        data['quiz'] = quiz_id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return the full quiz attempt detail with questions
        attempt = serializer.instance
        return Response(
            QuizAttemptDetailSerializer(attempt, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class QuizAttemptDetailView(generics.RetrieveAPIView):
    """API view for retrieving a quiz attempt"""
    serializer_class = QuizAttemptDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter quizzes based on user role and department membership"""
        user = self.request.user
        queryset = super().get_queryset()
        
        # Department filtering
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(departments__id=department_id)
            
        if user.is_student:
            # Students can only see published quizzes for their department
            if hasattr(user, 'student_profile') and user.student_profile.department:
                queryset = queryset.filter(
                    departments=user.student_profile.department,
                    is_published=True
                )
            else:
                queryset = queryset.none()
        elif user.is_teacher and not user.is_admin:
            # Teachers can see their own quizzes and published quizzes in their departments
            if hasattr(user, 'teacher_profile'):
                teacher_departments = user.teacher_profile.departments.all()
                queryset = queryset.filter(
                    models.Q(creator=user) |
                    models.Q(departments__in=teacher_departments)
                ).distinct()
            else:
                queryset = queryset.filter(creator=user)
                
        return queryset
        """
        Students can see only their own attempts
        Teachers can see attempts for quizzes they created
        Admins can see all attempts
        """
        user = self.request.user
        
        if user.is_admin:
            return QuizAttempt.objects.all()
        elif user.is_teacher:
            # Teachers can see attempts for quizzes they created
            return QuizAttempt.objects.filter(quiz__creator=user)
        else:
            # Students can see only their attempts
            return QuizAttempt.objects.filter(user=user)


class SubmitQuizView(APIView):
    """API view for submitting quiz responses"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = SubmitQuizResponseSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        attempt = serializer.save()
        
        return Response(
            QuizAttemptDetailSerializer(attempt, context={'request': request}).data,
            status=status.HTTP_200_OK
        )


class QuizAnalyticsView(APIView):
    """API view for quiz analytics"""
    permission_classes = [permissions.IsAuthenticated, IsTeacherOrAdmin]
    
    def get(self, request, quiz_id):
        """Get analytics for a specific quiz"""
        try:
            quiz = Quiz.objects.get(pk=quiz_id)
            
            # Check permissions
            if not request.user.is_admin and quiz.creator != request.user:
                return Response(
                    {"error": "You don't have permission to view analytics for this quiz"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get attempt statistics
            attempts = QuizAttempt.objects.filter(quiz=quiz, status='completed')
            attempt_count = attempts.count()
            
            if attempt_count == 0:
                return Response({
                    "quiz_id": quiz_id,
                    "title": quiz.title,
                    "attempt_count": 0,
                    "message": "No completed attempts for this quiz yet"
                })
            
            # Calculate statistics
            stats = attempts.aggregate(
                avg_score=Avg('score'),
                max_score=Max('score'),
                avg_time=Avg('time_taken_seconds')
            )
            
            # Count passing attempts
            passing_count = attempts.filter(score__gte=quiz.passing_score).count()
            passing_rate = (passing_count / attempt_count) * 100 if attempt_count > 0 else 0
            
            # Get response distribution
            responses = []
            for question in quiz.question_batch.questions.all():
                correct_count = question.responses.filter(is_correct=True).count()
                incorrect_count = question.responses.filter(is_correct=False).count()
                unanswered_count = attempt_count - correct_count - incorrect_count
                
                responses.append({
                    "question_id": question.id,
                    "question_text": question.question_text[:100],
                    "correct_count": correct_count,
                    "incorrect_count": incorrect_count,
                    "unanswered_count": unanswered_count,
                    "correct_percentage": (correct_count / attempt_count) * 100
                })
            
            return Response({
                "quiz_id": quiz_id,
                "title": quiz.title,
                "attempt_count": attempt_count,
                "avg_score": round(stats['avg_score'], 2),
                "max_score": stats['max_score'],
                "passing_score": quiz.passing_score,
                "passing_count": passing_count,
                "passing_rate": round(passing_rate, 2),
                "avg_time_seconds": stats['avg_time'],
                "avg_time_minutes": round(stats['avg_time'] / 60, 1) if stats['avg_time'] else 0,
                "questions_analytics": responses
            })
            
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class UserProgressView(APIView):
    """API view for user progress across all quizzes"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get progress for the current user"""
        user = request.user
        
        # Get all completed attempts by the user
        attempts = QuizAttempt.objects.filter(user=user, status='completed')
        
        if not attempts:
            return Response({
                "message": "No completed quiz attempts found",
                "total_quizzes_attempted": 0,
                "quizzes_passed": 0
            })
        
        # Get unique quizzes attempted
        unique_quizzes = attempts.values('quiz').distinct().count()
        
        # Get quizzes passed (use the most recent attempt for each quiz)
        quizzes_passed = 0
        for quiz_id in attempts.values_list('quiz', flat=True).distinct():
            latest_attempt = attempts.filter(quiz_id=quiz_id).order_by('-completed_at').first()
            if latest_attempt and latest_attempt.is_passed:
                quizzes_passed += 1
        
        # Calculate average score
        avg_score = attempts.aggregate(avg_score=Avg('score'))['avg_score']
        
        # Get recent activity
        recent_attempts = attempts.order_by('-completed_at')[:5]
        recent_activity = []
        
        for attempt in recent_attempts:
            recent_activity.append({
                "quiz_id": attempt.quiz.id,
                "quiz_title": attempt.quiz.title,
                "score": attempt.score,
                "is_passed": attempt.is_passed,
                "completed_at": attempt.completed_at
            })
        
        return Response({
            "total_quizzes_attempted": unique_quizzes,
            "quizzes_passed": quizzes_passed,
            "passing_rate": round((quizzes_passed / unique_quizzes) * 100, 1),
            "average_score": round(avg_score, 1),
            "recent_activity": recent_activity
        })
