import axios from 'axios';

const API_URL = '/api/reports';

const getQuizReport = async (quizId) => {
  const response = await axios.get(`${API_URL}/quizzes/${quizId}/summary/`);
  return response.data;
};

const getStudentPerformance = async (quizId) => {
  const response = await axios.get(`${API_URL}/quizzes/${quizId}/student_performance/`);
  return response.data;
};

const getQuestionAnalysis = async (quizId) => {
  const response = await axios.get(`${API_URL}/quizzes/${quizId}/question_analysis/`);
  return response.data;
};

export const reportService = {
  getQuizReport,
  getStudentPerformance,
  getQuestionAnalysis,
};

export default reportService;
