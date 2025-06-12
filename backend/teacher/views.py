from django.core.checks.security import sessions
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from departments.models import Department
from .models import Teacher
from .serializer import TeacherSerializer

User = get_user_model()

class TeacherListCreateView(generics.ListCreateAPIView):
    """
    View for listing and creating teachers.
    Only admin users can create new teachers.
    """
    queryset = Teacher.objects.filter(is_deleted=False)
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        department_names = data.get('department_ids', [])
        if isinstance(department_names, str):
            import json
            department_names = json.loads(department_names)
        department_ids = []
        for dept_name in department_names:
            dept, created = Department.objects.get_or_create(name=dept_name)
            department_ids.append(dept.department_id)
        data['department_ids'] = department_ids
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user.email,
            last_modified_by=self.request.user.email
        )

class TeacherDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating, and deleting a teacher's profile.
    """
    queryset = Teacher.objects.filter(is_deleted=False)
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'uuid'

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        # Support lookup by teacher_id (int) or uuid
        teacher_id = self.kwargs.get('teacher_id')
        if teacher_id is not None:
            return self.get_queryset().get(teacher_id=teacher_id)
        return super().get_object()

    def perform_update(self, serializer):
        """
        Update teacher profile and associated user data, including departments by name.
        """
        department_names = self.request.data.get('department_ids', None)
        if department_names is not None:
            if isinstance(department_names, str):
                import json
                department_names = json.loads(department_names)
            department_ids = []
            for dept_name in department_names:
                dept, created = Department.objects.get_or_create(name=dept_name)
                department_ids.append(dept.department_id)
            serializer.save(department_ids=department_ids, last_modified_by=self.request.user.email)
        else:
            serializer.save(last_modified_by=self.request.user.email)
    
    def perform_destroy(self, instance):
        """
        Delete the teacher's user account along with the profile.
        """
        instance.is_deleted = True
        instance.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({'message': 'Teacher is deleted successfully'}, status=status.HTTP_200_OK)

class TeacherListView(generics.ListAPIView):
    """
    View for listing all teachers.
    """
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return all teachers ordered by name.
        """
        try:
            return Teacher.objects.filter(is_deleted=False).order_by('name')
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
        
