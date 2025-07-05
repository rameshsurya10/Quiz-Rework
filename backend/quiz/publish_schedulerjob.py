import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.sites.models import Site
from quiz.models import Quiz
from students.models import Student
from django.contrib.sites.shortcuts import get_current_site

# scheduler_started = False  # ✅ global flag to prevent duplicates

def autopublish_quizzes():
    """
    Auto-publish quizzes 1 week before quiz date and notify students.
    Runs daily at 8 AM.
    """
    print("Running autopublish_quizzes task...")

    today = timezone.now().date()
    print("today:",today)
    target_date = today + timedelta(days=7)
    print("target_date:",target_date)

    quizzes = Quiz.objects.filter(
        quiz_date__date=target_date,
        is_published=False
    )
    print("quizzes:",quizzes)
    print("length of quizzes:",len(quizzes))

    for quiz in quizzes:
        quiz.is_published = True
        quiz.published_at = timezone.now()

        # Generate public link
        # domain = Site.objects.get_current().domain
        domain = get_current_site(request).domain
        quiz.url_link = f"http://{domain}/student/quiz/{quiz.quiz_id}/join/"
        print("quiz.url_link:",quiz.url_link)
        quiz.save()

        # Notify verified students
        students = Student.objects.filter(department_id=quiz.department_id, is_verified=True)
        print("students:",students)
        print("length of students:",len(students))
        subject = f"Quiz Assigned: {quiz.title}"
        print("subject:",subject)
        from_email = settings.DEFAULT_FROM_EMAIL
        print("from_email:",from_email)

        for student in students:
            print("student:",student)
            if student.email:
                print("student email:",student.email)
                message = f"""
                        Hello {student.name},

                        A new quiz titled "{quiz.title}" has been scheduled.

                        🗓 Quiz Date: {quiz.quiz_date.strftime('%Y-%m-%d %I:%M %p')}
                        🔗 Quiz Link (valid only at scheduled time): {quiz.url_link}

                        Best regards,
                        Redlitmus Team
                        """.strip()

                send_mail(subject, message, from_email, [student.email], fail_silently=False)

        print(f"✅ Published quiz '{quiz.title}' for {quiz.quiz_date.strftime('%Y-%m-%d %H:%M')}")

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(autopublish_quizzes, 'interval', seconds=10)
    # scheduler.add_job(autopublish_quizzes, 'cron', hour=8, minute=0)  # Runs daily at 8:00 AM
    scheduler.start()
    print("⏰ Scheduler started: autopublish_quizzes will run daily at 8:00 AM.")

# def start():
#     global scheduler_started
#     if scheduler_started:
#         return  # ✅ Prevent multiple starts

#     scheduler = BackgroundScheduler()
#     # scheduler.add_job(autopublish_quizzes, 'cron', hour=8, minute=0)
#     scheduler.add_job(autopublish_quizzes, 'interval', seconds=10)
#     scheduler.start()
#     scheduler_started = True
#     print("✅ Scheduler started: autopublish_quizzes will run daily at 8:00 AM")