from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet

# Create a router and register the viewsets
router = DefaultRouter()
router.register(r'', DepartmentViewSet)

# Define URL patterns for the departments app
urlpatterns = [
    path('', include(router.urls)),
]
