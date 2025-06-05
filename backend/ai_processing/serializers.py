from rest_framework import serializers
from django.db import transaction
from .models import QuestionBatch, Question, Option, Answer
from documents.models import Document


class OptionSerializer(serializers.ModelSerializer):
    """Serializer for question options"""
    class Meta:
        model = Option
        fields = ['id', 'option_text', 'is_correct']


class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for question answers"""
    class Meta:
        model = Answer
        fields = ['id', 'answer_text']


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for questions"""
    options = OptionSerializer(many=True, read_only=True)
    answer = AnswerSerializer(read_only=True)
    
    class Meta:
        model = Question
        fields = [
            'id', 'question_text', 'question_type', 
            'explanation', 'difficulty', 'options', 'answer'
        ]


class QuestionBatchSerializer(serializers.ModelSerializer):
    """Serializer for question batches"""
    questions_count = serializers.SerializerMethodField()
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = QuestionBatch
        fields = [
            'id', 'name', 'description', 'document', 'document_title',
            'difficulty', 'questions_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['questions_count', 'created_at', 'updated_at']
    
    def get_questions_count(self, obj):
        return obj.questions.count()


class QuestionBatchDetailSerializer(QuestionBatchSerializer):
    """Detailed serializer for question batches with questions included"""
    questions = QuestionSerializer(many=True, read_only=True)
    
    class Meta(QuestionBatchSerializer.Meta):
        fields = QuestionBatchSerializer.Meta.fields + ['questions']


class GenerateQuestionsSerializer(serializers.Serializer):
    """Serializer for generating questions from a document"""
    document_id = serializers.IntegerField()
    num_questions = serializers.IntegerField(min_value=1, max_value=50, default=10)
    question_types = serializers.MultipleChoiceField(
        choices=['multiple_choice', 'true_false', 'short_answer'],
        default=['multiple_choice']
    )
    difficulty = serializers.ChoiceField(
        choices=['easy', 'medium', 'hard', 'mixed'],
        default='medium'
    )
    batch_name = serializers.CharField(max_length=255)
    batch_description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_document_id(self, value):
        """Validate that the document exists and has been processed"""
        try:
            document = Document.objects.get(pk=value)
            if not document.is_processed or not document.extracted_text:
                raise serializers.ValidationError(
                    "Document has not been processed or has no extracted text"
                )
            return value
        except Document.DoesNotExist:
            raise serializers.ValidationError("Document not found")
    
    @transaction.atomic
    def create_batch_with_questions(self, validated_data, user, generated_questions):
        """Create a batch and associated questions from generated data"""
        # Get the document
        document = Document.objects.get(pk=validated_data['document_id'])
        
        # Create the question batch
        batch = QuestionBatch.objects.create(
            document=document,
            user=user,
            name=validated_data['batch_name'],
            description=validated_data.get('batch_description', ''),
            difficulty=validated_data['difficulty']
        )
        
        # Create questions for the batch
        for question_data in generated_questions:
            question_type = question_data.get('question_type', 'multiple_choice')
            
            # Create the question
            question = Question.objects.create(
                batch=batch,
                question_text=question_data['question_text'],
                question_type=question_type,
                explanation=question_data.get('explanation', ''),
                difficulty=question_data.get('difficulty', validated_data['difficulty'])
            )
            
            # Handle different question types
            if question_type == 'multiple_choice':
                # Create options for multiple choice questions
                options = question_data.get('options', [])
                correct_answer = question_data.get('correct_answer', '')
                
                for option_text in options:
                    Option.objects.create(
                        question=question,
                        option_text=option_text,
                        is_correct=(option_text == correct_answer)
                    )
            else:
                # Create answer for true/false or short_answer questions
                answer_text = question_data.get('correct_answer', '')
                if isinstance(answer_text, bool):
                    answer_text = str(answer_text)
                
                Answer.objects.create(
                    question=question,
                    answer_text=answer_text
                )
        
        return batch
