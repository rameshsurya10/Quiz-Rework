from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile, Teacher, Student
from departments.models import Department

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


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return attrs


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    class Meta:
        model = Department
        fields = ('id', 'name', 'description', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for Teacher model"""
    user = UserSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    full_name = serializers.SerializerMethodField()
    departments = DepartmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Teacher
        fields = (
            'id', 'user', 'user_id', 'employee_id',
            'phone_number', 'departments', 'full_name',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class TeacherCreateSerializer(serializers.Serializer):
    """Serializer for creating a new teacher with user account"""
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    department_name = serializers.CharField(required=True, max_length=100)
    employee_id = serializers.CharField(required=True, max_length=50)
    # specialization, qualification, bio, and is_head are removed as per user request

    def create(self, validated_data):
        # This method is not used directly since we're handling creation in the view
        # But it's required by the serializer
        pass


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


class StudentCreateSerializer(serializers.Serializer):
    """Serializer for creating a new student with user account"""
    # User fields
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    
    # Student fields
    student_id = serializers.CharField(required=True, max_length=20)
    department = serializers.UUIDField(required=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    enrollment_date = serializers.DateField(required=False, allow_null=True)
    graduation_year = serializers.IntegerField(required=False, allow_null=True)
