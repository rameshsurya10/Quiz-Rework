import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
      
      // Process questions for display
      const processedQuestions = questionsToDisplay.map((q) => {
        const processed = {
          question_text: q.question,
          explanation: q.explanation || '',
          type: q.type || 'mcq',
          correct_answer: q.correct_answer,
          options: []
        };

        if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
          let correctKey = q.correct_answer;
          if (correctKey && correctKey.includes(':')) {
            correctKey = correctKey.split(':')[0].trim();
          }
          
          processed.options = Object.entries(q.options).map(([key, text]) => ({
            option_text: text,
            is_correct: key === correctKey,
            id: key
          }));
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
      console.log('[QuizSection] Quiz pages data:', {
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        pages: quiz.pages,
        pages_type: typeof quiz.pages,
        pages_length: quiz.pages?.length
      });
      
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
      // Only show "All pages" if no specific pages are defined
      return 'All pages';
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
      console.log('[QuizSection] Quiz passing score data:', {
        quiz_id: quiz.quiz_id,
        title: quiz.title,
        passing_score: quiz.passing_score,
        passing_score_type: typeof quiz.passing_score
      });
      
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', mb: 1 }}>
                <Typography variant="caption">{quiz.no_of_questions || 0} Questions</Typography>
                <Typography variant="caption">{quiz.time_limit_minutes || 'N/A'} min limit</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Dept: {getDepartmentName(quiz)} | Type: {quiz.quiz_type || 'Normal'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', mt: 1 }}>
                <Typography variant="caption">Type: {quiz.question_type || 'Mixed'}</Typography>
                <Typography variant="caption">Pass Score: {getPassingScore(quiz)}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Pages: {getPageRanges(quiz)}
              </Typography>
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
          <QuizFormModern onSave={handleCreateQuiz} className="glass-effect" onCancel={handleCancelCreate} departments={departments} />
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
                  <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {index + 1}. {question.question_text}
                      <Chip label={question.type} size="small" sx={{ ml: 1, backgroundColor: '#093637', color: 'white' }} />
                    </Typography>
                    
                    {question.type === 'mcq' && question.options.map((option, optIndex) => (
                      <Box key={optIndex} sx={{
                        pl: 2,
                        py: 1,
                        my: 0.5,
                        width: '100%',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: option.is_correct ? 'success.main' : 'divider',
                        backgroundColor: option.is_correct ? alpha(theme.palette.success.light, 0.1) : 'transparent',
                      }}>
                        <Typography variant="body2" sx={{ color: option.is_correct ? 'success.dark' : 'text.primary' }}>
                          {String.fromCharCode(65 + optIndex)}. {option.option_text}
                        </Typography>
                      </Box>
                    ))}

                    {(question.type === 'fill' || question.type === 'truefalse' || question.type === 'oneline') && (
                       <Box sx={{
                        pl: 2, py: 1, my: 0.5, width: '100%', borderRadius: 1,
                        backgroundColor: alpha(theme.palette.success.light, 0.1),
                      }}>
                         <Typography variant="body2">
                          <strong>Correct Answer: </strong>{question.correct_answer}
                        </Typography>
                      </Box>
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
