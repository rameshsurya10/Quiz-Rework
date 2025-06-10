from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg, Q
from quizzes.models import Quiz, QuizAttempt, Question, QuestionAttempt
from users.models import User
import json

class QuizReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return Quiz.objects.filter(created_by=user)
        elif user.role == 'student':
            return Quiz.objects.filter(attempts__user=user).distinct()
        return Quiz.objects.none()

    def list(self, request):
        """List all quizzes with basic stats"""
        quizzes = self.get_queryset()
        
        data = []
        for quiz in quizzes:
            attempts = quiz.attempts.all()
            if not attempts.exists():
                continue
                
            data.append({
                'id': str(quiz.id),
                'title': quiz.title,
                'total_attempts': attempts.count(),
                'average_score': round(attempts.aggregate(avg=Avg('score'))['avg'] or 0, 2),
                'pass_rate': round((attempts.filter(score__gte=quiz.passing_score).count() / attempts.count()) * 100, 2)
            })
            
        return Response(data)

    @action(detail=True, methods=['get'])
    def student_performance(self, request, pk=None):
        """Get performance data for students who took this quiz"""
        quiz = self.get_queryset().filter(pk=pk).first()
        if not quiz:
            return Response(
                {"error": "Quiz not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        students = User.objects.filter(
            quiz_attempts__quiz=quiz
        ).annotate(
            attempts=Count('quiz_attempts'),
            best_score=Max('quiz_attempts__score'),
            last_attempt=Max('quiz_attempts__completed_at')
        ).order_by('-best_score')

        data = [{
            'id': str(student.id),
            'name': f"{student.first_name} {student.last_name}",
            'email': student.email,
            'attempts': student.attempts,
            'best_score': float(student.best_score or 0),
            'passed': student.best_score >= quiz.passing_score if student.best_score else False,
            'last_attempt': student.last_attempt
        } for student in students]

        return Response(data)

    @action(detail=True, methods=['get'])
    def question_analysis(self, request, pk=None):
        """Get question-wise analysis for a quiz"""
        quiz = self.get_queryset().filter(pk=pk).first()
        if not quiz:
            return Response(
                {"error": "Quiz not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        questions = quiz.questions.all()
        data = []
        
        for question in questions:
            total_attempts = QuestionAttempt.objects.filter(
                question=question,
                quiz_attempt__quiz=quiz
            ).count()
            
            if total_attempts == 0:
                continue
                
            correct_attempts = QuestionAttempt.objects.filter(
                question=question,
                quiz_attempt__quiz=quiz,
                is_correct=True
            ).count()
            
            data.append({
                'question_id': str(question.id),
                'question_text': question.text,
                'question_type': question.question_type,
                'total_attempts': total_attempts,
                'correct_attempts': correct_attempts,
                'accuracy': round((correct_attempts / total_attempts) * 100, 2)
            })
        
        return Response(data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get summary statistics for a quiz"""
        quiz = self.get_queryset().filter(pk=pk).first()
        if not quiz:
            return Response(
                {"error": "Quiz not found or access denied"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        attempts = quiz.attempts.all()
        total_attempts = attempts.count()
        
        if total_attempts == 0:
            return Response({
                'total_attempts': 0,
                'average_score': 0,
                'pass_rate': 0,
                'completion_rate': 0,
                'score_distribution': {}
            })
        
        # Score distribution
        score_distribution = {}
        for i in range(0, 101, 10):
            score_distribution[f"{i}-{i+9}"] = attempts.filter(
                score__gte=i,
                score__lt=i+10
            ).count()
        
        # Calculate completion rate (assuming we track time spent vs duration)
        completed_attempts = attempts.exclude(completed_at__isnull=True).count()
        
        return Response({
            'total_attempts': total_attempts,
            'average_score': round(attempts.aggregate(avg=Avg('score'))['avg'] or 0, 2),
            'pass_rate': round((attempts.filter(score__gte=quiz.passing_score).count() / total_attempts) * 100, 2),
            'completion_rate': round((completed_attempts / total_attempts) * 100, 2) if total_attempts > 0 else 0,
            'score_distribution': score_distribution,
            'passing_score': quiz.passing_score,
            'max_score': quiz.questions.count()  # Assuming 1 point per question
        })
