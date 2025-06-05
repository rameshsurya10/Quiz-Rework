from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile, Teacher, Student

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
    """Serializer for the UserProfile model"""
    
    class Meta:
        model = UserProfile
        fields = ('id', 'bio', 'avatar', 'institution')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model"""
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'profile')
        read_only_fields = ('id', 'email', 'is_active')


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


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return attrs


class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for Teacher model"""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    department_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Teacher
        fields = (
            'id', 'user', 'user_id', 'employee_id', 'specialization', 
            'qualification', 'bio', 'join_date', 'phone_number', 
            'is_head', 'departments', 'full_name', 'department_names',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    
    def get_department_names(self, obj):
        return [dept.name for dept in obj.departments.all()]


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model"""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = (
            'id', 'user', 'user_id', 'student_id', 'department',
            'department_name', 'enrollment_date', 'graduation_year',
            'phone_number', 'full_name', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    
    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None
