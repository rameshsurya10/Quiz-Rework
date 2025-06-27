import axios from 'axios';

// Base URL without trailing /api to avoid double prefix issues
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // If the request data is FormData, let the browser set the Content-Type
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log all API errors with useful information
    if (error.response) {
      console.log(`API Error ${error.response.status}:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config.url,
        method: error.config.method,
      });
      
      // Handle specific error codes
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            console.log('Attempting to refresh token...');
            const response = await axios.post(`${API_URL}/api/token/refresh/`, {
              refresh: refreshToken
            });
            
            if (response.data.access) {
              // Save the new access token
              localStorage.setItem('token', response.data.access);
              
              // Update authorization header and retry the original request
              originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
              return axios(originalRequest);
            }
          } else {
            console.log('No refresh token available');
            // Redirect to login or handle authentication failure
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } catch (refreshError) {
          console.log('Token refresh failed:', refreshError);
          // Clear tokens and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          
          if (typeof window !== 'undefined' && !originalRequest.url.includes('login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
      
      // Handle other error codes
      switch (error.response.status) {
        case 403:
          console.log('Permission denied: You do not have access to this resource');
          break;
        case 404:
          console.log(`Resource not found: ${error.config.url}`);
          break;
        case 500:
          console.log('Server error: Please try again later');
          break;
        default:
          console.log(`API error: ${error.response.statusText}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.log('Network Error: No response received from server', {
        url: error.config.url,
        method: error.config.method,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const studentApi = {
  getAll: (params) => api.get('/api/students/', { params }),
  getById: (id) => api.get(`/api/students/${id}/`),
  create: (data) => api.post('/api/students/create_student/', data),
  update: (id, data) => api.put(`/api/students/${id}/`, data),
  delete: (id) => api.delete(`/api/students/${id}/`),
  bulkCreate: (data) => api.post('/api/students/create_student/', data),
  // Add a test endpoint to check connectivity
  test: () => api.get('/api/students/'),
};

export const teacherApi = {
  getAll: (params) => api.get('/api/teachers/', { params }),
  get: (id) => api.get(`/api/teachers/${id}/`),
  create: (data) => api.post('/api/teachers/', data),
  update: (id, data) => api.put(`/api/teachers/${id}/`, data),
  delete: (id) => api.delete(`/api/teachers/${id}/`),
  bulkCreate: (data) => api.post('/api/teachers/bulk-create/', data),
  filterTeachers: (data) => api.post('/api/teachers/filter_teachers/', data),
};

export const departmentApi = {
  getAll: (params) => api.get('/api/departments/', { params }),
  getById: (id) => api.get(`/api/departments/${id}/`),
  create: (data) => api.post('/api/departments/', data),
  update: (id, data) => api.put(`/api/departments/${id}/`, data),
  delete: (id) => api.delete(`/api/departments/${id}/`),
};

export const quizApi = {
  getAll: (params) => api.get('/api/quiz/', { params }),
  getById: (id) => api.get(`/api/quiz/${id}/`),
  create: (data) => api.post('/api/quiz/', data),
  update: (id, data) => api.put(`/api/quiz/${id}/`, data),
  patch: (id, data) => api.patch(`/api/quiz/${id}/`, data),
  delete: (id) => api.delete(`/api/quiz/${id}/`),
  publish: (id) => api.post(`/api/quiz/${id}/publish/`),
  uploadFile: (quizId, fileData, config = {}) => {
    return api.post(`/api/quiz/${quizId}/files/upload/`, fileData, config);
  },
};

export const userApi = {
  // Use correct endpoints for users
  getAll: (params) => api.get('/api/accounts/', { params }), // General endpoint for all users
  getAllUsers: () => api.get('/api/accounts/'), // Alias for getAll with no params for consistency with component usage
  getById: (id) => api.get(`/api/accounts/${id}/`),
  create: (data) => api.post('/api/accounts/register/', data),
  createUser: (data) => api.post('/api/accounts/register/', data), // Alias for create for consistency
  update: (id, data) => api.put(`/api/accounts/${id}/`),
  updateUser: (id, data) => api.put(`/api/accounts/${id}/`), // Alias for update for consistency
  delete: (id) => api.delete(`/api/accounts/${id}/`),
  deleteUser: (id) => api.delete(`/api/accounts/${id}/`), // Alias for delete for consistency
  // Specific endpoint for status toggle if available, otherwise use update
  toggleStatus: (id, data) => api.patch(`/api/accounts/${id}/status/`, data),
  
  // Student-specific endpoints
  getAllStudents: (params) => api.get('/api/students/', { params }),
  
  // Teacher-specific endpoints
  getAllTeachers: (params) => api.get('/api/teacher/teachers/', { params }),

  // Fetches the current authenticated user's details, including nested profile information
  // This endpoint returns core user fields (first_name, last_name, email, role, etc.) and embeds
  // the UserProfile data inside a "profile" object, which is required by various components.
  getProfile: () => api.get('/api/accounts/me/'),
  updateProfile: (data) => api.put('/api/accounts/profile/', data), // Updated to match the correct endpoint
  changePassword: (data) => api.post('/api/accounts/change-password/', data),
  uploadProfilePicture: (data) => api.post('/api/accounts/profile/avatar/', data), // Updated avatar endpoint
};

// Settings are now handled through the user profile endpoint
// This API is kept for backward compatibility but uses the profile endpoint internally
export const settingsApi = {
  getSettings: () => userApi.getProfile().then(response => ({
    data: {
      email_notifications: response.data.email_notifications ?? true,
      push_notifications: response.data.push_notifications ?? false,
      dark_mode: response.data.dark_mode ?? false,
    }
  })),
  updateSettings: (data) => {
    // Map settings to profile fields
    const profileData = {
      email_notifications: data.email_notifications,
      push_notifications: data.push_notifications,
      dark_mode: data.dark_mode,
    };
    return userApi.updateProfile(profileData);
  },
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/data/'),
};

export const reportApi = {
  // Assumes an endpoint like /api/reports/student/{studentId}/
  // This endpoint should return data like: { studentName, quizTaken, averageScore, recentActivity, etc. }
  getStudentReport: (studentId) => api.get(`/api/reports/student/${studentId}/`),
  // You might also want an endpoint to get all reports or reports with filters
  // getAllReports: (params) => api.get('/api/reports/', { params }),
};

const apiService = api;
export default apiService;
