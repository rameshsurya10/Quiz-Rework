from django.db import models
from django.conf import settings
from django.utils.text import slugify
import uuid
import os


def document_file_path(instance, filename):
    """Generate a file path for uploaded documents"""
    # Get the file extension
    ext = filename.split('.')[-1]
    # Generate a unique filename using UUID and the original filename
    unique_id = str(uuid.uuid4())
    new_filename = f"{slugify(instance.title)}-{unique_id}.{ext}"
    # Return the file path
    return os.path.join('vector_documents', new_filename)


class Document(models.Model):
    """Model for storing PDF documents"""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=document_file_path, blank=True, null=True)
    extracted_text = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    # Add quiz relationship - nullable to support documents not linked to quizzes
    quiz = models.ForeignKey(
        'quiz.Quiz',
        on_delete=models.SET_NULL,
        related_name='documents',
        null=True,
        blank=True
    )
    # Question generation fields
    question_count = models.IntegerField(default=0)
    question_types = models.JSONField(default=list, blank=True)
    questions_generated = models.BooleanField(default=False)
    generation_status = models.CharField(max_length=20, default='pending', 
                                        choices=[
                                            ('pending', 'Pending'),
                                            ('processing', 'Processing'),
                                            ('completed', 'Completed'),
                                            ('failed', 'Failed')
                                        ])
    # File storage fields
    storage_type = models.CharField(max_length=20, default='local',
                                   choices=[
                                       ('local', 'Local Storage'),
                                       ('supabase', 'Supabase Storage'),
                                       ('s3', 'AWS S3'),
                                       ('vector_db', 'Vector Database')
                                   ])
    storage_path = models.CharField(max_length=255, blank=True)
    storage_url = models.URLField(blank=True)
    is_processed = models.BooleanField(default=False)
    page_count = models.IntegerField(default=0)
    file_size = models.IntegerField(default=0)  # Size in bytes
    file_type = models.CharField(max_length=50, blank=True)
    # Additional metadata as JSON (for selected pages, etc.)
    metadata = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    def get_file_size_display(self):
        """Return human-readable file size"""
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.2f} KB"
        else:
            return f"{self.file_size / (1024 * 1024):.2f} MB"


class DocumentVector(models.Model):
    """Model for storing document vector embeddings"""
    document = models.OneToOneField(
        Document,
        on_delete=models.CASCADE,
        related_name='vector'
    )
    vector_uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    embedding = models.BinaryField(null=True, blank=True)  # Store binary representation of vector
    is_indexed = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Vector for {self.document.title}"
