from django.urls import path
from .views import (
    QuizListCreateView,
    QuizDetailView,
    QuizAttemptsListView,
    UserQuizAttemptsListView,
    StartQuizView,
    QuizAttemptDetailView,
    SubmitQuizView,
    QuizAnalyticsView,
    UserProgressView,
)
from .views_ai_quiz import (
    AIGeneratedQuizCreateView,
    AIQuestionRegenerationView,
)

app_name = 'quizzes'

urlpatterns = [
    path('', QuizListCreateView.as_view(), name='quiz_list_create'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz_detail'),
    path('<int:quiz_id>/attempts/', QuizAttemptsListView.as_view(), name='quiz_attempts_list'),
    path('<int:quiz_id>/start/', StartQuizView.as_view(), name='start_quiz'),
    path('<int:quiz_id>/analytics/', QuizAnalyticsView.as_view(), name='quiz_analytics'),
    path('<int:quiz_id>/regenerate-questions/', AIQuestionRegenerationView.as_view(), name='quiz_regenerate_questions'),
    path('attempts/', UserQuizAttemptsListView.as_view(), name='user_quiz_attempts'),
    path('attempts/<int:pk>/', QuizAttemptDetailView.as_view(), name='quiz_attempt_detail'),
    path('submit/', SubmitQuizView.as_view(), name='submit_quiz'),
    path('progress/', UserProgressView.as_view(), name='user_progress'),
    path('ai-generated/', AIGeneratedQuizCreateView.as_view(), name='ai_generated_quiz_create'),
]
