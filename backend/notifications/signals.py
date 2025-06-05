from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    """Signal handler for newly created notifications to trigger email/SMS"""
    if created:
        # Log the notification creation
        logger.info(f"New notification created for user {instance.user.id}: {instance.title}")
        
        # For immediate email/SMS sending, we could call the tasks directly here
        # instead of relying on the bulk methods in the model
        try:
            from .tasks import send_notification_emails, send_notification_sms
            # Send single notification email
            send_notification_emails([instance.id])
            
            # Send SMS only if the user has a phone number
            has_phone = False
            if hasattr(instance.user, 'student_profile'):
                has_phone = instance.user.student_profile.phone_number is not None
            elif hasattr(instance.user, 'teacher_profile'):
                has_phone = instance.user.teacher_profile.phone_number is not None
                
            if has_phone:
                send_notification_sms([instance.id])
                
        except Exception as e:
            logger.error(f"Error sending notification {instance.id}: {str(e)}")
