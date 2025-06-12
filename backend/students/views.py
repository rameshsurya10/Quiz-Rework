from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import Student
from .serializers import StudentSerializer
from .serializers import StudentBulkUploadSerializer

class StudentViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing student instances.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'student_id'

    queryset = Student.objects.filter(is_deleted=False)
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        serializer = StudentBulkUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'status': 'success',
                'message': result['message'],
                'data': {
                    'total_rows': result['total_rows'],
                    'success_count': result['success_count'],
                    'error_count': result['error_count'],
                    'errors': result['errors']
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'status': 'error',
            'message': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        # Create a sample Excel file
        data = {
            'name': ['John Doe', 'Jane Smith'],
            'email': ['john@example.com', 'jane@example.com'],
            'phone': ['1234567890', '9876543210'],
            'department_id': [1, 2]
        }
        
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Students')
            worksheet = writer.sheets['Students']
            worksheet.set_column('A:D', 20)
        
        output.seek(0)
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename=student_upload_template.xlsx'
        return response
    
    # def perform_create(self, serializer):
    #     # Add created_by and last_modified_by from request user
    #     user_identifier = getattr(self.request.user, 'username', 
    #                            getattr(self.request.user, 'email', 'system'))
    #     serializer.save(
    #         created_by=user_identifier,
    #         last_modified_by=user_identifier
    #     )
    
    def perform_update(self, serializer):
        # Update last_modified_by
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        serializer.save(last_modified_by=user_identifier)
    
    @action(detail=True, methods=['post'])
    def soft_delete(self, request, student_id=None):
        """Soft delete a student by setting is_deleted=True"""
        student = self.get_object()
        user_identifier = getattr(request.user, 'username', 
                               getattr(request.user, 'email', 'system'))
        student.is_deleted = True
        student.last_modified_by = user_identifier
        student.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """List all deleted students"""
        deleted_students = Student.objects.filter(is_deleted=True)
        page = self.paginate_queryset(deleted_students)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(deleted_students, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['post'])
    def filter_students(self, request):
        """
        Filter students by department_id and/or student_name
        Expected JSON payload:
        {
            "department_id": 1,  # optional
            "student_name": "deepika"  # optional
        }
        """
        try:
            department_id = request.data.get('department_id')
            student_name = request.data.get('student_name', '').strip()
            
            # If no filters provided, return all non-deleted students
            if department_id is None and not student_name:
                queryset = Student.objects.filter(is_deleted=False)
                serializer = self.get_serializer(queryset, many=True)
                return Response({
                    'status': 'success',
                    'message': 'All active students retrieved successfully',
                    'count': queryset.count(),
                    'data': serializer.data
                })
                
            # Start with base queryset (only non-deleted students)
            queryset = Student.objects.filter(is_deleted=False)
            
            # Apply department filter if provided
            if department_id is not None:
                queryset = queryset.filter(department_id=department_id)
            
            # Apply name filter if provided - using icontains for partial matching
            if student_name:
                queryset = queryset.filter(name__icontains=student_name)
                
            # Get the count before pagination
            total_count = queryset.count()
            
            # Apply pagination
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'status': 'success',
                    'message': 'Students retrieved successfully',
                    'count': total_count,
                    'data': serializer.data
                })
                
            # If no pagination
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'status': 'success',
                'message': 'Students retrieved successfully',
                'count': total_count,
                'data': serializer.data
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StudentListCreateView(generics.ListCreateAPIView):
    """
    View for listing all students or creating a new student.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Student.objects.filter(is_deleted=False)
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user.username,
            last_modified_by=self.request.user.username
        )

class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating or deleting a student instance.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'student_id'
    
    def get_queryset(self):
        return Student.objects.filter(is_deleted=False)
    
    def perform_update(self, serializer):
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        serializer.save(last_modified_by=user_identifier)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        instance.is_deleted = True
        instance.last_modified_by = user_identifier
        instance.save()
        return Response(
            {'status': 'success', 'message': 'Student deleted successfully'},
            status=status.HTTP_200_OK
        )

class StudentCreateView(generics.CreateAPIView):
    """
    View specifically for creating new students via the /create_student/ endpoint.
    """
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        user_identifier = getattr(self.request.user, 'username', 
                               getattr(self.request.user, 'email', 'system'))
        serializer.save(
            created_by=user_identifier,
            last_modified_by=user_identifier
        )
