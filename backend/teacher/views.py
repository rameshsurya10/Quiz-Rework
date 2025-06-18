from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import Teacher
from .serializer import TeacherSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing teacher instances.
    """
    queryset = Teacher.objects.filter(is_deleted=False).order_by('-last_modified_at')
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

