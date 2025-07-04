import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReplayIcon from '@mui/icons-material/Replay';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon, Checkbox } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import FullLayout from '../FullLayout';
import PageHeader from '../../common/PageHeader';
import QuizFormModern from './QuizFormModern';
import { ConfirmationDialog } from '../../common';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { quizApi, departmentApi } from '../../services/api';
import { quizService } from '../../services/quizService';

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

      setQuizzes(allQuizzes);
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
    try {
      await quizApi.publish(quizId);
      await fetchQuizzes();
      showSnackbar('Quiz published successfully and notifications sent!', 'success');
    } catch (error) {
      console.error('Failed to publish quiz:', error);
      showSnackbar(error.response?.data?.message || 'Failed to publish quiz', 'error');
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
      
      // Explicitly use current_questions for the admin preview
      const questionsToDisplay = quizData.current_questions || [];
      
      // Process questions for display, ensuring all keys are preserved correctly.
      const processedQuestions = questionsToDisplay.map((q) => {
        // Start with all properties from the source question object
        const processed = { ...q };

        // Standardize the main question text key
        processed.question_text = q.question || q.question_text || 'No question text';
        
        // Standardize the type
        processed.type = q.question_type || q.type || 'mcq';

        // Process MCQ options into a consistent format if they exist
        if (processed.type === 'mcq' && q.options) {
          if (Array.isArray(q.options)) {
            // Already in array format, just ensure consistency
            processed.options = q.options.map((opt, index) => {
              if (typeof opt === 'object' && opt.option_text) {
                return opt; // Already properly formatted
              }
              // Convert simple array items to proper format
              return {
                option_text: String(opt),
                is_correct: false, // Will be determined elsewhere
                id: String.fromCharCode(65 + index) // A, B, C, D...
              };
            });
          } else if (typeof q.options === 'object') {
            // Convert object format to array
            const correctKey = q.correct_answer?.toString().split(':')[0].trim();
            processed.options = Object.entries(q.options).map(([key, value]) => {
              // Ensure the option text is a string, even if it's a nested object.
              const optionText = (value && typeof value === 'object') ? JSON.stringify(value) : String(value);
              return {
                option_text: optionText,
                is_correct: key === correctKey,
                id: key
              };
            });
          } else {
            processed.options = [];
          }
        } else {
          // Ensure options is an empty array for non-MCQ to prevent render errors
          processed.options = [];
        }
        
        return processed;
      });

      setSelectedQuiz({
        ...quizData,
        questions: processedQuestions
      });

    } catch (error) {
      console.error('Failed to fetch quiz details:', error);
      showSnackbar('Failed to load quiz questions. Please try again.', 'error');
      setViewModalOpen(false);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleReplaceQuestion = async (questionNumber) => {
    if (!selectedQuiz) return;
    
    // Add validation to prevent sending bad requests
    if (typeof questionNumber === 'undefined' || questionNumber === null) {
      console.error("Attempted to replace a question with an invalid number:", questionNumber);
      showSnackbar('Cannot replace question: Invalid question number.', 'error');
      return;
    }

    try {
      await quizService.replaceQuestion(selectedQuiz.quiz_id, questionNumber);
      showSnackbar('Question replaced successfully!', 'success');
      // Refresh the view
      await handleViewQuiz(selectedQuiz.quiz_id);
    } catch (error) {
      console.error('Failed to replace question:', error);
      showSnackbar('Failed to replace question', 'error');
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuiz(null);
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '40px' }}>
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
              </Box>
              {!quiz.is_published ? (
                <Button 
                  variant="contained" 
                  startIcon={<AssignmentIcon />} 
                  size="small" 
                  onClick={() => handlePublishClick(quiz.quiz_id)}>
                  PUBLISH
                </Button>
              ) : (
                <Button 
                  variant="outlined" 
                  color="success"
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

        <Dialog open={isViewModalOpen} onClose={closeViewModal} fullWidth maxWidth="md" scroll="paper">
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #44a08d 0%, #093637 100%)',
            color: 'white',
          }}>
            {selectedQuiz?.title}
          </DialogTitle>
          <DialogContent dividers>
            {isQuestionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedQuiz?.questions?.length > 0 ? (
              <List>
                {selectedQuiz.questions.map((question, index) => (
                  <ListItem key={index} sx={{ display: 'block', mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                        {index + 1}. {question.question_text}
                      </Typography>
                      <IconButton 
                        edge="end" 
                        aria-label="replace" 
                        onClick={() => handleReplaceQuestion(question.question_number)}
                      >
                        <ReplayIcon />
                      </IconButton>
                    </Box>
                    
                    {/* Options for MCQ */}
                    {question.type === 'mcq' && question.options && (
                      <Box sx={{ pl: 2, mt: 1 }}>
                        {Array.isArray(question.options) ? (
                          // Handle processed options array
                          question.options.map(option => (
                            <Typography 
                              key={option.id || option.key} 
                              sx={{ color: option.is_correct ? 'success.main' : 'text.secondary' }}
                            >
                              {option.id}: {String(option.option_text)}
                            </Typography>
                          ))
                        ) : (
                          // Handle raw options object
                          Object.entries(question.options).map(([key, text]) => (
                            <Typography 
                              key={key} 
                              sx={{ 
                                color: question.correct_answer?.toString().split(':')[0].trim() === key ? 'success.main' : 'text.secondary' 
                              }}
                            >
                              {key}: {String(text)}
                            </Typography>
                          ))
                        )}
                      </Box>
                    )}

                    {/* Correct Answer for other types */}
                    {(question.type !== 'mcq') && (
                      <Typography sx={{ pl: 2, mt: 1, color: 'success.main' }}>
                        Correct Answer: {
                          (question.correct_answer && typeof question.correct_answer === 'object')
                            ? JSON.stringify(question.correct_answer)
                            : String(question.correct_answer)
                        }
                      </Typography>
                    )}

                    {question.explanation && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.200',color: 'black', borderRadius: 1, width: '100%' }}>
                        <Typography variant="body2">
                          <strong>Explanation: </strong>{question.explanation}
                        </Typography>
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ textAlign: 'center', my: 4 }}>No questions found for this quiz.</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeViewModal}>Close</Button>
            <Button 
              variant="contained" 
              onClick={() => {
                if (selectedQuiz) {
                  navigate(`/PUBLISH-quiz/${selectedQuiz.quiz_id}`);
                  closeViewModal();
                }
              }}
            >
              Proceed to PUBLISH
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </FullLayout>
  );
};

export default QuizSection;
