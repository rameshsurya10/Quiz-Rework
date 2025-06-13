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
            'quiz_id', 'title', 'description', 'uploadedfiles',
            'is_published', 'published_at', 'time_limit_minutes',
            'passing_score', 'max_attempts', 'start_date', 'end_date',
            'department', 'department_id', 'department_name', 'created_at', 
            'created_by', 'created_by_name', 'last_modified_at',
            'last_modified_by', 'last_modified_by_name', 'creator', 
            'creator_name', 'is_deleted'
        ]
        read_only_fields = [
            'quiz_id', 'created_at', 'created_by', 'created_by_name',
            'last_modified_at', 'last_modified_by', 'last_modified_by_name',
            'is_deleted', 'published_at', 'department_name', 'creator_name'
        ]
        extra_kwargs = {
            'department': {'write_only': True},
            'creator': {'write_only': True}
        }
    
    def validate(self, data):
        """
        Validate that start_date is before end_date if both are provided
        """
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "End date must be after start date"
            )
        return data

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
