from django.db import models
from django.conf import settings
from django.utils import timezone

class Quiz(models.Model):
    """Model representing a quiz"""
    quiz_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    uploadedfiles = models.JSONField(null=True, blank=True, help_text="List of uploaded files with their metadata")
    
    creator = models.CharField(max_length=255, null=True, blank=True, help_text="Name of the user who created the quiz")
    
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        related_name='department_quizzes',
        db_column='department_id'
    )
    
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    passing_score = models.PositiveIntegerField(null=True, blank=True)
    max_attempts = models.PositiveIntegerField(null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who created the quiz")
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who last modified the quiz")
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'quizzes'  
        ordering = ['-created_at']
        verbose_name_plural = 'Quizzes'
    
    def __str__(self):
        return self.title or f"Quiz {self.quiz_id}"
    
    def save(self, *args, **kwargs):
        # Set published_at when quiz is published
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)
