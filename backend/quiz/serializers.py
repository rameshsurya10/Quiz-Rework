from rest_framework import serializers
from .models import Quiz
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime

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
            'quiz_type', 'question_type', 'pages',
            'department_id',
            'department_name',
            'quiz_date',
            'is_published', 'published_at', 'is_deleted',
            'creator',
            'created_at', 'created_by',
            'last_modified_at', 'last_modified_by',
            'creator_name',
            'uploaded_files',
            'uploadedfiles',
            'time_limit_minutes', 'passing_score'
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

class CustomDateField(serializers.DateField):
    def to_internal_value(self, data):
        try:
            # Parse the date string
            parsed_date = datetime.strptime(data, '%Y-%m-%d').date()
            return parsed_date
        except (ValueError, TypeError):
            raise serializers.ValidationError('Date must be in YYYY-MM-DD format')

    def to_representation(self, value):
        if isinstance(value, datetime):
            return value.date()
        return value

class QuizCreateSerializer(serializers.Serializer):
    """Serializer for quiz creation, handling specific payload keys."""
    quiz_id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False)
    no_of_questions = serializers.IntegerField(required=False)
    quiz_type = serializers.CharField(max_length=50, required=False)
    question_type = serializers.CharField(max_length=50, required=False, default='multiple_choice')
    pages = serializers.JSONField(required=False, default=list)
    department_id = serializers.IntegerField(required=False, allow_null=True)
    quiz_date = CustomDateField(required=True)
    uploadedfiles = serializers.JSONField(required=False, default=list)

    def create(self, validated_data):
        """Create and return a new Quiz instance, given the validated data."""
        quiz_data = {}
        quiz_data['title'] = validated_data.get('title')
        quiz_data['description'] = validated_data.get('description', '')
        quiz_data['pages'] = validated_data.get('pages', [])
        quiz_data['uploadedfiles'] = validated_data.get('uploadedfiles', [])

        # Map payload keys to model field names
        if 'no_of_questions' in validated_data:
            quiz_data['no_of_questions'] = validated_data['no_of_questions']
        
        if 'quiz_type' in validated_data:
            quiz_data['quiz_type'] = validated_data['quiz_type']

        if 'question_type' in validated_data:
            quiz_data['question_type'] = validated_data['question_type']

        # Handle department_id
        department_id_payload = validated_data.get('department_id')
        if department_id_payload is not None:
            try:
                department_instance = Quiz.department.field.related_model.objects.get(pk=department_id_payload)
                quiz_data['department'] = department_instance
            except Quiz.department.field.related_model.DoesNotExist:
                raise serializers.ValidationError({'department_id': f"Department with id {department_id_payload} not found."})
        
        # Handle quiz_date - convert date to datetime with timezone
        quiz_date = validated_data.get('quiz_date')
        if quiz_date:
            # Convert date to datetime at midnight
            quiz_datetime = datetime.combine(quiz_date, datetime.min.time())
            # Make it timezone aware
            quiz_data['quiz_date'] = timezone.make_aware(quiz_datetime)

        # Get the request user
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        
        # Set creator and created_by fields
        if user and user.is_authenticated:
            quiz_data['creator'] = user.get_full_name() or user.username
            quiz_data['created_by'] = user.email
            quiz_data['last_modified_by'] = user.email

        # Create the quiz instance
        quiz = Quiz.objects.create(**quiz_data)
        
        # Return the created quiz with all fields
        return quiz

    def update(self, instance, validated_data):
        raise NotImplementedError("This serializer does not support update operations.")

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
