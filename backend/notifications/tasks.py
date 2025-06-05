from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from .models import Notification
import logging

logger = logging.getLogger(__name__)

def send_notification_emails(notification_ids):
    """
    Send email notifications for the given notification IDs
    
    This would typically be run as a Celery task in production
    """
    notifications = Notification.objects.filter(
        id__in=notification_ids,
        email_sent=False
    ).select_related('user')
    
    for notification in notifications:
        try:
            # Get user email
            recipient_email = notification.user.email
            
            # Skip if no email
            if not recipient_email:
                continue
                
            # Send email
            send_mail(
                subject=notification.title,
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False
            )
            
            # Mark as sent
            notification.email_sent = True
            notification.email_sent_at = timezone.now()
            notification.save(update_fields=['email_sent', 'email_sent_at'])
            
            logger.info(f"Email notification sent to {recipient_email}: {notification.title}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification {notification.id}: {str(e)}")
    
    return len(notifications)

def send_notification_sms(notification_ids):
    """
    Send SMS notifications for the given notification IDs
    
    This would require integration with an SMS service like Twilio
    """
    # This is a placeholder - in production, you'd use an SMS API service
    notifications = Notification.objects.filter(
        id__in=notification_ids,
        sms_sent=False,
        user__student_profile__phone_number__isnull=False  # Only for students with phone numbers
    ).select_related('user', 'user__student_profile')
    
    for notification in notifications:
        try:
            # Get user phone number
            phone_number = notification.user.student_profile.phone_number
            
            # Skip if no phone number
            if not phone_number:
                continue
                
            # Here you would integrate with SMS service like:
            # twilio_client.messages.create(
            #     body=notification.message[:160],  # Limit to 160 chars for SMS
            #     from_=settings.TWILIO_PHONE_NUMBER,
            #     to=str(phone_number)
            # )
            
            # For now, just log it
            logger.info(f"SMS would be sent to {phone_number}: {notification.title}")
            
            # Mark as sent
            notification.sms_sent = True
            notification.sms_sent_at = timezone.now()
            notification.save(update_fields=['sms_sent', 'sms_sent_at'])
            
        except Exception as e:
            logger.error(f"Failed to send SMS notification {notification.id}: {str(e)}")
    
    return len(notifications)
