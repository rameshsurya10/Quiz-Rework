"""
Supabase integration for Django.
This module provides utilities to interact with Supabase from Django applications.
"""

import os
from functools import lru_cache
from supabase import create_client, Client
from django.conf import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Get a cached Supabase client instance.
    
    Returns:
        Client: A Supabase client instance.
    """
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_KEY
    
    if not (supabase_url and supabase_key):
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY must be configured in settings."
        )
    
    return create_client(supabase_url, supabase_key)


class SupabaseStorage:
    """
    Utility class for interacting with Supabase Storage.
    
    Example usage:
        storage = SupabaseStorage()
        storage.upload_file('pdfs', 'document.pdf', file_data)
        download_url = storage.get_download_url('pdfs', 'document.pdf')
    """
    
    def __init__(self):
        self.client = get_supabase_client()
        
    def upload_file(self, bucket, path, file, file_options=None):
        """
        Upload a file to Supabase Storage.
        
        Args:
            bucket (str): Storage bucket name
            path (str): Path/filename in the bucket
            file: File object or bytes
            file_options (dict, optional): Additional file options
            
        Returns:
            dict: Response from Supabase
        """
        return self.client.storage.from_(bucket).upload(path, file, file_options)
    
    def get_download_url(self, bucket, path):
        """
        Get a public download URL for a file.
        
        Args:
            bucket (str): Storage bucket name
            path (str): Path/filename in the bucket
            
        Returns:
            str: Public download URL
        """
        return self.client.storage.from_(bucket).get_public_url(path)
    
    def create_signed_url(self, bucket, path, expires_in=60):
        """
        Create a signed URL that expires after a certain time.
        
        Args:
            bucket (str): Storage bucket name
            path (str): Path/filename in the bucket
            expires_in (int): Expiration time in seconds
            
        Returns:
            dict: Response with signed URL
        """
        return self.client.storage.from_(bucket).create_signed_url(path, expires_in)
    
    def download_file(self, bucket, path):
        """
        Download a file from Supabase Storage.
        
        Args:
            bucket (str): Storage bucket name
            path (str): Path/filename in the bucket
            
        Returns:
            bytes: File content
        """
        return self.client.storage.from_(bucket).download(path)
    
    def remove_file(self, bucket, paths):
        """
        Remove a file or files from Supabase Storage.
        
        Args:
            bucket (str): Storage bucket name
            paths (str or list): Path(s) to remove
            
        Returns:
            dict: Response from Supabase
        """
        if isinstance(paths, str):
            paths = [paths]
        return self.client.storage.from_(bucket).remove(paths)


class SupabaseAuth:
    """
    Utility class for interacting with Supabase Auth.
    
    Example usage:
        auth = SupabaseAuth()
        user = auth.sign_up('user@example.com', 'password')
        session = auth.sign_in('user@example.com', 'password')
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def sign_up(self, email, password, user_metadata=None):
        """
        Register a new user with email and password.
        
        Args:
            email (str): User's email
            password (str): User's password
            user_metadata (dict, optional): Additional user metadata
            
        Returns:
            dict: User data
        """
        return self.client.auth.sign_up({
            "email": email,
            "password": password,
            **({"data": user_metadata} if user_metadata else {})
        })
    
    def sign_in(self, email, password):
        """
        Sign in a user with email and password.
        
        Args:
            email (str): User's email
            password (str): User's password
            
        Returns:
            dict: Session data
        """
        return self.client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    
    def sign_out(self, jwt):
        """
        Sign out a user.
        
        Args:
            jwt (str): JWT token
            
        Returns:
            dict: Response data
        """
        return self.client.auth.sign_out(jwt)
    
    def get_user(self, jwt):
        """
        Get user information.
        
        Args:
            jwt (str): JWT token
            
        Returns:
            dict: User data
        """
        return self.client.auth.get_user(jwt)


class SupabaseDB:
    """
    Utility class for interacting with Supabase Database.
    
    Example usage:
        db = SupabaseDB()
        data = db.select('documents', ['id', 'title'])
        db.insert('documents', {'title': 'New Document'})
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def select(self, table, columns='*', **query_params):
        """
        Select data from a table.
        
        Args:
            table (str): Table name
            columns (str or list): Columns to select
            **query_params: Additional query parameters
            
        Returns:
            dict: Query response
        """
        query = self.client.table(table).select(columns)
        
        for k, v in query_params.items():
            if k == 'eq':  # Equal
                query = query.eq(v[0], v[1])
            elif k == 'neq':  # Not equal
                query = query.neq(v[0], v[1])
            elif k == 'gt':  # Greater than
                query = query.gt(v[0], v[1])
            elif k == 'lt':  # Less than
                query = query.lt(v[0], v[1])
            elif k == 'gte':  # Greater than or equal
                query = query.gte(v[0], v[1])
            elif k == 'lte':  # Less than or equal
                query = query.lte(v[0], v[1])
            elif k == 'limit':  # Limit
                query = query.limit(v)
        
        return query.execute()
    
    def insert(self, table, data):
        """
        Insert data into a table.
        
        Args:
            table (str): Table name
            data (dict or list): Data to insert
            
        Returns:
            dict: Insert response
        """
        return self.client.table(table).insert(data).execute()
    
    def update(self, table, data, **match_params):
        """
        Update data in a table.
        
        Args:
            table (str): Table name
            data (dict): Data to update
            **match_params: Record matching parameters
            
        Returns:
            dict: Update response
        """
        query = self.client.table(table).update(data)
        
        for k, v in match_params.items():
            query = query.eq(k, v)
        
        return query.execute()
    
    def delete(self, table, **match_params):
        """
        Delete data from a table.
        
        Args:
            table (str): Table name
            **match_params: Record matching parameters
            
        Returns:
            dict: Delete response
        """
        query = self.client.table(table).delete()
        
        for k, v in match_params.items():
            query = query.eq(k, v)
        
        return query.execute()
