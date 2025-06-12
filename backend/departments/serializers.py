from rest_framework import serializers
from .models import Department
from accounts.models import Teacher
from quizzes.models import Quiz

class TeacherDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed teacher information for embedding."""
    name = serializers.CharField(source='user.get_full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Teacher
        fields = ['id', 'name', 'email', 'employee_id', 'specialization', 'is_head']

class QuizInDepartmentSerializer(serializers.ModelSerializer):
    """Serializer for basic quiz info within a department."""
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'is_published', 'start_date', 'end_date']

class DepartmentSerializer(serializers.ModelSerializer):
    """Basic Department serializer with stats and write-only teachers."""
    student_count = serializers.IntegerField(read_only=True)
    teacher_count = serializers.IntegerField(read_only=True)
    teacher_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Teacher.objects.all(),
        source='teachers',
        required=False,
        write_only=True,
        help_text="List of teacher IDs to associate with the department."
    )
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'icon', 'color',
            'student_count', 'teacher_count', 'created_at', 'last_modified_at',
            'teacher_ids'
        ]
        read_only_fields = ['created_at', 'last_modified_at', 'student_count', 'teacher_count']
    
    def create(self, validated_data):
        teachers = validated_data.pop('teachers', [])
        department = super().create(validated_data)
        if teachers:
            department.teachers.set(teachers)
        return department
    
    def update(self, instance, validated_data):
        teachers = validated_data.pop('teachers', None)
        instance = super().update(instance, validated_data)
        if teachers is not None:
            instance.teachers.set(teachers)
        return instance

class DepartmentDetailSerializer(DepartmentSerializer):
    """Detailed Department serializer with full teachers and quizzes list."""
    teachers = TeacherDetailSerializer(many=True, read_only=True)
    quizzes = QuizInDepartmentSerializer(many=True, read_only=True)
    head_teacher = TeacherDetailSerializer(read_only=True, source='get_head_teacher')
    
    class Meta(DepartmentSerializer.Meta):
        fields = [
            'id', 'name', 'code', 'description', 'icon', 'color',
            'student_count', 'teacher_count', 'created_at', 'last_modified_at',
            'teachers', 'quizzes', 'head_teacher'
        ]
        read_only_fields = DepartmentSerializer.Meta.read_only_fields + ['teachers', 'quizzes', 'head_teacher']

    def get_head_teacher(self, obj):
        """Get head teacher of department if exists."""
        return obj.teachers.filter(is_head=True).first()
