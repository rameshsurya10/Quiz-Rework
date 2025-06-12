from rest_framework import serializers
from .models import Student

class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model"""
    created_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_modified_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    class Meta:
        model = Student
        fields = [
            'student_id', 'uuid', 'name', 'email', 'phone', 'department_id',
            'created_at', 'last_modified_at', 'created_by', 'last_modified_by'
        ]
        read_only_fields = ['student_id', 'uuid', 'created_at', 'last_modified_at']
