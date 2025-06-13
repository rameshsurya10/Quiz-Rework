from rest_framework import serializers
from .models import Quiz
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class UserNameField(serializers.CharField):
    def to_representation(self, value):
        return value or None
    
    def to_internal_value(self, data):
        return str(data) if data else None

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    file_name = serializers.CharField()
    file_type = serializers.CharField(required=False)
    file_size = serializers.IntegerField(required=False)

class QuizSerializer(serializers.ModelSerializer):
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Quiz.department.field.related_model.objects.all(),
        source='department',
        write_only=True,
        required=False
    )
    department_name = serializers.CharField(source='department.name', read_only=True)
    creator = UserNameField(required=False)
    created_by = serializers.CharField(read_only=True)
    last_modified_by = serializers.CharField(read_only=True)
    creator_name = UserNameField(source='creator', read_only=True)
    uploaded_files = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Quiz
        fields = [
            'quiz_id', 'title', 'description', 'no_of_questions',
            'question_type', 'pages', 'department', 'quiz_date',
            'is_active', 'created_at', 'created_by', 'last_modified_at',
            'last_modified_by', 'is_deleted'
        ]
        read_only_fields = ['quiz_id', 'created_at', 'last_modified_at']
        extra_kwargs = {
            'pages': {'required': False, 'default': []}
        }

    def validate_quiz_date(self, value):
        """Validate that quiz_date is not in the past"""
        if value < timezone.now():
            raise serializers.ValidationError("Quiz date cannot be in the past")
        return value

    def validate_pages(self, value):
        """Validate the pages format"""
        if not value:  # Handle empty list or None
            return []
            
        if not isinstance(value, list):
            raise serializers.ValidationError("Pages must be a list")
            
        for page_range in value:
            if not isinstance(page_range, str):
                raise serializers.ValidationError("Each page range must be a string")
            # Validate format like "23-45,56-60"
            parts = page_range.split(',')
            for part in parts:
                if '-' not in part:
                    raise serializers.ValidationError("Page ranges must be in format 'start-end'")
                try:
                    start, end = map(int, part.split('-'))
                    if start > end:
                        raise serializers.ValidationError("Start page must be less than end page")
                except ValueError:
                    raise serializers.ValidationError("Page numbers must be integers")
        return value

class QuizCreateSerializer(serializers.ModelSerializer):
    """Serializer for quiz creation"""
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Quiz.department.field.related_model.objects.all(),
        source='department',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Quiz
        fields = [
            'quiz_id', 'title', 'description', 'time_limit_minutes',
            'passing_score', 'max_attempts', 'start_date', 'end_date',
            'department_id', 'is_published', 'uploadedfiles'
        ]
        read_only_fields = [
            'quiz_id', 'created_at', 'created_by', 'last_modified_at',
            'last_modified_by', 'is_deleted', 'published_at'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        
        # Handle file uploads if any
        uploaded_files = validated_data.pop('uploadedfiles', None)
        
        # Create quiz instance
        quiz = Quiz(**validated_data)
        
        # Set user references
        if user and user.is_authenticated:
            # Store creator name and email
            quiz.creator = user.get_full_name() or user.email
            quiz.created_by = user.email
            quiz.last_modified_by = user.email
        
        # Handle is_published
        if validated_data.get('is_published'):
            quiz.published_at = timezone.now()
        
        # Set uploaded files if any
        if uploaded_files:
            quiz.uploadedfiles = uploaded_files
        
        quiz.save()
        return quiz

class QuizUpdateSerializer(QuizSerializer):
    """Serializer for quiz updates"""
    creator = UserNameField(required=False)
    
    class Meta(QuizSerializer.Meta):
        # Don't require fields on update
        extra_kwargs = {
            'title': {'required': False},
            'description': {'required': False},
            'department': {'required': False},
            'creator': {'required': False}
        }
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        
        # Update last_modified_by if user is authenticated
        if user and user.is_authenticated:
            instance.last_modified_by = user.email
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle is_published
        if validated_data.get('is_published') and not instance.published_at:
            instance.published_at = timezone.now()
        
        instance.save()
        return instance
