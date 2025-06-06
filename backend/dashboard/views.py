# dashboard/views.py
from django.shortcuts import render
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection

# Set up logging
logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """
    Endpoint to retrieve aggregated data for dashboard
    """
    try:
        logger.info("Dashboard data request received")
        
        # Test database connection
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                logger.info("Database connection test successful")
        except Exception as db_error:
            logger.error(f"Database connection error: {str(db_error)}")
            return Response(
                {"error": "Database connection error", "details": str(db_error)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Get user counts
        try:
            from accounts.models import User
            students_count = User.objects.filter(is_student=True).count()
            teachers_count = User.objects.filter(is_teacher=True).count()
            logger.info(f"User counts - Students: {students_count}, Teachers: {teachers_count}")
        except Exception as user_error:
            logger.error(f"Error getting user counts: {str(user_error)}")
            students_count = 0
            teachers_count = 0

        # Get quiz statistics
        try:
            from quizzes.models import Quiz, QuizAttempt
            total_quizzes = Quiz.objects.count()
            total_attempts = QuizAttempt.objects.count()
            logger.info(f"Quiz stats - Quizzes: {total_quizzes}, Attempts: {total_attempts}")
        except Exception as quiz_error:
            logger.error(f"Error getting quiz stats: {str(quiz_error)}")
            total_quizzes = 0
            total_attempts = 0

        # Initialize default values
        average_score = 0
        right_answers_pct = 0
        wrong_answers_pct = 0
        unanswered_pct = 0
        avg_duration = 0
        recent_quizzes = []

        # Calculate performance metrics if we have quiz attempts
        if total_attempts > 0:
            try:
                # Calculate average score
                avg_score_result = QuizAttempt.objects.aggregate(avg_score=Avg('score'))
                average_score = int((avg_score_result.get('avg_score') or 0) * 100)
                
                # Get performance metrics from attempts with data
                attempts_with_data = QuizAttempt.objects.filter(total_questions__gt=0)
                
                if attempts_with_data.exists():
                    # Calculate percentages
                    right_answers_pct = int(attempts_with_data.aggregate(
                        right_pct=Avg('correct_answers') * 100 / Avg('total_questions')
                    ).get('right_pct', 0) or 0)
                    
                    wrong_answers_pct = int(attempts_with_data.aggregate(
                        wrong_pct=Avg('wrong_answers') * 100 / Avg('total_questions')
                    ).get('wrong_pct', 0) or 0)
                    
                    # Ensure percentages add up correctly
                    unanswered_pct = max(0, 100 - right_answers_pct - wrong_answers_pct)
                    
                    # Calculate average duration
                    avg_duration = int((attempts_with_data.aggregate(
                        avg_time=Avg('duration_seconds')
                    ).get('avg_time') or 0))
                
                # Get recent quizzes
                recent_quizzes = list(Quiz.objects.order_by('-created_at')[:10].values('id', 'title'))
                
            except Exception as metrics_error:
                logger.error(f"Error calculating metrics: {str(metrics_error)}")
                # Continue with default values if there's an error

        # Build response data
        dashboard_data = {
            'students': students_count,
            'teachers': teachers_count,
            'total_quizzes': total_quizzes,
            'total_attempts': total_attempts,
            'average_score': average_score,
            'participants': total_attempts,  # This might need adjustment based on your requirements
            'right_answers': right_answers_pct,
            'wrong_answers': wrong_answers_pct,
            'unanswered_questions': unanswered_pct,
            'average_duration': avg_duration,
            'extra': recent_quizzes
        }
        
        logger.info("Dashboard data prepared successfully")
        return Response(dashboard_data)
    
    except Exception as e:
        logger.exception("Unexpected error in dashboard_data:")
        return Response(
            {"error": "An unexpected error occurred", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )