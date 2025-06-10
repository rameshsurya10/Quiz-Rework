from rest_framework import serializers
from .models import UserSettings, SystemSettings

class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for user settings"""
    class Meta:
        model = UserSettings
        fields = ['id', 'email_notifications', 'push_notifications', 'dark_mode', 'updated_at']
        read_only_fields = ['id', 'updated_at']

class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings"""
    class Meta:
        model = SystemSettings
        fields = ['key', 'value', 'description', 'is_active', 'updated_at']
        read_only_fields = ['updated_at']
