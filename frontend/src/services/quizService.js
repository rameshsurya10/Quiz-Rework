import axios from 'axios';
import { quizApi } from './api.js';

// Use the same API configuration as the main api.js file
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Configure axios with auth token - simplified version
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
// Helper function to normalize question data structure for display
const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    return [];
  }
  
  return questions.flatMap(questionData => {
    // If questionData is already in the correct format
    if (questionData.question_text && typeof questionData.question_text === 'string') {
      return [questionData];
    }
    
    // If questionData.question is a string (simple question)
    if (typeof questionData.question === 'string') {
      return [{
        ...questionData,
        question_text: questionData.question
      }];
    }
    
    // If questionData.question is an array or object (complex structure from backend)
    let questionsArray;
    try {
      questionsArray = typeof questionData.question === 'string' 
        ? JSON.parse(questionData.question) 
        : questionData.question;
    } catch (e) {
      // If parsing fails, treat as simple question
      return [{
        ...questionData,
        question_text: String(questionData.question)
      }];
    }
    
    // Ensure questionsArray is an array
    if (!Array.isArray(questionsArray)) {
      questionsArray = [questionsArray];
    }
    
    // Process each question in the array
    return questionsArray.map((q, index) => ({
      ...questionData,
      question_id: questionData.question_id || `${questionData.id || 'unknown'}-${index}`,
      question_text: q.question || q.question_text || 'No question text available',
      type: q.type || questionData.question_type || questionData.type || 'mcq',
      options: q.options || questionData.options || {},
      correct_answer: q.correct_answer || questionData.correct_answer || '',
      explanation: q.explanation || questionData.explanation || ''
    }));
  });
};

// Helper function to format questions for display in modals/dialogs
const formatQuestionsForDisplay = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'No questions available';
  }
  
  return questions.map((question, index) => {
    // Extract the actual question text
    let questionText = '';
    
    if (typeof question === 'string') {
      questionText = question;
    } else if (question.question_text) {
      questionText = question.question_text;
    } else if (question.question) {
      // Handle case where question.question might be an object or string
      if (typeof question.question === 'string') {
        questionText = question.question;
      } else if (Array.isArray(question.question)) {
        // If question.question is an array, extract the first question text
        const firstQ = question.question[0];
        questionText = firstQ?.question || firstQ?.question_text || '[Question not available]';
      } else if (typeof question.question === 'object') {
        questionText = question.question.question || question.question.question_text || '[Question not available]';
      } else {
        questionText = '[Question format not recognized]';
      }
    } else {
      questionText = '[Question text not available]';
    }
    
    return `${index + 1}. ${questionText}`;
  }).join('\n');
};

