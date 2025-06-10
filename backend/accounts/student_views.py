from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from departments.models import Department
from .models import Student
from .serializers import StudentSerializer, StudentCreateSerializer
from .permissions import IsAdmin
User = get_user_model()

from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

class StudentListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating students.
    Only admin users can create new students.
    """
    queryset = Student.objects.filter(is_deleted=False).select_related('user', 'department')
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]  # Enforce authentication
    pagination_class = None  # Default to no pagination

    def dispatch(self, request, *args, **kwargs):
        # Check if pagination is requested via URL kwargs or query params
        if kwargs.get('paginated') or request.query_params.get('page_size'):
            self.pagination_class = CustomPagination
        return super().dispatch(request, *args, **kwargs)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentCreateSerializer
        return StudentSerializer
        
    def get_queryset(self):
        """
        Filter students based on query parameters
        """
        queryset = super().get_queryset()
        
        # Filter by department if provided
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
            
        # Filter by role if provided (for backward compatibility)
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(user__role=role)
            
        return queryset
        
    def list(self, request, *args, **kwargs):
        """
        Handle pagination based on query parameters
        """
        # Check if pagination is requested
        page_size = request.query_params.get('page_size')
        if page_size and page_size.lower() == 'none':
            self.pagination_class = None
        elif page_size and page_size.isdigit():
            self.pagination_class = CustomPagination
            self.pagination_class.page_size = int(page_size)
            
        return super().list(request, *args, **kwargs)

    def get_permissions(self):
        """
        Only allow admin users to create new students.
        All authenticated users can view the list.
        """
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        try:
            # Get the serializer and validate data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Extract data from serializer
            email = serializer.validated_data.get('email')
            password = serializer.validated_data.get('password')
            first_name = serializer.validated_data.get('first_name')
            last_name = serializer.validated_data.get('last_name')
            student_id = serializer.validated_data.get('student_id')
            department_id = serializer.validated_data.get('department')
            phone_number = serializer.validated_data.get('phone_number', None)
            enrollment_date = serializer.validated_data.get('enrollment_date', None)
            graduation_year = serializer.validated_data.get('graduation_year', None)
            
            # Create user account
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.STUDENT,
            )
            
            # Get department
            department = None
            if department_id:
                try:
                    department = Department.objects.get(id=department_id)
                except Department.DoesNotExist:
                    return Response(
                        {"error": "Department does not exist."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create student profile
            student = Student.objects.create(
                user=user,
                student_id=student_id,
                department=department,
                phone_number=phone_number,
                enrollment_date=enrollment_date,
                graduation_year=graduation_year,
            )
            
            # Return the created student data
            response_serializer = StudentSerializer(student)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # If any error occurs during creation, return error response
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating, and deleting a student's profile.
    """
    queryset = Student.objects.select_related('user', 'department').all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    lookup_field = 'id'
    
    def perform_update(self, serializer):
        """
        Update student profile and associated user data.
        """
        instance = serializer.instance
        user_data = self.request.data.get('user', {})
        
        # Update user fields if provided
        user = instance.user
        if 'first_name' in user_data:
            user.first_name = user_data['first_name']
        if 'last_name' in user_data:
            user.last_name = user_data['last_name']
        if 'email' in user_data:
            user.email = user_data['email']
        
        user.save()
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Delete the student's user account along with the profile.
        """
        # First set is_deleted flag to True instead of completely deleting
        instance.is_deleted = True
        instance.save()
        
        # Optionally, deactivate the user account
        user = instance.user
        user.is_active = False
        user.save()
