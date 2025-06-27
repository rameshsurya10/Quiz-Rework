import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, 
  IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, 
  ListItemText, ListItemIcon, Checkbox, Divider, Stack, Avatar
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
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import QuizFormModern from './QuizFormModern';
import ConfirmationDialog from '../ConfirmationDialog';
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
      
      // Always fetch complete quiz details to ensure we have questions with answers
      const quizDetails = await quizService.getQuizDetails(quizId);
      
      if (!quizDetails) {
        throw new Error('Quiz not found');
      }
      
      let questions = quizDetails.questions || [];
      
      console.log('Raw questions from backend:', questions);
      
      // Process questions to normalize the data structure
      questions = questions.map((question, qIndex) => {
        console.log(`Processing question ${qIndex + 1}:`, {
          question: question.question,
          type: question.type,
          correct_answer: question.correct_answer,
          options: question.options,
          options_type: typeof question.options
        });
        
        const processedQuestion = {
          ...question,
          question_text: question.question_text || question.question,
          type: question.type || 'mcq'
        };

        // Handle MCQ questions with options object
        if (question.type === 'mcq' && question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
          console.log('Converting MCQ options object to array:', question.options);
          
          // Convert options object to array format for display
          processedQuestion.options = Object.entries(question.options).map(([key, text]) => {
            // Extract the correct answer key from "B: Patrick Hitler" format
            let correctKey = question.correct_answer;
            if (correctKey && correctKey.includes(':')) {
              correctKey = correctKey.split(':')[0].trim();
            }
            
            const optionObj = {
              option_text: text,
              is_correct: key === correctKey,
              id: key
            };
            
            console.log(`  Option ${key}: "${text}", is_correct: ${key === correctKey} (correctKey: ${correctKey})`);
            return optionObj;
          });
          
          console.log('Final processed MCQ options:', processedQuestion.options);
        } else if (question.type === 'mcq' && Array.isArray(question.options)) {
          // Already in correct format
          processedQuestion.options = question.options;
          console.log('MCQ options already in array format:', processedQuestion.options);
        } else if (question.type === 'mcq') {
          // MCQ but no valid options
          processedQuestion.options = [];
          console.log('MCQ question but no valid options found');
        } else {
          // Non-MCQ questions
          processedQuestion.options = [];
        }

        // For non-MCQ questions, ensure correct_answer is properly set
        if (question.type !== 'mcq' && question.correct_answer) {
          // Clean up the correct answer (remove prefix if it exists)
          let cleanAnswer = question.correct_answer;
          if (cleanAnswer.includes(':')) {
            cleanAnswer = cleanAnswer.split(':')[1]?.trim() || cleanAnswer;
          }
          processedQuestion.correct_answer = cleanAnswer;
        }

        console.log(`Final processed question ${qIndex + 1}:`, processedQuestion);
        return processedQuestion;
      });
      
      console.log('All processed questions:', questions);
      
      setSelectedQuiz({
        ...quizDetails,
        questions: questions
      });
    } catch (error) {
      console.error('Failed to load quiz questions:', error);
      showSnackbar('Failed to load quiz questions', 'error');
      setViewModalOpen(false);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuiz(null);
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
      // Use only the backend pages field - no fallbacks to mock data
      if (quiz.pages && Array.isArray(quiz.pages) && quiz.pages.length > 0) {
        // If pages is an array of numbers, join them
        if (typeof quiz.pages[0] === 'number') {
          return quiz.pages.join(', ');
        }
        // If pages is an array of objects with start/end, format them
        if (typeof quiz.pages[0] === 'object' && quiz.pages[0].start && quiz.pages[0].end) {
          return quiz.pages.map(range => `${range.start}-${range.end}`).join(', ');
        }
        // If pages is an array of strings, join them
        return quiz.pages.join(', ');
      }
      return 'All Pages';
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

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                {quiz.title}
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Department:</strong> {getDepartmentName(quiz)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Type:</strong> {quiz.quiz_type?.toUpperCase() || 'DOCUMENT'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Pages:</strong> {getPageRanges(quiz)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Pass Score:</strong> {getPassingScore(quiz)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Created:</strong> {new Date(quiz.quiz_date).toLocaleDateString()}
                </Typography>
              </Stack>
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
              
              {!quiz.is_published && (
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
              )}
              
              {quiz.is_published && (
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
              )}
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
          onSave={handleCreateQuiz} 
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
            <List sx={{ p: 0 }}>
              {selectedQuiz.questions.map((question, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ py: 2, px: 3, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {index + 1}. {question.question_text}
                    </Typography>
                    
                    {/* Debug info */}
                    <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                      Debug: Type={question.type}, Options={question.options?.length || 0}
                    </Typography>
                    
                    {question.type === 'mcq' && question.options && question.options.length > 0 && (
                      <Box sx={{ width: '100%', ml: 2, mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                          Options:
                        </Typography>
                        {question.options.map((option, optIndex) => (
                          <Box 
                            key={optIndex} 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              py: 1,
                              px: 2,
                              mb: 0.5,
                              borderRadius: 1,
                              bgcolor: option.is_correct ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[500], 0.05),
                              border: `1px solid ${option.is_correct ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.grey[500], 0.2)}`
                            }}
                          >
                            <Typography variant="body2" sx={{ 
                              fontWeight: option.is_correct ? 600 : 400,
                              color: option.is_correct ? 'success.main' : 'text.primary'
                            }}>
                              {String.fromCharCode(65 + optIndex)}. {option.option_text}
                            </Typography>
                            {option.is_correct && <CheckCircleIcon sx={{ ml: 1, fontSize: 16, color: 'success.main' }} />}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Show if MCQ but no options processed */}
                    {question.type === 'mcq' && (!question.options || question.options.length === 0) && (
                      <Box sx={{ width: '100%', p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2" sx={{ color: 'error.main' }}>
                          Debug: MCQ question but no options found. Raw options: {JSON.stringify(question.options)}
                        </Typography>
                      </Box>
                    )}

                    {(question.type === 'truefalse' || question.type === 'fill' || question.type === 'oneline') && (
                      <Box sx={{ width: '100%', mt: 1, p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          Correct Answer: {question.correct_answer || 'Not available'}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                          Debug: Type={question.type}, Answer={question.correct_answer}
                        </Typography>
                      </Box>
                    )}
                    
                    {question.explanation && (
                      <Box sx={{ p: 1, mt: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1, width: '100%' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>Explanation:</Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{question.explanation}</Typography>
                      </Box>
                    )}
                  </ListItem>
                  {index < selectedQuiz.questions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
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