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

  const handleSaveQuiz = async (quizData, onUploadProgress) => {
    setIsCreating(true);

    // 1. Prepare the JSON payload for quiz creation
    const departmentIds = departments
      .filter(dep => quizData.department.includes(dep.name))
      .map(dep => dep.id);

    const jsonPayload = { ...quizData };
    const filesToUpload = jsonPayload.files; // Keep files for the next step
    delete jsonPayload.files;
    delete jsonPayload.department;
    jsonPayload.department_ids = departmentIds;

    try {
      // 2. Create the quiz with JSON data
      const createResponse = await quizApi.create(jsonPayload);
      const newQuizId = createResponse.data.quiz_id;

      if (!newQuizId) {
        console.error('Quiz creation response did not include a quiz_id:', createResponse.data);
        throw new Error('Failed to get new quiz ID.');
      }

      // 3. Upload files if any
      if (filesToUpload && filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach(file => {
          formData.append('file', file);
        });

        await quizApi.uploadFile(newQuizId, formData, { onUploadProgress });
      }

      showSnackbar('Quiz created successfully!', 'success');
      fetchQuizzes();
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating quiz:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || 'Failed to create quiz.';
      showSnackbar(errorMsg, 'error');
      setIsCreating(false);
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
      if (quizData.questions && quizData.questions.length === 1 && quizData.questions[0].options === null) {
        try {
          const raw = quizData.questions[0].question;
          const parsed = JSON.parse(raw);
          quizData.questions = parsed.map((q) => ({
            question_text: q.question,
            options: Object.values(q.options).map((text, idx) => ({
              option_text: text,
              is_correct: String.fromCharCode(65 + idx) === q.correct_answer,
              id: idx
            })),
            explanation: q.explanation || ''
          }));
        } catch (e) {
          console.error('Failed to parse embedded questions JSON', e);
        }
      }
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
          <QuizFormModern onSave={handleSaveQuiz} className="glass-effect" onCancel={handleCancelCreate} departments={departments} />
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
                  <ListItem key={question.id || index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                    <ListItemText primary={`${index + 1}. ${question.question_text}`} primaryTypographyProps={{ fontWeight: 'bold' }} />
                    <List sx={{ width: '100%' }}>
                      {(question.options || []).map((option) => (
                        <ListItem key={option.id} sx={{ bgcolor: option.is_correct ? alpha(theme.palette.success.main, 0.1) : 'transparent', borderRadius: 1 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {option.is_correct && <CheckCircleIcon color="success" fontSize="small" />}
                          </ListItemIcon>
                          <ListItemText primary={option.option_text} />
                        </ListItem>
                      ))}
                    </List>
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
