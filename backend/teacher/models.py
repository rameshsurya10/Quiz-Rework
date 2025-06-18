from django.db import models
import uuid

class Teacher(models.Model):
    teacher_id = models.BigAutoField(primary_key=True)
    department_ids = models.JSONField(default=list, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    country_code = models.CharField(max_length=10, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    join_date = models.DateTimeField()
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, unique=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, blank=True, null=True)
    last_modified_by = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'teacher'
        ordering = ['name']