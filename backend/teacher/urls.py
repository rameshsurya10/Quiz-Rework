from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeacherViewSet

app_name = 'teacher'

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'teachers', TeacherViewSet, basename='teacher')
# router.register(r'', TeacherViewSet, basename='teacher')

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls))
]
