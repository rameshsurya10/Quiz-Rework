import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, ListItemIcon, Checkbox } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import FullLayout from '../FullLayout';
import PageHeader from '../../common/PageHeader';
import QuizFormModern from './QuizFormModern';
import ConfirmationDialog from '../ConfirmationDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { quizApi, departmentApi } from '../../services/api';

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
  const [activeTab, setActiveTab] = useState(0);
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
      const response = await quizApi.getAll();
      const quizzesData = response.data.results || response.data || [];
      setQuizzes(quizzesData);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      setError('Failed to load quizzes. Please try again later.');
      showSnackbar('Failed to fetch quizzes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showSnackbar]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await departmentApi.getAll();
      setDepartments(data.results || data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      showSnackbar('Failed to load departments', 'error');
    }
  }, [showSnackbar]);

  useEffect(() => {
    if (!isCreating) {
      fetchQuizzes();
      fetchDepartments();
    }
  }, [isCreating, fetchQuizzes, fetchDepartments]);

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
      
      // Extract files from formData for separate upload
      const files = formData.files || [];
      
      // Remove files from the JSON payload but keep page_ranges in both places
      const { files: removedFiles, ...quizData } = formData;
      
      // Add page_ranges to the quiz metadata if it exists
      if (formData.page_ranges) {
        if (!quizData.metadata) {
          quizData.metadata = {};
        }
        quizData.metadata.page_ranges_str = formData.page_ranges;
      }
      
      // Create the quiz first
      const response = await quizApi.create(quizData);
      const quizId = response.data.quiz_id;
      
      // If we have files, upload them
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          
          // Add page_ranges to the form data if it exists
          if (formData.page_ranges) {
            fileFormData.append('page_ranges', formData.page_ranges);
          }
          
          return quizApi.uploadFile(quizId, fileFormData, { onUploadProgress });
        });
        
        await Promise.all(uploadPromises);
      }
      
      // Refresh the quiz list
      fetchQuizzes();
      setIsCreating(false);
      
      // Show success message
      showSnackbar('Quiz created successfully!', 'success');
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      setIsCreating(false);
      showSnackbar(error.response?.data?.error || 'Failed to create quiz', 'error');
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
      await quizApi.patch(quizId, { is_published: true });
      await fetchQuizzes();
      showSnackbar('Publish status updated', 'success');
    } catch (error) {
      console.error('Failed to publish quiz:', error);
      showSnackbar('Failed to update publish status', 'error');
    }
  };

  // View quiz questions in modal
  const handleViewQuiz = async (quizId) => {
    try {
      setQuestionsLoading(true);
      setSelectedQuiz(null);
      setViewModalOpen(true);
      const response = await quizApi.getById(quizId);
      const quizData = response.data;
      
      // Normalize questions structure if needed
      if (quizData.questions) {
        try {
          // Check if questions is a string that needs parsing
          if (quizData.questions.length === 1 && typeof quizData.questions[0].question === 'string') {
            try {
              const raw = quizData.questions[0].question;
              const parsed = JSON.parse(raw);
              quizData.questions = parsed.map((q) => ({
                question_text: q.question,
                options: q.options && typeof q.options === 'object' ? 
                  Object.entries(q.options).map(([key, text], idx) => ({
                    option_text: text,
                    is_correct: key === q.correct_answer,
                    id: idx
                  })) : [],
                explanation: q.explanation || '',
                type: q.type || 'mcq'
              }));
            } catch (e) {
              console.error('Failed to parse embedded questions JSON', e);
            }
          } 
          // Handle array of question objects with direct structure
          else if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
            quizData.questions = quizData.questions.map((q) => {
              // If question is already in the correct format
              if (q.question_text) {
                return q;
              }
              
              // Convert from API format to display format
              return {
                question_text: q.question,
                options: q.options && typeof q.options === 'object' ? 
                  Object.entries(q.options).map(([key, text], idx) => ({
                    option_text: text,
                    is_correct: key === q.correct_answer,
                    id: idx
                  })) : [],
                explanation: q.explanation || '',
                type: q.type || 'mcq'
              };
            });
          }
        } catch (e) {
          console.error('Failed to normalize questions:', e);
        }
      }
      
      console.log("Processed quiz data:", quizData);
      setSelectedQuiz(quizData);
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

  const renderQuizCard = (quiz, index) => (
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
              Dept: {quiz.department_name || 'General'} | Type: {quiz.quiz_type || 'Normal'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary', mt: 1 }}>
              <Typography variant="caption">Type: {quiz.question_type || 'Mixed'}</Typography>
              <Typography variant="caption">Pass Score: {quiz.passing_score || 'N/A'}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Pages: {quiz.pages && quiz.pages.length > 0 ? quiz.pages.join(', ') : 'N/A'}
            </Typography>
          </CardContent>
          <CardActions sx={{ justifyContent: 'space-between', p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button variant="contained" startIcon={<AssignmentIcon />} size="small" onClick={() => handlePublishClick(quiz.quiz_id)}>PUBLISH</Button>
            <Box>
              <IconButton size="small" onClick={() => handleViewQuiz(quiz.quiz_id)}><VisibilityIcon /></IconButton>
              <IconButton size="small" onClick={() => handleDelete(quiz.quiz_id)}><DeleteIcon /></IconButton>
            </Box>
          </CardActions>
        </QuizStyledCard>
      </motion.div>
    </Grid>
  );

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
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
            ) : error ? (
              <Typography color="error" sx={{ textAlign: 'center', mt: 4 }}>{error}</Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                  <Paper elevation={3} sx={{ borderRadius: '50px', overflow: 'hidden' }} className="glass-effect">
                    <Tabs
                      value={activeTab}
                      onChange={handleTabChange}
                      indicatorColor="primary"
                      textColor="primary"
                      variant="fullWidth"
                      sx={{
                        '& .MuiTabs-indicator': {
                          height: '100%',
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: '50px',
                          zIndex: 1,
                        },
                        '& .MuiTab-root': {
                          position: 'relative',
                          zIndex: 2,
                          color: theme.palette.text.secondary,
                          transition: 'color 0.3s ease',
                          '&.Mui-selected': {
                            color: theme.palette.primary.contrastText,
                          },
                        },
                      }}
                    >
                      <Tab label={`Published (${publishedQuizzes.length})`} />
                      <Tab label={`Drafts (${draftQuizzes.length})`} />
                    </Tabs>
                  </Paper>
                </Box>

                <Grid container spacing={3}>
                  {(activeTab === 0 ? publishedQuizzes : draftQuizzes).map((quiz, index) => renderQuizCard(quiz, index))}
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
          <DialogTitle>{selectedQuiz?.title || 'Loading...'}</DialogTitle>
          <DialogContent dividers>
            {isQuestionsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>
            ) : selectedQuiz && selectedQuiz.questions && selectedQuiz.questions.length > 0 ? (
              <List>
                {selectedQuiz.questions.map((question, index) => (
                  <ListItem key={question.id || index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2, border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 1 }}>
                      <ListItemText 
                        primary={`${index + 1}. ${question.question_text || question.question}`} 
                        primaryTypographyProps={{ fontWeight: 'bold' }} 
                      />
                      <Chip 
                        label={question.type || 'mcq'} 
                        size="small" 
                        color={
                          question.type === 'mcq' ? 'primary' : 
                          question.type === 'truefalse' ? 'secondary' : 
                          question.type === 'fill' ? 'info' : 'default'
                        } 
                        sx={{ ml: 1 }} 
                      />
                    </Box>
                    
                    {/* Multiple choice options */}
                    {(question.type === 'mcq' || (question.options && Object.keys(question.options).length > 0)) && (
                      <List sx={{ width: '100%' }}>
                        {question.options && typeof question.options === 'object' ? (
                          // Handle options as object (API format)
                          Object.entries(question.options).map(([key, value], idx) => (
                            <ListItem key={idx} sx={{ 
                              bgcolor: key === question.correct_answer ? alpha(theme.palette.success.main, 0.1) : 'transparent', 
                              borderRadius: 1,
                              mb: 0.5
                            }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                {key === question.correct_answer && <CheckCircleIcon color="success" fontSize="small" />}
                              </ListItemIcon>
                              <ListItemText primary={`${key}: ${value}`} />
                            </ListItem>
                          ))
                        ) : (
                          // Handle options as array (normalized format)
                          (question.options || []).map((option) => (
                            <ListItem key={option.id} sx={{ 
                              bgcolor: option.is_correct ? alpha(theme.palette.success.main, 0.1) : 'transparent', 
                              borderRadius: 1,
                              mb: 0.5
                            }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                {option.is_correct && <CheckCircleIcon color="success" fontSize="small" />}
                              </ListItemIcon>
                              <ListItemText primary={option.option_text} />
                            </ListItem>
                          ))
                        )}
                      </List>
                    )}
                    
                    {/* True/False, Fill, or One-line answer types */}
                    {(question.type === 'truefalse' || question.type === 'fill' || question.type === 'oneline') && (
                      <Box sx={{ width: '100%', mt: 1, mb: 1, p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Correct Answer: {question.correct_answer}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Explanation for all question types */}
                    {question.explanation && (
                      <Box sx={{ p: 1, mt: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1, width: '100%' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Explanation:</Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{question.explanation}</Typography>
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : selectedQuiz ? (
              <Typography sx={{ textAlign: 'center', my: 4 }}>No questions found for this quiz.</Typography>
            ) : (
              <Typography sx={{ textAlign: 'center', my: 4 }}>Failed to load quiz details.</Typography>
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
