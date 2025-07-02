from apscheduler.schedulers.background import BackgroundScheduler
from django.utils.timezone import now
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def delete_old_quiz_attempts():
    from quiz.models import QuizAttempt
    from students.models import Student
    from django.utils.timezone import now
    from datetime import timedelta
    import logging

    logger = logging.getLogger(__name__)
    current_time = now()

    # # Optional: Run only on 1st of month at midnight
    # if current_time.day != 1 or current_time.hour != 0:
    #     return

    one_month_ago = current_time - timedelta(days=30)

    student_ids = list(
        Student.objects.filter(is_deleted=False).values_list('student_id', flat=True)
    )

    # ✅ Only match records with created_at DATE (not time) ≤ cutoff date
    attempts_to_delete = QuizAttempt.objects.filter(
        student_id__in=student_ids,
        created_at__date__lte=one_month_ago.date()
    )
    count = attempts_to_delete.count()
    attempts_to_delete.delete()
    logger.info(f"[{current_time}] Deleted {count} quiz attempts for deleted students.")

def start():
    scheduler = BackgroundScheduler()
    # scheduler.add_job(delete_old_quiz_attempts, 'interval', seconds=10)
    scheduler.add_job(delete_old_quiz_attempts, 'cron', hour=8, minute=0)
    scheduler.start()

