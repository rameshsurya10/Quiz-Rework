from rest_framework import serializers
from .models import Department
from accounts.models import Teacher, Student

class DepartmentSerializer(serializers.ModelSerializer):
    """Basic Department serializer with stats"""
    student_count = serializers.IntegerField(read_only=True)
    teacher_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'icon', 'color',
                 'student_count', 'teacher_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class DepartmentDetailSerializer(DepartmentSerializer):
    """Detailed Department serializer with teachers list"""
    teachers = serializers.SerializerMethodField()
    head_teacher = serializers.SerializerMethodField()
    
    class Meta(DepartmentSerializer.Meta):
        fields = DepartmentSerializer.Meta.fields + ['teachers', 'head_teacher']
    
    def get_teachers(self, obj):
        """Get summarized list of teachers in department"""
        teachers = Teacher.objects.filter(departments=obj)[:10]  # Limit to 10 for performance
        return [{
            'id': str(teacher.id),
            'name': teacher.user.get_full_name(),
            'email': teacher.user.email,
            'employee_id': teacher.employee_id,
            'specialization': teacher.specialization,
            'is_head': teacher.is_head
        } for teacher in teachers]
    
    def get_head_teacher(self, obj):
        """Get head teacher of department if exists"""
        head = Teacher.objects.filter(departments=obj, is_head=True).first()
        if not head:
            return None
        
        return {
            'id': str(head.id),
            'name': head.user.get_full_name(),
            'email': head.user.email,
            'employee_id': head.employee_id,
            'phone_number': str(head.phone_number) if head.phone_number else None
        }

class BulkUploadStudentSerializer(serializers.Serializer):
    """Serializer for bulk student upload"""
    file = serializers.FileField()
    
class BulkDeleteStudentSerializer(serializers.Serializer):
    """Serializer for bulk student deletion"""
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True
    )
