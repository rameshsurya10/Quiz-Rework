# dashboard/views.py
from django.shortcuts import render
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import connection
from quiz.models import QuizAttempt,Quiz,Question
from students.models import Student
from teacher.models import Teacher
from departments.models import Department
from collections import defaultdict


# Set up logging
logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """
    Dashboard data for logged-in user (global stats)
    """
    try:
        user = request.user
        logger.info(f"Dashboard request for user: {user.email}")

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")  # Check DB connection

        students_count = Student.objects.filter(is_deleted=False).count()
        teachers_count = Teacher.objects.filter(is_deleted=False).count()
        departments_count = Department.objects.filter().count()
        quizzes_count = Quiz.objects.filter(is_deleted=False).count()
        questions_count = Question.objects.count()

        quiz_attempts = QuizAttempt.objects.select_related("quiz", "student").all()

        total_percentage = 0
        valid_attempts = 0
        correct_total = 0
        wrong_total = 0
        unanswered_total = 0
        student_ids = set()
        department_scores = defaultdict(lambda: {"score_sum": 0, "total_questions": 0})

        high_score = None
        low_score = None
        performance_distribution = {
            "excellent": 0,
            "good": 0,
            "average": 0,
            "poor": 0
        }

        for attempt in quiz_attempts:
            student = attempt.student
            student_ids.add(student.student_id)

            if not attempt.question_answer:
                continue

            try:
                first_qid = attempt.question_answer[0]["question_id"]
                question_obj = Question.objects.get(question_id=first_qid)
                all_qs = question_obj.question
                total_qs = len(all_qs)
            except Exception:
                continue

            if total_qs == 0:
                continue

            correct = sum(1 for q in attempt.question_answer if q.get("is_correct") is True)
            wrong = sum(1 for q in attempt.question_answer if q.get("is_correct") is False)
            unanswered = total_qs - (correct + wrong)

            correct_total += correct
            wrong_total += wrong
            unanswered_total += unanswered

            percentage = (attempt.score / total_qs) * 100
            total_percentage += percentage
            valid_attempts += 1

            # Rank high/low scores
            if high_score is None or percentage > high_score["percentage"]:
                high_score = {
                    "student_id": student.student_id,
                    "name": student.name,
                    "score": attempt.score,
                    "percentage": round(percentage, 2)
                }

            if low_score is None or percentage < low_score["percentage"]:
                low_score = {
                    "student_id": student.student_id,
                    "name": student.name,
                    "score": attempt.score,
                    "percentage": round(percentage, 2)
                }

            # Categorize performance
            if percentage >= 90:
                performance_distribution["excellent"] += 1
            elif percentage >= 70:
                performance_distribution["good"] += 1
            elif percentage >= 40:
                performance_distribution["average"] += 1
            else:
                performance_distribution["poor"] += 1

            # Department-wise percentage
            dept_id = getattr(student, "department_id", None)
            try:
                dept_name = Department.objects.get(department_id=dept_id).name if dept_id else "Unknown"
            except Department.DoesNotExist:
                dept_name = "Unknown"

            department_scores[dept_name]["score_sum"] += attempt.score
            department_scores[dept_name]["total_questions"] += total_qs

        # Calculate averages
        average_percentage = round(total_percentage / valid_attempts, 2) if valid_attempts > 0 else 0

        # Format department-wise % scores
        department_percentages = {}
        for dept, stats in department_scores.items():
            if stats["total_questions"] > 0:
                department_percentages[dept] = round((stats["score_sum"] / stats["total_questions"]) * 100, 2)

        dashboard_data = {
            "students": students_count,
            "teachers": teachers_count,
            "departments": departments_count,
            "quizzes": quizzes_count,
            "questions": questions_count,
            "total_quiz_attempts": quiz_attempts.count(),
            "total_students_attempted": len(student_ids),
            "overall_correct_answers": correct_total,
            "overall_wrong_answers": wrong_total,
            "overall_unanswered": unanswered_total,
            "overall_quiz_average_percentage": average_percentage,
            "high_score": high_score,
            "low_score": low_score,
            "performance_distribution": performance_distribution,
            "department_wise_performance": department_percentages,
        }

        logger.info("Dashboard data sent successfully")
        return Response(dashboard_data)

    except Exception as e:
        logger.exception("Error in dashboard_data view:")
        return Response(
            {"error": "Internal server error", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )