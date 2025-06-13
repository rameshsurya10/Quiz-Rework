from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'quiz'

# Create a router for viewsets
router = DefaultRouter()

urlpatterns = [
    # Quiz CRUD endpoints
    path('', views.QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:quiz_id>/', views.QuizRetrieveUpdateDestroyView.as_view(), name='quiz-detail'),
    path('<int:quiz_id>/publish/', views.QuizPublishView.as_view(), name='quiz-publish'),
    
    # File management endpoints
    path('<int:quiz_id>/files/', views.QuizFileUploadView.as_view(), name='quiz-files-list'),
    path('<int:quiz_id>/files/upload/', views.QuizFileUploadView.as_view(), name='quiz-file-upload'),
    path('<int:quiz_id>/files/<str:file_id>/', views.QuizFileUploadView.as_view(), name='quiz-file-detail'),
    # Quiz question generation endpoint
    path('<int:quiz_id>/generate-questions/', views.QuizQuestionGenerateView.as_view(), name='quiz-generate-questions'),
]
