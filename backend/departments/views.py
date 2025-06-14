from rest_framework import viewsets, status, serializers
from django.db.models import Count
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from .models import Department
from accounts.models import  User
from .serializers import DepartmentSerializer, DepartmentDetailSerializer
from django.db.models import Count, Q
import csv
import io

class DepartmentViewSet(viewsets.ModelViewSet):
    """API endpoint for Department management with bulk operations"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    
    # Explicitly define allowed HTTP methods
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    
    def get_queryset(self):
        """Return only departments where is_deleted is False."""
        queryset = Department.objects.filter(is_deleted=False)
        user = self.request.user
        # Optionally, keep your role-based filtering here if needed
        # For now, just return all non-deleted departments
        return queryset
    
    def get_serializer_class(self):
        """Return different serializers for list and detail views"""
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentSerializer
    
    @action(detail=False, methods=['post'], url_path='create-department', url_name='create-department')
    def create_department(self, request):
        """Create a new department"""
        return self.create(request)

    def create(self, request, *args, **kwargs):
        """
        Handle POST request to create a new department.
        """
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='bulk-upload-students')
    def bulk_upload_students(self, request, pk=None):
        """Bulk upload students from CSV file"""
        department = self.get_object()
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'error': 'File must be CSV format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success_count, error_count, errors = Department.bulk_upload_students(
            department_id=department.department_id,
            csv_file=csv_file
        )
        
        return Response({
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors,
        })
        
    @action(detail=True, methods=['post'], url_path='bulk-delete-students')
    def bulk_delete_students(self, request, pk=None):
        """Bulk delete students from department"""
        department = self.get_object()
        
        if 'student_ids' not in request.data or not isinstance(request.data['student_ids'], list):
            return Response(
                {'error': 'student_ids list is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        student_ids = request.data['student_ids']
        delete_count, error_count, errors = Department.bulk_delete_students(
            department_id=department.department_id,
            student_ids=student_ids
        )
        
        return Response({
            'delete_count': delete_count,
            'error_count': error_count,
            'errors': errors,
        })
    
    @action(detail=True, methods=['get'], url_path='students')
    def students(self, request, pk=None):
        """Get all students in department"""
        department = self.get_object()
        students = Student.objects.filter(department=department)
        
        from accounts.serializers import StudentSerializer
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='teachers')
    def teachers(self, request, pk=None):
        """Get all teachers in department"""
        department = self.get_object()
        teachers = Teacher.objects.filter(departments=department)
        
        from accounts.serializers import TeacherSerializer
        serializer = TeacherSerializer(teachers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='dashboard')
    def dashboard(self, request, pk=None):
        """Get dashboard stats for department"""
        department = self.get_object()
        
        # Get quiz stats
        from quiz.models import Quiz, QuizAttempt
        quizzes = Quiz.objects.filter(departments=department).count()
        attempts = QuizAttempt.objects.filter(
            quiz__departments=department
        ).count()
        
        passing_rate = 0
        if attempts > 0:
            passing_attempts = QuizAttempt.objects.filter(
                quiz__departments=department,
                passed=True
            ).count()
            passing_rate = (passing_attempts / attempts) * 100
            
        return Response({
            'student_count': department.student_count,
            'teacher_count': department.teacher_count,
            'quiz_count': quizzes,
            'attempt_count': attempts,
            'passing_rate': passing_rate,
        })

    def update(self, request, *args, **kwargs):
        """
        Handle PUT/PATCH request to update a department and update teacher's department_ids if teacher_id is provided.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        teacher_id = serializer.validated_data.pop('teacher_id', None)
        self.perform_update(serializer)
        # Update teacher's department_ids if teacher_id is provided
        if teacher_id:
            try:
                from teacher.models import Teacher
                teacher = Teacher.objects.get(teacher_id=teacher_id)
                dept_ids = teacher.department_ids or []
                if instance.department_id not in dept_ids:
                    dept_ids.append(instance.department_id)
                    teacher.department_ids = dept_ids
                    teacher.save()
            except Teacher.DoesNotExist:
                pass  # Optionally, raise a validation error if you want
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: set is_deleted=True for the department instead of deleting from DB.
        Return a success message in the response.
        """
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({'message': 'Department deleted successfully'}, status=status.HTTP_200_OK)
