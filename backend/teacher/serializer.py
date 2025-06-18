from rest_framework import serializers
from .models import Teacher
from departments.models import Department
from departments.serializers import DepartmentSerializer

class TeacherSerializer(serializers.ModelSerializer):
    department_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True, write_only=True
    )
    departments = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        # fields = "__all__"
        fields = [
            "teacher_id", "uuid", "name",
            "department_ids",  # for creating/updating
            "departments",     # for displaying nested objects
            "email", "phone", "join_date", "is_deleted",
            "created_at", "last_modified_at",
            "created_by", "last_modified_by"
        ]

    def get_departments(self, obj):
        department_ids = obj.department_ids
        if not department_ids:
            return []
        
        departments = Department.objects.filter(department_id__in=department_ids)
        return DepartmentSerializer(departments, many=True).data