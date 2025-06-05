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
    return os.path.join('documents', new_filename)


class Document(models.Model):
    """Model for storing PDF documents"""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=document_file_path)
    extracted_text = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    is_processed = models.BooleanField(default=False)
    page_count = models.IntegerField(default=0)
    file_size = models.IntegerField(default=0)  # Size in bytes
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
