from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile
from departments.models import Department
from django.core.cache import cache
from django.core.mail import send_mail
import random
from django.utils import timezone
from students.models import Student
from teacher.models import Teacher
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.core.cache import cache
from teacher.models import Teacher

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user data"""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add extra response data
        data['user_id'] = self.user.id
        data['email'] = self.user.email
        data['role'] = self.user.role
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for the UserProfile model with settings"""
    avatar_url = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    updated_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = (
            'id', 'bio', 'avatar', 'avatar_url', 'institution',
            'email_notifications', 'push_notifications', 'dark_mode',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_avatar_url(self, obj):
        if obj.avatar and hasattr(obj.avatar, 'url'):
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model"""
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 
                  'date_joined', 'profile')
        read_only_fields = ('id', 'email', 'is_active', 'date_joined')
    
    def get_full_name(self, obj):
        return obj.get_full_name()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'role', 'password', 'password_confirm')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs
    
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            role=validated_data.get('role', User.Role.STUDENT)
        )
        return user

class UnifiedLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    role = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=False)

    OTP_CACHE_PREFIX = "login_otp_"

    def _generate_and_send_otp(self, email, name):
        otp = f"{random.randint(100000, 999999)}"
        cache.set(f"{self.OTP_CACHE_PREFIX}{email}", otp, timeout=300)  # 5 mins
        from django.core.mail import send_mail
        send_mail(
            subject="Your OTP for Login",
            message=f"Hello {name},\n\nYour OTP is: {otp}\n\nValid for 5 mins.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )
        return otp

    def validate(self, attrs):
        email = attrs["email"]
        role = attrs["role"].lower().strip()
        password = attrs.get("password")

        # ✅ ADMIN login with password
        if role == "admin":
            try:
                user = User.objects.get(email=email, role="ADMIN")
            except User.DoesNotExist:
                raise serializers.ValidationError({"email": ["Admin user not found."]})

            if not password:
                raise serializers.ValidationError({"password": ["Password is required."]})
            if not user.check_password(password):
                raise serializers.ValidationError({"password": ["Invalid password."]})

            # ✅ Return tokens
            refresh = RefreshToken.for_user(user)
            attrs["token_response"] = {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
            attrs["user"] = user
            return attrs

        # ✅ STUDENT or TEACHER — send OTP
        if role == "student":
            student = Student.objects.filter(email=email, is_deleted=False).first()
            if not student:
                raise serializers.ValidationError({"email": ["No student found with this email."]})
            self._generate_and_send_otp(email, student.name)
        elif role == "teacher":
            teacher = Teacher.objects.filter(email=email, is_deleted=False).first()
            if not teacher:
                raise serializers.ValidationError({"email": ["No teacher found with this email."]})
            self._generate_and_send_otp(email, teacher.name)
        else:
            raise serializers.ValidationError({"role": ["Invalid role."]})
        otp = self._generate_and_send_otp(email, role)
        raise serializers.ValidationError({
            "otp": [f"OTP sent. Please check your email.", f"otp: {otp}"]
        })

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.CharField()
    otp = serializers.CharField()

    OTP_CACHE_PREFIX = "login_otp_"

    def validate(self, attrs):
        email = attrs["email"]
        role = attrs["role"].lower().strip()
        otp = attrs["otp"]

        # ✅ Check if user exists in student/teacher (but don't create auth user)
        if role == "student":
            student = Student.objects.filter(email=email, is_deleted=False).first()
            if not student:
                raise serializers.ValidationError({"email": ["No student found with this email."]})
            user = student

        elif role == "teacher":
            teacher = Teacher.objects.filter(email=email, is_deleted=False).first()
            if not teacher:
                raise serializers.ValidationError({"email": ["No teacher found with this email."]})
            user = teacher

        else:
            raise serializers.ValidationError({"role": ["Invalid role. Only 'student' or 'teacher' allowed."]})

        # ✅ OTP check
        cache_key = f"{self.OTP_CACHE_PREFIX}{email}"
        cached_otp = cache.get(cache_key)

        if not cached_otp:
            raise serializers.ValidationError({"otp": ["OTP has expired. Please request a new one."]})

        if str(cached_otp) != str(otp):
            raise serializers.ValidationError({"otp": ["Invalid OTP."]})

        # ✅ OTP is valid – delete from cache
        cache.delete(cache_key)

        attrs["user"] = user  # Can be student or teacher object
        return attrs


#     email = serializers.EmailField(required=True)
#     role = serializers.ChoiceField(choices=[(r.name, r.name) for r in User.Role])
#     # Password required only for admin
#     password = serializers.CharField(write_only=True, required=False)
#     # OTP supplied by student/teacher in second step
#     otp = serializers.CharField(write_only=True, required=False, max_length=6, min_length=6)

#     OTP_CACHE_PREFIX = "login_otp_"
#     OTP_EXPIRY_SECONDS = 300  # 5 minutes

#     def _generate_and_send_otp(self, email):
#         """Generate a 6-digit OTP, cache it and send via email."""
#         otp = f"{random.randint(0, 999999):06d}"
#         cache_key = f"{self.OTP_CACHE_PREFIX}{email}"
#         cache.set(cache_key, otp, timeout=self.OTP_EXPIRY_SECONDS)

#         send_mail(
#             subject="Your Login OTP",
#             message=f"Your one-time password (OTP) is {otp}. It expires in {self.OTP_EXPIRY_SECONDS // 60} minutes.",
#             from_email=None,  # Use DEFAULT_FROM_EMAIL
#             recipient_list=[email],
#             fail_silently=True,  # Don't crash if email backend not configured
#         )

#     def validate(self, attrs):
#         email = attrs.get("email")
#         role = attrs.get("role").upper()
#         attrs["role"] = role
#         password = attrs.get("password")
#         otp = attrs.get("otp")

#         # try:
#         #     user = User.objects.get(email=email)
#         # except User.DoesNotExist:
#         #     raise serializers.ValidationError({"email": ["User with provided email not found"]})

#         # Extra role-specific check:
#         if role == "STUDENT":
#             if not Student.objects.filter(email=email).exists():
#                 raise serializers.ValidationError({"email": ["No student found with this email"]})
#         elif role == "TEACHER":
#             if not Teacher.objects.filter(email=email).exists():
#                 raise serializers.ValidationError({"email": ["No teacher found with this email"]})
#         elif role == "ADMIN":
#             user = User.objects.get(email=email)
#             if not password:
#                 raise serializers.ValidationError({"password": ["Password is required for admin login"]})
#             if not user.check_password(password):
#                 raise serializers.ValidationError({"password": ["Invalid password"]})
#             attrs["user"] = user
#             return attrs

#         # OTP path (for student/teacher)
#         cache_key = f"{self.OTP_CACHE_PREFIX}{email}"
#         cached_otp = cache.get(cache_key)

#         if not otp or cached_otp is None:
#             self._generate_and_send_otp(email)
#             raise serializers.ValidationError({"otp": ["OTP sent. Please check your email."]})

#         if otp != cached_otp:
#             raise serializers.ValidationError({"otp": ["Invalid OTP"]})

#         cache.delete(cache_key)
#         attrs["user"] = user
#         return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return attrs