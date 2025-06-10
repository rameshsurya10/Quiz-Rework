from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSettings(models.Model):
    """Model to store user-specific settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=False)
    dark_mode = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Settings for {self.user.email}"
    
    class Meta:
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"

class SystemSettings(models.Model):
    """Model to store system-wide settings"""
    key = models.CharField(max_length=50, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.key}: {self.value[:20]}..."
    
    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"
