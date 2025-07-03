import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Button,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Fab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Avatar,
  Fade,
  Grow,
  Skeleton,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Subject,
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Search,
  Book,
  Category,
  School,
  Assignment,
  Quiz,
  FilterList,
  ColorLens,
  Label
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { departmentApi, subjectApi } from '../../services/api';
import TeacherLayout from './TeacherLayout';

const TeacherSubjectSection = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    description: '',
    department: '',
    color: '#e17055',
    code: ''
  });
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Warm color palette
  const warmColors = {
    primary: '#e17055',
    secondary: '#f39c12',
    accent: '#e74c3c',
    background: '#fef7f4',
    cardBackground: '#fff',
    textPrimary: '#2c3e50',
    textSecondary: '#7f8c8d',
    success: '#27ae60',
    warning: '#f39c12'
  };

  // Subject colors
  const subjectColors = [
    '#e17055', '#f39c12', '#e74c3c', '#27ae60', '#3498db',
    '#9b59b6', '#f1c40f', '#e67e22', '#2ecc71', '#8e44ad'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSubjects();
  }, [subjects, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptResponse, subResponse] = await Promise.all([
        departmentApi.getAll(),
        subjectApi.getAll()
      ]);
      
      setDepartments(deptResponse.data?.results || deptResponse.data || []);
      setSubjects(subResponse.data.results || subResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterSubjects = () => {
    let filtered = [...subjects];
    if (searchQuery) {
      filtered = filtered.filter(subject =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredSubjects(filtered);
  };

  const handleMenuClick = (event, subject) => {
    setMenuAnchor(event.currentTarget);
    setSelectedSubject(subject);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSubject(null);
  };

  const handleAdd = () => {
    setSubjectForm({
      name: '',
      description: '',
      department: '',
      color: '#e17055',
      code: ''
    });
    setAddDialog(true);
  };

  const handleEdit = () => {
    setSubjectForm({
      name: selectedSubject.name,
      description: selectedSubject.description,
      department: selectedSubject.department,
      color: selectedSubject.color,
      code: selectedSubject.code
    });
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleSaveSubject = async () => {
    try {
      if (selectedSubject) {
        // Update
        await subjectApi.update(selectedSubject.department_id, subjectForm);
        setSubjects(subjects.map(s =>
          s.department_id === selectedSubject.department_id ? { ...s, ...subjectForm } : s
        ));
        setSnackbar({ open: true, message: 'Subject updated successfully', severity: 'success' });
      } else {
        // Create
        const response = await subjectApi.create(subjectForm);
        setSubjects([...subjects, response.data]);
        setSnackbar({ open: true, message: 'Subject created successfully', severity: 'success' });
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      setSnackbar({ open: true, message: 'Failed to save subject', severity: 'error' });
    } finally {
      setEditDialog(false);
      setSelectedSubject(null);
    }
  };

  const confirmDelete = async () => {
    try {
      await subjectApi.delete(selectedSubject.department_id);
      setSubjects(subjects.filter(s => s.department_id !== selectedSubject.department_id));
      setSnackbar({ open: true, message: 'Subject deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting subject:', error);
      setSnackbar({ open: true, message: 'Failed to delete subject', severity: 'error' });
    } finally {
      setDeleteDialog(false);
      setSelectedSubject(null);
    }
  };

  const SubjectCard = ({ subject }) => (
    <Grow in={true} timeout={600}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: subject.color }}>
                <Book />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                  {subject.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {subject.code}
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={(e) => handleMenuClick(e, subject)}
              sx={{ color: subject.color }}
            >
              <MoreVert />
            </IconButton>
          </Box>

          <Typography variant="body2" sx={{ 
            color: 'text.secondary',
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {subject.description}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip 
              label={subject.department}
              size="small"
              sx={{
                backgroundColor: `${subject.color}20`,
                color: subject.color,
                fontWeight: 600
              }}
            />
            <Chip 
              label={`${subject.quizCount} Quizzes`}
              size="small"
              sx={{
                backgroundColor: `${warmColors.secondary}20`,
                color: warmColors.secondary,
                fontWeight: 600
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              size="small"
              onClick={() => navigate(`/teacher/subjects/${subject.id}/quizzes`)}
              sx={{
                color: subject.color,
                fontWeight: 600,
                '&:hover': { backgroundColor: `${subject.color}10` }
              }}
            >
              View Quizzes
            </Button>
            <Button
              size="small"
              onClick={() => navigate(`/teacher/quiz/create?subject=${subject.id}`)}
              sx={{
                color: warmColors.success,
                fontWeight: 600,
                '&:hover': { backgroundColor: `${warmColors.success}10` }
              }}
            >
              Create Quiz
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  const StatsCard = ({ icon: Icon, title, value, color }) => (
    <Grow in={true} timeout={800}>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
          border: `1px solid ${color}20`,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 1 }}>
                {loading ? <Skeleton width={60} /> : value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {title}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: color, width: 56, height: 56, boxShadow: `0 4px 12px ${color}30` }}>
              <Icon sx={{ fontSize: 28 }} />
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  if (error) {
    return (
      <TeacherLayout>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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
            <Typography variant="h4" sx={{
              fontWeight: 700,
              color: '#333',
              mb: 1,
              background: 'linear-gradient(135deg, #e17055 0%, #f39c7a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Subject Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Organize and manage your subjects
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              bgcolor: '#e17055',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              '&:hover': { bgcolor: '#d4624a' },
            }}
          >
            Add Subject
          </Button>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              icon={Subject}
              title="Total Subjects"
              value={subjects.length}
              color={warmColors.primary}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              icon={Category}
              title="Departments"
              value={departments.length}
              color={warmColors.secondary}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              icon={Quiz}
              title="Total Quizzes"
              value={subjects.reduce((sum, s) => sum + s.quizCount, 0)}
              color={warmColors.success}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              icon={Assignment}
              title="Active Subjects"
              value={subjects.filter(s => s.quizCount > 0).length}
              color={warmColors.accent}
            />
          </Grid>
        </Grid>

        {/* Search Bar */}
        <Paper sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
          border: '1px solid rgba(225, 112, 85, 0.1)',
          borderRadius: 3,
          mb: 4,
        }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#e17055' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { borderColor: '#e17055' },
                  '&.Mui-focused fieldset': { borderColor: '#e17055' },
                },
              }}
            />
          </CardContent>
        </Paper>

        {/* Subjects Grid */}
        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Skeleton height={120} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredSubjects.length > 0 ? (
          <Grid container spacing={3}>
            {filteredSubjects.map((subject) => (
              <Grid item xs={12} md={6} key={subject.department_id}>
                <SubjectCard subject={subject} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
            border: '1px solid rgba(225, 112, 85, 0.1)',
            borderRadius: 3,
            textAlign: 'center',
            py: 8,
          }}>
            <Subject sx={{ fontSize: 64, color: '#e17055', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#333', mb: 1 }}>
              No subjects found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Create your first subject to get started
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAdd}
              sx={{ bgcolor: '#e17055', '&:hover': { bgcolor: '#d4624a' } }}
            >
              Add Subject
            </Button>
          </Card>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => navigate(`/teacher/subjects/${selectedSubject?.id}`)}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View Subject
          </MenuItem>
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit Subject
          </MenuItem>
          <MenuItem onClick={() => navigate(`/teacher/subjects/${selectedSubject?.id}/quizzes`)}>
            <Quiz fontSize="small" sx={{ mr: 1 }} />
            View Quizzes
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Subject
          </MenuItem>
        </Menu>

        {/* Add/Edit Dialog */}
        <Dialog
          open={addDialog || editDialog}
          onClose={() => {
            setAddDialog(false);
            setEditDialog(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: warmColors.textPrimary }}>
            {editDialog ? 'Edit Subject' : 'Add New Subject'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Subject Name"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Subject Code"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                    multiline
                    rows={3}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={subjectForm.department}
                      onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                      label="Department"
                    >
                      {departments.map(dept => (
                        <MenuItem key={dept.id} value={dept.name}>{dept.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Color</InputLabel>
                    <Select
                      value={subjectForm.color}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      label="Color"
                    >
                      {subjectColors.map(color => (
                        <MenuItem key={color} value={color}>
                          <Box display="flex" alignItems="center">
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: color,
                                mr: 1
                              }}
                            />
                            {color}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setAddDialog(false);
              setEditDialog(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSubject} 
              variant="contained"
              sx={{
                backgroundColor: warmColors.primary,
                '&:hover': { backgroundColor: warmColors.accent }
              }}
            >
              {editDialog ? 'Update' : 'Add'} Subject
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ color: warmColors.textPrimary }}>
            Delete Subject
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedSubject?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={confirmDelete} 
              color="error" 
              variant="contained"
              sx={{
                backgroundColor: warmColors.accent,
                '&:hover': { backgroundColor: '#c0392b' }
              }}
            >
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
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </TeacherLayout>
  );
};

export default TeacherSubjectSection;
