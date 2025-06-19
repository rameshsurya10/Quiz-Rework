from rest_framework import serializers
from students.models import Student
from departments.models import Department
from departments.serializers import DepartmentSerializer
from teacher.models import Teacher  # Adjust if path differs


class TeacherSerializer(serializers.ModelSerializer):
    departments = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "teacher_id", "uuid", "name",
            "department_ids",        # ← stored field in model
            "departments",           # ← computed via IDs
            "students",
            "student_count",
            "email", "phone", "join_date", "is_deleted",
            "created_at", "last_modified_at",
            "created_by", "last_modified_by"
        ]

    def get_valid_department_ids_with_students(self, department_ids):
        """
        Return department IDs where:
        - is_deleted=False
        - and department has at least 1 student where is_deleted=False
        """
        if not department_ids:
            return []

        # Filter out soft-deleted departments
        departments = Department.objects.filter(
            department_id__in=department_ids,
            is_deleted=False
        )

        valid_ids = []
        for dept in departments:
            if Student.objects.filter(department_id=dept.department_id, is_deleted=False).exists():
                valid_ids.append(dept.department_id)

        return valid_ids

    def get_departments(self, obj):
        valid_ids = self.get_valid_department_ids_with_students(obj.department_ids)
        departments = Department.objects.filter(department_id__in=valid_ids)
        return [{"department_id": d.department_id, "name": d.name, "code" :d.code} for d in departments]

    def get_students(self, obj):
        valid_ids = self.get_valid_department_ids_with_students(obj.department_ids)
        students = Student.objects.filter(
            department_id__in=valid_ids,
            is_deleted=False
        )
        return [{"student_id": s.student_id, "name": s.name} for s in students]

    def get_student_count(self, obj):
        valid_ids = self.get_valid_department_ids_with_students(obj.department_ids)
        return Student.objects.filter(
            department_id__in=valid_ids,
            is_deleted=False
        ).count()