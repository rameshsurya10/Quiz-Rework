import React, { useState, useEffect } from 'react';
import { 
  Grid, Typography, Card, CardContent, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, InputLabel, MenuItem, Select,
  Skeleton, Snackbar, Alert, Chip, alpha, Paper,
  Avatar, Divider, Grow, Fade, Slide, useTheme
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useSpring, animated } from '@react-spring/web';
import apiService from "../api";

const TeacherSection = () => {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department_id: '',
    qualification: '',
    phone: ''
  });

  // Fetch teachers and departments data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Check authentication
      if (!apiService.isAuthenticated()) {
        showMessage('Please login to access teacher data', 'error');
        return;
      }

      // Fetch teachers data
      const teachersResponse = await apiService.api.get('api/accounts/teachers/');
      
      if (teachersResponse?.data) {
        setTeachers(teachersResponse.data);
      }

      // Fetch departments data (if needed)
      // Note: You'll need to implement the departments API if needed
      // For now, we'll use the mock data for departments
      setDepartments([
        { id: 1, name: 'Computer Science' },
        { id: 2, name: 'Mathematics' },
        { id: 3, name: 'Physics' },
        { id: 4, name: 'Chemistry' },
        { id: 5, name: 'Biology' }
      ]);

      showMessage('Teacher data loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showMessage('Failed to load teacher data', 'error');
      
      // Use mock data for development/testing
      setTeachers([
        { 
          id: 1, 
          name: 'Dr. John Smith', 
          email: 'john.smith@example.com',
          department: { id: 1, name: 'Computer Science' },
          qualification: 'Ph.D in Computer Science',
          phone: '+1 (555) 123-4567',
          quizzes_created: 15,
          quizzes_published: 12,
          created_at: '2024-12-01T09:00:00Z'
        },
        { 
          id: 2, 
          name: 'Prof. Sarah Johnson', 
          email: 'sarah.johnson@example.com',
          department: { id: 2, name: 'Mathematics' },
          qualification: 'Ph.D in Mathematics',
          phone: '+1 (555) 987-6543',
          quizzes_created: 8,
          quizzes_published: 7,
          created_at: '2025-01-15T10:30:00Z'
        },
        { 
          id: 3, 
          name: 'Dr. Michael Chen', 
          email: 'michael.chen@example.com',
          department: { id: 3, name: 'Physics' },
          qualification: 'Ph.D in Theoretical Physics',
          phone: '+1 (555) 456-7890',
          quizzes_created: 10,
          quizzes_published: 9,
          created_at: '2025-02-20T14:15:00Z'
        }
      ]);
      
      setDepartments([
        { id: 1, name: 'Computer Science', teacher_count: 5 },
        { id: 2, name: 'Mathematics', teacher_count: 3 },
        { id: 3, name: 'Physics', teacher_count: 4 },
        { id: 4, name: 'Biology', teacher_count: 2 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show message function
  const showMessage = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message: message,
      severity: severity,
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.email || !formData.department_id) {
        showMessage('Please fill all required fields', 'error');
        return;
      }

      // Submit data to API
      const response = await apiService.useCRUD().create('api/teachers', formData);
      
      if (response?.id) {
        // If successful, add new teacher to state
        const newTeacher = {
          ...response,
          department: departments.find(d => d.id === parseInt(formData.department_id)),
          quizzes_created: 0,
          quizzes_published: 0
        };
        
        setTeachers([...teachers, newTeacher]);
        showMessage('Teacher added successfully', 'success');
        
        // Close dialog and reset form
        setOpenDialog(false);
        setFormData({
          name: '',
          email: '',
          department_id: '',
          qualification: '',
          phone: ''
        });
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      showMessage('Failed to add teacher', 'error');
    }
  };

  useEffect(() => {
    // Fetch data when component mounts
    fetchData();
  }, []);

  // Render loading skeleton
  const renderSkeletons = () => (
    <Grid container spacing={3}>
      {[...Array(4)].map((_, index) => (
        <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
        </Grid>
      ))}
    </Grid>
  );

  // Calculate summary stats
  const totalTeachers = teachers.length;
  const totalDepartments = departments.length;
  const totalQuizzesCreated = teachers.reduce((sum, teacher) => sum + (teacher.quizzes_created || 0), 0);
  const totalQuizzesPublished = teachers.reduce((sum, teacher) => sum + (teacher.quizzes_published || 0), 0);

  // Animated counters using react-spring
  const teacherSpring = useSpring({ val: totalTeachers, from: { val: 0 }, config: { duration: 700 } });
  const deptSpring = useSpring({ val: totalDepartments, from: { val: 0 }, config: { duration: 700 } });

  const theme = useTheme();

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'relative',
        p: { xs: 2, sm: 4 },
        borderRadius: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, #fff 100%)`,
        mb: 4,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.10)',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s',
        '&:hover': { boxShadow: '0 16px 40px 0 rgba(31,38,135,0.15)' }
      }}
    >
      {/* Header with stats and actions */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={4}
        sx={{
          background: `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`,
          borderRadius: 3,
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 4 },
          mb: 4,
          boxShadow: '0 2px 12px 0 rgba(31,38,135,0.08)'
        }}
      >
        <Box>
          <Typography variant="h5" component="h2" fontWeight="bold" mb={1} sx={{ letterSpacing: 1, color: theme.palette.primary.dark }}>
            Teacher Management
          </Typography>
          <Box display="flex" gap={2}>
            <Box display="flex" alignItems="center">
              <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
              <Typography variant="body2">
                <strong><animated.span>{teacherSpring.val.to(val => Math.floor(val))}</animated.span></strong> Teachers
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <BusinessIcon fontSize="small" sx={{ mr: 0.5, color: 'secondary.main' }} />
              <Typography variant="body2">
                <strong><animated.span>{deptSpring.val.to(val => Math.floor(val))}</animated.span></strong> Departments
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            size="small"
            sx={{
              borderRadius: 3,
              fontWeight: 600,
              boxShadow: '0 2px 8px 0 rgba(31,38,135,0.08)',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(33,150,243,0.2)' },
                '70%': { boxShadow: '0 0 0 10px rgba(33,150,243,0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(33,150,243,0)' }
              },
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.07)' }
            }}
          >
            Add Teacher
          </Button>
          <IconButton 
            color="primary"
            onClick={fetchData}
            title="Refresh"
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'primary.light',
              background: alpha(theme.palette.primary.light, 0.08),
              transition: 'background 0.2s, transform 0.2s',
              '&:hover': { background: alpha(theme.palette.primary.light, 0.18), transform: 'rotate(120deg) scale(1.13)' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Teacher cards grid */}
      {isLoading ? (
        renderSkeletons()
      ) : (
        <Grid container spacing={3}>
          {teachers.map((teacher, idx) => (
            <Grow in timeout={450 + idx * 120} key={teacher.id}>
              <Grid item xs={12} sm={6} md={4}>
                <Card 
                  elevation={3}
                  sx={{ 
                    borderRadius: 4,
                    transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.07)} 0%, #fff 100%)`,
                    boxShadow: '0 4px 24px 0 rgba(31,38,135,0.10)',
                    '&:hover': {
                      transform: 'translateY(-8px) scale(1.03)',
                      boxShadow: '0 16px 40px 0 rgba(31,38,135,0.18)',
                      background: `linear-gradient(120deg, ${alpha(theme.palette.primary.light, 0.14)} 0%, #fff 100%)`,
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'primary.main',
                          width: 54,
                          height: 54,
                          mr: 2,
                          fontSize: 28,
                          boxShadow: '0 2px 8px 0 rgba(33,150,243,0.14)'
                        }}
                      >
                        {teacher.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: 0.5 }}>
                          {teacher.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {teacher.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Box mb={2}>
                      <Chip 
                        label={teacher.department?.name || 'Unassigned'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600, letterSpacing: 0.3, px: 1.5 }}
                      />
                    </Box>
                    <Typography variant="body2" mb={0.5}>
                      <strong>Qualification:</strong> {teacher.qualification || 'N/A'}
                    </Typography>
                    <Typography variant="body2" mb={2}>
                      <strong>Phone:</strong> {teacher.phone || 'N/A'}
                    </Typography>
                    <Divider sx={{ my: 1.5 }} />
                    <Box display="flex" justifyContent="space-between" mt={2}>
                      <Box textAlign="center">
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                          {teacher.quizzes_created || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h6" color="success.main" fontWeight="bold">
                          {teacher.quizzes_published || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Published
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="h6" color="info.main" fontWeight="bold">
                          {Math.round(((teacher.quizzes_published || 0) / (teacher.quizzes_created || 1)) * 100)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Publish Rate
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grow>
          ))}
        </Grid>
      )}


      {/* Add teacher dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: `linear-gradient(120deg, #fff 80%, ${alpha(theme.palette.secondary.light, 0.13)} 100%)`,
            boxShadow: '0 8px 32px 0 rgba(31,38,135,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, letterSpacing: 0.5, color: theme.palette.primary.dark }}>Add New Teacher</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Full Name"
            name="name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange}
            required
            sx={{ mb: 2, mt: 1, borderRadius: 2, background: alpha(theme.palette.primary.light, 0.05) }}
          />
          <TextField
            margin="dense"
            label="Email Address"
            name="email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={handleInputChange}
            required
            sx={{ mb: 2, borderRadius: 2, background: alpha(theme.palette.primary.light, 0.05) }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2, borderRadius: 2, background: alpha(theme.palette.primary.light, 0.03) }}>
            <InputLabel id="department-select-label">Department</InputLabel>
            <Select
              labelId="department-select-label"
              name="department_id"
              value={formData.department_id}
              label="Department"
              onChange={handleInputChange}
              required
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Qualification"
            name="qualification"
            fullWidth
            variant="outlined"
            value={formData.qualification}
            onChange={handleInputChange}
            sx={{ mb: 2, borderRadius: 2, background: alpha(theme.palette.primary.light, 0.05) }}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            name="phone"
            fullWidth
            variant="outlined"
            value={formData.phone}
            onChange={handleInputChange}
            sx={{ borderRadius: 2, background: alpha(theme.palette.primary.light, 0.05) }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" sx={{ fontWeight: 600 }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 550 }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%', fontWeight: 600, letterSpacing: 0.3, borderRadius: 2, boxShadow: '0 2px 8px 0 rgba(33,150,243,0.12)' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default TeacherSection;

