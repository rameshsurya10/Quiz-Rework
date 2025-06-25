from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class Quiz(models.Model):
    """Model representing a quiz"""
    QUIZ_TYPE_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    
    QUESTION_TYPE_CHOICES = [
        ('mcq', 'Multiple Choice'),
        ('fill', 'Fill in the Blank'),
        ('truefalse', 'True/False'),
        ('oneline', 'One Line Answer'),
        ('mixed', 'Mixed Types'),
    ]
    
    quiz_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    quiz_type = models.CharField(max_length=50, choices=QUIZ_TYPE_CHOICES, default='medium')
    question_type = models.CharField(max_length=50, choices=QUESTION_TYPE_CHOICES, default='mcq')
    no_of_questions = models.IntegerField(default=5)
    time_limit_minutes = models.IntegerField(default=30)
    passing_score = models.IntegerField(null=True, blank=True)
    share_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL for sharing the quiz")
    uploadedfiles = models.JSONField(default=list, blank=True, null=True)
    pages = models.JSONField(help_text="List of page ranges to generate questions from", null=True, blank=True, default=list)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        related_name='department_quizzes',
        db_column='department_id'
    )
    quiz_date = models.DateTimeField(default=timezone.now)
    published_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    creator = models.CharField(max_length=255, null=True, blank=True, help_text="Name of the user who created the quiz")
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who created the quiz")
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255, null=True, blank=True, help_text="Email of the user who last modified the quiz")
    metadata = models.JSONField(default=dict, blank=True, null=True, help_text="Additional metadata for the quiz")
    
    class Meta:
        db_table = 'quizzes'  
        ordering = ['quiz_date']
        verbose_name_plural = 'Quizzes'
    
    def __str__(self):
        return self.title or f"Quiz {self.quiz_id}"
    
    def save(self, *args, **kwargs):
        # Ensure quiz_date is timezone-aware
        if self.quiz_date and timezone.is_naive(self.quiz_date):
            self.quiz_date = timezone.make_aware(self.quiz_date)
            
        # Set published_at when quiz is published
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
            
        # Generate share_url when quiz is published if it doesn't exist
        if self.is_published and not self.share_url:
            base_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else ''
            self.share_url = f"{base_url}/quiz/take/{self.quiz_id}"
            
        super().save(*args, **kwargs)

class Question(models.Model):
    """Model representing a quiz question"""
    question_id = models.AutoField(primary_key=True)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions',
        db_column='quiz_id'
    )
    # question = models.TextField()
    question = models.JSONField()
    question_type = models.CharField(max_length=50)
    difficulty = models.CharField(max_length=50)
    options = models.JSONField(null=True, blank=True)
    correct_answer = models.CharField(max_length=255, null=True, blank=True)
    explanation = models.TextField(null=True, blank=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    # Add document relationship
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        related_name='questions',
        null=True,
        blank=True,
        db_column='document_id'
    )

    class Meta:
        db_table = 'questions'
        ordering = ['question_id']
        verbose_name_plural = 'Questions'

    def __str__(self):
        return f"Question {self.question_id} for Quiz {self.quiz.quiz_id}"
        
    def save(self, *args, **kwargs):
        # Ensure created_at is timezone-aware
        if self.created_at and timezone.is_naive(self.created_at):
            self.created_at = timezone.make_aware(self.created_at)
            
        # Ensure last_modified_at is timezone-aware
        if self.last_modified_at and timezone.is_naive(self.last_modified_at):
            self.last_modified_at = timezone.make_aware(self.last_modified_at)
            
        super().save(*args, **kwargs)

class QuizAttempt(models.Model):
    """Model representing a student's attempt at a quiz"""
    attempt_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.SET_NULL,
        related_name='quiz_attempts',
        null=True,
        blank=True,
        db_column='student_id'
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.SET_NULL,
        related_name='quiz_attempts',
        null=True,
        blank=True,
        db_column='quiz_id'
    )
    question_answer = models.JSONField(help_text="Stores question-answer pairs as JSON")
    score = models.IntegerField(default=0)
    result = models.CharField(
        max_length=10,
        choices=[('pass', 'Pass'), ('fail', 'Fail')],
        default='fail'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255)
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255)

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['attempt_id']
        verbose_name = 'Quiz Attempt'
        verbose_name_plural = 'Quiz Attempts'

    def __str__(self):
        return f"Attempt {self.attempt_id} - Student {self.student_id} on Quiz {self.quiz_id}"