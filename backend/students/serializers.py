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
            'created_at', 'last_modified_at', 'created_by', 'last_modified_by',
            'register_number','class_name','section'
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

    def validate_phone(self, value):
        department_id = self.initial_data.get("department_id")

        if not department_id:
            raise serializers.ValidationError("Department ID is required to validate phone number.")

        # Convert to int if needed
        department_id = int(department_id)

        if self.instance:
            # Updating: exclude the current instance
            exists = Student.objects.exclude(pk=self.instance.pk).filter(
                phone=value,
                department_id=department_id,
                is_deleted=False
            ).exists()
        else:
            # Creating: check if any student in same department has this phone
            exists = Student.objects.filter(
                phone=value,
                department_id=department_id,
                is_deleted=False
            ).exists()

        if exists:
            raise serializers.ValidationError("A student with this phone number already exists in this department.")

        return value

    def validate_email(self, value):
        department_id = self.initial_data.get("department_id")

        if not department_id:
            raise serializers.ValidationError("Department ID is required to validate email.")

        department_id = int(department_id)

        if self.instance:
            exists = Student.objects.exclude(pk=self.instance.pk).filter(
                email=value,
                department_id=department_id,
                is_deleted=False
            ).exists()
        else:
            exists = Student.objects.filter(
                email=value,
                department_id=department_id,
                is_deleted=False
            ).exists()

        if exists:
            raise serializers.ValidationError("A student with this email already exists in this department.")

        return value

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

            # Required columns
            required_columns = ['register_number','class_name','section','name', 'email',"mobile_number", 'department_name', 'department_code']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise serializers.ValidationError(f"Missing required columns: {', '.join(missing_columns)}")

            for index, row in df.iterrows():
                try:
                    row_num = index + 2  # Excel row number
                    register_number = str(row.get('register_number', '')).strip()
                    class_name = str(row.get('class_name', '')).strip()
                    section = str(row.get('section', '')).strip()
                    name = str(row.get('name', '')).strip()
                    email = str(row.get('email', '')).strip().lower()
                    phone = str(row.get('mobile_number', '')).strip() if pd.notna(row.get('mobile_number')) else None
                    dept_name = str(row.get('department_name', '')).strip()
                    dept_code = str(row.get('department_code', '')).strip()

                    # Check mandatory values
                    if not email:
                        errors.append(f"Row {row_num}: Email is required")
                        continue

                    try:
                        validate_email(email)
                    except ValidationError:
                        errors.append(f"Row {row_num}: Invalid email format - {email}")
                        continue

                    if not dept_name or not dept_code:
                        errors.append(f"Row {row_num}: Department name or code is missing")
                        continue

                    # Find or create department
                    department = Department.objects.filter(name=dept_name, code=dept_code, is_deleted=False).first()
                    if not department:
                        department = Department.objects.create(
                            name=dept_name,
                            code=dept_code,
                            section=section,
                            class_name=class_name,
                            created_by=user,
                            last_modified_by=user
                        )

                    # Check if student with same email exists in the same department
                    if Student.objects.filter(email=email, department_id=department.department_id, is_deleted=False).exists():
                        errors.append(f"Row {row_num}: Student already exists in department - {email}")
                        continue

                    # ✅ Create student using department_id as an integer
                    student = Student.objects.create(
                        name=name,
                        email=email,
                        phone=phone,
                        department_id=department.department_id,  # ✅ Use department.department_id here
                        created_by=user,
                        last_modified_by=user,
                        register_number=register_number,
                        class_name=class_name,
                        section=section
                    )

                    success_count += 1
                    send_student_verification_email(student)

                except Exception as e:
                    errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
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