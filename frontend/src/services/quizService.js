import axios from 'axios';

// Base URL - should match your Django backend
const API_BASE_URL = 'http://localhost:8000/api';

// Configure axios with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  };
};

// Quiz API services
// Quiz API services
export const quizService = {
  // Get all documents available for quiz creation
  getDocuments: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  // Get document details including page count
  getDocumentDetails: async (documentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/documents/${documentId}/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching document details:', error);
      throw error;
    }
  },

  // Create a new quiz with AI-generated questions
  createAIGeneratedQuiz: async (quizData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/ai-generated/`,
        quizData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error creating AI-generated quiz:', error);
      throw error;
    }
  },

  // Regenerate questions for an existing quiz
  regenerateQuizQuestions: async (quizId, regenerationData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/quiz/${quizId}/regenerate-questions/`,
        regenerationData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error regenerating quiz questions:', error);
      throw error;
    }
  },

  // Get all quiz created by the user
  getUserquiz: async (status = '') => {
    try {
      const params = {};
      if (status) {
        params.status = status;
      }
      const response = await axios.get(`${API_BASE_URL}/quiz/`, { ...getAuthHeaders(), params });
      return response.data;
    } catch (error) {
      console.error('Error fetching user quiz:', error);
      throw error;
    }
  },

  // Get quiz details including questions
  getQuizDetails(quizId) {
    return axios.get(`${API_BASE_URL}/quiz/${quizId}/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching quiz details:', error);
        throw error;
      });
  },

  // Get quiz report summary
  getQuizReport(quizId) {
    return axios.get(`${API_BASE_URL}/quiz/${quizId}/report/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching quiz report:', error);
        throw error;
      });
  },

  // Get student performance for a quiz
  getStudentPerformance(quizId) {
    return axios.get(`${API_BASE_URL}/quiz/${quizId}/student-performance/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching student performance:', error);
        throw error;
      });
  },

  // Get question analysis for a quiz
  getQuestionAnalysis(quizId) {
    return axios.get(`${API_BASE_URL}/quiz/${quizId}/question-analysis/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching question analysis:', error);
        throw error;
      });
  },

  // Get quiz questions with optional page filtering
  getQuizQuestions: async (quizId, pageFilter = null, complexityFilter = null) => {
    try {
      let url = `${API_BASE_URL}/ai_processing/quiz/${quizId}/questions/`;
      
      // Add query parameters if provided
      const params = new URLSearchParams();
      if (pageFilter) params.append('page', pageFilter);
      if (complexityFilter) params.append('complexity', complexityFilter);
      
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }
      
      const response = await axios.get(url, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      throw error;
    }
  },

  // Get page analytics for quiz questions
  getQuizPageAnalytics: async (quizId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/ai_processing/quiz/${quizId}/page-analytics/`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz page analytics:', error);
      throw error;
    }
  },

  // Publish a quiz (update status)
  publishQuiz: async (quizId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/quiz/${quizId}/`,
        { is_published: true, status: 'published' },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error publishing quiz:', error);
      throw error;
    }
  },
};

export default quizService;
