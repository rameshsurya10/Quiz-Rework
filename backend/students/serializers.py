from rest_framework import serializers
from .models import Student
from departments.models import Department
from django.contrib.auth import get_user_model
import pandas as pd
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

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
            # Read the Excel file
            df = pd.read_excel(file)
            
            # Validate required columns
            required_columns = ['name', 'email']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                raise serializers.ValidationError(
                    f"Missing required columns: {', '.join(missing_columns)}"
                )
            
            # Process each row
            for index, row in df.iterrows():
                try:
                    # Validate email
                    if not row.get('email'):
                        errors.append(f"Row {index + 2}: Email is required")
                        continue
                    
                    try:
                        validate_email(row['email'])
                    except ValidationError:
                        errors.append(f"Row {index + 2}: Invalid email format - {row['email']}")
                        continue
                    
                    # Check for duplicate email
                    if Student.objects.filter(email=row['email']).exists():
                        errors.append(f"Row {index + 2}: Student with this email already exists - {row['email']}")
                        continue
                    
                    # Create student
                    student_data = {
                        'name': row.get('name', '').strip(),
                        'email': row['email'].strip().lower(),
                        'phone': str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                        'department_id': int(row['department_id']) if pd.notna(row.get('department_id')) else None,
                        'created_by': user,
                        'last_modified_by': user
                    }
                    
                    Student.objects.create(**student_data)
                    success_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: {str(e)}")
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