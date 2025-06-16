from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class Quiz(models.Model):
    """Model representing a quiz"""
    quiz_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    no_of_questions = models.IntegerField(default=10)
    quiz_type = models.CharField(max_length=50, default='easy')
    question_type = models.CharField(max_length=50, default='multiple_choice', help_text="Type of questions in the quiz (e.g., multiple_choice, fill_in_blank)")
    uploadedfiles = models.JSONField(help_text="List of uploaded files with their metadata", null=True, blank=True, default=list)
    pages = models.JSONField(help_text="List of page ranges to generate questions from", null=True, blank=True, default=list)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        related_name='department_quizzes',
        db_column='department_id'
    )
    quiz_date = models.DateTimeField(default=timezone.now)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    creator = models.CharField(max_length=255, null=True, blank=True, help_text="Name of the user who created the quiz")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who created the quiz")
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who last modified the quiz")
    # is_deleted is already defined above
    time_limit_minutes = models.IntegerField(null=True, blank=True)
    passing_score = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'quizzes'  
        ordering = ['quiz_date']
        verbose_name_plural = 'Quizzes'
    
    def __str__(self):
        return self.title or f"Quiz {self.quiz_id}"
    
    def save(self, *args, **kwargs):
        # Set published_at when quiz is published
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)
