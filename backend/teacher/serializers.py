from rest_framework import serializers
from .models import Teacher
from departments.models import Department

class TeacherSerializer(serializers.ModelSerializer):
    department_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Teacher
        fields = [
            'teacher_id', 'uuid', 'name', 'email', 'phone', 'department_ids',
            'department_names', 'join_date', 'is_deleted', 'created_at',
            'last_modified_at', 'created_by', 'last_modified_by'
        ]
        read_only_fields = ['teacher_id', 'uuid', 'created_at', 'last_modified_at']
    
    def get_department_names(self, obj):
        if not obj.department_ids:
            return []
        departments = Department.objects.filter(department_id__in=obj.department_ids)
        return [dept.name for dept in departments]
