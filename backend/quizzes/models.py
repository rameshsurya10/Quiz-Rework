from django.db import models
from django.conf import settings
from django.utils import timezone
from ai_processing.models import QuestionBatch, Question
import uuid


class Quiz(models.Model):
    """Model for a quiz that can be taken by students"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    question_batch = models.ForeignKey(
        QuestionBatch,
        on_delete=models.CASCADE,
        related_name='quizzes'
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_quizzes'
    )
    # Department assignments - many-to-many relationship
    departments = models.ManyToManyField(
        'departments.Department',
        related_name='quizzes',
        blank=True
    )
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    time_limit_minutes = models.PositiveIntegerField(default=30)
    passing_score = models.PositiveIntegerField(default=70)  # percentage
    max_attempts = models.PositiveIntegerField(default=3)
    shuffle_questions = models.BooleanField(default=True)
    show_answers = models.BooleanField(default=True)  # Show correct answers after submission
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)  # Optional deadline
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quiz' 
        ordering = ['-created_at']
        verbose_name_plural = 'Quizzes'
    
    def __str__(self):
        return self.title
        
    def publish(self):
        """Publish quiz and notify students in assigned departments"""
        if self.is_published:
            return False
            
        self.is_published = True
        self.published_at = timezone.now()
        self.save(update_fields=['is_published', 'published_at'])
        
        # Send notifications to all students in assigned departments
        self.notify_students()
        return True
        
    def notify_students(self):
        """Notify all students in assigned departments about this quiz"""
        from accounts.models import Student
        from notifications.models import Notification
        
        # Get all students from assigned departments
        students = Student.objects.filter(department__in=self.departments.all())
        
        # Create notifications
        notifications = []
        for student in students:
            notification = Notification(
                user=student.user,
                title=f"New Quiz Available: {self.title}",
                message=f"A new quiz '{self.title}' has been published. It is available until {self.end_date.strftime('%Y-%m-%d %H:%M') if self.end_date else 'no end date'}.",
                notification_type='quiz',
                content_object=self
            )
            notifications.append(notification)
            
        if notifications:
            # Bulk create notifications
            Notification.objects.bulk_create(notifications)
            
        return len(notifications)


class QuizAttempt(models.Model):
    """Model for tracking a user's attempt at a quiz"""
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('timed_out', 'Timed Out'),
    ]
    
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='in_progress'
    )
    score = models.FloatField(null=True, blank=True)  # Percentage score
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.PositiveIntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ['quiz', 'user', 'started_at']
    
    def __str__(self):
        return f"{self.user.email}'s attempt at {self.quiz.title}"
    
    @property
    def is_passed(self):
        """Check if the quiz attempt has a passing score"""
        if self.score is None or self.status != 'completed':
            return False
        return self.score >= self.quiz.passing_score


class QuizQuestionResponse(models.Model):
    """Model for storing a user's response to a quiz question"""
    attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    selected_option = models.ForeignKey(
        'ai_processing.Option',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='selected_responses'
    )
    text_response = models.TextField(blank=True)  # For short answer questions
    is_correct = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['question__id']
        unique_together = ['attempt', 'question']
    
    def __str__(self):
        return f"Response to question {self.question.id} in {self.attempt}"
