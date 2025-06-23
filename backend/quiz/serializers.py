from rest_framework import serializers
from .models import Quiz
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, date
from .models import Question
import json

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

class CustomDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, data):
        # Simple approach - try a few common formats
        formats = [
            '%Y-%m-%dT%H:%M',       # 2025-07-01T10:30
            '%Y-%m-%d %H:%M',       # 2025-07-01 10:30
            '%Y-%m-%d',             # 2025-07-01
        ]
        
        # Try standard formats first
        for fmt in formats:
            try:
                dt = datetime.strptime(data, fmt)
                return timezone.make_aware(dt, timezone=timezone.get_current_timezone())
            except (ValueError, TypeError):
                pass
        
        # Special handling for AM/PM formats
        try:
            # Handle formats like "2025-07-01T10:30AM" or "2025-07-01T10:30PM"
            if 'T' in data:
                date_part, time_part = data.split('T', 1)
                
                # Check for AM/PM indicators
                time_only = time_part
                am_pm = None
                
                if 'AM' in time_part:
                    time_only = time_part.replace('AM', '')
                    am_pm = 'AM'
                elif 'PM' in time_part:
                    time_only = time_part.replace('PM', '')
                    am_pm = 'PM'
                elif 'am' in time_part.lower():
                    time_only = time_part.lower().replace('am', '')
                    am_pm = 'AM'
                elif 'pm' in time_part.lower():
                    time_only = time_part.lower().replace('pm', '')
                    am_pm = 'PM'
                
                if am_pm:
                    # Make sure time_only is properly formatted (e.g., "10:30")
                    if ':' not in time_only:
                        # Handle case where time might be "1030" without a colon
                        if len(time_only.strip()) == 4:
                            time_only = f"{time_only[:2]}:{time_only[2:]}"
                        else:
                            raise ValueError("Invalid time format")
                    
                    # Format the datetime string
                    formatted_data = f"{date_part} {time_only.strip()} {am_pm}"
                    dt = datetime.strptime(formatted_data, '%Y-%m-%d %I:%M %p')
                    return timezone.make_aware(dt, timezone=timezone.get_current_timezone())
        except Exception as e:
            print(f"Error parsing date: {str(e)}")
        
        # If all parsing attempts fail, raise an error
        raise serializers.ValidationError("Invalid date format. Please use YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MMAM/PM format.")


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['question_id', 'question', 'question_type', 'options', 'correct_answer', 'explanation']


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
    quiz_date = CustomDateTimeField()
    created_at = serializers.DateTimeField(read_only=True)
    last_modified_at = serializers.DateTimeField(read_only=True)
    published_at = serializers.DateTimeField(required=False)
    questions = QuestionSerializer(many=True, read_only=True, source='quiz_questions')
    
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
            'time_limit_minutes', 'passing_score',
            'questions',
            'metadata'
        ]
        read_only_fields = ['quiz_id', 'created_at', 'last_modified_at']
        extra_kwargs = {
            'pages': {'required': False, 'default': []},
            'metadata': {'required': False, 'default': {}}
        }

    def to_representation(self, instance):
        """Override to_representation to parse JSON in question field"""
        data = super().to_representation(instance)
        
        # Process questions if they exist
        if 'questions' in data and data['questions']:
            for question in data['questions']:
                # Parse JSON for mixed question types
                if question.get('question_type') == 'mixed':
                    try:
                        question['parsed_json'] = json.loads(question['question'])
                    except (json.JSONDecodeError, TypeError):
                        question['parsed_json'] = None
        
        return data

    def validate_quiz_date(self, value):
        if timezone.is_naive(value):
            value = timezone.make_aware(value, timezone.get_current_timezone())
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

class QuizCreateSerializer(serializers.Serializer):
    """Serializer for quiz creation, handling specific payload keys."""
    quiz_id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False)
    no_of_questions = serializers.IntegerField(required=False, min_value=1, max_value=35)
    quiz_type = serializers.CharField(max_length=50, required=False)
    question_type = serializers.CharField(max_length=50, required=False, default='multiple_choice')
    pages = serializers.JSONField(required=False, default=list)
    department_id = serializers.IntegerField(required=False, allow_null=True)
    quiz_date = CustomDateTimeField(required=True)
    uploadedfiles = serializers.JSONField(required=False, default=list)
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_no_of_questions(self, value):
        """Validate number of questions"""
        try:
            # Convert to integer if it's a string
            value = int(value) if isinstance(value, str) else value
            
            if value > 35:
                raise serializers.ValidationError({
                    "error": "Number of questions cannot exceed 35",
                    "message": f"You've requested {value} questions, but the maximum allowed is 35. Please reduce the number of questions.",
                    "title": "Question Limit Exceeded"
                })
        except (ValueError, TypeError):
            raise serializers.ValidationError({
                "error": "Invalid number of questions",
                "message": "Please enter a valid number between 1 and 35.",
                "title": "Invalid Input"
            })
        return value

    def validate_uploadedfiles(self, value):
        """Validate uploaded files"""
        if value:
            total_size = 0
            for file_info in value:
                if 'file_size' in file_info:
                    total_size += file_info['file_size']
            
            # Check if total size exceeds 60MB
            max_size = 60 * 1024 * 1024  # 60MB in bytes
            if total_size > max_size:
                raise serializers.ValidationError({
                    "error": f"Total file size cannot exceed 60MB",
                    "message": f"The total size of all uploaded files ({total_size/(1024*1024):.2f}MB) exceeds the maximum allowed (60MB). Please reduce the file sizes or upload fewer files.",
                    "title": "File Size Limit Exceeded"
                })
        return value

    def create(self, validated_data):
        """Create and return a new Quiz instance, given the validated data."""
        quiz_data = {}
        quiz_data['title'] = validated_data.get('title')
        quiz_data['description'] = validated_data.get('description', '')
        quiz_data['pages'] = validated_data.get('pages', [])
        quiz_data['uploadedfiles'] = validated_data.get('uploadedfiles', [])
        quiz_data['metadata'] = validated_data.get('metadata', {})
        
        # Log the metadata for debugging
        print(f"Creating quiz with metadata: {quiz_data['metadata']}")
        
        # Map payload keys to model field names
        field_mapping = {
            'quiz_type': 'quiz_type',
            'question_type': 'question_type',
            'no_of_questions': 'no_of_questions',
            'time_limit_minutes': 'time_limit_minutes',
            'passing_score': 'passing_score',
            'quiz_date': 'quiz_date'
        }
        
        for payload_key, model_field in field_mapping.items():
            if payload_key in validated_data:
                quiz_data[model_field] = validated_data.get(payload_key)
        
        # Handle department_id
        department_id_payload = validated_data.get('department_id')
        if department_id_payload is not None:
            try:
                department_instance = Quiz.department.field.related_model.objects.get(pk=department_id_payload)
                quiz_data['department'] = department_instance
            except Quiz.department.field.related_model.DoesNotExist:
                raise serializers.ValidationError({'department_id': f"Department with id {department_id_payload} not found."})
        
        # Get the request user
        request = self.context.get('request')
        user = request.user if request and hasattr(request, 'user') else None
        
        # Set creator and created_by fields
        if user and user.is_authenticated:
            quiz_data['creator'] = user.get_full_name() or user.username
            quiz_data['created_by'] = user.email
            quiz_data['last_modified_by'] = user.email
        
        # Create the quiz
        quiz = Quiz.objects.create(**quiz_data)
        
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
