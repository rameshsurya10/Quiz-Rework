from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import uuid

class Notification(models.Model):
    """Notification model for various system alerts and messages"""
    NOTIFICATION_TYPES = (
        ('quiz', 'Quiz'),
        ('document', 'Document'),
        ('system', 'System'),
        ('department', 'Department'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='system'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Generic relation to any model (Quiz, Document, etc.)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Fields for email/SMS notification tracking
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    sms_sent = models.BooleanField(default=False)
    sms_sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        
    def __str__(self):
        return f"{self.title} - {self.user.email}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.save(update_fields=['is_read'])
        
    @classmethod
    def send_bulk_quiz_notifications(cls, quiz, students):
        """
        Send notifications about a quiz to multiple students
        
        Args:
            quiz: Quiz instance
            students: QuerySet of Student instances
        
        Returns:
            int: Number of notifications created
        """
        notifications = []
        
        for student in students:
            notification = cls(
                user=student.user,
                title=f"New Quiz: {quiz.title}",
                message=f"A new quiz '{quiz.title}' has been published for your department.",
                notification_type='quiz',
                content_type=ContentType.objects.get_for_model(quiz),
                object_id=quiz.id
            )
            notifications.append(notification)
        
        if notifications:
            cls.objects.bulk_create(notifications)
            
            # Now schedule emails/SMS if required
            from .tasks import send_notification_emails, send_notification_sms
            
            notification_ids = [n.id for n in notifications]
            send_notification_emails.delay(notification_ids)
            send_notification_sms.delay(notification_ids)
            
        return len(notifications)
