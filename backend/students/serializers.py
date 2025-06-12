from rest_framework import serializers
from .models import Student
from departments.models import Department

class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model"""
    created_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_modified_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'student_id', 'uuid', 'name', 'email', 'phone', 
            'department_id', 'department_name', 'is_deleted',
            'created_at', 'last_modified_at', 'created_by', 'last_modified_by'
        ]
        read_only_fields = ['student_id', 'uuid', 'created_at', 'last_modified_at']
        extra_kwargs = {
            'department_id': {'required': False, 'allow_null': True},
            'is_deleted': {'read_only': True}
        }
    
    def get_department_name(self, obj):
        if obj.department_id:
            try:
                department = Department.objects.get(department_id=obj.department_id)
                return department.name
            except Department.DoesNotExist:
                return None
        return None
