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

app_name = 'quizzes'

urlpatterns = [
    path('', QuizListCreateView.as_view(), name='quiz_list_create'),
    path('<int:pk>/', QuizDetailView.as_view(), name='quiz_detail'),
    path('<int:quiz_id>/attempts/', QuizAttemptsListView.as_view(), name='quiz_attempts_list'),
    path('<int:quiz_id>/start/', StartQuizView.as_view(), name='start_quiz'),
    path('<int:quiz_id>/analytics/', QuizAnalyticsView.as_view(), name='quiz_analytics'),
    path('attempts/', UserQuizAttemptsListView.as_view(), name='user_quiz_attempts'),
    path('attempts/<int:pk>/', QuizAttemptDetailView.as_view(), name='quiz_attempt_detail'),
    path('submit/', SubmitQuizView.as_view(), name='submit_quiz'),
    path('progress/', UserProgressView.as_view(), name='user_progress'),
]
