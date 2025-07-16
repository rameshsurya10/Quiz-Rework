import os
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from quiz.models import Quiz
from students.models import Student

# scheduler_started = False  # ✅ global flag to prevent duplicates

def autopublish_quizzes():
    """
    Auto-publish quizzes:
    - If `publish_date` is set: publish on that date.
    - If not: publish 7 days before the `quiz_date`.
    - Send email notifications to verified students.
    """
    print("Running autopublish_quizzes task...")

    today = timezone.now().date()
    print("Today:", today)

    # Filter quizzes not yet published
    quizzes = Quiz.objects.filter(is_published=False,is_deleted=False)
    print("Total unpublished quizzes:", quizzes.count())

    for quiz in quizzes:
        publish_on = None

        # if quiz.publish_date:
        #     publish_on = quiz.publish_date.date()
        if quiz.quiz_date:
            publish_on = (quiz.quiz_date - timedelta(days=7)).date()
            print("quiz_date:",quiz.quiz_date)
            print("publish_on:",publish_on)

        print(f"Quiz: {quiz.title}, Publish on: {publish_on}")

        if publish_on == today:
            quiz.is_published = True
            quiz.published_at = timezone.now()
            print("quiz.published_at:",quiz.published_at)

            # Generate public quiz link
            quiz.url_link = f"student/quiz/{quiz.quiz_id}/join/"
            quiz.save()

            # Notify students
            students = Student.objects.filter(department_id=quiz.department_id, is_verified=True,is_deleted=False)
            print("students:",len(students))
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

                    send_mail(subject, message, from_email, [student.email], fail_silently=False,html_message=message,)

            print(f"✅ Published quiz '{quiz.title}' scheduled for {quiz.quiz_date.strftime('%Y-%m-%d %H:%M')}")

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(autopublish_quizzes, 'interval', seconds=10)
    # scheduler.add_job(autopublish_quizzes, 'cron', hour=8, minute=0)
    scheduler.start()