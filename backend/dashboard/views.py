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
    Dashboard data for logged-in user (global counts, no QuizAttempt)
    """
    try:
        user = request.user
        logger.info(f"Dashboard request for user: {user.email}")

        # DB connection check
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        # Import models
        from accounts.models import User
        from quiz.models import Quiz, Question
        from departments.models import Department
        from students.models import Student
        from teacher.models import Teacher

        # Counts (no created_by filters)
        students_count = Student.objects.filter(is_deleted=False).count()
        teachers_count = Teacher.objects.filter(is_deleted=False).count()
        departments_count = Department.objects.filter(is_deleted=False).count()
        quizzes_count = Quiz.objects.filter(is_deleted=False).count()
        questions_count = Question.objects.count()

        # Use actual field name: quiz_id instead of id
        # recent_quizzes = list(
        #     Quiz.objects.order_by('-created_at')[:10].values('quiz_id', 'title', 'created_at')
        # )

        dashboard_data = {
            'students': students_count,
            'teachers': teachers_count,
            'departments': departments_count,
            'quizzes': quizzes_count,
            'questions': questions_count,
            # 'recent_quizzes': recent_quizzes,
        }

        logger.info("Dashboard data sent successfully")
        return Response(dashboard_data)

    except Exception as e:
        logger.exception("Error in dashboard_data view:")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )