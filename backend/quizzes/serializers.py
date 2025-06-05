from rest_framework import serializers
from django.utils import timezone
from .models import Quiz, QuizAttempt, QuizQuestionResponse
from ai_processing.models import Question, Option
from ai_processing.serializers import QuestionSerializer


class QuizSerializer(serializers.ModelSerializer):
    """Serializer for Quiz model"""
    creator_name = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()
    batch_name = serializers.CharField(source='question_batch.name', read_only=True)
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'question_batch', 'batch_name',
            'creator', 'creator_name', 'is_published', 'time_limit_minutes',
            'passing_score', 'max_attempts', 'shuffle_questions', 'show_answers',
            'question_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['creator', 'creator_name', 'created_at', 'updated_at']
    
    def get_creator_name(self, obj):
        return f"{obj.creator.first_name} {obj.creator.last_name}".strip()
    
    def get_question_count(self, obj):
        return obj.question_batch.questions.count()
    
    def create(self, validated_data):
        """Create a new quiz and set the creator"""
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


class QuizDetailSerializer(QuizSerializer):
    """Detailed serializer for Quiz with questions"""
    questions = serializers.SerializerMethodField()
    
    class Meta(QuizSerializer.Meta):
        fields = QuizSerializer.Meta.fields + ['questions']
    
    def get_questions(self, obj):
        """Get questions from the question batch"""
        questions = obj.question_batch.questions.all()
        return QuestionSerializer(questions, many=True).data


class QuizQuestionResponseSerializer(serializers.ModelSerializer):
    """Serializer for quiz question responses"""
    class Meta:
        model = QuizQuestionResponse
        fields = ['question', 'selected_option', 'text_response']


class SubmitQuizResponseSerializer(serializers.Serializer):
    """Serializer for submitting quiz responses"""
    attempt_id = serializers.IntegerField()
    responses = QuizQuestionResponseSerializer(many=True)
    
    def validate_attempt_id(self, value):
        """Validate the quiz attempt exists and is in progress"""
        try:
            attempt = QuizAttempt.objects.get(pk=value)
            if attempt.status != 'in_progress':
                raise serializers.ValidationError("This quiz attempt is no longer in progress")
            return value
        except QuizAttempt.DoesNotExist:
            raise serializers.ValidationError("Quiz attempt not found")
    
    def validate(self, data):
        """Validate that the user is submitting responses for their own attempt"""
        attempt = QuizAttempt.objects.get(pk=data['attempt_id'])
        user = self.context['request'].user
        
        if attempt.user != user:
            raise serializers.ValidationError(
                "You cannot submit responses for someone else's quiz attempt"
            )
        
        return data
    
    def save(self):
        """Save the quiz responses and calculate the score"""
        attempt_id = self.validated_data['attempt_id']
        responses_data = self.validated_data['responses']
        
        attempt = QuizAttempt.objects.get(pk=attempt_id)
        quiz = attempt.quiz
        
        # Save responses and calculate score
        correct_count = 0
        total_questions = len(responses_data)
        
        for response_data in responses_data:
            question = response_data['question']
            
            # Determine if response is correct
            is_correct = False
            
            if question.question_type == 'multiple_choice':
                selected_option = response_data.get('selected_option')
                if selected_option and selected_option.is_correct:
                    is_correct = True
            elif question.question_type == 'true_false':
                text_response = response_data.get('text_response', '').lower()
                correct_answer = question.answer.answer_text.lower()
                is_correct = (text_response == correct_answer)
            else:  # short_answer
                # For short answer, we'll need manual grading or more sophisticated matching
                # For now, just check if the response is not empty
                text_response = response_data.get('text_response', '')
                is_correct = None  # Cannot automatically determine correctness
            
            # Save the response
            QuizQuestionResponse.objects.update_or_create(
                attempt=attempt,
                question=question,
                defaults={
                    'selected_option': response_data.get('selected_option'),
                    'text_response': response_data.get('text_response', ''),
                    'is_correct': is_correct
                }
            )
            
            if is_correct:
                correct_count += 1
        
        # Calculate score (exclude questions that can't be auto-graded)
        gradable_questions = total_questions - attempt.responses.filter(is_correct=None).count()
        if gradable_questions > 0:
            score = (correct_count / gradable_questions) * 100
        else:
            score = 0
        
        # Update the attempt
        attempt.status = 'completed'
        attempt.score = score
        attempt.completed_at = timezone.now()
        attempt.time_taken_seconds = (attempt.completed_at - attempt.started_at).seconds
        attempt.save()
        
        return attempt


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempts"""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    user_name = serializers.SerializerMethodField()
    is_passed = serializers.ReadOnlyField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'user', 'user_name', 'status',
            'score', 'started_at', 'completed_at', 'time_taken_seconds', 'is_passed'
        ]
        read_only_fields = [
            'user', 'status', 'score', 'started_at', 'completed_at',
            'time_taken_seconds', 'is_passed'
        ]
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    
    def create(self, validated_data):
        """Create a new quiz attempt for the current user"""
        validated_data['user'] = self.context['request'].user
        
        # Check if max attempts reached
        quiz = validated_data['quiz']
        user = validated_data['user']
        
        attempt_count = QuizAttempt.objects.filter(
            quiz=quiz, user=user, status='completed'
        ).count()
        
        if quiz.max_attempts and attempt_count >= quiz.max_attempts:
            raise serializers.ValidationError(
                f"Maximum attempts ({quiz.max_attempts}) for this quiz has been reached"
            )
        
        return super().create(validated_data)


class QuizAttemptDetailSerializer(QuizAttemptSerializer):
    """Detailed serializer for quiz attempts with responses"""
    responses = serializers.SerializerMethodField()
    questions = serializers.SerializerMethodField()
    
    class Meta(QuizAttemptSerializer.Meta):
        fields = QuizAttemptSerializer.Meta.fields + ['responses', 'questions']
    
    def get_responses(self, obj):
        """Get the user's responses for this attempt"""
        return [{
            'question_id': response.question.id,
            'selected_option_id': response.selected_option.id if response.selected_option else None,
            'text_response': response.text_response,
            'is_correct': response.is_correct
        } for response in obj.responses.all()]
    
    def get_questions(self, obj):
        """Get questions for this quiz"""
        questions = obj.quiz.question_batch.questions.all()
        if obj.quiz.shuffle_questions:
            questions = questions.order_by('?')
        return QuestionSerializer(questions, many=True).data
