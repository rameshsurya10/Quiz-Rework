from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UserProfile
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer
)
from .permissions import IsOwnerOrAdminOrReadOnly

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom token view for JWT authentication"""
    serializer_class = CustomTokenObtainPairSerializer


class UserRegistrationView(generics.CreateAPIView):
    """API view for user registration"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create a user profile
        UserProfile.objects.create(user=user)
        
        return Response(
            {
                "message": "User registered successfully",
                "user": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating user profiles"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def get_object(self):
        return self.request.user.profile


class UserDetailView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating user details"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """API view for changing user password"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            
            # Check if the current password is correct
            if not user.check_password(serializer.validated_data['current_password']):
                return Response({'current_password': ['Wrong password.']}, status=status.HTTP_400_BAD_REQUEST)
            
            # Set the new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'message': 'Password updated successfully'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """API view for listing users (admin only)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return User.objects.all()
        elif user.is_teacher:
            # Teachers can see students and themselves
            return User.objects.filter(role=User.Role.STUDENT) | User.objects.filter(id=user.id)
        else:
            # Students can only see themselves
            return User.objects.filter(id=user.id)
