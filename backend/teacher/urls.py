from django.urls import path

from .views import TeacherListCreateView, TeacherDetailView


app_name = 'teacher'


urlpatterns = [
    path('teachers/', TeacherListCreateView.as_view(), name='teacher_list_create'),
    path('teachers/<uuid:uuid>/', TeacherDetailView.as_view(), name='teacher_detail_by_uuid'),
    path('teachers/<int:teacher_id>/', TeacherDetailView.as_view(), name='teacher_detail_by_id'),
]
