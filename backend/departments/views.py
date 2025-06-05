from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Department
from accounts.models import Student, Teacher, User
from .serializers import DepartmentSerializer, DepartmentDetailSerializer
from django.db.models import Count, Q
import csv
import io

class DepartmentViewSet(viewsets.ModelViewSet):
    """API endpoint for Department management with bulk operations"""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return different serializers for list and detail views"""
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentSerializer
    
    def get_queryset(self):
        """Filter departments based on user role"""
        user = self.request.user
        queryset = Department.objects.all()
        
        if user.is_student:
            # Students can only see their own department
            queryset = queryset.filter(students__user=user)
        elif user.is_teacher:
            # Teachers can see departments they belong to
            queryset = queryset.filter(teachers__user=user)
            
        return queryset.annotate(
            student_count=Count('students', distinct=True),
            teacher_count=Count('teachers', distinct=True)
        )
    
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
            department_id=department.id,
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
            department_id=department.id,
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
        from quizzes.models import Quiz, QuizAttempt
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
