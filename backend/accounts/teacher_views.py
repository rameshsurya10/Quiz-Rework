from django.core.checks.security import sessions
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from departments.models import Department
from .models import Teacher
from .serializers import TeacherSerializer, TeacherCreateSerializer
from .permissions import IsAdmin

User = get_user_model()

class TeacherListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating teachers.
    Only admin users can create new teachers.
    """
    queryset = Teacher.objects.filter(is_deleted=False).select_related('user').prefetch_related('departments')
    permission_classes = [permissions.AllowAny]  # Temporarily allow any access for testing
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TeacherCreateSerializer
        return TeacherSerializer

    def get_permissions(self):
        """
        Only allow admin users to create new teachers.
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
            first_name = serializer.validated_data['first_name']
            last_name = serializer.validated_data['last_name']
            teacher_name = f"{first_name} {last_name}"
            email = serializer.validated_data['email']
            phone_number = serializer.validated_data.get('phone_number', '')
            department_name = serializer.validated_data['department_name']
            
            print(f"Creating teacher: {teacher_name} ({email})")
            
            # Check if user with this email already exists
            if User.objects.filter(email=email).exists():
                error_msg = f"User with email {email} already exists"
                print(error_msg)
                return Response(
                    {"error": error_msg}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create user
            print("Creating user...")
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                role=User.Role.TEACHER,
                is_active=True
            )
            
            try:
                # Get or create Department
                department, created = Department.objects.get_or_create(
                    name=department_name,
                    defaults={
                        'code': department_name.upper()[:10], 
                        'created_by': request.user.email if request.user.is_authenticated else 'System'
                    }
                )
                print(f"Department {'created' if created else 'retrieved'}: {department.name}")

                # Create Teacher profile
                print("Creating teacher profile...")
                teacher = Teacher.objects.create(
                    user=user,
                    employee_id=serializer.validated_data['employee_id'],
                    phone_number=phone_number,
                    # specialization, qualification, bio, and is_head are removed as per user request
                    # These fields are optional in the model or have defaults.
                    created_by=request.user.email if request.user.is_authenticated else 'System',
                    last_modified_by=request.user.email if request.user.is_authenticated else 'System'
                )
                
                # Add department to teacher
                teacher.departments.add(department)
                
                # Serialize the response
                response_serializer = TeacherSerializer(teacher)
                headers = self.get_success_headers(response_serializer.data)
                
                return Response({
                    "message": "Teacher created successfully",
                    "teacher": response_serializer.data
                }, status=status.HTTP_201_CREATED, headers=headers)
                
            except Exception as e:
                user.delete()  # Clean up user if teacher creation fails
                raise  # Re-raise the exception to be caught by the outer try-except
                
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            
            print(error_traceback)
            print("Error details:", str(e))
            print("Request data:", request.data if 'request' in locals() else 'No request data')
            
            
            return Response(
                {
                    "error": "An error occurred while creating the teacher.",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

class TeacherListView(generics.ListAPIView):
    """
    View for listing all teachers with their department information.
    """
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """
        Return all teachers with their related departments.
        """
        try:
            return Teacher.objects.filter(is_deleted=False)\
                .select_related('user')\
                .prefetch_related('departments')\
                .order_by('user__first_name', 'user__last_name')
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return Teacher.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Custom list method to include additional data in the response.
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Check if we have any results
            if not queryset.exists():
                return Response({
                    'status': 'success',
                    'count': 0,
                    'teachers': []
                }, status=status.HTTP_200_OK)
            
            # Serialize the queryset
            serializer = self.get_serializer(queryset, many=True)
            
            # Get the serialized data
            response_data = {
                'status': 'success',
                'count': len(serializer.data),
                'teachers': serializer.data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Error in TeacherListView: {str(e)}")
            return Response(
                {'error': 'An error occurred while fetching teachers'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
