from django.db import models
import uuid
from django.contrib.auth import get_user_model
User = get_user_model()

class Student(models.Model):
    student_id = models.AutoField(primary_key=True)
    register_number = models.CharField(max_length=255, unique=True)
    class_name = models.CharField(max_length=255)
    section = models.CharField(max_length=255,null=True, blank=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, null=False)
    phone = models.CharField(max_length=20, null=True, blank=True)
    department_id = models.IntegerField(null=True, blank=True, db_column='department_id')
    is_verified = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    last_modified_by = models.CharField(max_length=255, null=True, blank=True)
    class Meta:
        db_table = 'student'
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['name']
        indexes = [
            models.Index(fields=['email'], name='student_email_idx'),
            models.Index(fields=['department_id'], name='student_department_idx'),
        ]

    def __str__(self):
        return self.name