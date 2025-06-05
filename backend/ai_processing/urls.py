from django.urls import path
from .views import (
    GenerateQuestionsView,
    QuestionBatchListView,
    QuestionBatchDetailView,
    QuestionDetailView,
)

app_name = 'ai_processing'

urlpatterns = [
    path('generate/', GenerateQuestionsView.as_view(), name='generate_questions'),
    path('batches/', QuestionBatchListView.as_view(), name='question_batch_list'),
    path('batches/<int:pk>/', QuestionBatchDetailView.as_view(), name='question_batch_detail'),
    path('questions/<int:pk>/', QuestionDetailView.as_view(), name='question_detail'),
]
