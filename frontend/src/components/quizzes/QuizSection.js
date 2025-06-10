import React, { useState, useEffect } from 'react';
import FullLayout from '../FullLayout';
import {
  Container, Button, Box, Typography, Grid, Card, CardContent, CardActions, IconButton, Chip, useTheme, alpha, Paper
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment'; // For Assign Quiz
import { PageHeader, EmptyState } from '../common';
import ConfirmationDialog from '../ConfirmationDialog'; // Assuming common.js is in the parent directory
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import CreateQuizDialog from './CreateQuizDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { quizApi } from '../../services/api';

// Styled Card component (similar to DashboardStyledCard)
const QuizStyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 30px 0 rgba(0,0,0,0.07)',
  },
}));

// Mock quiz data
const mockQuizzes = [
  {
    id: '1',
    title: 'Introduction to React',
    description: 'Test your knowledge on the fundamental concepts of React, including components, props, and state.',
    questionCount: 15,
    status: 'Published',
    category: 'Programming',
    difficulty: 'Beginner',
    timeLimit: 30, // minutes
    lastModified: '2024-05-15T10:30:00Z',
  },
  {
    id: '2',
    title: 'Advanced JavaScript Concepts',
    description: 'Dive deep into closures, promises, async/await, and other advanced JavaScript topics.',
    questionCount: 25,
    status: 'Draft',
    category: 'Programming',
    difficulty: 'Intermediate',
    timeLimit: 60,
    lastModified: '2024-05-20T14:00:00Z',
  },
  {
    id: '3',
    title: 'Python for Data Science',
    description: 'Assess your skills in using Python libraries like NumPy, Pandas, and Matplotlib for data analysis.',
    questionCount: 20,
    status: 'Published',
    category: 'Data Science',
    difficulty: 'Intermediate',
    timeLimit: 45,
    lastModified: '2024-05-10T09:00:00Z',
  },
];

const QuizSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);
  const [quizToDeleteId, setQuizToDeleteId] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // For save/update operations

  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoading(true);
      try {
        const response = await quizApi.getAll();
        // The API returns the array directly, not in a data property
        setQuizzes(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to fetch quizzes:', error);
        showSnackbar('Failed to load quizzes. Please try again.', 'error');
        setQuizzes([]); // Ensure quizzes is always an array
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [showSnackbar]); // Add showSnackbar to dependency array

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setEditingQuiz(null); // Reset editing quiz when dialog closes
  };

  const handleOpenEditDialog = (quiz) => {
    setEditingQuiz(quiz);
    setOpenCreateDialog(true);
  };

  const handleDeleteQuiz = (quizId) => {
    setQuizToDeleteId(quizId);
    setOpenConfirmDeleteDialog(true);
  };

  const confirmDeleteQuiz = async () => {
    if (quizToDeleteId) {
      // Consider adding a specific loading state for delete if needed
      try {
        await quizApi.delete(quizToDeleteId);
        setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizToDeleteId));
        showSnackbar('Quiz deleted successfully!', 'success');
      } catch (error) {
        console.error('Failed to delete quiz:', error);
        showSnackbar('Failed to delete quiz. Please try again.', 'error');
      }
    }
    handleCloseConfirmDeleteDialog();
  };

  const handleCloseConfirmDeleteDialog = () => {
    setOpenConfirmDeleteDialog(false);
    setQuizToDeleteId(null);
  };

  const handleSaveQuiz = async (quizData) => {
    setIsSaving(true);
    try {
      if (editingQuiz) { // Update existing quiz
        const response = await quizApi.update(editingQuiz.id, quizData);
        setQuizzes(prevQuizzes => 
          prevQuizzes.map(q => 
            q.id === editingQuiz.id ? { ...q, ...response.data } : q // Assuming API returns updated quiz
          )
        );
        showSnackbar('Quiz updated successfully!', 'success');
      } else { // Create new quiz
        // Here you would typically call your API to create a new quiz
        console.log('Creating quiz with data:', quizData);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create a new quiz object with a temporary ID (in a real app, this would come from the API)
        const newQuiz = {
          id: `temp-${Date.now()}`,
          ...quizData,
          status: 'Draft',
          questionCount: 0,
          lastModified: new Date().toISOString(),
        };
        
        setQuizzes(prevQuizzes => [newQuiz, ...prevQuizzes]);
        showSnackbar('Quiz created successfully!', 'success');
      }
      handleCloseCreateDialog(); // Close dialog on success
    } catch (error) {
      console.error('Failed to save quiz:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Please try again.';
      showSnackbar(`Failed to save quiz: ${errorMessage}`, 'error');
      // Do not close dialog on error, so user can retry or see error
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusChipColor = (status) => {
    if (status === 'Published') return 'success';
    if (status === 'Draft') return 'warning';
    return 'default';
  };

  return (
    <FullLayout>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Quiz Management"
          subtitle="Create, edit, and manage all quizzes for the platform."
          actions={[
            <Button
              key="create-quiz"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create New Quiz
            </Button>,
          ]}
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            {/* Replace with a Skeleton loader later if desired */}
            <Typography>Loading quizzes...</Typography>
          </Box>
        ) : quizzes.length === 0 ? (
          <EmptyState 
            title="No Quizzes Yet"
            description="Get started by creating your first quiz. Click the button above to begin."
            icon={<AssignmentIcon />}
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateDialog}>
                Create First Quiz
              </Button>
            }
          />
        ) : (
          <Grid container spacing={3} sx={{ mt: 3 }}>
            {quizzes.map((quiz, index) => (
              <Grid item xs={12} sm={6} md={4} key={quiz.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{ height: '100%' }}
                >
                  <QuizStyledCard>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {quiz.title}
                        </Typography>
                        <Chip 
                          label={quiz.status} 
                          color={getStatusChipColor(quiz.status)} 
                          size="small" 
                          sx={{ fontWeight: 'medium' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, height: '60px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {quiz.description}
                      </Typography>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={1}>
                        <Typography variant="caption" color="text.secondary">
                          {quiz.questionCount} Questions
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {quiz.timeLimit} min limit
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Category: {quiz.category} | Difficulty: {quiz.difficulty}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', p: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}` }}>
                      <Button size="small" startIcon={<AssignmentIcon />} variant="outlined">
                        Assign
                      </Button>
                      <Box>
                        <IconButton size="small" aria-label="view quiz">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="edit quiz" onClick={() => handleOpenEditDialog(quiz)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="delete quiz" onClick={() => handleDeleteQuiz(quiz.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardActions>
                  </QuizStyledCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        <CreateQuizDialog 
          open={openCreateDialog} 
          onClose={handleCloseCreateDialog} 
          onSave={handleSaveQuiz} 
          initialData={editingQuiz}
          isSaving={isSaving} // Pass the isSaving state
        />

        <ConfirmationDialog
          open={openConfirmDeleteDialog}
          onClose={handleCloseConfirmDeleteDialog}
          onConfirm={confirmDeleteQuiz}
          title="Confirm Quiz Deletion"
          message={`Are you sure you want to delete this quiz? This action cannot be undone.`}
          confirmText="Delete"
          confirmButtonColor="error"
        />
      </Container>
    </FullLayout>
  );
};

export default QuizSection;
