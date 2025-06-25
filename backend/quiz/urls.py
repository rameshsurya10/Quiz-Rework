from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import QuizViewSet
from .views import StudentQuestionView


app_name = 'quiz'

# Create a router for viewsets
router = DefaultRouter()
router.register(r'', QuizViewSet, basename='quiz')

urlpatterns = [
    # Quiz CRUD endpoints
    path('', views.QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:quiz_id>/', views.QuizRetrieveUpdateDestroyView.as_view(), name='quiz-detail'),
    path('<int:quiz_id>/publish/', views.QuizPublishView.as_view(), name='quiz-publish'),
    path('<int:quiz_id>/share/', views.QuizShareView.as_view(), name='quiz-share'),
    path('question_shuffle/<int:quiz_id>/', StudentQuestionView.as_view(), name='question_"shuffle'),

   
    # File management endpoints
    path('<int:quiz_id>/files/upload/', views.QuizFileUploadView.as_view(), name='quiz-file-upload'),
    path('<int:quiz_id>/files/<str:file_id>/', views.QuizFileUploadView.as_view(), name='quiz-file-detail'),
   
    # path('<int:quiz_id>/tamil/upload/', views.TamilImageUploadView.as_view(), name='tamil-file-upload'),
    # path('<int:quiz_id>/tamil/<str:file_id>/', views.TamilImageUploadView.as_view(), name='tamil-file-detail'),
   
   
    # Quiz question generation endpoints
    path('<int:quiz_id>/generate_question/', views.QuizQuestionGenerateFromExistingFileView.as_view(), name='quiz-generate-from-existing-file'),
    path('<int:quiz_id>/generate_by_type/', views.QuizQuestionGenerateByTypeView.as_view(), name='quiz-generate-by-type'),
    path('', include(router.urls)),
]
