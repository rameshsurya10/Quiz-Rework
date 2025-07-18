from django.core.checks.security import sessions
from rest_framework import generics, permissions, status, viewsets
from .models import Teacher
from rest_framework.response import Response
from .serializer import TeacherSerializer
from django.utils.dateparse import parse_datetime
from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from students.models import Student
from departments.models import Department
User = get_user_model()

class TeacherViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing teacher instances.
    """
    queryset = Teacher.objects.filter(is_deleted=False).order_by('last_modified_at')
    serializer_class = TeacherSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'teacher_id'

    def create(self, request, *args, **kwargs):
        """
        Create a new teacher instance, setting created_by and last_modified_by.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            created_by=request.user.email,
            last_modified_by=request.user.email
        )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """
        Set last_modified_by field during update.
        """
        serializer.save(last_modified_by=self.request.user.email)

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete a teacher instance.
        """
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

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

