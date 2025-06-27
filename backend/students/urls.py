from django.urls import path, re_path
from rest_framework.routers import DefaultRouter
from . import views
from .views import *

app_name = 'students'

# Using a router for standard CRUD operations
router = DefaultRouter()
router.register(r'', views.StudentViewSet, basename='student')

urlpatterns = [
    # Standard REST endpoints
    path('', views.StudentListView.as_view(), name='student-list-create'),
    path('<int:student_id>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('verify/<int:student_id>/', StudentVerificationView.as_view(), name='student-verify'),
    # Additional endpoints - handle both with and without trailing slash
    re_path(r'^create_student$', views.StudentCreateView.as_view(), name='create-student-no-slash'),
    path('quiz_submit/', SubmitQuizAttemptView.as_view(), name='quiz-submit'),
    path('quiz_attempt/<int:quiz_id>/', RetrieveQuizAttemptView.as_view(), name='quiz-attempt-detail'),
    path('quiz_attempts/', ListStudentQuizResultsView.as_view(), name='quiz-attempts-list'),
    path('send_reminder/', QuizReminderStudent.as_view(), name='send_quiz_reminders'),
    
    # Include router URLs
] + router.urls
