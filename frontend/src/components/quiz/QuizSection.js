import React, { useState, useEffect } from 'react';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper, Tabs, Tab, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

import FullLayout from '../FullLayout';
import PageHeader from '../../common/PageHeader';
import QuizFormModern from './QuizFormModern';
import ConfirmationDialog from '../ConfirmationDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from '../../services/api';

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
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (!isCreating) { // Only fetch when not in create/edit mode
      const fetchQuizzes = async () => {
        setIsLoading(true);
        setError('');
        try {
          const response = await api.get('/api/quiz/');
          const quizzesData = response.data.results || response.data || [];
          setQuizzes(quizzesData);
        } catch (err) {
          console.error('Failed to fetch quizzes:', err);
          setError('Failed to load quizzes. Please try again later.');
          showSnackbar('Failed to fetch quizzes', 'error');
        } finally {
          setIsLoading(false);
        }
      };
      fetchQuizzes();
    }
  }, [showSnackbar, isCreating]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  const handleSaveQuiz = async (formData, onUploadProgress) => {
    try {
      await api.post('/api/quiz/', formData, {
        onUploadProgress,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showSnackbar('Quiz created successfully!', 'success');
      setIsCreating(false); // This will trigger a re-fetch due to useEffect dependency
    } catch (err) {
      console.error('Failed to save quiz:', err);
      const errorMessage = err.response?.data?.detail || 'An error occurred while saving the quiz.';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDelete = (quizId) => {
    setQuizToDeleteId(quizId);
    setConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!quizToDeleteId) return;
    try {
      await api.delete(`/api/quiz/${quizToDeleteId}/`);
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
        <QuizStyledCard>
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
            <Button variant="contained" startIcon={<AssignmentIcon />} size="small">Assign</Button>
            <Box>
              <IconButton size="small"><VisibilityIcon /></IconButton>
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
          <QuizFormModern onSave={handleSaveQuiz} onCancel={handleCancelCreate} />
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
                  <Paper elevation={3} sx={{ borderRadius: '50px', overflow: 'hidden' }}>
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
      </Container>
    </FullLayout>
  );
};

export default QuizSection;
