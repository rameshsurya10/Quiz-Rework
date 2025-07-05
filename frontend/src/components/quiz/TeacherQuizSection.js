import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, 
  IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, 
  ListItemText, ListItemIcon, Checkbox, Divider, Stack, Avatar, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import DraftIcon from '@mui/icons-material/Drafts';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import QuizFormModern from './QuizFormModern';
import { ConfirmationDialog } from '../../common';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { quizApi, departmentApi } from '../../services/api';
import { quizService } from '../../services/quizService';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '20px',
  background: alpha(theme.palette.background.paper, 0.9),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}`,
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
}));

const TeacherQuizSection = () => {
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
  const [regenerationsUsed, setRegenerationsUsed] = useState(0);
  const [balanceQuestions, setBalanceQuestions] = useState(0);
  const [additionalQuestionsPool, setAdditionalQuestionsPool] = useState([]);

  const processQuestionList = (list) =>
    list.filter(Boolean).map((q, index) => {
      const processed = { ...q };
      processed.question_text = q.question || q.question_text || 'No question text';
      processed.type = q.question_type || q.type || 'mcq';
      processed.question_number = q.question_number || (index + 1);
      if (processed.type === 'mcq' && q.options) {
        if (Array.isArray(q.options)) {
          processed.options = q.options.map((opt, optIndex) =>
            (typeof opt === 'object' && opt.option_text) ? opt : { option_text: String(opt), is_correct: false, id: String.fromCharCode(65 + optIndex) }
          );
        } else if (typeof q.options === 'object' && q.options !== null) {
          const correctKey = q.correct_answer?.toString().split(':')[0].trim();
          processed.options = Object.entries(q.options).map(([key, value]) => ({
            option_text: String(value),
            is_correct: key === correctKey,
            id: key
          }));
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
      console.log('[Teacher Quiz] Fetching teacher-specific quizzes...');
      const quizzesData = await quizService.getUserquiz(activeTab);
      console.log('[Teacher Quiz] Teacher-specific quizzes loaded:', {
        total: quizzesData.length,
        tab: activeTab,
        quizzes: quizzesData.map(q => ({ id: q.quiz_id, title: q.title, department: q.department_name }))
      });
      
      if (!Array.isArray(quizzesData)) {
        console.error('Invalid quiz data format:', quizzesData);
        throw new Error('Invalid response format from server');
      }
      
      setQuizzes(quizzesData);
    } catch (error) {
      console.error('[Teacher Quiz] Error fetching teacher-specific quizzes:', error);
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
          await fetchDepartments();
          await fetchQuizzes();
        } catch (error) {
          console.error("Error loading data:", error);
          setError("Failed to load data");
        }
      }
    };
    
    loadData();
  }, [isCreating, fetchDepartments, fetchQuizzes]);

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
      
      if (!formData.title || !formData.quiz_type) {
        showSnackbar('Missing required fields', 'error');
        setIsCreating(false);
        return;
      }
      
      const result = await quizService.createQuizWithFiles(formData, onUploadProgress);
      
      fetchQuizzes();
      setIsCreating(false);
      
      showSnackbar('Quiz created successfully!', 'success');
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      setIsCreating(false);
      
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

  const handlePublishClick = async (quizId) => {
    try {
      await quizApi.patch(quizId, { is_published: true });
      await fetchQuizzes();
      showSnackbar('Quiz published successfully!', 'success');
    } catch (error) {
      console.error('Failed to publish quiz:', error);
      showSnackbar('Failed to publish quiz', 'error');
    }
  };

  const handleViewQuiz = async (quizId) => {
    try {
      setQuestionsLoading(true);
      setViewModalOpen(true);
      
      const quizDetails = await quizService.getQuizDetails(quizId);
      
      if (!quizDetails) {
        throw new Error('Quiz not found');
      }
      
      let questions = quizDetails.current_questions || quizDetails.questions || [];
      let additionalQuestions = quizDetails.additional_question_list || [];

      const parseJsonIfString = (jsonString) => {
        if (typeof jsonString === 'string') {
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.error('Failed to parse JSON string:', e);
            return [];
          }
        }
        return Array.isArray(jsonString) ? jsonString : [];
      };

      questions = parseJsonIfString(questions);
      additionalQuestions = parseJsonIfString(additionalQuestions);

      const processedQuestions = processQuestionList(questions).map((question, index) => ({
        ...question,
        question_number: index + 1
      }));
      const processedAdditionalQuestions = processQuestionList(additionalQuestions);
      
      setSelectedQuiz({
        ...quizDetails,
        questions: processedQuestions
      });
      setAdditionalQuestionsPool(processedAdditionalQuestions);
      setBalanceQuestions(quizDetails.balance_questions || 0);
    } catch (error) {
      console.error('Failed to load quiz questions:', error);
      showSnackbar('Failed to load quiz questions', 'error');
      setViewModalOpen(false);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleRegenerateQuestion = async (questionIndex) => {
    if (!selectedQuiz) return;

    if (!selectedQuiz.is_published && regenerationsUsed >= balanceQuestions) {
      showSnackbar('You have used all your regenerations for this quiz.', 'warning');
      return;
    }

    const questionToReplace = selectedQuiz.questions[questionIndex];
    if (!questionToReplace) {
      showSnackbar('Could not find the question to regenerate.', 'error');
      return;
    }
    const originalQuestionNumber = questionToReplace.question_number;

    try {
      await quizService.replaceQuestion(selectedQuiz.quiz_id, originalQuestionNumber);
      
      // Refresh the quiz data from backend after regeneration
      const refreshedQuizData = await quizService.getQuizDetails(selectedQuiz.quiz_id);
      
      if (!refreshedQuizData) {
        throw new Error('Quiz not found');
      }
      
      let questions = refreshedQuizData.current_questions || refreshedQuizData.questions || [];
      let additionalQuestions = refreshedQuizData.additional_question_list || [];

      const parseJsonIfString = (jsonString) => {
        if (typeof jsonString === 'string') {
          try {
            return JSON.parse(jsonString);
          } catch (e) {
            console.error('Failed to parse JSON string:', e);
            return [];
          }
        }
        return Array.isArray(jsonString) ? jsonString : [];
      };

      questions = parseJsonIfString(questions);
      additionalQuestions = parseJsonIfString(additionalQuestions);

      // Process questions and assign sequential question numbers (1, 2, 3, etc.)
      const processedQuestions = processQuestionList(questions).map((question, index) => ({
        ...question,
        question_number: index + 1
      }));
      const processedAdditionalQuestions = processQuestionList(additionalQuestions);
      
      setSelectedQuiz({
        ...refreshedQuizData,
        questions: processedQuestions
      });
      setAdditionalQuestionsPool(processedAdditionalQuestions);
      setBalanceQuestions(refreshedQuizData.balance_questions || 0);

      showSnackbar('Question regenerated successfully!', 'success');

      if (!selectedQuiz.is_published) {
        setRegenerationsUsed(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to regenerate question:', error);
      showSnackbar(error.message || 'Failed to regenerate question', 'error');
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuiz(null);
    setRegenerationsUsed(0);
    setAdditionalQuestionsPool([]);
    setBalanceQuestions(0);
  };

  const getStatusChip = (isPublished) => {
    return isPublished ? (
      <Chip 
        icon={<PublishIcon />} 
        label="Published" 
        color="success" 
        size="small" 
        sx={{ fontWeight: 600 }}
      />
    ) : (
      <Chip 
        icon={<DraftIcon />} 
        label="Draft" 
        color="warning" 
        size="small" 
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const renderQuizCard = (quiz, index) => {
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

    const getDepartmentName = (quiz) => {
      if (quiz.department_name) return quiz.department_name;
      if (quiz.department_id && departments.length > 0) {
        const dept = departments.find(d => d.department_id === quiz.department_id);
        return dept ? dept.name : 'Unknown';
      }
      return 'General';
    };

    const getPassingScore = (quiz) => {
      // Use only the backend passing_score field - no fallbacks to mock data
      if (quiz.passing_score !== undefined && quiz.passing_score !== null) {
        return `${quiz.passing_score}%`;
      }
      return 'Not set';
    };

    return (
      <Grid item xs={12} sm={6} lg={4} key={quiz.quiz_id}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -5 }}
        >
          <StyledCard>
            <CardContent sx={{ flexGrow: 1, p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: quiz.is_published ? 'success.main' : 'warning.main',
                    width: 48,
                    height: 48
                  }}
                >
                  <QuizIcon />
                </Avatar>
                {getStatusChip(quiz.is_published)}
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.main', minHeight: '56px' }}>
                {quiz.title}
              </Typography>

              <Grid container spacing={1} sx={{ color: 'text.secondary', mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption">{quiz.no_of_questions || 0} Questions</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">{quiz.time_limit_minutes || 'N/A'} min limit</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Dept: {getDepartmentName(quiz)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Difficulty: {
                    (quiz.quiz_type && typeof quiz.quiz_type === 'object')
                      ? Object.entries(quiz.quiz_type)
                          .filter(([, value]) => value) // Filter out empty values
                          .map(([key, value]) => `${value} ${key}`)
                          .join(', ') || 'Not set'
                      : (quiz.quiz_type || 'Normal')
                  }</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Type: {quiz.question_type || 'Mixed'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption">Pass Score: {getPassingScore(quiz)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Pages: {getPageRanges(quiz)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption">Created: {new Date(quiz.quiz_date).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </CardContent>

            <Divider />
            
            <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleViewQuiz(quiz.quiz_id)}
                  sx={{ color: 'primary.main' }}
                >
                  <VisibilityIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => handleDelete(quiz.quiz_id)}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              {!quiz.is_published && quiz.no_of_questions > 0 ? (
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<PublishIcon />}
                  onClick={() => handlePublishClick(quiz.quiz_id)}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Publish
                </Button>
              ) : quiz.is_published ? (
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    const shareUrl = quiz.share_url || quiz.url_link || `${window.location.origin}/quiz/${quiz.quiz_id}/join/`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      showSnackbar('Quiz link copied to clipboard!', 'success');
                    }).catch(() => {
                      showSnackbar('Failed to copy link', 'error');
                    });
                  }}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'success.main',
                    borderColor: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.50',
                      borderColor: 'success.main'
                    }
                  }}
                >
                  Copy Link
                </Button>
              ) : null}
            </CardActions>
          </StyledCard>
        </motion.div>
      </Grid>
    );
  };

  const publishedQuizzes = quizzes.filter(q => q.is_published);
  const draftQuizzes = quizzes.filter(q => !q.is_published);

  if (isCreating) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <QuizFormModern 
          onSave={{ 
            createQuiz: quizService.createQuiz, 
            uploadFile: quizService.uploadFileForQuiz 
          }} 
          onCancel={handleCancelCreate} 
          departments={departments} 
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Quiz Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.5,
              background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(78, 205, 196, 0.3)',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(78, 205, 196, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Create New Quiz
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Create, manage, and publish quizzes for your students
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            fontStyle: 'italic',
            background: alpha(theme.palette.info.main, 0.1),
            p: 1,
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}
        >
          🔒 Showing only quizzes you created or from your assigned departments
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 64,
            },
          }}
        >
          <Tab label={`All Quizzes (${quizzes.length})`} value="all" />
          <Tab label={`Published (${publishedQuizzes.length})`} value="published" />
          <Tab label={`Drafts (${draftQuizzes.length})`} value="draft" />
        </Tabs>
      </Paper>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="error" variant="h6">{error}</Typography>
        </Paper>
      ) : (
        <AnimatePresence mode="wait">
          {quizzes.length > 0 ? (
            <Grid container spacing={3}>
              {(activeTab === 'all' ? quizzes : 
                activeTab === 'published' ? publishedQuizzes : draftQuizzes)
                .map((quiz, index) => renderQuizCard(quiz, index))}
            </Grid>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <QuizIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  No Quizzes Yet
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Create your first quiz to get started with engaging your students
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                  size="large"
                  sx={{
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Create Your First Quiz
                </Button>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={isConfirmDialogOpen}
        title="Delete Quiz"
        message="Are you sure you want to delete this quiz? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialogOpen(false)}
      />

      {/* View Quiz Questions Modal */}
      <Dialog
        open={isViewModalOpen}
        onClose={closeViewModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
          color: 'white',
          fontWeight: 700
        }}>
          {selectedQuiz?.title} - Questions Preview
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {isQuestionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedQuiz?.questions?.length > 0 ? (
            <Box sx={{ p: 2 }}>
              {!selectedQuiz.is_published && (
                <Box sx={{ p: 2, mb: 2, backgroundColor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                  <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 'medium' }}>
                    Note: You can regenerate up to {balanceQuestions} questions for this quiz. This will use a question from the additional questions pool. 
                    You have {balanceQuestions - regenerationsUsed} regenerations remaining.
                  </Typography>
                </Box>
              )}
              {selectedQuiz.questions.map((question, index) => {
                const canRegenerate = regenerationsUsed < balanceQuestions && additionalQuestionsPool.length > 0;
                const tooltipTitle = canRegenerate 
                  ? 'Regenerate this question' 
                  : regenerationsUsed >= balanceQuestions
                    ? 'No more regenerations available.'
                    : 'No additional questions in the pool.';

                return (
                <Box key={question.question_number || index} sx={{ mb: 4, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: 'background.paper' }}>
                  {/* Question Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                        Question {question.question_number || (index + 1)}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', lineHeight: 1.6 }}>
                        {question.question_text || question.question || 'No question text'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip 
                        label={question.type?.toUpperCase() || 'UNKNOWN'} 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                      />
                      {!selectedQuiz.is_published && (
                        <Tooltip title={tooltipTitle}>
                          <span>
                            <IconButton 
                              size="small"
                              aria-label="replace" 
                              onClick={() => handleRegenerateQuestion(index)}
                              disabled={!canRegenerate}
                            >
                              <ReplayIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  
                  {/* Question Type Specific Content */}
                  {question.type === 'mcq' && question.options && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                        Options:
                      </Typography>
                      <Box sx={{ pl: 2 }}>
                        {typeof question.options === 'object' && !Array.isArray(question.options) ? (
                          // Handle object format options
                          Object.entries(question.options).map(([key, text]) => {
                            const isCorrect = question.correct_answer?.toString().split(':')[0].trim() === key;
                            return (
                              <Box 
                                key={key} 
                                sx={{ 
                                  p: 1, 
                                  mb: 1, 
                                  borderRadius: 1,
                                  backgroundColor: isCorrect ? 'success.50' : 'grey.50',
                                  border: isCorrect ? '2px solid' : '1px solid',
                                  borderColor: isCorrect ? 'success.main' : 'grey.300'
                                }}
                              >
                                <Typography sx={{ color: isCorrect ? 'success.dark' : 'text.primary', fontWeight: isCorrect ? 'bold' : 'normal' }}>
                                  {isCorrect && '✓ '}{key}: {String(text)}
                                </Typography>
                              </Box>
                            );
                          })
                        ) : Array.isArray(question.options) ? (
                          // Handle array format options
                          question.options.map((option, optIndex) => {
                            const isCorrect = option.is_correct || false;
                            return (
                              <Box 
                                key={optIndex} 
                                sx={{ 
                                  p: 1, 
                                  mb: 1, 
                                  borderRadius: 1,
                                  backgroundColor: isCorrect ? 'success.50' : 'grey.50',
                                  border: isCorrect ? '2px solid' : '1px solid',
                                  borderColor: isCorrect ? 'success.main' : 'grey.300'
                                }}
                              >
                                <Typography sx={{ color: isCorrect ? 'success.dark' : 'text.primary', fontWeight: isCorrect ? 'bold' : 'normal' }}>
                                  {isCorrect && '✓ '}{option.id || String.fromCharCode(65 + optIndex)}: {String(option.option_text || option)}
                                </Typography>
                              </Box>
                            );
                          })
                        ) : (
                          <Typography color="text.secondary">No options available</Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Correct Answer for Fill-ups, One Line, True/False */}
                  {(question.type === 'fill' || question.type === 'oneline' || question.type === 'truefalse') && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                        Correct Answer:
                      </Typography>
                      <Box sx={{ p: 2, backgroundColor: 'success.50', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                        <Typography sx={{ color: 'success.dark', fontWeight: 'bold' }}>
                          {String(question.correct_answer || 'No answer provided')}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Explanation */}
                  {question.explanation && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.secondary' }}>
                        Explanation:
                      </Typography>
                      <Box sx={{ p: 2, backgroundColor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
                        <Typography variant="body2" sx={{ color: 'info.dark' }}>
                          {question.explanation}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Source Page */}
                  {question.source_page && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        Source: Page {question.source_page}
                      </Typography>
                    </Box>
                  )}
                </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>No questions found for this quiz.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeViewModal} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          {selectedQuiz && !selectedQuiz.is_published && (
            <Button 
              variant="contained" 
              onClick={() => {
                handlePublishClick(selectedQuiz.quiz_id);
                closeViewModal();
              }}
              sx={{ 
                textTransform: 'none',
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
              }}
            >
              Publish Quiz
            </Button>
          )}
          {selectedQuiz && selectedQuiz.is_published && (
            <Button 
              variant="outlined" 
              startIcon={<ContentCopyIcon />}
              onClick={() => {
                const shareUrl = selectedQuiz.share_url || selectedQuiz.url_link || `${window.location.origin}/quiz/${selectedQuiz.quiz_id}/join/`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  showSnackbar('Quiz link copied to clipboard!', 'success');
                }).catch(() => {
                  showSnackbar('Failed to copy link', 'error');
                });
              }}
              sx={{ 
                textTransform: 'none',
                color: 'success.main',
                borderColor: 'success.main',
                '&:hover': {
                  backgroundColor: 'success.50',
                  borderColor: 'success.main'
                }
              }}
            >
              Copy Quiz Link
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherQuizSection; 