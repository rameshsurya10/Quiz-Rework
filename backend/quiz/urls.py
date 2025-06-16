from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import QuizViewSet

app_name = 'quiz'

# Create a router for viewsets
router = DefaultRouter()
router.register(r'', QuizViewSet, basename='quiz')

urlpatterns = [
    # Quiz CRUD endpoints
    path('', views.QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:quiz_id>/', views.QuizRetrieveUpdateDestroyView.as_view(), name='quiz-detail'),
    path('<int:quiz_id>/publish/', views.QuizPublishView.as_view(), name='quiz-publish'),
    # path('<int:quiz_id>/generate-from-prompt/', views.QuizQuestionGenerateFromPromptView.as_view(), name='quiz-generate-from-prompt'),
    
    # File management endpoints
    path('<int:quiz_id>/files/', views.QuizFileUploadView.as_view(), name='quiz-files-list'),
    path('<int:quiz_id>/files/upload/', views.QuizFileUploadView.as_view(), name='quiz-file-upload'),
    path('<int:quiz_id>/files/<str:file_id>/', views.QuizFileUploadView.as_view(), name='quiz-file-detail'),
    # Quiz question generation endpoints
    path('<int:quiz_id>/generate_question/', views.QuizQuestionGenerateFromExistingFileView.as_view(), name='quiz-generate-from-existing-file'),
    path('<int:quiz_id>/generate_by_type/', views.QuizQuestionGenerateByTypeView.as_view(), name='quiz-generate-by-type'),
    path('', include(router.urls)),
]
