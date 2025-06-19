import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle auth errors
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/token/refresh/`, {
            refresh: refreshToken
          });
          
          if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
            originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
            return axios(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
      }
      
      // Token refresh failed
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Token utilities
const getBaseUrl = () => API_URL;

const parseToken = (token) => {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error parsing token:', error);
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const decoded = parseToken(token);
    return decoded && decoded.exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
};

const getUserFromToken = (token) => {
  try {
    const decoded = parseToken(token);
    if (!decoded) return null;
    
    return {
      email: decoded.email || decoded.username || '',
      role: decoded.role || ''
    };
  } catch (error) {
    return null;
  }
};

// Authentication functions
const loginUser = async (credentials) => {
  try {
    // Try standard JWT endpoint
    const response = await axios.post(`${API_URL}/api/token/`, {
      email: credentials.email,
      password: credentials.password
    });
    
    if (response.data && response.data.access) {
      localStorage.setItem('token', response.data.access);
      if (response.data.refresh) {
        localStorage.setItem('refreshToken', response.data.refresh);
      }
      
      // After setting token, fetch full user profile to store locally
      try {
        const profileResponse = await api.get('/api/accounts/profile/');
        if (profileResponse.data) {
          localStorage.setItem('user', JSON.stringify(profileResponse.data));
        } else {
          // Fallback to basic info if profile data is empty
          const userInfo = { email: credentials.email, role: credentials.role || '' };
          localStorage.setItem('user', JSON.stringify(userInfo));
        }
      } catch (profileError) {
        console.error('Failed to fetch profile after login, using basic info:', profileError);
        // Fallback to basic info if profile fetch fails
        const userInfo = { email: credentials.email, role: credentials.role || '' };
        localStorage.setItem('user', JSON.stringify(userInfo));
      }
      
      return {
        success: true,
        data: response.data
      };
    }
    
    return {
      success: false,
      error: 'Invalid response from server'
    };
  } catch (error) {
    // Try fallback to custom login endpoint if standard fails
    try {
      const fallbackResponse = await axios.post(`${API_URL}/api/accounts/login/`, {
        email: credentials.email,
        password: credentials.password,
        role: credentials.role
      });
      
      if (fallbackResponse.data && fallbackResponse.data.token) {
        localStorage.setItem('token', fallbackResponse.data.token);
        if (fallbackResponse.data.refresh_token) {
          localStorage.setItem('refreshToken', fallbackResponse.data.refresh_token);
        }
        
        // After setting token, fetch full user profile to store locally
        try {
          const profileResponse = await api.get('/api/accounts/profile/');
          if (profileResponse.data) {
            localStorage.setItem('user', JSON.stringify(profileResponse.data));
          } else {
            // Fallback to basic info if profile data is empty
            const userInfo = { email: credentials.email, role: credentials.role || '' };
            localStorage.setItem('user', JSON.stringify(userInfo));
          }
        } catch (profileError) {
          console.error('Failed to fetch profile after login, using basic info:', profileError);
          // Fallback to basic info if profile fetch fails
          const userInfo = { email: credentials.email, role: credentials.role || '' };
          localStorage.setItem('user', JSON.stringify(userInfo));
        }
        
        return {
          success: true,
          data: fallbackResponse.data
        };
      }
      
      return {
        success: false,
        error: 'Authentication failed with both endpoints'
      };
    } catch (fallbackError) {
      console.error('Login failed on both endpoints:', error, fallbackError);
      return {
        success: false,
        error: error.response?.data?.detail || 'Authentication failed'
      };
    }
  }
};

const logoutUser = (navigate = null) => {
  // Clear all auth tokens and user data
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  // If navigate function is provided, use React Router navigation
  if (navigate) {
    navigate('/login');
  } else {
    // Fallback to window location for non-React Router contexts
    window.location.href = '/login';
  }
  
  return true;
};

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return isTokenValid(token);
};

const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  
  return getUserFromToken(token);
};

const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || '';
};

// CRUD operations with hooks
const useCRUD = () => {
  // Create
  const create = async (endpoint, data, onError) => {
    try {
      const response = await api.post(endpoint, data);
      return response.data;
    } catch (err) {
      if (onError) onError(err.response?.data?.message || 'Error creating resource');
      return null;
    }
  };

  // Read
  const read = async (endpoint, page = 1, pageSize = 10, filters = {}, onError) => {
    try {
      const params = { page, page_size: pageSize, ...filters };
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (err) {
      if (onError) onError(err.response?.data?.message || 'Error fetching data');
      return null;
    }
  };

  // Update
  const update = async (endpoint, id, data, onError) => {
    try {
      const response = await api.put(`${endpoint}/${id}`, data);
      return response.data;
    } catch (err) {
      if (onError) onError(err.response?.data?.message || 'Error updating resource');
      return null;
    }
  };

  // Delete
  const remove = async (endpoint, id, onError) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      return true;
    } catch (err) {
      if (onError) onError(err.response?.data?.message || 'Error deleting resource');
      return false;
    }
  };

  // Get by ID
  const getById = async (endpoint, id, onError) => {
    try {
      const response = await api.get(`${endpoint}/${id}`);
      return response.data;
    } catch (err) {
      if (onError) onError(err.response?.data?.message || 'Resource not found');
      return null;
    }
  };

  return {
    create,
    read,
    update,
    remove,
    getById
  };
};

// User profile API methods
const userApi = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/accounts/profile/');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.patch('/api/accounts/profile/', profileData);
      // Update local storage if email is updated
      if (profileData.email) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.email = profileData.email;
        localStorage.setItem('user', JSON.stringify(user));
      }
      return { data: response.data };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      await api.post('/api/accounts/change-password/', passwordData);
      return { success: true };
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await api.patch('/api/accounts/profile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return { data: response.data };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }
};

// Export the API service object
const apiService = {
  api,
  getBaseUrl,
  userApi,
  parseToken,
  isTokenValid,
  getUserFromToken,
  loginUser,
  logoutUser,
  isAuthenticated,
  getCurrentUser,
  getUserRole,
  useCRUD
};

export default apiService;
