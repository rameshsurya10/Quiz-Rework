from rest_framework import serializers
from .models import Teacher
from departments.models import Department

class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for Teacher model"""
    departments = serializers.SerializerMethodField()
    department_ids = serializers.ListField(write_only=True)

    class Meta:
        model = Teacher
        fields = [
            'teacher_id', 'uuid', 'name', 'departments', 'department_ids', 'created_at',
            'last_modified_at', 'created_by', 'last_modified_by', 'email',
            'phone', 'join_date', 'is_deleted'
        ]
        read_only_fields = ('teacher_id', 'uuid', 'created_at', 'last_modified_at')
        extra_kwargs = {
            'department_ids': {'write_only': True}
        }
    
    def get_departments(self, obj):
        # department_ids may be int or uuid, so we try both
        ids = obj.department_ids or []
        departments = Department.objects.filter(department_id__in=ids)
        return [
            {'id': dept.department_id, 'name': dept.name}
            for dept in departments
        ]

    def validate_department_ids(self, value):
        # Optionally, validate that department IDs exist in Department model
        return value


class TeacherCreateSerializer(serializers.Serializer):
    """Serializer for creating a new teacher with user account"""
    name = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    department_ids = serializers.ListField(child=serializers.UUIDField(), required=True)
    join_date = serializers.DateField(required=True)
  
    def create(self, validated_data):
        # This method is not used directly since we're handling creation in the view
        # But it's required by the serializer
        pass