from django.urls import path, re_path
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'students'

# Using a router for standard CRUD operations
router = DefaultRouter()
router.register(r'', views.StudentViewSet, basename='student')

urlpatterns = [
    # Standard REST endpoints
    path('', views.StudentListCreateView.as_view(), name='student-list-create'),
    path('<int:student_id>/', views.StudentDetailView.as_view(), name='student-detail'),
    
    # Additional endpoints - handle both with and without trailing slash
    path('create_student/', views.StudentCreateView.as_view(), name='create-student'),
    re_path(r'^create_student$', views.StudentCreateView.as_view(), name='create-student-no-slash'),
    
    # Include router URLs
] + router.urls
