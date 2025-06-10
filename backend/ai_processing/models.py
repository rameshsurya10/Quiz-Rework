from django.db import models
from django.conf import settings
from documents.models import Document


class QuestionBatch(models.Model):
    """Model for a batch of generated questions"""
    DIFFICULTY_CHOICES = [
        ('lite', 'Lite'),
        ('medium', 'Medium'),
        ('expert', 'Expert'),
        ('mixed', 'Mixed'),
    ]
    
    # Complexity level guides for AI
    COMPLEXITY_GUIDES = {
        'lite': """
            - Focus on basic comprehension and recall
            - Use straightforward language
            - Test fundamental concepts
            - Make options clearly distinct
            - Include simple explanations
        """,
        'medium': """
            - Test understanding and application
            - Include some analytical thinking
            - Use moderate technical language
            - Require connecting multiple concepts
            - Provide detailed explanations
        """,
        'expert': """
            - Focus on advanced analysis and synthesis
            - Use complex scenarios and edge cases
            - Include technical terminology
            - Require deep understanding
            - Test problem-solving abilities
            - Provide comprehensive explanations
        """,
        'mixed': """
            - Include a mixture of difficulty levels
            - Cover various cognitive levels (recall, application, analysis)
            - Mix straightforward and complex language
            - Test both basic concepts and deeper connections
        """
    }
    
    document = models.ForeignKey(
        Document, 
        on_delete=models.CASCADE,
        related_name='question_batches'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='question_batches'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Question Batches'
    
    def __str__(self):
        return f"{self.name} ({self.document.title})"


class Question(models.Model):
    """Model for a generated question"""
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]
    
    batch = models.ForeignKey(
        QuestionBatch, 
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        default='multiple_choice'
    )
    explanation = models.TextField(blank=True)
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return f"{self.question_text[:50]}..."


class Option(models.Model):
    """Model for a question option (for multiple choice questions)"""
    question = models.ForeignKey(
        Question, 
        on_delete=models.CASCADE,
        related_name='options'
    )
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['id']
    
    def __str__(self):
        return self.option_text[:50]


class Answer(models.Model):
    """Model for storing correct answers for non-multiple choice questions"""
    question = models.OneToOneField(
        Question,
        on_delete=models.CASCADE,
        related_name='answer'
    )
    answer_text = models.TextField()
    
    def __str__(self):
        return self.answer_text[:50]
