from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import UserProfile
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    UnifiedLoginSerializer,
    VerifyOTPSerializer
)
from .permissions import IsOwnerOrAdminOrReadOnly
from students.models import Student
from teacher.models import Teacher
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.core.mail import send_mail
import random
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from .serializers import VerifyOTPSerializer

def generate_otp():
    return random.randint(100000, 999999)

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
    """
    API view for retrieving and updating user profiles and settings
    Handles both profile information and user settings in one endpoint
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def get_object(self):
        # Get or create the user's profile with default settings
        profile, created = UserProfile.objects.get_or_create(
            user=self.request.user,
            defaults={
                'email_notifications': True,
                'push_notifications': False,
                'dark_mode': False
            }
        )
        return profile
        
    def perform_update(self, serializer):
        # Handle file uploads separately
        avatar = self.request.FILES.get('avatar')
        if avatar:
            # Delete old avatar if exists when new one is uploaded
            profile = self.get_object()
            if profile.avatar:
                profile.avatar.delete(save=False)
            serializer.validated_data['avatar'] = avatar
            
        # Save the updated profile
        serializer.save()


class UserDetailView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating user details"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdminOrReadOnly]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


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
    """API view for listing users with optional role filtering"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Disable pagination for simplicity
    
    def get_queryset(self):
        queryset = User.objects.all()
        user = self.request.user
        
        # Apply role filtering if provided in query parameters
        role = self.request.query_params.get('role')
        if role:
            if role.lower() == 'teacher':
                return queryset.filter(role=User.Role.TEACHER)
            elif role.lower() == 'student':
                return queryset.filter(role=User.Role.STUDENT)
            elif role.lower() == 'admin':
                return queryset.filter(role=User.Role.ADMIN)
        
        # Apply permission-based filtering if no role specified
        if not user.is_admin:
            if user.is_teacher:
                # Teachers can see students and themselves
                return queryset.filter(role=User.Role.STUDENT) | queryset.filter(id=user.id)
            else:
                # Students can only see themselves
                return queryset.filter(id=user.id)
        
        return queryset
        
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class AvatarUploadView(APIView):
    """API view for uploading user avatar"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if 'avatar' not in request.FILES:
            return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        avatar_file = request.FILES['avatar']
        
        # Check if file is an image
        if not avatar_file.content_type.startswith('image/'):
            return Response({'error': 'File must be an image'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check file size limit (e.g., 2MB)
        if avatar_file.size > 2 * 1024 * 1024:  # 2MB
            return Response({'error': 'Image size should be less than 2MB'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get or create user profile
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            
            # Delete old avatar if exists
            if profile.avatar and hasattr(profile.avatar, 'path'):
                if profile.avatar.path:
                    import os
                    if os.path.exists(profile.avatar.path):
                        os.remove(profile.avatar.path)
            
            # Save new avatar
            profile.avatar = avatar_file
            profile.save()
            
            return Response({
                'success': True,
                'message': 'Avatar updated successfully',
                'avatar_url': request.build_absolute_uri(profile.avatar.url) if profile.avatar else None
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InitiateLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        role = request.data.get("role", "").lower().strip()

        if not email or not role:
            return Response({"message": "Email and role are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate role & get user name from student/teacher
        if role == "student":
            student = Student.objects.filter(email=email, is_deleted=False).first()
            if not student:
                return Response({"message": "You are not entered in the student table."}, status=status.HTTP_404_NOT_FOUND)
            name = student.name

        elif role == "teacher":
            teacher = Teacher.objects.filter(email=email, is_deleted=False).first()
            if not teacher:
                return Response({"message": "You are not entered in the teacher table."}, status=status.HTTP_404_NOT_FOUND)
            name = teacher.name

        else:
            return Response({"message": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

        # ✅ Generate and cache OTP
        otp = generate_otp()
        cache_key = f"login_otp_{email}"
        cache.set(cache_key, otp, timeout=300)  # 5 minutes

        # ✅ Send email
        subject = "Your OTP for Login"
        message = f"Hello {name},\n\nYour OTP for login is: {otp}\n\nThis OTP is valid for 5 minutes."
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])

        return Response({"message": "OTP has been sent to your email.", "otp": otp}, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]  # ✅ now guaranteed to exist
        # refresh = RefreshToken.for_user(user)
        role = request.data.get("role", "").lower().strip()

        if role == "student":
            user_id = user.student_id
        elif role == "teacher":
            user_id = user.teacher_id
        else:
            user_id = None

        return Response({
            # "refresh": str(refresh),
            # "access": str(refresh.access_token),
            "user": {
                "id": user_id,
                "name": user.name,
                "email": user.email,
                "type": role
            }
        }, status=status.HTTP_200_OK)