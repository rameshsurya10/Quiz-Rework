from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid
from phonenumber_field.modelfields import PhoneNumberField


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular User with the given email and password."""
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with email as the unique identifier"""
    
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Admin')
        TEACHER = 'TEACHER', _('Teacher')
        STUDENT = 'STUDENT', _('Student')
    
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    role = models.CharField(
        _('role'),
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into the admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['email']
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN
    
    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER
    
    @property
    def is_student(self):
        return self.role == self.Role.STUDENT


class Teacher(models.Model):
    """Teacher model linking to the User model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=50, unique=True) # From TeacherCreateSerializer
    specialization = models.CharField(max_length=255, blank=True, null=True) # From TeacherCreateSerializer
    qualification = models.CharField(max_length=255, blank=True, null=True) # From TeacherCreateSerializer
    bio = models.TextField(blank=True, null=True)
    join_date = models.DateField(blank=True, null=True)
    phone_number = PhoneNumberField(blank=True, null=True)
    is_head = models.BooleanField(default=False)
    departments = models.ManyToManyField('departments.Department', related_name='department_teachers') # Field name is 'departments'

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True) # Aligned with serializer

    # Fields from TeacherCreateView logic (created_by, last_modified_by)
    created_by = models.CharField(max_length=255) 
    last_modified_by = models.CharField(max_length=255)

    is_deleted = models.BooleanField(default=False) # For soft delete

    class Meta:
        verbose_name = 'teacher' # Singular for verbose_name
        verbose_name_plural = 'teachers'
        ordering = ['user__first_name', 'user__last_name'] # Sensible default ordering

    def __str__(self):
        user_fullname = "N/A"
        employee_id_str = "No ID"
        # Ensure user and employee_id exist before trying to access them
        if hasattr(self, 'user') and self.user:
            user_fullname = self.user.get_full_name()
        if hasattr(self, 'employee_id') and self.employee_id:
            employee_id_str = self.employee_id
        return f"{user_fullname} ({employee_id_str})"

    def save(self, *args, **kwargs):
        # Ensure the user has the correct role when saving
        if hasattr(self, 'user') and self.user and self.user.role != User.Role.TEACHER:
            self.user.role = User.Role.TEACHER
            self.user.save() # Save the user object if role changed
        super().save(*args, **kwargs)


class Student(models.Model):
    """Student model extending the User model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    department = models.ForeignKey('departments.Department', on_delete=models.SET_NULL, 
                                 related_name='students', null=True, blank=True)
    enrollment_date = models.DateField(blank=True, null=True)
    graduation_year = models.IntegerField(blank=True, null=True)
    phone_number = PhoneNumberField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.student_id})"
    
    def save(self, *args, **kwargs):
        # Ensure the user has the correct role
        if self.user.role != User.Role.STUDENT:
            self.user.role = User.Role.STUDENT
            self.user.save()
        super().save(*args, **kwargs)
        # Update department student count
        if self.department:
            self.department.update_counts()

class UserProfile(models.Model):
    """Extended profile information for users with settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    institution = models.CharField(max_length=255, blank=True)
    
    # Settings fields
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)
    dark_mode = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s profile"
        
    class Meta:
        ordering = ['-created_at']
