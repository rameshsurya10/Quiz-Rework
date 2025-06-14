from rest_framework import serializers
from quiz.models import Quiz, QuizAttempt, Question, QuestionAttempt
from users.models import User

class QuizReportSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    total_attempts = serializers.IntegerField(read_only=True)
    average_score = serializers.FloatField(read_only=True)
    pass_rate = serializers.FloatField(read_only=True)

class StudentPerformanceSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    attempts = serializers.IntegerField(read_only=True)
    best_score = serializers.FloatField(read_only=True)
    passed = serializers.BooleanField(read_only=True)
    last_attempt = serializers.DateTimeField(read_only=True)

class QuestionAnalysisSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(read_only=True)
    question_text = serializers.CharField(read_only=True)
    question_type = serializers.CharField(read_only=True)
    total_attempts = serializers.IntegerField(read_only=True)
    correct_attempts = serializers.IntegerField(read_only=True)
    accuracy = serializers.FloatField(read_only=True)

class QuizSummarySerializer(serializers.Serializer):
    total_attempts = serializers.IntegerField(read_only=True)
    average_score = serializers.FloatField(read_only=True)
    pass_rate = serializers.FloatField(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    score_distribution = serializers.DictField(
        child=serializers.IntegerField(),
        read_only=True
    )
    passing_score = serializers.IntegerField(read_only=True)
    max_score = serializers.IntegerField(read_only=True)
