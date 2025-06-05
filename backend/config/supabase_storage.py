"""
Supabase Storage Backend for Django
Allows using Supabase Storage to store files in Django.
"""

import os
from io import BytesIO
from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from .supabase import SupabaseStorage as SupabaseClient


@deconstructible
class SupabaseStorage(Storage):
    """
    Storage backend for Supabase.
    
    This class implements Django's Storage interface to allow
    storing files in Supabase Storage.
    """
    
    def __init__(self, bucket='public', base_url=None):
        self.client = SupabaseClient()
        self.bucket = bucket
        self.base_url = base_url
        
        if self.base_url is None:
            self.base_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{self.bucket}/"
    
    def _get_path(self, name):
        """
        Normalize the file path to ensure consistency.
        """
        return name.replace("\\", "/")
    
    def _open(self, name, mode='rb'):
        """
        Open a file from Supabase Storage.
        """
        path = self._get_path(name)
        data = self.client.download_file(self.bucket, path)
        return BytesIO(data)
    
    def _save(self, name, content):
        """
        Save a new file to Supabase Storage.
        """
        path = self._get_path(name)
        content.seek(0)  # Ensure we're at the beginning of the file
        file_data = content.read()
        
        self.client.upload_file(self.bucket, path, file_data)
        return name
    
    def url(self, name):
        """
        Get the URL for a file.
        """
        path = self._get_path(name)
        return self.client.get_download_url(self.bucket, path)
    
    def exists(self, name):
        """
        Check if a file exists.
        This is approximated since Supabase doesn't have a direct exists check.
        """
        try:
            self.client.download_file(self.bucket, self._get_path(name))
            return True
        except:
            return False
    
    def delete(self, name):
        """
        Delete a file.
        """
        try:
            self.client.remove_file(self.bucket, self._get_path(name))
        except:
            pass  # Ignore errors if file doesn't exist
    
    def listdir(self, path):
        """
        List the contents of a directory.
        Not fully supported by Supabase client, so returns empty lists.
        """
        return [], []  # Directories, files
    
    def size(self, name):
        """
        Get the size of a file.
        Not directly supported, so returns 0.
        """
        return 0  # Not directly supported by Supabase client
    
    def get_accessed_time(self, name):
        """
        Get the last accessed time of a file.
        Not directly supported, so returns None.
        """
        return None  # Not supported
    
    def get_created_time(self, name):
        """
        Get the creation time of a file.
        Not directly supported, so returns None.
        """
        return None  # Not supported
    
    def get_modified_time(self, name):
        """
        Get the last modified time of a file.
        Not directly supported, so returns None.
        """
        return None  # Not supported


class SupabasePublicStorage(SupabaseStorage):
    """Storage for publicly accessible files"""
    
    def __init__(self):
        super().__init__(bucket='public')


class SupabasePrivateStorage(SupabaseStorage):
    """Storage for private files that require authentication"""
    
    def __init__(self):
        super().__init__(bucket='private')
    
    def url(self, name):
        """
        Get a signed URL that expires after a set time for private files.
        """
        path = self._get_path(name)
        signed_url = self.client.create_signed_url(
            self.bucket, 
            path, 
            expires_in=settings.SUPABASE_URL_EXPIRY_SECONDS if hasattr(settings, 'SUPABASE_URL_EXPIRY_SECONDS') else 3600
        )
        return signed_url.get('signedURL', '')
