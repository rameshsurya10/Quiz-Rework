from django.core.checks.security import sessions
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
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

class TeacherViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing teacher instances.
    """
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'teacher_id'

    def get_queryset(self):
        # Filter out deleted teachers by default
        return Teacher.objects.filter(is_deleted=False).order_by('name')
        
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Handle department names and codes
        department_names = data.get('department_names', [])
        department_codes = data.get('department_code', [])
        
        if not department_names and not department_codes:
            return Response(
                {'error': 'Either department_names or department_code must be provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        department_ids = []
        
        # If department_names is provided, use them
        if department_names:
            if isinstance(department_names, str):
                import json
                department_names = json.loads(department_names)
            
            for dept_name in department_names:
                dept, _ = Department.objects.get_or_create(
                    name=dept_name,
                    defaults={'code': department_codes[department_names.index(dept_name)] 
                             if department_codes and len(department_codes) > department_names.index(dept_name) 
                             else f"DEPT{Department.objects.count() + 1}"}
                )
                department_ids.append(dept.department_id)
        
        data['department_ids'] = department_ids
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Set created_by and last_modified_by
        serializer.save(
            created_by=self.request.user.email,
            last_modified_by=self.request.user.email
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
    def perform_create(self, serializer):
        # This is kept for backward compatibility
        serializer.save(
            created_by=self.request.user.email,
            last_modified_by=self.request.user.email
        )

    @action(detail=False, methods=['post'])
    def filter_teachers(self, request):
        """
        Filter teachers by department_id (single or array) and/or teacher_name
        Expected JSON payload:
        {
            "department_id": 1,  # optional (int or array of ints)
            "teacher_name": "john"  # optional (string)
        }
        """
        try:
            department_id = request.data.get('department_id')
            teacher_name = request.data.get('teacher_name', '').strip()
            
            # If no filters provided, return all non-deleted teachers
            if department_id is None and not teacher_name:
                queryset = self.get_queryset()
                serializer = self.get_serializer(queryset, many=True)
                return Response({
                    'status': 'success',
                    'message': 'All active teachers retrieved successfully',
                    'count': queryset.count(),
                    'data': serializer.data
                })
                
            # Start with base queryset (only non-deleted teachers)
            queryset = self.get_queryset()
            
            # Apply department filter if provided
            if department_id is not None:
                if isinstance(department_id, list):
                    # Handle array of department_ids
                    from django.db.models import Q
                    query = Q()
                    for dept_id in department_id:
                        if dept_id is not None:  # Skip None values
                            query |= Q(department_ids__contains=[dept_id])
                    queryset = queryset.filter(query)
                else:
                    # Single department_id
                    queryset = queryset.filter(department_ids__contains=[department_id])
            
            # Apply name filter if provided - using icontains for partial matching
            if teacher_name:
                queryset = queryset.filter(name__icontains=teacher_name)
                
            # Get the count before pagination
            total_count = queryset.count()
            
            # Apply pagination if needed
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'status': 'success',
                    'message': 'Teachers retrieved successfully',
                    'count': total_count,
                    'data': serializer.data
                })
                
            # If no pagination
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'status': 'success',
                'message': 'Teachers retrieved successfully',
                'count': total_count,
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