export const quizService = {
  // Get all documents available for quiz creation
  getDocuments: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/documents/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  // Get document details including page count
  getDocumentDetails: async (documentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/documents/${documentId}/`, getAuthHeaders());
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
        `${API_BASE_URL}/api/quiz/ai-generated/`,
        quizData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error creating AI-generated quiz:', error);
      throw error;
    }
  },

  // Create a new quiz with JSON data
  createQuiz: async (quizData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/`,
        quizData,
        getAuthHeaders() // This will set Content-Type to application/json
      );
      return response.data;
    } catch (error) {
      console.error('Error creating quiz:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.response.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create quiz');
      }
    }
  },

  // Upload a single file for a quiz
  uploadFileForQuiz: async (quizId, file, pageRange = null, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add page range if provided
    if (pageRange) {
      formData.append('page_range', pageRange);
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress) {
            onUploadProgress(progressEvent);
      }
        }
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/${quizId}/upload/`,
        formData,
        config
      );
      return response.data;
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw new Error(`Failed to upload file: ${file.name}`);
    }
  },

  // Regenerate questions for an existing quiz
  regenerateQuizQuestions: async (quizId, regenerationData) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/${quizId}/regenerate-questions/`,
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
      
      const response = await axios.get(
        `${API_BASE_URL}/api/quiz/`, 
        { 
          ...getAuthHeaders(), 
          params,
          validateStatus: status => status < 500 // Accept any status < 500
        }
      );

      // Handle empty response
      if (!response.data) {
        console.warn('Empty response from quiz API');
        return [];
      }

      // Extract all quizzes from the categorized response
      const allQuizzes = [
        ...(response.data.current_quizzes || []),
        ...(response.data.past_quizzes || []),
        ...(response.data.upcoming_quizzes || [])
      ];

      // Normalize quiz data - preserve null/undefined for pages and passing_score
      return allQuizzes.map(quiz => ({
        quiz_id: quiz.quiz_id || quiz.id,
        title: quiz.title || 'Untitled Quiz',
        description: quiz.description || '',
        is_published: quiz.is_published || false,
        no_of_questions: quiz.no_of_questions || 0,
        time_limit_minutes: quiz.time_limit_minutes || 30,
        passing_score: quiz.passing_score, // Don't provide fallback - preserve actual value
        pages: quiz.pages, // Don't provide fallback - preserve actual value
        metadata: quiz.metadata || {},
        department_id: quiz.department_id || (quiz.department && quiz.department.id),
        department_name: quiz.department_name || (quiz.department && quiz.department.name) || 'Not assigned',
        quiz_type: quiz.quiz_type || 'Normal',
        question_type: quiz.question_type || 'Mixed',
        questions: Array.isArray(quiz.questions) ? normalizeQuestions(quiz.questions) : []
      }));
    } catch (error) {
      console.error('Error fetching user quiz:', error);
      if (error.response?.status === 404) {
        return []; // Return empty array for 404
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch quizzes');
    }
  },

  // Get quiz details including questions
  getQuizDetails: async (quizId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/quiz/${quizId}/`, 
        {
          ...getAuthHeaders(),
          validateStatus: status => status < 500
        }
      );

      if (!response.data) {
        throw new Error('No quiz data returned from server');
      }

      // Normalize quiz data
      const quiz = response.data;
      
      console.log('Raw quiz data from API:', quiz);
      
      return {
        ...quiz,
        quiz_id: quiz.quiz_id || quiz.id,
        title: quiz.title || 'Untitled Quiz',
        description: quiz.description || '',
        is_published: quiz.is_published || false,
        no_of_questions: quiz.no_of_questions || 0,
        time_limit_minutes: quiz.time_limit_minutes || 30,
        passing_score: quiz.passing_score, // Preserve actual value from backend
        pages: quiz.pages, // Preserve actual value from backend
        metadata: quiz.metadata || {},
        department_id: quiz.department_id || (quiz.department && quiz.department.id),
        department_name: quiz.department_name || (quiz.department && quiz.department.name) || 'Not assigned',
        quiz_type: quiz.quiz_type || 'Normal',
        question_type: quiz.question_type || 'Mixed',
        questions: Array.isArray(quiz.questions) ? normalizeQuestions(quiz.questions) : []
      };
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      if (error.response?.status === 404) {
        throw new Error('Quiz not found');
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch quiz details');
    }
  },

  // Get quiz report summary
  getQuizReport(quizId) {
    return axios.get(`${API_BASE_URL}/api/reports/quiz/${quizId}/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching quiz report:', error);
        throw error;
      });
  },

  // Get student performance for a quiz
  getStudentPerformance(quizId) {
    return axios.get(`${API_BASE_URL}/api/reports/quiz/${quizId}/student_performance/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching student performance:', error);
        throw error;
      });
  },

  // Get question analysis for a quiz
  getQuestionAnalysis(quizId) {
    return axios.get(`${API_BASE_URL}/api/reports/quiz/${quizId}/question_analysis/`, getAuthHeaders())
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching question analysis:', error);
        throw error;
      });
  },

  // Get questions for a specific quiz
  getQuizQuestions: async (quizId, pageFilter = null, complexity = null) => {
    try {
      const params = {};
      if (pageFilter) params.page = pageFilter;
      if (complexity) params.complexity = complexity;
      
      const response = await axios.get(
        `${API_BASE_URL}/api/quiz/${quizId}/questions/`,
        {
          ...getAuthHeaders(),
          params
        }
      );
      
      // Process and normalize the questions
      const questions = normalizeQuestions(response.data.questions || []);
      return { questions };
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      throw error;
    }
  },

  // Get page analytics for quiz questions
  getQuizPageAnalytics: async (quizId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/quiz/${quizId}/page-analytics/`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz page analytics:', error);
      throw error;
    }
  },

  // Publish a quiz (update status)
  deleteQuiz: async (quizId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/quiz/${quizId}/`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  // Publish a quiz (update status)
  publishQuiz: async (quizId) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/quiz/${quizId}/`,
        { is_published: true, status: 'published' },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error publishing quiz:', error);
      throw error;
    }
  },

  // Helper function to normalize questions data
  normalizeQuestions: normalizeQuestions,

  // Helper function to format questions for display in modals/dialogs
  formatQuestionsForDisplay: formatQuestionsForDisplay,

  // Replace a question in a quiz
  replaceQuestion: async (quizId, questionNumber) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/${quizId}/replace-question/`,
        { question_number: questionNumber },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error replacing question:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to replace question');
      }
    }
  },

  // Regenerate a single question in a quiz
  regenerateQuizQuestion: async (quizId, questionNumber) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/${quizId}/regenerate-question/${questionNumber}/`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error regenerating quiz question:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to regenerate quiz question');
      }
    }
  },
};

export default quizService;
