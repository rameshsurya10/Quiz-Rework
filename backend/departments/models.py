from django.db import models
from django.conf import settings
import uuid
import csv
import io

class Department(models.Model):
    """Department model for organizing teachers and students"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=255, unique=False)
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.CharField(max_length=255, unique=False)

    # created_at = models.DateTimeField(auto_now_add=True)
    # updated_at = models.DateTimeField(auto_now=True)
    
    # Department statistics - cached fields for better performance
    student_count = models.IntegerField(default=0)
    teacher_count = models.IntegerField(default=0)
    document_count = models.IntegerField(default=0)
    quiz_count = models.IntegerField(default=0)
    
    # Icons and UI settings
    icon = models.CharField(max_length=50, default="school")
    color = models.CharField(max_length=20, default="#4285F4")
    
    # Many-to-many relationship with teachers
    teachers = models.ManyToManyField(
        'accounts.Teacher',
        related_name='departments',
        blank=True,
        help_text='Teachers who belong to this department'
    )
    
    class Meta:
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def update_counts(self):
        """Update the cached counts for this department"""
        from accounts.models import User
        
        self.student_count = User.objects.filter(
            student_profile__department=self).count()
        self.teacher_count = User.objects.filter(
            teacher_profile__departments=self).count()
        self.save(update_fields=['student_count', 'teacher_count'])
    
    @classmethod
    def bulk_upload_students(cls, department_id, csv_file):
        """
        Bulk upload students from CSV file
        
        CSV Format:
        email,first_name,last_name,student_id
        
        Returns: (success_count, error_count, errors)
        """
        from accounts.models import User, Student
        
        department = cls.objects.get(id=department_id)
        decoded_file = csv_file.read().decode('utf-8')
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        
        success_count = 0
        error_count = 0
        errors = []
        
        for row in reader:
            try:
                # Create or update user
                email = row.get('email').lower().strip()
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': row.get('first_name', ''),
                        'last_name': row.get('last_name', ''),
                        'role': User.Role.STUDENT,
                    }
                )
                
                # Create or update student profile
                student, student_created = Student.objects.get_or_create(
                    user=user,
                    defaults={
                        'student_id': row.get('student_id', str(uuid.uuid4())[:8]),
                        'department': department
                    }
                )
                
                if not student_created:
                    student.department = department
                    student.save()
                
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Row {reader.line_num}: {str(e)}")
        
        # Update department counts
        department.update_counts()
        
        return success_count, error_count, errors
    
    @classmethod
    def bulk_delete_students(cls, department_id, student_ids):
        """
        Bulk delete students from a department
        
        Returns: (delete_count, error_count, errors)
        """
        from accounts.models import Student
        
        department = cls.objects.get(id=department_id)
        delete_count = 0
        error_count = 0
        errors = []
        
        for student_id in student_ids:
            try:
                student = Student.objects.get(id=student_id, department=department)
                # Don't delete the user account, just remove from department
                student.department = None
                student.save()
                delete_count += 1
            except Exception as e:
                error_count += 1
                errors.append(f"Student ID {student_id}: {str(e)}")
        
        # Update department counts
        department.update_counts()
        
        return delete_count, error_count, errors
