import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress, Tooltip, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon, Checkbox, TextField, Switch, FormControlLabel, FormControl, InputLabel, Select, MenuItem, Radio, RadioGroup } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import FullLayout from '../FullLayout';
import PageHeader from '../../common/PageHeader';
import QuizFormModern from './QuizFormModern';
import { ConfirmationDialog } from '../../common';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { quizApi, departmentApi } from '../../services/api';
import { quizService } from '../../services/quizService';
import MatchTheFollowingPreview from './MatchTheFollowingPreview';

const QuizStyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 30px 0 rgba(0,0,0,0.07)',
  },
}));

const QuizSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreating, setIsCreating] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [departments, setDepartments] = useState([]);

  // State for question view modal
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isQuestionsLoading, setQuestionsLoading] = useState(false);
  const [balanceQuestions, setBalanceQuestions] = useState(0);
  const [additionalQuestionsPool, setAdditionalQuestionsPool] = useState([]);

  // State for publishing
  const [isPublishing, setIsPublishing] = useState(false);

  // State for editing questions
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialQuiz, setInitialQuiz] = useState(null);
  
  // State for deleting and adding questions
  const [deletedQuestions, setDeletedQuestions] = useState(0);
  const [addedQuestions, setAddedQuestions] = useState(0);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState('');
  const [newQuestionData, setNewQuestionData] = useState({
    question_text: '',
    options: [],
    correct_answer: '',
    explanation: ''
  });

  const [deleteAlertShown, setDeleteAlertShown] = useState(false);
  const [regeneratedQuestions, setRegeneratedQuestions] = useState({}); // { [question_number]: true }
  const [isQuestionActionLoading, setIsQuestionActionLoading] = useState(false);
  const [showAddPrompt, setShowAddPrompt] = useState(false);

  const processQuestionList = (list) => 
    list.filter(Boolean).map((q, index) => {
      const processed = { ...q };
      processed.question_text = q.question || q.question_text || 'No question text';
      processed.type = q.question_type || q.type || 'mcq';
      // Only fallback to index+1 if q.question_number is undefined/null/0
      processed.question_number = (q.question_number !== undefined && q.question_number !== null && q.question_number !== 0)
        ? q.question_number
        : (index + 1);
      if (processed.type === 'mcq' && q.options) {
        if (Array.isArray(q.options)) {
          processed.options = q.options.map((opt, optIndex) => (typeof opt === 'object' && opt.option_text) ? opt : { option_text: String(opt), is_correct: false, id: String.fromCharCode(65 + optIndex) });
        } else if (typeof q.options === 'object' && q.options !== null) {
          const correctAnswerString = q.correct_answer?.toString().trim();
          processed.options = Object.entries(q.options).map(([key, value]) => {
            const optionValueString = String(value).trim();
            // The option is correct if its key OR its value matches the correct answer.
            const isCorrect = (key === correctAnswerString || optionValueString === correctAnswerString);
            return {
              option_text: optionValueString,
              is_correct: isCorrect,
              id: key
            };
          });
        } else {
          processed.options = [];
        }
      } else {
        processed.options = [];
      }
      return processed;
    });

  const fetchQuizzes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const quizzesData = await quizService.getUserquiz(activeTab);
      console.log('Fetched quizzes:', quizzesData);
      
      if (!Array.isArray(quizzesData)) {
        console.error('Invalid quiz data format:', quizzesData);
        throw new Error('Invalid response format from server');
      }

      setQuizzes(quizzesData);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError(error.message || 'Failed to fetch quizzes');
      setQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await departmentApi.getAll();
      const departmentsData = data.results || data || [];
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      showSnackbar('Failed to load departments', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    const loadData = async () => {
      if (!isCreating) {
        try {
          // Fetch departments first
          await fetchDepartments();
          // Then fetch quizzes
          await fetchQuizzes();
        } catch (error) {
          console.error("Error loading data:", error);
          setError("Failed to load data");
        }
      }
    };
    
    loadData();
    // Only re-run when isCreating changes, not on function reference changes
  }, [isCreating]);

  useEffect(() => {
    if (
      isViewModalOpen &&
      selectedQuiz &&
      selectedQuiz.questions &&
      selectedQuiz.no_of_questions &&
      selectedQuiz.questions.length < selectedQuiz.no_of_questions &&
      !showAddPrompt // Only open if not already open
    ) {
      setShowAddPrompt(true);
    }
  }, [isViewModalOpen, selectedQuiz]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleCreateQuiz = async (formData, onUploadProgress) => {
    try {
      setIsCreating(true);
      
      // Validate that required fields are present
      if (!formData.title || !formData.quiz_type) {
        showSnackbar('Missing required fields', 'error');
        setIsCreating(false);
        return;
      }
      
      // Use the quizService method for creating quiz with files
      const result = await quizService.createQuizWithFiles(formData, onUploadProgress);
      
      // Reset state - useEffect will handle refreshing the quiz list
      setIsCreating(false);
      
      // Show success message
      showSnackbar('Quiz created successfully!', 'success');
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      setIsCreating(false);
      
      // Show detailed error message from response if available
      let errorMsg = 'Failed to create quiz';
      
      if (error.response) {
        if (error.response.data?.detail) {
          errorMsg = error.response.data.detail;
        } else if (error.response.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error.response.status === 413) {
          errorMsg = 'File is too large. Maximum size is 60MB.';
        } else if (error.response.status === 400) {
          errorMsg = 'Invalid data. Please check your inputs.';
        }
      }
      
      showSnackbar(errorMsg, 'error');
    }
  };

  const handleDelete = (quizId) => {
    setQuizToDeleteId(quizId);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!quizToDeleteId) return;
    try {
      await quizApi.delete(quizToDeleteId);
      setQuizzes(quizzes.filter(q => q.quiz_id !== quizToDeleteId));
      showSnackbar('Quiz deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      showSnackbar('Failed to delete quiz', 'error');
    } finally {
      setConfirmDialogOpen(false);
      setQuizToDeleteId(null);
    }
  };

  // Publish quiz and refresh list
  const handlePublishClick = async (quizId) => {
    if (!selectedQuiz || !selectedQuiz.questions) {
      showSnackbar('Quiz data is not loaded. Please try again.', 'error');
      setIsPublishing(false);
      return;
    }
    setIsPublishing(true);
    try {
      // Use local state for validation
      if (!areAllQuestionsValid(selectedQuiz.questions)) {
        showSnackbar('Cannot publish: Quiz has incomplete or invalid questions.', 'error');
        setIsPublishing(false);
        return;
      }

      // Directly call the publish API at http://127.0.0.1:8000/api/quiz/:quiz_id/publish/
      const response = await fetch(`http://127.0.0.1:8000/api/quiz/${quizId}/publish/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if needed
          ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
        },
      });
      if (!response.ok) {
        throw new Error('Failed to publish quiz');
      }
      await fetchQuizzes();
      showSnackbar('Quiz published successfully and notifications sent!', 'success');
      closeViewModal();
    } catch (error) {
      console.error('Failed to publish quiz:', error);
      showSnackbar(error.response?.data?.message || 'Failed to publish quiz', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // View quiz questions in modal
  const handleViewQuiz = async (quizId) => {
    try {
      setQuestionsLoading(true);
      setSelectedQuiz(null);
      setViewModalOpen(true);
      
      // Use getQuizDetails to get complete quiz data with questions
      const quizData = await quizService.getQuizDetails(quizId);
      
      console.log('Raw quiz data from backend:', quizData);
      
      // Handle different question data formats from backend
      let questionsToDisplay = [];
      let additionalQuestions = [];
      
      if (quizData.current_questions) {
        questionsToDisplay = quizData.current_questions;
      } else if (quizData.questions) {
        questionsToDisplay = quizData.questions;
      }
      
      if (quizData.additional_question_list) {
        additionalQuestions = quizData.additional_question_list;
      }

      // Handle case where questions might be a JSON string
      if (typeof questionsToDisplay === 'string') {
        try {
          questionsToDisplay = JSON.parse(questionsToDisplay);
        } catch (parseError) {
          console.error('Failed to parse questions JSON:', parseError);
          questionsToDisplay = [];
        }
      }
      
      // Ensure we have an array
      if (!Array.isArray(questionsToDisplay)) {
        questionsToDisplay = [];
      }
      if (!Array.isArray(additionalQuestions)) {
        additionalQuestions = [];
      }
      
      console.log('Processed questions to display:', questionsToDisplay);
      
      // Process questions for display, ensuring all keys are preserved correctly.
      const processedQuestions = processQuestionList(questionsToDisplay);
      const processedAdditionalQuestions = processQuestionList(additionalQuestions);

      console.log('Final processed questions:', processedQuestions);
      console.log('Final additional questions:', processedAdditionalQuestions);

      const fullQuizData = {
        ...quizData,
        questions: processedQuestions,
      };
      setSelectedQuiz(fullQuizData);
      setInitialQuiz(JSON.parse(JSON.stringify(fullQuizData))); // Deep copy
      setAdditionalQuestionsPool(processedAdditionalQuestions);
      setBalanceQuestions(quizData.balance_questions || 0);

    } catch (error) {
      console.error('Failed to fetch quiz details:', error);
      showSnackbar('Failed to load quiz questions. Please try again.', 'error');
      setViewModalOpen(false);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleRegenerateQuestion = async (questionIndex) => {
    if (!selectedQuiz) return;
    if (isQuestionActionLoading) return;
    setIsQuestionActionLoading(true);

    if (!selectedQuiz.is_published && balanceQuestions <= 0) {
      showSnackbar('You have used all your regenerations for this quiz.', 'warning');
      setIsQuestionActionLoading(false);
      return;
    }

    const questionToReplace = selectedQuiz.questions[questionIndex];
    if (!questionToReplace) {
      showSnackbar('Could not find the question to regenerate.', 'error');
      setIsQuestionActionLoading(false);
      return;
    }
    const backendQuestionNumber = questionToReplace.question_number;

    if (regeneratedQuestions[backendQuestionNumber]) {
      showSnackbar('You can only regenerate each question once.', 'warning');
      setIsQuestionActionLoading(false);
      return;
    }

    try {
      await quizService.replaceQuestion(selectedQuiz.quiz_id, backendQuestionNumber);

      // Refresh the quiz data from backend after regeneration
      const refreshedQuizData = await quizService.getQuizDetails(selectedQuiz.quiz_id);
      
      // Handle different question data formats from backend
      let questionsToDisplay = [];
      let additionalQuestions = [];
      
      if (refreshedQuizData.current_questions) {
        questionsToDisplay = refreshedQuizData.current_questions;
      } else if (refreshedQuizData.questions) {
        questionsToDisplay = refreshedQuizData.questions;
      }
      
      if (refreshedQuizData.additional_question_list) {
        additionalQuestions = refreshedQuizData.additional_question_list;
      }

      // Handle case where questions might be a JSON string
      if (typeof questionsToDisplay === 'string') {
        try {
          questionsToDisplay = JSON.parse(questionsToDisplay);
        } catch (parseError) {
          console.error('Failed to parse questions JSON:', parseError);
          questionsToDisplay = [];
        }
      }
      
      // Ensure we have an array
      if (!Array.isArray(questionsToDisplay)) {
        questionsToDisplay = [];
      }
      if (!Array.isArray(additionalQuestions)) {
        additionalQuestions = [];
      }
      
      // Process questions and assign sequential question numbers (1, 2, 3, etc.)
      const processedQuestions = processQuestionList(questionsToDisplay);
      const processedAdditionalQuestions = processQuestionList(additionalQuestions);

      setSelectedQuiz(prev => ({
        ...refreshedQuizData,
        questions: processedQuestions
      }));
      setInitialQuiz(JSON.parse(JSON.stringify(processedQuestions))); // Deep copy
      setAdditionalQuestionsPool(processedAdditionalQuestions);
      setBalanceQuestions(refreshedQuizData.balance_questions || 0);
      setRegeneratedQuestions(prev => ({ ...prev, [backendQuestionNumber]: true }));
      showSnackbar('Question regenerated successfully!', 'success');
    } catch (error) {
      console.error('Failed to regenerate question:', error);
      showSnackbar(error.message || 'Failed to regenerate question', 'error');
    } finally {
      setIsQuestionActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionIndex) => {
    if (deletedQuestions >= 1) {
      if (!deleteAlertShown) {
        showSnackbar('You can only delete one question per quiz.', 'warning');
        setDeleteAlertShown(true);
      }
      return;
    }

    if (!selectedQuiz) return;
    if (isQuestionActionLoading) return;
    setIsQuestionActionLoading(true);

    // Always use the latest question_number from refreshed state
    const questionToDelete = selectedQuiz.questions[questionIndex];
    if (!questionToDelete) {
      showSnackbar('Could not find the question to delete.', 'error');
      setIsQuestionActionLoading(false);
      return;
    }
    const backendQuestionNumber = questionToDelete.question_number;

    try {
      // Make API call to replace-question endpoint for deletion
      await quizService.replaceQuestion(selectedQuiz.quiz_id, backendQuestionNumber);

      // Refresh the quiz data from backend after deletion
      const refreshedQuizData = await quizService.getQuizDetails(selectedQuiz.quiz_id);
      
      // Handle different question data formats from backend
      let questionsToDisplay = [];
      let additionalQuestions = [];
      
      if (refreshedQuizData.current_questions) {
        questionsToDisplay = refreshedQuizData.current_questions;
      } else if (refreshedQuizData.questions) {
        questionsToDisplay = refreshedQuizData.questions;
      }
      
      if (refreshedQuizData.additional_question_list) {
        additionalQuestions = refreshedQuizData.additional_question_list;
      }

      // Handle case where questions might be a JSON string
      if (typeof questionsToDisplay === 'string') {
        try {
          questionsToDisplay = JSON.parse(questionsToDisplay);
        } catch (parseError) {
          console.error('Failed to parse questions JSON:', parseError);
          questionsToDisplay = [];
        }
      }
      
      // Ensure we have an array
      if (!Array.isArray(questionsToDisplay)) {
        questionsToDisplay = [];
      }
      if (!Array.isArray(additionalQuestions)) {
        additionalQuestions = [];
      }
      
      // Process questions and assign sequential question numbers (1, 2, 3, etc.)
      const processedQuestions = processQuestionList(questionsToDisplay);
      const processedAdditionalQuestions = processQuestionList(additionalQuestions);

      setSelectedQuiz(prev => ({
        ...refreshedQuizData,
        questions: processedQuestions,
        no_of_questions: processedQuestions.length
      }));
      setInitialQuiz(JSON.parse(JSON.stringify(processedQuestions))); // Deep copy
      setAdditionalQuestionsPool(processedAdditionalQuestions);
      setBalanceQuestions(refreshedQuizData.balance_questions || 0);

      setDeletedQuestions(1); // Set to 1 and do NOT reset on quiz data refresh
      setShowAddPrompt(true); // Show add prompt dialog
      if (!deleteAlertShown) {
        showSnackbar('You can only delete one question per quiz.', 'warning');
        setDeleteAlertShown(true);
      }
      showSnackbar('Question deleted successfully!', 'success');
    } catch (error) {
      console.error('Failed to delete question:', error);
      showSnackbar(error.message || 'Failed to delete question', 'error');
    } finally {
      setIsQuestionActionLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setIsAddQuestionOpen(true);
  };

  const handleQuestionTypeSelect = (type) => {
    setNewQuestionType(type);
    if (type === 'mcq') {
      setNewQuestionData({
        question_text: '',
        options: [
          { id: 'A', option_text: '', is_correct: false },
          { id: 'B', option_text: '', is_correct: false },
          { id: 'C', option_text: '', is_correct: false },
          { id: 'D', option_text: '', is_correct: false }
        ],
        correct_answer: '',
        explanation: ''
      });
    } else {
      setNewQuestionData({
        question_text: '',
        options: [],
        correct_answer: '',
        explanation: ''
      });
    }
  };

  const handleNewQuestionChange = (field, value) => {
    setNewQuestionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewOptionChange = (optionIndex, field, value) => {
    setNewQuestionData(prev => ({
      ...prev,
      options: prev.options.map((opt, index) => 
        index === optionIndex ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const handleSaveNewQuestion = async () => {
    // Validate the new question
    if (!newQuestionData.question_text.trim()) {
      showSnackbar('Question text is required', 'error');
      return;
    }

    if (newQuestionType === 'mcq') {
      if (!newQuestionData.options.some(opt => opt.option_text.trim())) {
        showSnackbar('At least one option is required', 'error');
        return;
      }
      if (!newQuestionData.options.some(opt => opt.is_correct)) {
        showSnackbar('Please select the correct answer', 'error');
        return;
      }
    } else {
      if (!newQuestionData.correct_answer.trim()) {
        showSnackbar('Correct answer is required', 'error');
        return;
      }
    }

    // Prepare the new question (no question_number)
    const newQuestion = {
      type: newQuestionType,
      question: newQuestionData.question_text,
      explanation: newQuestionData.explanation || '',
      options: newQuestionType === 'mcq'
        ? {
            A: newQuestionData.options[0]?.option_text,
            B: newQuestionData.options[1]?.option_text,
            C: newQuestionData.options[2]?.option_text,
            D: newQuestionData.options[3]?.option_text,
          }
        : undefined,
      correct_answer: newQuestionType === 'mcq'
        ? newQuestionData.options.find(opt => opt.is_correct)?.id
        : newQuestionData.correct_answer,
    };

    // Build the payload as per backend requirements
    const isFinalQuestion = (selectedQuiz.questions.length + 1) === selectedQuiz.no_of_questions;
    const payload = {
      title: selectedQuiz.title,
      description: selectedQuiz.description,
      is_published: selectedQuiz.is_published,
      time_limit_minutes: selectedQuiz.time_limit_minutes,
      passing_score: selectedQuiz.passing_score,
      add_question: true, // Always true for every add
      questions: [
        // Existing questions (with question_number)
        ...selectedQuiz.questions.map(q => ({
          question_number: q.question_number,
          type: q.type,
          question: q.question,
          options: q.options,
          explanation: q.explanation,
          correct_answer: q.correct_answer,
        })),
        // New question (no question_number)
        newQuestion,
      ],
    };

    try {
      await quizApi.update(selectedQuiz.quiz_id, payload);
      showSnackbar('Question added and saved successfully!', 'success');
      // Reload the quiz view by fetching the latest quiz details
      const response = await fetch(`http://localhost:8000/api/quiz/${selectedQuiz.quiz_id}/`);
      if (response.ok) {
        const latestQuiz = await response.json();
        setSelectedQuiz({
          ...latestQuiz,
          questions: latestQuiz.current_questions || latestQuiz.questions || [],
        });
      }
      setShowAddPrompt(false); // Force close the add prompt after add
    } catch (error) {
      console.error('Failed to save added question:', error);
      showSnackbar('Question added but failed to save to database', 'error');
    }

    // Reset form
    setIsAddQuestionOpen(false);
    setNewQuestionType('');
    setNewQuestionData({
      question_text: '',
      options: [],
      correct_answer: '',
      explanation: ''
    });
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuiz(null);
    setAdditionalQuestionsPool([]);
    setBalanceQuestions(0);
    setIsEditMode(false);
    setInitialQuiz(null);
    // Removed deletedQuestions reset
    setIsAddQuestionOpen(false);
    setNewQuestionType('');
    setNewQuestionData({
      question_text: '',
      options: [],
      correct_answer: '',
      explanation: ''
    });
    setAddedQuestions(0); // Reset added questions counter
    setDeleteAlertShown(false); // Reset delete alert
    setRegeneratedQuestions({}); // Reset regenerate alerts
    setShowAddPrompt(false); // Reset add prompt
  };

  const handleQuizDetailChange = (field, value) => {
    setSelectedQuiz(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    setSelectedQuiz(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        [field]: value
      };
      return { ...prev, questions: newQuestions };
    });
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setSelectedQuiz(prev => {
      const newQuestions = [...prev.questions];
      const newOptions = [...newQuestions[questionIndex].options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        option_text: value
      };
      newQuestions[questionIndex].options = newOptions;
      return { ...prev, questions: newQuestions };
    });
  };

  const handleCancelEdit = () => {
    setSelectedQuiz(initialQuiz);
    setIsEditMode(false);
  };

  const handleSaveChanges = async () => {
    console.log('🔧 Save Changes clicked');
    console.log('🔧 selectedQuiz:', selectedQuiz);
    console.log('🔧 initialQuiz:', initialQuiz);
    
    if (!selectedQuiz || !initialQuiz) {
      console.log('❌ Missing quiz data');
      showSnackbar('Missing quiz data', 'error');
      return;
    }

    const quizDetailsChanged =
      selectedQuiz.title !== initialQuiz.title ||
      selectedQuiz.description !== initialQuiz.description ||
      selectedQuiz.time_limit_minutes !== initialQuiz.time_limit_minutes ||
      selectedQuiz.passing_score !== initialQuiz.passing_score ||
      selectedQuiz.is_published !== initialQuiz.is_published;

    const questionsChanged = JSON.stringify(selectedQuiz.questions) !== JSON.stringify(initialQuiz.questions);

    console.log('🔧 Quiz details changed:', quizDetailsChanged);
    console.log('🔧 Questions changed:', questionsChanged);

    if (!quizDetailsChanged && !questionsChanged) {
      console.log('ℹ️ No changes detected');
      showSnackbar('No changes were made.', 'info');
      setIsEditMode(false);
      return;
    }

    const timeLimit = parseInt(selectedQuiz.time_limit_minutes, 10);
    const passingScore = parseInt(selectedQuiz.passing_score, 10);

    const payload = {
      title: selectedQuiz.title,
      description: selectedQuiz.description,
      is_published: selectedQuiz.is_published,
      time_limit_minutes: isNaN(timeLimit) ? null : timeLimit,
      passing_score: isNaN(passingScore) ? null : passingScore,
      questions: selectedQuiz.questions.map(q => {
        const optionsObject = (q.type === 'mcq' && Array.isArray(q.options))
          ? q.options.reduce((acc, opt) => {
            acc[opt.id] = opt.option_text;
            return acc;
          }, {})
          : {};

        return {
          question_number: q.question_number,
          options: optionsObject,
          explanation: q.explanation || ''
        };
      })
    };

    console.log('🚀 API Payload:', payload);
    console.log('🚀 Quiz ID:', selectedQuiz.quiz_id);

    try {
      console.log('📡 Making API call...');
      const response = await quizApi.update(selectedQuiz.quiz_id, payload);
      console.log('✅ API Success:', response);
      showSnackbar('Quiz updated successfully!', 'success');
      setIsEditMode(false);
      fetchQuizzes();
      closeViewModal();
    } catch (error) {
      console.error('❌ API Error:', error);
      console.error('❌ Error response:', error.response);
      showSnackbar(error.response?.data?.error || 'Failed to update quiz.', 'error');
    }
  };

  const getStatusChip = (isPublished) => {
    const status = isPublished ? 'Published' : 'Draft';
    const color = isPublished ? 'success' : 'warning';
    return <Chip label={status} color={color} size="small" sx={{ fontWeight: 'medium' }} />;
  };

  const renderQuizCard = (quiz, index) => {
    // Helper function to display page ranges from backend data only
    const getPageRanges = (quiz) => {
      if (quiz.pages && Array.isArray(quiz.pages) && quiz.pages.length > 0) {
        return quiz.pages.map(p => {
          if (typeof p === 'object' && p.filename) {
            return `${p.filename} (${p.page_range || 'All'})`;
          }
          return 'Invalid page format';
        }).join('; ');
      }
      return 'Not applicable';
    };

    // Get department name from multiple possible sources
    const getDepartmentName = (quiz) => {
      if (quiz.department_name) {
        return quiz.department_name;
      } else if (quiz.department && typeof quiz.department === 'object' && quiz.department.name) {
        return quiz.department.name;
      } else if (departments.length > 0 && quiz.department_id) {
        const dept = departments.find(d => d.id === quiz.department_id);
        return dept ? dept.name : 'Not assigned';
      }
      return 'Not assigned';
    };
    
    // Get passing score from backend data only
    const getPassingScore = (quiz) => {
      // Use only the backend passing_score field - no fallbacks to mock data
      if (quiz.passing_score !== undefined && quiz.passing_score !== null) {
        return `${quiz.passing_score}%`;
      }
      
      // Return empty or indicate not set instead of mock data
      return 'Not set';
    };

    const hasQuestions = quiz.no_of_questions > 0;

    return (
      <Grid item xs={12} sm={6} md={4} key={quiz.quiz_id}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          style={{ height: '100%' }}
        >
          <QuizStyledCard className="glass-effect">
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', flexGrow: 1, mr: 1 }}>
                  {quiz.title}
                </Typography>
                {getStatusChip(quiz.is_published)}
              </Box>
              <Typography variant="body2" sx={{ color: '#18181B', mb: 2, minHeight: '40px' }}>
                {quiz.description || 'No description available.'}
              </Typography>
              
              <Grid container spacing={1} sx={{ color: 'text.secondary', mb: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption">{quiz.no_of_questions || 0} Questions</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">{quiz.time_limit_minutes || 'N/A'} min limit</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">
                    Dept: {getDepartmentName(quiz)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">
                    Difficulty: {typeof quiz.quiz_type === 'object' ? 'Mixed' : (quiz.quiz_type || 'Normal')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">
                    Type: {quiz.question_type || 'Mixed'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="caption">
                        Pass Score: {getPassingScore(quiz)}
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Pages: {getPageRanges(quiz)}
                  </Typography>
                </Grid>
              </Grid>

            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Box>
                <IconButton size="small" onClick={() => handleViewQuiz(quiz.quiz_id)}><VisibilityIcon /></IconButton>
                <IconButton size="small" onClick={() => handleDelete(quiz.quiz_id)}><DeleteIcon /></IconButton>
                {quiz.is_published && (
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    size="small"
                    onClick={() => {
                      const shareUrl = quiz.share_url || quiz.url_link || `${window.location.origin}/quiz/${quiz.quiz_id}/join/`;
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        showSnackbar('Quiz link copied to clipboard!', 'success');
                      }).catch(() => {
                        showSnackbar('Failed to copy link', 'error');
                      });
                    }}>
                    Copy Link
                  </Button>
                )}
              </Box>
            </CardActions>
          </QuizStyledCard>
        </motion.div>
      </Grid>
    );
  };

  const publishedQuizzes = quizzes.filter(q => q.is_published);
  const draftQuizzes = quizzes.filter(q => !q.is_published);

  return (
    <FullLayout>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        {isCreating ? (
          <QuizFormModern 
            onSave={{ 
              createQuiz: quizService.createQuiz, 
              uploadFile: quizService.uploadFileForQuiz 
            }} 
            className="glass-effect" 
            onCancel={handleCancelCreate} 
            departments={departments} 
          />
        ) : (
          <>
            <PageHeader
              title="Quiz Management"
              subtitle="Create, edit, and manage all quizzes for the platform."
              actions={[
                <Button
                  key="create-quiz"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                >
                  Create New Quiz
                </Button>,
              ]}
            />

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ mt: 4, p: 3, bgcolor: 'error.main', color: 'error.contrastText', borderRadius: 1 }}>
                <Typography>{error}</Typography>
              </Box>
            ) : quizzes.length === 0 ? (
              <Box sx={{ 
                mt: 4, 
                p: 4, 
                textAlign: 'center',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1
              }}>
                <Typography variant="h6" gutterBottom>No Quizzes Found</Typography>
                <Typography color="text.secondary">
                  Get started by creating your first quiz using the button above.
                </Typography>
              </Box>
            ) : (
              <>
                <Paper sx={{ mb: 3, mt: 3 }}>
                  <Tabs 
                    value={activeTab} 
                    onChange={(e, newValue) => setActiveTab(newValue)} 
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab value="all" label={`All Quizzes (${quizzes.length})`} />
                    <Tab value="published" label={`Published (${publishedQuizzes.length})`} />
                    <Tab value="draft" label={`Drafts (${draftQuizzes.length})`} />
                  </Tabs>
                </Paper>

                <Grid container spacing={3}>
                  {(activeTab === 'all' ? quizzes :
                    activeTab === 'published' ? publishedQuizzes :
                    draftQuizzes
                  ).map((quiz, index) => renderQuizCard(quiz, index))}
                </Grid>
              </>
            )}
          </>
        )}

        <ConfirmationDialog
          open={isConfirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete this quiz? This action cannot be undone."
        />

        <Dialog
          open={isViewModalOpen}
          onClose={(event, reason) => {
            if (
              selectedQuiz &&
              selectedQuiz.questions &&
              selectedQuiz.no_of_questions &&
              selectedQuiz.questions.length < selectedQuiz.no_of_questions
            ) {
              showSnackbar('You must add a question before leaving this screen.', 'warning');
              return;
            }
            closeViewModal();
          }}
          disableEscapeKeyDown={selectedQuiz && selectedQuiz.questions && selectedQuiz.no_of_questions && selectedQuiz.questions.length < selectedQuiz.no_of_questions}
          fullWidth
          maxWidth="md"
          scroll="paper"
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #44a08d 0%, #093637 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {isEditMode ? (
              <TextField
                value={selectedQuiz?.title || ''}
                onChange={(e) => handleQuizDetailChange('title', e.target.value)}
                variant="standard"
                sx={{
                  '.MuiInput-input': {
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  },
                }}
              />
            ) : (
              selectedQuiz?.title
            )}
            {!isEditMode && (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setIsEditMode(true)}
                variant="contained"
                color="secondary"
                size="small"
              >
                Edit
              </Button>
            )}
          </DialogTitle>
          <DialogContent dividers>
            {isQuestionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedQuiz ? (
              <>
                {isEditMode && (
                  <Box sx={{ p: 2 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Quiz Title"
                          value={selectedQuiz.title}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, title: e.target.value })}
                          fullWidth
                          variant="outlined"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={selectedQuiz.is_published}
                              onChange={(e) => setSelectedQuiz({ ...selectedQuiz, is_published: e.target.checked })}
                              name="is_published"
                              color="primary"
                            />
                          }
                          label="Published"
                          sx={{ mt: 2 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Description"
                          value={selectedQuiz.description}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, description: e.target.value })}
                          fullWidth
                          multiline
                          rows={3}
                          variant="outlined"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Time Limit (minutes)"
                          type="number"
                          value={selectedQuiz.time_limit_minutes}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, time_limit_minutes: e.target.value })}
                          fullWidth
                          variant="outlined"
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Passing Score"
                          type="number"
                          value={selectedQuiz.passing_score}
                          onChange={(e) => setSelectedQuiz({ ...selectedQuiz, passing_score: e.target.value })}
                          fullWidth
                          variant="outlined"
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 3 }} />
                  </Box>
                )}
                {!selectedQuiz.is_published && !isEditMode && (
                  <Box sx={{ p: 2, mb: 2, backgroundColor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                    <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 'medium' }}>
                      Note: You can regenerate up to 5 questions for this quiz. This will use a question from the additional questions pool. 
                      You have {balanceQuestions} regenerations remaining.
                    </Typography>
                  </Box>
                )}
                <List>
                  {selectedQuiz.questions?.map((question, index) => {
                    const canRegenerate = balanceQuestions > 0 && additionalQuestionsPool.length > 0 && !regeneratedQuestions[question.question_number];
                    // Only allow delete if the quiz is full (no_of_questions reached)
                    const canDelete = selectedQuiz.questions.length === selectedQuiz.no_of_questions;
                    
                    let tooltipTitle = '';
                    if (canRegenerate) {
                      tooltipTitle = 'Regenerate this question';
                    } else if (canDelete) {
                      tooltipTitle = 'Delete this question (1 deletion allowed)';
                    } else if (balanceQuestions === 0) {
                      tooltipTitle = deletedQuestions >= 1 ? 'Already deleted one question' : 'No more regenerations available';
                    } else {
                      tooltipTitle = 'No additional questions in the pool';
                    }

                    return (
                      <Paper key={index} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            Question {index + 1}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label={question.type?.toUpperCase()} size="small" />
                            {!selectedQuiz.is_published && (canRegenerate || (deletedQuestions < 1)) && (
                              <Tooltip title={tooltipTitle}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => canRegenerate ? handleRegenerateQuestion(index) : handleDeleteQuestion(index)}
                                    disabled={isQuestionActionLoading}
                                  >
                                    {canRegenerate ? <ReplayIcon /> : <DeleteIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                        <Typography variant="body1" sx={{ mt: 1 }}>{question.question_text}</Typography>
                        
                        {question.type === 'mcq' && Array.isArray(question.options) && (
                          <List dense sx={{ pl: 2, mt: 1 }}>
                            {question.options.map((option, optIndex) => {
                              if (!option) return null;

                              if (isEditMode) {
                                return (
                                  <TextField
                                    key={optIndex}
                                    fullWidth
                                    variant="outlined"
                                    label={`Option ${String.fromCharCode(65 + optIndex)}`}
                                    value={option.option_text || ''}
                                    onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                    sx={{ mb: 1 }}
                                  />
                                );
                              }
                              return (
                                <ListItem key={optIndex} disablePadding sx={{ color: option.is_correct ? 'success.main' : 'text.primary' }}>
                                  <ListItemIcon sx={{ minWidth: 'auto', mr: 1, color: 'inherit' }}>
                                    {option.is_correct && <CheckCircleIcon fontSize="small" />}
                                  </ListItemIcon>
                                  <ListItemText primary={`${String.fromCharCode(65 + optIndex)}. ${option.option_text}`} />
                                </ListItem>
                              );
                            })}
                          </List>
                        )}

                        {(question.type === 'fill' || question.type === 'oneline' || question.type === 'truefalse') && (
                          <Box sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 'medium' }}>
                              Correct Answer: {question.correct_answer}
                            </Typography>
                          </Box>
                        )}

                        {question.type === 'match' && (
                          <Box sx={{ mt: 2 }}>
                            <MatchTheFollowingPreview question={question} />
                          </Box>
                        )}
                        {question.explanation && (
                          <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.info.light, 0.1), borderRadius: 1 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1, fontWeight: 'bold' }}>Explanation:</Typography>
                            {isEditMode ? (
                              <TextField
                                fullWidth
                                multiline
                                variant="outlined"
                                value={question.explanation || ''}
                                onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: alpha(theme.palette.background.paper, 0.5),
                                  },
                                }}
                              />
                            ) : (
                              <Typography variant="body2">{question.explanation || 'No explanation provided.'}</Typography>
                            )}
                          </Box>
                        )}
                        {question.source_page && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
                            Source: Page {question.source_page}
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </List>
                
                {/* Add Question Button */}
                {!selectedQuiz.is_published && selectedQuiz.questions?.length < selectedQuiz.no_of_questions && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddQuestion}
                      sx={{ borderRadius: 2 }}
                    >
                      Add Question
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Typography>No quiz details available.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            {isEditMode ? (
              <>
                <Button onClick={handleCancelEdit}>Cancel</Button>
                <Button onClick={handleSaveChanges} variant="contained">Save Changes</Button>
              </>
            ) : (
              <>
                <Button onClick={closeViewModal} disabled={selectedQuiz && selectedQuiz.questions && selectedQuiz.no_of_questions && selectedQuiz.questions.length < selectedQuiz.no_of_questions}>
                  Close
                </Button>
                {selectedQuiz && !selectedQuiz.is_published && (
                  <Button
                    onClick={() => handlePublishClick(selectedQuiz.quiz_id)}
                    variant="contained"
                    disabled={
                      !selectedQuiz.questions ||
                      selectedQuiz.questions.length !== selectedQuiz.no_of_questions ||
                      !areAllQuestionsValid(selectedQuiz.questions) ||
                      isPublishing
                    }
                  >
                    {isPublishing ? <CircularProgress size={24} color="inherit" /> : 'Proceed to PUBLISH'}
                  </Button>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Add Question Dialog */}
        <Dialog open={isAddQuestionOpen} onClose={() => setIsAddQuestionOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Add New Question</DialogTitle>
          <DialogContent>
            {!newQuestionType ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Select Question Type</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleQuestionTypeSelect('mcq')}
                      sx={{ p: 2, textAlign: 'left' }}
                    >
                      <Box>
                        <Typography variant="subtitle1">Multiple Choice</Typography>
                        <Typography variant="body2" color="text.secondary">Question with 4 options</Typography>
                      </Box>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleQuestionTypeSelect('fill')}
                      sx={{ p: 2, textAlign: 'left' }}
                    >
                      <Box>
                        <Typography variant="subtitle1">Fill in the Blank</Typography>
                        <Typography variant="body2" color="text.secondary">Question with blank spaces</Typography>
                      </Box>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleQuestionTypeSelect('oneline')}
                      sx={{ p: 2, textAlign: 'left' }}
                    >
                      <Box>
                        <Typography variant="subtitle1">One Line Answer</Typography>
                        <Typography variant="body2" color="text.secondary">Short answer question</Typography>
                      </Box>
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => handleQuestionTypeSelect('truefalse')}
                      sx={{ p: 2, textAlign: 'left' }}
                    >
                      <Box>
                        <Typography variant="subtitle1">True/False</Typography>
                        <Typography variant="body2" color="text.secondary">True or False question</Typography>
                      </Box>
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Add {newQuestionType.toUpperCase()} Question
                </Typography>
                
                <TextField
                  fullWidth
                  label="Question Text"
                  multiline
                  rows={3}
                  value={newQuestionData.question_text}
                  onChange={(e) => handleNewQuestionChange('question_text', e.target.value)}
                  sx={{ mb: 3 }}
                />

                {newQuestionType === 'mcq' && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>Options</Typography>
                    {newQuestionData.options.map((option, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Radio
                          checked={option.is_correct}
                          onChange={() => {
                            setNewQuestionData(prev => ({
                              ...prev,
                              options: prev.options.map((opt, i) => ({
                                ...opt,
                                is_correct: i === index
                              }))
                            }));
                          }}
                          size="small"
                        />
                        <TextField
                          fullWidth
                          label={`Option ${option.id}`}
                          value={option.option_text}
                          onChange={(e) => handleNewOptionChange(index, 'option_text', e.target.value)}
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}

                {newQuestionType === 'truefalse' && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>Correct Answer</Typography>
                    <RadioGroup
                      value={newQuestionData.correct_answer}
                      onChange={(e) => handleNewQuestionChange('correct_answer', e.target.value)}
                    >
                      <FormControlLabel value="True" control={<Radio />} label="True" />
                      <FormControlLabel value="False" control={<Radio />} label="False" />
                    </RadioGroup>
                  </Box>
                )}

                {(newQuestionType === 'fill' || newQuestionType === 'oneline') && (
                  <TextField
                    fullWidth
                    label="Correct Answer"
                    value={newQuestionData.correct_answer}
                    onChange={(e) => handleNewQuestionChange('correct_answer', e.target.value)}
                    sx={{ mb: 3 }}
                  />
                )}

                <TextField
                  fullWidth
                  label="Explanation (Optional)"
                  multiline
                  rows={2}
                  value={newQuestionData.explanation}
                  onChange={(e) => handleNewQuestionChange('explanation', e.target.value)}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddQuestionOpen(false)}>Cancel</Button>
            {newQuestionType && (
              <Button onClick={handleSaveNewQuestion} variant="contained">
                Save Question
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {showAddPrompt && (
          <Dialog
            open={showAddPrompt}
            onClose={() => {}} // No-op: disables outside click and escape
            disableEscapeKeyDown
            // For MUI v5+, disableBackdropClick is not available, so onClose no-op is enough
          >
            <DialogTitle>Add a Question</DialogTitle>
            <DialogContent>
              <Typography>
                You must add a question before publishing. Click "Add Question" to continue.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowAddPrompt(false);
                  setIsAddQuestionOpen(true);
                }}
              >
                Add Question
              </Button>
            </DialogActions>
          </Dialog>
        )}

      </Container>
    </FullLayout>
  );
};

// Helper function to validate questions before publishing
const areAllQuestionsValid = (questions) => {
  if (!questions || questions.length === 0) {
    return false;
  }

  return questions.every(q => {
    if (!q) return false;
    // Default to 'mcq' if type is missing, consistent with rendering logic
    const type = q.type || 'mcq';

    switch (type) {
      case 'mcq':
        if (!q.options) return false;
        if (Array.isArray(q.options)) {
          // At least one option must be marked as correct
          return q.options.some(opt => opt && opt.is_correct);
        } else if (typeof q.options === 'object' && q.options !== null) {
          // A correct_answer must exist and correspond to a key in the options object
          if (!q.correct_answer) return false;
          const correctKey = String(q.correct_answer).split(':')[0].trim();
          return Object.prototype.hasOwnProperty.call(q.options, correctKey);
        }
        return false; // Return false if options are not in a supported format
      
      case 'fill':
      case 'oneline':
        // The correct_answer must be a non-empty string
        return typeof q.correct_answer === 'string' && q.correct_answer.trim() !== '';
        
      case 'truefalse':
        // The correct_answer must be either "True" or "False"
        return q.correct_answer === 'True' || q.correct_answer === 'False';
        
      default:
        // Any other question type is considered invalid for now
        return false;
    }
  });
};

export default QuizSection;