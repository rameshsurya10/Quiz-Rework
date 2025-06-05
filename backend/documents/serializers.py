from rest_framework import serializers
from django.conf import settings
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document model"""
    user = serializers.ReadOnlyField(source='user.email')
    file_size_display = serializers.ReadOnlyField(source='get_file_size_display')
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file', 'file_url', 'file_size',
            'file_size_display', 'page_count', 'is_processed', 'user',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'file_size', 'page_count', 'is_processed', 'created_at', 'updated_at']
    
    def get_file_url(self, obj):
        """Return the URL of the document file"""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
    
    def validate_file(self, file):
        """Validate the uploaded file"""
        # Check file size
        if file.size > settings.MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(
                f"File size ({file.size / (1024 * 1024):.2f} MB) exceeds the maximum allowed size "
                f"({settings.MAX_UPLOAD_SIZE / (1024 * 1024)} MB)."
            )
        
        # Check file type
        if file.content_type not in settings.ALLOWED_DOCUMENT_TYPES:
            raise serializers.ValidationError(
                f"File type '{file.content_type}' is not allowed. "
                f"Allowed types: {', '.join(settings.ALLOWED_DOCUMENT_TYPES)}"
            )
        
        return file


class DocumentUploadSerializer(serializers.Serializer):
    """Serializer for uploading documents with immediate processing"""
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    file = serializers.FileField(write_only=True)
    process_immediately = serializers.BooleanField(default=True)


class ExtractedTextSerializer(serializers.Serializer):
    """Serializer for extracting text from a document"""
    document_id = serializers.IntegerField()
    extracted_text = serializers.CharField(read_only=True)
