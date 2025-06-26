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

  // Create a new quiz with attached files
  createQuizWithFiles: async (quizData, onUploadProgress) => {
    try {
      // Extract files to upload separately
      const files = quizData.files || [];
      
      // Create a clean payload without the files property
      const { files: removedFiles, ...cleanQuizData } = quizData;
      
      // First create the quiz
      const response = await axios.post(
        `${API_BASE_URL}/api/quiz/`,
        cleanQuizData,
        getAuthHeaders()
      );
      
      const quizId = response.data.id || response.data.quiz_id;
      
      if (!quizId) {
        throw new Error('Quiz created but no quiz_id returned from the server');
      }
      
      // If there are files, upload them one by one
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // IMPORTANT: Make sure the file is valid and not empty
          if (!file || file.size === 0) {
            console.warn(`Skipping empty file at index ${i}`);
            continue;
          }
          
          // Log file details for debugging
          console.log(`File ${i + 1} details:`, {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
          
          try {
            // Use a direct fetch approach instead of axios
            const token = localStorage.getItem('token');
            const url = `${API_BASE_URL}/api/quiz/${quizId}/files/upload/`;
            
            // Create a simple FormData with just the file
            const formData = new FormData();
            formData.append('file', file);
            
            // Add page ranges only for PDF files
            if (quizData.page_ranges && 
                (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
              formData.append('page_ranges', quizData.page_ranges);
            }
            
            console.log(`Uploading file ${i + 1}/${files.length}: ${file.name} to ${url}`);
            
            // Use XMLHttpRequest for better progress tracking
            const xhr = new XMLHttpRequest();
            
            // Create a promise to handle the XHR request
            await new Promise((resolve, reject) => {
              // Set up progress tracking
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onUploadProgress) {
                  // Calculate file progress percentage
                  const fileProgress = Math.round((event.loaded / event.total) * 100);
                  
                  // Calculate overall progress based on current file and completed files
                  const overallProgress = Math.round(
                    ((i * 100) + fileProgress) / files.length
                  );
                  
                  // Update progress in UI with XMLHttpRequest-like format
                  onUploadProgress({ 
                    lengthComputable: true,
                    loaded: overallProgress, 
                    total: 100 
                  });
                  console.log(`Upload progress: ${fileProgress}% (file), ${overallProgress}% (overall)`);
                }
              };
              
              // Handle completion
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const result = JSON.parse(xhr.responseText);
                    console.log('File upload successful:', result);
                    resolve(result);
                  } catch (e) {
                    console.log('Upload completed but response parsing failed:', e);
                    resolve({ success: true });
                  }
                } else {
                  reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
                }
              };
              
              // Handle errors
              xhr.onerror = () => {
                reject(new Error('Network error during upload'));
              };
              
              // Open and send the request
              xhr.open('POST', url);
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
              xhr.send(formData);
            });
            
            // Report completion of this file
            if (onUploadProgress) {
              const progress = Math.round(((i + 1) * 100) / files.length);
              onUploadProgress({ 
                lengthComputable: true,
                loaded: progress, 
                total: 100 
              });
            }
          } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            throw new Error(`Failed to upload "${file.name}": ${error.message}`);
          }
        }
      }
      
      // Fetch and return the updated quiz data
      const updatedQuiz = await axios.get(
        `${API_BASE_URL}/api/quiz/${quizId}/`,
        getAuthHeaders()
      );
      
      return updatedQuiz.data;
    } catch (error) {
      console.error('Error creating quiz with files:', error);
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to create quiz with files');
      }
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

      // Normalize quiz data
      return allQuizzes.map(quiz => ({
        quiz_id: quiz.quiz_id || quiz.id,
        title: quiz.title || 'Untitled Quiz',
        description: quiz.description || '',
        is_published: quiz.is_published || false,
        no_of_questions: quiz.no_of_questions || 0,
        time_limit_minutes: quiz.time_limit_minutes || 30,
        passing_score: quiz.passing_score || 60,
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
        passing_score: quiz.passing_score || 60,
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

  // Get quiz questions with optional page filtering
  getQuizQuestions: async (quizId, pageFilter = null, complexityFilter = null) => {
    try {
      let url = `${API_BASE_URL}/api/quiz/${quizId}/questions/`;
      
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
  formatQuestionsForDisplay: formatQuestionsForDisplay
};

export default quizService;
