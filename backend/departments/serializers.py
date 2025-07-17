from rest_framework import serializers
from .models import Department
from students.models import Student
from teacher.models import Teacher

class StudentInDepartmentSerializer(serializers.ModelSerializer):
    """A simple serializer for listing students within a department."""
    class Meta:
        model = Student
        fields = ['student_id', 'name', 'is_verified']

class DepartmentWithStudentsSerializer(serializers.ModelSerializer):
    """
    A department serializer that includes a list of its students
    and a count of them.
    """
    students = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    teachers = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    department_section = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'department_id', 'name', 'code', 'teachers', 'section', 'class_name',
            'student_count', 'students', 'teacher_count','department_section'
        ]

    def get_department_section(self, obj):
        # If any field is missing, fallback to empty string
        name = obj.name or ''
        class_name = obj.class_name or ''
        section = obj.section or ''
        parts = [part for part in [name, class_name, section] if part]
        return "-".join(parts) if parts else None

    def get_teachers(self, obj):
        from teacher.models import Teacher

        request = self.context.get('request')
        user = getattr(request, 'user', None)

        # Show only the current teacher if user is a teacher
        if user and hasattr(user, 'role') and user.role == 'TEACHER':
            try:
                teacher = Teacher.objects.get(email=user.email, is_deleted=False)
                if obj.department_id in teacher.department_ids:
                    return [{
                        'teacher_id': teacher.teacher_id,
                        'name': teacher.name
                    }]
                else:
                    return []  # Not assigned to this department
            except Teacher.DoesNotExist:
                return []

        # Admin or others: show all teachers assigned to the department
        else:
            teachers = Teacher.objects.filter(
                department_ids__contains=[obj.department_id],
                is_deleted=False
            )
            return [{'teacher_id': t.teacher_id, 'name': t.name} for t in teachers]

    def get_teacher_count(self, obj):
        return Teacher.objects.filter(
            department_ids__contains=[obj.department_id],
            is_deleted=False
        ).count()

    def get_students(self, obj):
        filters = {
            'department_id': obj.department_id,
            'class_name': obj.class_name,
            'is_deleted': False
        }
        students = Student.objects.filter(**filters)
        return StudentInDepartmentSerializer(students, many=True).data

    def get_student_count(self, obj):
        filters = {
            'department_id': obj.department_id,
            'class_name': obj.class_name,
            'is_deleted': False
        }

        return Student.objects.filter(**filters).count()

class DepartmentSerializer(serializers.ModelSerializer):
    """Basic Department serializer matching the model fields"""
    department_id = serializers.IntegerField(read_only=True)
    uuid = serializers.UUIDField(read_only=True)
    created_by = serializers.CharField(required=False, allow_blank=True)
    last_modified_by = serializers.CharField(required=False, allow_blank=True)
    is_deleted = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_modified_at = serializers.DateTimeField(read_only=True)
    teacher_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    section = serializers.CharField(required=False, allow_null=True)
    class_name = serializers.CharField(required=False, allow_null=True)
    
    class Meta:
        model = Department
        fields = [
            'department_id', 'uuid', 'name', 'code', 'description', 'section', 'class_name',
            'created_at', 'created_by', 'last_modified_at', 'last_modified_by', 'is_deleted', 'teacher_id'
        ]
        read_only_fields = ['department_id', 'uuid', 'created_at', 'last_modified_at', 'is_deleted']

    def create(self, validated_data):
        teacher_id = validated_data.pop('teacher_id', None)
        request = self.context.get('request', None)
        user_email = 'system'
        if request and hasattr(request, 'user') and request.user and request.user.is_authenticated:
            user_email = request.user.email
        if not validated_data.get('created_by'):
            validated_data['created_by'] = user_email
        if not validated_data.get('last_modified_by'):
            validated_data['last_modified_by'] = user_email
        department = super().create(validated_data)
        # PUBLISH department to teacher if teacher_id is provided
        if teacher_id:
            try:
                from teacher.models import Teacher
                teacher = Teacher.objects.get(teacher_id=teacher_id)
                dept_ids = teacher.department_ids or []
                if department.department_id not in dept_ids:
                    dept_ids.append(department.department_id)
                    teacher.department_ids = dept_ids
                    teacher.save()
            except Teacher.DoesNotExist:
                pass  # Optionally, raise a validation error if you want
        return department

class DepartmentDetailSerializer(DepartmentSerializer):
    """Detailed Department serializer (extend as needed)"""
    teachers = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    class Meta(DepartmentSerializer.Meta):
        fields = DepartmentSerializer.Meta.fields + ['teachers', 'students']

    def get_teachers(self, obj):
        from teacher.models import Teacher
        teachers = Teacher.objects.filter(
            department_ids__contains=[obj.department_id],
            is_deleted=False
        )
        return [
            {
                'teacher_id': teacher.teacher_id,
                'name': teacher.name,
                'section' : teacher.section,
                'class_name' : teacher.class_name
            }
            for teacher in teachers
        ]

    def get_students(self, obj):
        from students.models import Student
        try:
            students = Student.objects.filter(department_id=obj.department_id, is_deleted=False)
            return [
                {
                'student_id': student.student_id,
                'name': student.name,
                'section': student.section,
                'class_name': student.class_name
            }
            for student in students
        ]
        except Exception as e:
            return [{'error': str(e)}]

class BulkUploadStudentSerializer(serializers.Serializer):
    """Serializer for bulk student upload"""
    file = serializers.FileField()
    
class BulkDeleteStudentSerializer(serializers.Serializer):
    """Serializer for bulk student deletion"""
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True
    )
