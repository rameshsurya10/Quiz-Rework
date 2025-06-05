from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """API view to list user notifications with filtering options"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user with filtering"""
        queryset = Notification.objects.filter(user=self.request.user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read)
            
        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
            
        return queryset


class NotificationDetailView(generics.RetrieveAPIView):
    """API view to retrieve specific notification details"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """User can only view their own notifications"""
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    """API view to mark notification as read"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        """Mark notification as read"""
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            notification.mark_as_read()
            return Response(status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response(
                {'detail': 'Notification not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
