from rest_framework import serializers
from .models import Student
from departments.models import Department
from django.contrib.auth import get_user_model
import pandas as pd
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from .utils import send_student_verification_email

User = get_user_model()

class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model"""
    created_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_modified_by = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    department_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'student_id', 'uuid', 'name', 'email', 'phone', 
            'department_id', 'department_name', 'is_deleted','is_verified',
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

class StudentBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    
    def validate_file(self, value):
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError("Only Excel files are allowed.")
        return value
    
    def create(self, validated_data):
        file = validated_data['file']
        user = self.context['request'].user
        errors = []
        success_count = 0

        try:
            df = pd.read_excel(file)

            # Ensure required columns
            required_columns = ['name', 'email', 'code']
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                raise serializers.ValidationError(
                    f"Missing required columns: {', '.join(missing_columns)}"
                )

            # Process each row
            for index, row in df.iterrows():
                try:
                    row_num = index + 2  # For Excel row number
                    email = str(row.get('email', '')).strip().lower()

                    if not email:
                        errors.append(f"Row {row_num}: Email is required")
                        continue

                    try:
                        validate_email(email)
                    except ValidationError:
                        errors.append(f"Row {row_num}: Invalid email format - {email}")
                        continue

                    if Student.objects.filter(email=email, is_deleted=False).exists():
                        errors.append(f"Row {row_num}: Student already exists - {email}")
                        continue

                    department_id = row.get('department_id')
                    if pd.isna(department_id):
                        errors.append(f"Row {row_num}: Department ID is missing")
                        continue

                    try:
                        department = Department.objects.get(pk=int(department_id), is_deleted=False)
                    except Department.DoesNotExist:
                        # ✅ Auto-create department if not exists
                        department_name = str(row.get('department_name', f'Department {department_id}')).strip()

                        department = Department.objects.create(
                            department_id=int(department_id),
                            name=department_name,
                            code=f'DEP{department_id}',
                            created_by=user,
                            last_modified_by=user
                        )

                    # Create the student
                    student = Student.objects.create(
                        name=str(row.get('name', '')).strip(),
                        email=email,
                        phone=str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                        department_id=department,
                        created_by=user,
                        last_modified_by=user
                    )

                    success_count += 1
                    send_student_verification_email(student)

                except Exception as e:
                    errors.append(f"Row {row_num}: Unexpected error: {str(e)}")
                    continue

            return {
                'success': True,
                'message': f'Successfully processed {success_count} students',
                'errors': errors,
                'total_rows': len(df),
                'success_count': success_count,
                'error_count': len(errors)
            }

        except Exception as e:
            raise serializers.ValidationError(f"Error processing file: {str(e)}")