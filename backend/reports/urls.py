from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'quiz', views.QuizReportViewSet, basename='quiz-reports')

urlpatterns = [
    path('', include(router.urls)),
]
