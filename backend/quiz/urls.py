from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    QuizListCreateView, 
    QuizRetrieveUpdateDestroyView, 
    QuizFileUploadView,
    QuizPublishView,
    QuizQuestionGenerateView,
    StudentQuestionView,
    QuizShareView,
    QuizQuestionsView,
    ReplaceQuizQuestionAPIView,
    QuizQuestionGenerateFromPromptView,
    QuizQuestionGenerateFromExistingFileView,
    QuizQuestionGenerateByTypeView,
    QuizViewSet
)

app_name = 'quiz'

router = DefaultRouter()
router.register('', QuizViewSet, basename='quiz-viewset')


urlpatterns = [
    # Main quiz endpoints
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<int:quiz_id>/', QuizRetrieveUpdateDestroyView.as_view(), name='quiz-detail'),
    
    # Dedicated file upload endpoint
    path('<int:quiz_id>/upload/', QuizFileUploadView.as_view(), name='quiz-file-upload'),
    
    # Other quiz actions
    path('<int:quiz_id>/publish/', QuizPublishView.as_view(), name='quiz-publish'),
    path('<int:quiz_id>/questions/', QuizQuestionsView.as_view(), name='quiz-questions'),
    path('<int:quiz_id>/replace-question/', ReplaceQuizQuestionAPIView.as_view(), name='replace-quiz-question'),
   
    # Student and sharing endpoints
    path('student/<int:quiz_id>/', StudentQuestionView.as_view(), name='student-quiz-questions'),
    path('share/<str:quiz_id>/', QuizShareView.as_view(), name='quiz-share'),
   
    # Question generation endpoints
    path('<int:quiz_id>/generate-questions/', QuizQuestionGenerateView.as_view(), name='quiz-generate-questions'),
    path('<int:quiz_id>/generate-from-prompt/', QuizQuestionGenerateFromPromptView.as_view(), name='generate-from-prompt'),
    path('<int:quiz_id>/generate-from-file/', QuizQuestionGenerateFromExistingFileView.as_view(), name='generate-from-file'),
    path('<int:quiz_id>/generate-by-type/', QuizQuestionGenerateByTypeView.as_view(), name='generate-by-type'),
    
    # Including the router for ViewSet (if needed, otherwise can be removed)
    path('viewset/', include(router.urls)),
]
