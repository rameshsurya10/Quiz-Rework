from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherViewSet, TeacherListCreateView, TeacherDetailView

app_name = 'teacher'

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'teachers', TeacherViewSet, basename='teacher')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Keep the existing URLs for backward compatibility
    path('teachers/legacy/', TeacherListCreateView.as_view(), name='teacher_list_create'),
    path('teachers/legacy/<uuid:uuid>/', TeacherDetailView.as_view(), name='teacher_detail_by_uuid'),
    path('teachers/legacy/<int:teacher_id>/', TeacherDetailView.as_view(), name='teacher_detail_by_id'),
]
