from django.urls import path
from .views import StudentListCreateView, StudentDetailView

app_name = 'students'

urlpatterns = [  
    path('create_student', StudentListCreateView.as_view(), name='student_list_create'),
]
