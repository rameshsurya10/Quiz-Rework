import axios from 'axios';

// Base URL without trailing /api to avoid double prefix issues
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Request cache for deduplication
const requestCache = new Map();
const pendingRequests = new Map();

// Create API instance with improved configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to create request key for caching
const createRequestKey = (config) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
};

// Helper function for retrying requests
const retryRequest = async (config, retryCount = 0, maxRetries = 2) => {
  try {
    return await api(config);
  } catch (error) {
    if (retryCount < maxRetries && error.code === 'ECONNABORTED' || error.response?.status >= 500) {
      console.log(`Retrying request (${retryCount + 1}/${maxRetries}):`, config.url);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return retryRequest(config, retryCount + 1, maxRetries);
    }
    throw error;
  }
};

// Add a request interceptor to include the auth token and implement request deduplication
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

    // Add request timestamp for caching
    config.metadata = { requestTime: Date.now() };

    // Implement request deduplication for GET requests
    if (config.method === 'get') {
      const requestKey = createRequestKey(config);
      
      // Check if request is already pending
      if (pendingRequests.has(requestKey)) {
        return pendingRequests.get(requestKey);
      }
      
      // Check cache for recent requests (cache for 30 seconds)
      const cached = requestCache.get(requestKey);
      if (cached && Date.now() - cached.timestamp < 30000) {
        return Promise.resolve(cached.response);
      }
      
      // Store the request promise
      const requestPromise = api(config);
      pendingRequests.set(requestKey, requestPromise);
      
      // Clean up pending request when done
      requestPromise.finally(() => {
        pendingRequests.delete(requestKey);
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors and caching
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get') {
      const requestKey = createRequestKey(response.config);
      requestCache.set(requestKey, {
        response: response,
        timestamp: Date.now()
      });
      
      // Clean old cache entries (keep last 100 entries)
      if (requestCache.size > 100) {
        const firstKey = requestCache.keys().next().value;
        requestCache.delete(firstKey);
      }
    }
    
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
              return retryRequest(originalRequest);
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
      
      // Handle other error codes with user-friendly messages
      switch (error.response.status) {
        case 403:
          console.log('Permission denied: You do not have access to this resource');
          break;
        case 404:
          console.log(`Resource not found: ${error.config.url}`);
          break;
        case 429:
          // Rate limiting - wait and retry
          console.log('Rate limited - retrying after delay');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return retryRequest(originalRequest);
        case 500:
          console.log('Server error: Please try again later');
          // Automatically retry server errors
          if (!originalRequest._serverRetry) {
            originalRequest._serverRetry = true;
            return retryRequest(originalRequest);
          }
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
      
      // Retry network errors
      if (!originalRequest._networkRetry) {
        originalRequest._networkRetry = true;
        return retryRequest(originalRequest);
      }
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      console.log('Request timeout:', error.config.url);
      if (!originalRequest._timeoutRetry) {
        originalRequest._timeoutRetry = true;
        return retryRequest(originalRequest);
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Request Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Enhanced API methods with better error handling and response optimization
export const studentApi = {
  getAll: (params) => api.get('/api/students/', { params }),
  getById: (id) => api.get(`/api/students/${id}/`),
  create: (data) => api.post('/api/students/create_student/', data),
  update: (id, data) => api.put(`/api/students/${id}/`, data),
  delete: (id) => api.delete(`/api/students/${id}/`),
  bulkCreate: (data) => api.post('/api/students/create_student/', data),
  bulkUpload: (formData, onUploadProgress) => api.post('/api/students/bulk_upload/', formData, {
    onUploadProgress,
    timeout: 60000 // Longer timeout for file uploads
  }),
  test: () => api.get('/api/students/'),
};

export const teacherApi = {
  getAll: (params) => api.get('/api/teachers/', { params }),
  get: (teacher_id) => api.get(`/api/teachers/${teacher_id}/`),
  create: (data) => api.post('/api/teachers/', data),
  update: (teacher_id, data) => api.put(`/api/teachers/${teacher_id}/`, data),
  delete: (teacher_id) => api.delete(`/api/teachers/${teacher_id}/`),
  filterTeachers: (data) => api.post('/api/teachers/filter_teachers/', data),
};

export const departmentApi = {
  getAll: (params) => api.get('/api/departments/', { params }),
  getById: (id) => api.get(`/api/departments/${id}/`),
  create: (data) => api.post('/api/departments/', data),
  update: (id, data) => api.put(`/api/departments/${id}/`, data),
  delete: (id) => api.delete(`/api/accounts/${id}/`),
  deleteUser: (id) => api.delete(`/api/accounts/${id}/`),
  toggleStatus: (id, data) => api.patch(`/api/accounts/${id}/status/`, data),
  
  getAllStudents: (params) => api.get('/api/students/', { params }),
  getAllTeachers: (params) => api.get('/api/teachers/', { params }),

  getProfile: () => api.get('/api/accounts/me/'),
  updateProfile: (data) => api.put('/api/accounts/profile/', data),
  changePassword: (data) => api.post('/api/accounts/change-password/', data),
  uploadProfilePicture: (data, onUploadProgress) => api.post('/api/accounts/profile/avatar/', data, {
    onUploadProgress,
    timeout: 30000
  }),
  bulkUploadStudents: (departmentId, formData, onUploadProgress) => api.post(`/api/departments/${departmentId}/bulk-upload-students/`, formData, {
    onUploadProgress,
    timeout: 60000
  }),
  bulkDeleteStudents: (departmentId, data) => api.post(`/api/departments/${departmentId}/bulk-delete-students/`, data),
};

export const subjectApi = {
  getAll: () => api.get('/api/departments/'),
  create: (data) => api.post('/api/departments/', data),
  update: (id, data) => api.put(`/api/departments/${id}/`, data),
  delete: (id) => api.delete(`/api/departments/${id}/`),
};

export const quizApi = {
  getAll: (params) => api.get('/api/quiz/', { params }),
  getById: (id) => api.get(`/api/quiz/${id}/`),
  getForStudent: (id) => api.get(`/api/quiz/student/${id}/`),
  create: (data) => api.post('/api/quiz/', data),
  update: (id, data) => api.put(`/api/quiz/${id}/`, data),
  patch: (id, data) => api.patch(`/api/quiz/${id}/`, data),
  delete: (id) => api.delete(`/api/quiz/${id}/`),
  publish: (id) => api.post(`/api/quiz/${id}/publish/`),
  uploadFile: (quizId, fileData, onUploadProgress) => {
    return api.post(`/api/quiz/${quizId}/files/upload/`, fileData, {
      onUploadProgress,
      timeout: 120000, // 2 minutes for large file uploads
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
  },
  
  // Student quiz operations
  submitQuizAttempt: (data) => api.post('/api/students/quiz_submit/', data),
  getQuizAttempt: (quizId) => api.get(`/api/students/quiz_result/${quizId}/`),
  getAllQuizAttempts: () => api.get('/api/students/quiz_attempts/'),
  
  // Enhanced question management endpoints
  questions: {
    update: (quizId, questionNumber, data) => 
      api.patch(`/api/quiz/${quizId}/questions/${questionNumber}/`, data),
    delete: (quizId, questionNumber) => 
      api.delete(`/api/quiz/${quizId}/questions/${questionNumber}/`),
    exchange: (quizId, questionNumber, newQuestionNumber) =>
      api.post(`/api/quiz/${quizId}/questions/exchange/`, {
        current_question: questionNumber,
        new_question: newQuestionNumber
      }),
    add: (quizId, data) =>
      api.post(`/api/quiz/${quizId}/questions/`, data),
    replace: (quizId, questionNumber) =>
      api.post(`/api/quiz/${quizId}/replace-question/`, { question_number: questionNumber })
  }
};

export const userApi = {
  getAll: (params) => api.get('/api/accounts/', { params }),
  getAllUsers: () => api.get('/api/accounts/'),
  getById: (id) => api.get(`/api/accounts/${id}/`),
  create: (data) => api.post('/api/accounts/register/', data),
  createUser: (data) => api.post('/api/accounts/register/', data),
  update: (id, data) => api.put(`/api/accounts/${id}/`, data),
  updateUser: (id, data) => api.put(`/api/accounts/${id}/`, data),
  delete: (id) => api.delete(`/api/accounts/${id}/`),
  deleteUser: (id) => api.delete(`/api/accounts/${id}/`),
  toggleStatus: (id, data) => api.patch(`/api/accounts/${id}/status/`, data),
  
  getAllStudents: (params) => api.get('/api/students/', { params }),
  getAllTeachers: (params) => api.get('/api/teachers/', { params }),

  getProfile: () => api.get('/api/accounts/me/'),
  updateProfile: (data) => api.put('/api/accounts/profile/', data),
  changePassword: (data) => api.post('/api/accounts/change-password/', data),
  uploadProfilePicture: (data, onUploadProgress) => api.post('/api/accounts/profile/avatar/', data, {
    onUploadProgress,
    timeout: 30000
  }),
};

// Enhanced settings API
export const settingsApi = {
  getSettings: () => userApi.getProfile().then(response => ({
    data: {
      email_notifications: response.data.email_notifications ?? true,
      push_notifications: response.data.push_notifications ?? false,
      dark_mode: response.data.dark_mode ?? false,
    }
  })),
  updateSettings: (data) => {
    const profileData = {
      email_notifications: data.email_notifications,
      push_notifications: data.push_notifications,
      dark_mode: data.dark_mode,
    };
    return userApi.updateProfile(profileData);
  },
};

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/'),
};

export const reportApi = {
  getStudentReport: (studentId) => api.get(`/api/reports/student/${studentId}/`),
};

// Utility functions for better API management
export const apiUtils = {
  // Clear all cached requests
  clearCache: () => {
    requestCache.clear();
    pendingRequests.clear();
  },
  
  // Get cache status
  getCacheInfo: () => ({
    cacheSize: requestCache.size,
    pendingRequests: pendingRequests.size
  }),
  
  // Preload common data
  preloadCommonData: async () => {
    try {
      await Promise.allSettled([
        departmentApi.getAll(),
        userApi.getProfile()
      ]);
    } catch (error) {
      console.log('Preload failed:', error);
    }
  }
};

export const fetchTeacherDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw new Error('Failed to fetch dashboard data');
  }
};

const apiService = api;
export default apiService;
