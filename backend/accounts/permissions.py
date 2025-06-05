from rest_framework import permissions


class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admins to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Check if the user is an admin
        if request.user.is_admin:
            return True
        
        # Check if the object has a user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the object is a user
        return obj == request.user


class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsTeacherOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow teachers and admins.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_teacher or request.user.is_admin)
