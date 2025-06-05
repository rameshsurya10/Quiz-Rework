from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Notification


class ContentObjectRelatedField(serializers.RelatedField):
    """
    Custom field to handle generic relations with different object types
    """
    def to_representation(self, value):
        """
        Serialize different types of related objects
        """
        if hasattr(value, 'title'):
            return {'id': str(value.id), 'type': value.__class__.__name__, 'title': value.title}
        elif hasattr(value, 'name'):
            return {'id': str(value.id), 'type': value.__class__.__name__, 'name': value.name}
        return {'id': str(value.id), 'type': value.__class__.__name__}


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for the Notification model"""
    content_object = ContentObjectRelatedField(read_only=True)
    
    class Meta:
        model = Notification
        fields = (
            'id', 'title', 'message', 'notification_type', 
            'is_read', 'created_at', 'content_object',
            'email_sent', 'email_sent_at', 'sms_sent', 'sms_sent_at'
        )
        read_only_fields = fields
