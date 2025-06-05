from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserRegistrationView,
    UserProfileView,
    UserDetailView,
    ChangePasswordView,
    UserListView,
)
from .teacher_views import TeacherListCreateView, TeacherDetailView

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # User endpoints
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/', UserListView.as_view(), name='user_list'),
    
    # Teacher endpoints
    path('teachers/', TeacherListCreateView.as_view(), name='teacher_list_create'),
    path('teachers/<uuid:id>/', TeacherDetailView.as_view(), name='teacher_detail'),
]
