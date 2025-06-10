from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import UserSettings, SystemSettings
from .serializers import UserSettingsSerializer, SystemSettingsSerializer

class UserSettingsView(APIView):
    """API view for managing user settings"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user settings or create default if not exists"""
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        """Update user settings"""
        settings, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SystemSettingsListView(generics.ListAPIView):
    """API view for listing system settings (admin only)"""
    queryset = SystemSettings.objects.filter(is_active=True)
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAdminUser]

class SystemSettingDetailView(generics.RetrieveUpdateAPIView):
    """API view for retrieving and updating system settings (admin only)"""
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'key'
