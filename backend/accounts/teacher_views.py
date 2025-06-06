from django.core.checks.security import sessions
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from departments.models import Department
from .models import Teacher
from .serializers import TeacherSerializer, UserRegistrationSerializer
from .permissions import IsAdmin

User = get_user_model()

class TeacherListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating teachers.
    Only admin users can create new teachers.
    """
    queryset = Teacher.objects.select_related('user').prefetch_related('departments').all()
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """
        Only allow admin users to create new teachers.
        All authenticated users can view the list.
        """
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        # """
        # Create a new user and teacher profile.
        # Expected payload:
        # {
        #     "email": "teacher@example.com",
        #     "first_name": "John",
        #     "last_name": "Doe",
        #     "password": "securepassword123",
        #     "employee_id": "T12345",
        #     "specialization": "Mathematics",
        #     "qualification": "M.Sc. in Mathematics",
        #     "phone_number": "+1234567890",
        #     "department_ids": [1, 2, 3]  # Optional: List of department IDs
        # }
        # """
        user_serializer = UserRegistrationSerializer(data=request.data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save(role=User.Role.TEACHER)

        # Step 2: Get or create department
        department_name = request.data.get('department_name')
        if department_name:
            department, created = Department.objects.get_or_create(
                department_name=department_name,
                defaults={
                    'code': 'test',
                    'created_by': 'Admin'
                }
            )
        else:
            return Response({"error": "department_name is required"}, status=400)

        # Step 3: Prepare teacher data
        teacher_data = {
            'teacher_name': request.data.get('teacher_name'),
            'email': request.data.get('email'),
            'phone_number': request.data.get('phone_number'),
            'create_by': 'Admin',
            'user': user.id  # If your teacher model has a OneToOneField to User
        }

        teacher_serializer = self.get_serializer(data=teacher_data)
        teacher_serializer.is_valid(raise_exception=True)
        teacher = teacher_serializer.save()
        teacher.departments.add(department)

        headers = self.get_success_headers(teacher_serializer.data)
        return Response(teacher_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating, and deleting a teacher's profile.
    """
    queryset = Teacher.objects.select_related('user').prefetch_related('departments').all()
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    lookup_field = 'id'
    
    def perform_update(self, serializer):
        """
        Update teacher profile and associated user data.
        """
        user_data = {}
        user_fields = ['first_name', 'last_name', 'email']
        
        # Extract user data from request
        for field in user_fields:
            if field in self.request.data:
                user_data[field] = self.request.data[field]
        
        # Update user if there's user data
        if user_data:
            user = serializer.instance.user
            for key, value in user_data.items():
                setattr(user, key, value)
            user.save()
        
        # Update teacher profile
        serializer.save()
        
        # Update departments if provided
        if 'department_ids' in self.request.data:
            serializer.instance.departments.set(self.request.data['department_ids'])
    
    def perform_destroy(self, instance):
        """
        Delete the teacher's user account along with the profile.
        """
        user = instance.user
        instance.delete()
        user.delete()
