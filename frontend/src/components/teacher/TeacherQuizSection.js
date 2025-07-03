import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Fade,
  Grow,
  Skeleton,
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  Divider,
  Tooltip,
  Snackbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Assessment,
  Share,
  Schedule,
  Quiz as QuizIcon,
  CheckCircle,
  Cancel,
  People,
  School,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { quizApi, departmentApi } from '../../services/api';
import TeacherLayout from './TeacherLayout';

const TeacherQuizSection = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchTerm, departmentFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [quizzesResponse, departmentsResponse] = await Promise.all([
        quizApi.getAll(),
        departmentApi.getAll(),
      ]);

      // Process quizzes data
      const allQuizzes = [
        ...(quizzesResponse.data.current_quizzes || []),
        ...(quizzesResponse.data.upcoming_quizzes || []),
        ...(quizzesResponse.data.past_quizzes || []),
      ];
      setQuizzes(allQuizzes);

      // Process departments data
      setDepartments(departmentsResponse.data.results || departmentsResponse.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load quiz data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterQuizzes = () => {
    let filtered = [...quizzes];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(quiz => quiz.department_id === departmentFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'published') {
        filtered = filtered.filter(quiz => quiz.is_published);
      } else if (statusFilter === 'draft') {
        filtered = filtered.filter(quiz => !quiz.is_published);
      }
    }

    setFilteredQuizzes(filtered);
  };

  const handleMenuClick = (event, quiz) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuiz(quiz);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuiz(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await quizApi.delete(selectedQuiz.quiz_id);
      setQuizzes(quizzes.filter(q => q.quiz_id !== selectedQuiz.quiz_id));
      setSnackbar({
        open: true,
        message: 'Quiz deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete quiz',
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedQuiz(null);
    }
  };

  const handlePublishToggle = async (quiz) => {
    try {
      await quizApi.publish(quiz.quiz_id);
      setQuizzes(quizzes.map(q => 
        q.quiz_id === quiz.quiz_id 
          ? { ...q, is_published: !q.is_published }
          : q
      ));
      setSnackbar({
        open: true,
        message: `Quiz ${quiz.is_published ? 'unpublished' : 'published'} successfully`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error updating quiz:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update quiz',
        severity: 'error',
      });
    }
    handleMenuClose();
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.department_id === departmentId);
    return department ? department.name : 'Unknown';
  };

  const getStatusColor = (quiz) => {
    if (quiz.is_published) return '#4caf50';
    return '#ff9800';
  };

  const getStatusLabel = (quiz) => {
    if (quiz.is_published) return 'Published';
    return 'Draft';
  };

  const QuizCard = ({ quiz, index }) => (
    <Grow in={true} timeout={600 + index * 100}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
          border: '1px solid rgba(225, 112, 85, 0.1)',
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 25px rgba(225, 112, 85, 0.15)',
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
                {quiz.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {quiz.description || 'No description provided'}
              </Typography>
            </Box>
            <IconButton
              onClick={(e) => handleMenuClick(e, quiz)}
              sx={{ color: '#e17055' }}
            >
              <MoreVert />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              label={getStatusLabel(quiz)}
              size="small"
              sx={{
                backgroundColor: `${getStatusColor(quiz)}15`,
                color: getStatusColor(quiz),
                fontWeight: 600,
              }}
            />
            <Chip
              label={getDepartmentName(quiz.department_id)}
              size="small"
              variant="outlined"
              sx={{ color: '#666' }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <QuizIcon sx={{ fontSize: 16, color: '#666' }} />
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {quiz.questions?.length || 0} questions
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <People sx={{ fontSize: 16, color: '#666' }} />
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {quiz.attempts_count || 0} attempts
                </Typography>
              </Box>
            </Box>
            <Typography variant="caption" sx={{ color: '#666' }}>
              {new Date(quiz.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  if (error) {
    return (
      <TeacherLayout>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchData} sx={{ bgcolor: '#e17055' }}>
          Retry
        </Button>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#333',
                mb: 1,
                background: 'linear-gradient(135deg, #e17055 0%, #f39c7a 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Quiz Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Create, manage, and track your quizzes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/quiz/create')}
            sx={{
              bgcolor: '#e17055',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              '&:hover': {
                bgcolor: '#d4624a',
              },
            }}
          >
            Create Quiz
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ p: 2, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#e17055' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={statusFilter}
                onChange={(e, newValue) => setStatusFilter(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#e17055' },
                  '& .Mui-selected': { color: '#e17055 !important' },
                  border: '1px solid #e1705530',
                  borderRadius: 2
                }}
              >
                <Tab label="All" value="all" />
                <Tab label="Published" value="published" />
                <Tab label="Draft" value="draft" />
              </Tabs>
            </Grid>
          </Grid>
        </Card>

        {/* Quiz Grid */}
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Skeleton height={200} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredQuizzes.length > 0 ? (
          <Grid container spacing={3}>
            {filteredQuizzes.map((quiz, index) => (
              <Grid item xs={12} md={6} lg={4} key={quiz.quiz_id}>
                <QuizCard quiz={quiz} index={index} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
              border: '1px solid rgba(225, 112, 85, 0.1)',
              borderRadius: 3,
              textAlign: 'center',
              py: 8,
            }}
          >
            <QuizIcon sx={{ fontSize: 64, color: '#e17055', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#333', mb: 1 }}>
              No quizzes found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {searchTerm || departmentFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'Create your first quiz to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/quiz/create')}
              sx={{
                bgcolor: '#e17055',
                '&:hover': {
                  bgcolor: '#d4624a',
                },
              }}
            >
              Create Quiz
            </Button>
          </Card>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(225, 112, 85, 0.15)',
            },
          }}
        >
          <MenuItem onClick={() => {
            navigate(`/quiz/${selectedQuiz?.quiz_id}`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            View Quiz
          </MenuItem>
          <MenuItem onClick={() => {
            navigate(`/quiz/${selectedQuiz?.quiz_id}/edit`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            Edit Quiz
          </MenuItem>
          <MenuItem onClick={() => handlePublishToggle(selectedQuiz)}>
            <ListItemIcon>
              {selectedQuiz?.is_published ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
            </ListItemIcon>
            {selectedQuiz?.is_published ? 'Unpublish' : 'Publish'}
          </MenuItem>
          <MenuItem onClick={() => {
            navigate(`/quiz/${selectedQuiz?.quiz_id}/results`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Assessment fontSize="small" />
            </ListItemIcon>
            View Results
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336' }}>
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: '#f44336' }} />
            </ListItemIcon>
            Delete Quiz
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Quiz</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedQuiz?.title}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </TeacherLayout>
  );
};

export default TeacherQuizSection;