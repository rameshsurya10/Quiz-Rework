from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserRegistrationView,
    UserProfileView,
    UserDetailView,
    ChangePasswordView,
    UserListView,
    AvatarUploadView,
)

from rest_framework.response import Response

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

app_name = 'accounts'

# Simple test view to verify API routing
@api_view(['GET'])
@permission_classes([AllowAny])
def test_api_view(request):
    return Response({
        'status': 'success',
        'message': 'API endpoint is working correctly',
        'path': request.path
    })

urlpatterns = [
    # Test endpoint
    path('test/', test_api_view, name='test-api'),
    
    # Authentication endpoints
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # User endpoints
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('me/avatar/', AvatarUploadView.as_view(), name='user_avatar_upload'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('', UserListView.as_view(), name='user_list'),    
]
