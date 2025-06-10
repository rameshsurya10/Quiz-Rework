import React, { useState, useEffect, useCallback } from 'react';
import { teacherApi, departmentApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import { 
  Grid, Typography, Card, CardContent, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, InputAdornment, Avatar, Paper, CardActionArea, Divider
} from "@mui/material";
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { 
  Person as PersonIcon, 
  Business as BusinessIcon,
  Add as AddIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';


// Styled Components
const DashboardStyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)',
  background: `linear-gradient(135deg, ${alpha(theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease-in-out',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 6px 22px 0 rgba(0,0,0,0.07)',
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(2),
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  }
}));

// If StyledCard is used for other purposes, keep it. Otherwise, this line can be removed.
const StyledCard = DashboardStyledCard;

const StatsBadge = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  borderRadius: 12,
  background: theme.palette.background.default,
  minWidth: 80
}));

const TeacherAvatar = styled(Avatar)(({ theme }) => ({
  width: 100,
  height: 100,
  margin: '0 auto 16px',
  fontSize: 40,
  background: theme.palette.primary.main
}));

const TeacherSection = ({ initialOpenDialog = false }) => {
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('md')); // Used for responsive behavior
  const [openDialog, setOpenDialog] = useState(initialOpenDialog);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [teacherData, setTeacherData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeTeachers: 0,
    departments: 0,
    averageRating: 0
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    employeeId: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch teacher data from the API
  const fetchTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use separate try/catch for each API call to prevent one failure from affecting the other
      let teachersData = [];
      let deptData = [];
      
      try {
        const teachersRes = await teacherApi.getAll();
        teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data?.results || []);
        console.log('Successfully fetched teachers:', teachersData.length);
      } catch (teacherError) {
        console.error('Error fetching teachers:', teacherError);
        // Continue execution even if teacher fetch fails
      }
      
      try {
        const deptsRes = await departmentApi.getAll();
        deptData = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.results || []);
        console.log('Successfully fetched departments:', deptData.length);
      } catch (deptError) {
        console.error('Error fetching departments:', deptError);
        // Continue execution even if department fetch fails
      }
      
      // Process teacher data to ensure consistent format
      const processedTeachers = teachersData.map(teacher => ({
        id: teacher.id,
        name: teacher.full_name || `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim(),
        position: teacher.specialization || 'Teacher',
        department: Array.isArray(teacher.departments) && teacher.departments.length > 0 
          ? teacher.departments[0].name 
          : 'Unassigned',
        email: teacher.user?.email || '',
        phone: teacher.phone_number || '',
        employee_id: teacher.employee_id || ''
      }));
      
      setTeacherData(processedTeachers);
      
      // Process department data
      setDepartments(deptData);
      
      // Update stats
      setStats({
        totalTeachers: processedTeachers.length,
        activeTeachers: processedTeachers.filter(t => t.active !== false).length,
        departments: deptData.length,
        averageRating: 4.0 // Placeholder until we have real rating data
      });
      
    } catch (error) {
      console.error('Error in overall fetchTeacherData process:', error);
      showMessage('Failed to load data: ' + (error.response?.data?.detail || error.message), 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // Handle initial dialog state from props
  useEffect(() => {
    setOpenDialog(initialOpenDialog);
  }, [initialOpenDialog]);

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.department) errors.department = 'Department is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (data) => {
    try {
      // Add new teacher through API
      await teacherApi.create({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_number: data.phone || '',
        department_name: data.department,
        employee_id: data.employeeId || `EMP-${Math.floor(Math.random() * 10000)}`
      });
      
      showMessage('Teacher added successfully');
      setOpenDialog(false);
      fetchTeacherData(); // Refresh the list
    } catch (error) {
      console.error('Error adding teacher:', error);
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         error.response?.data?.detail ||
                         'Failed to add teacher';
      showMessage(errorMessage, 'error');
    }
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        py: 2,
        px: { xs: 2, sm: 3 },
        transition: theme.transitions.create('margin', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: 0,
      }}
    >
      <Container 
        maxWidth={false} 
        disableGutters
        sx={{ 
          p: 3,
          maxWidth: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4,
        }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Teacher Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage teachers and their details
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ mt: { xs: 2, sm: 0 } }}
          >
            Add New Teacher
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { title: 'Total Teachers', value: stats.totalTeachers, icon: <PersonIcon />, color: 'primary' },
            { title: 'Active Now', value: stats.activeTeachers, icon: <CheckCircleIcon />, color: 'success' },
            { title: 'Departments', value: stats.departments, icon: <BusinessIcon />, color: 'secondary' },
            { title: 'Avg. Rating', value: stats.averageRating.toFixed(1), icon: <SchoolIcon />, color: 'warning' },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index} sx={{ display: 'flex' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{ width: '100%' }}
              >
                <DashboardStyledCard>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {stat.title}
                      </Typography>
                      <Avatar sx={{ 
                        bgcolor: alpha(theme.palette[stat.color]?.main || theme.palette.primary.main, 0.1),
                        color: theme.palette[stat.color]?.main || theme.palette.primary.main,
                        width: 40,
                        height: 40,
                      }}>
                        {React.cloneElement(stat.icon, { sx: { fontSize: '1.25rem' } })}
                      </Avatar>
                    </Box>
                    <Box mt={1}>
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  </CardContent>
                </DashboardStyledCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Teachers Grid */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              All Teachers
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search teachers..."
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => {}}
              >
                Filter
              </Button>
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : teacherData.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No teachers found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Get started by adding a new teacher
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Add Teacher
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              <AnimatePresence>
                {teacherData.map((teacher, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={teacher.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <StyledCard>
                        <CardActionArea>
                          <CardContent sx={{ p: 3, textAlign: 'center' }}>
                            <TeacherAvatar 
                              src={teacher.user?.profile?.avatar}
                              sx={{ 
                                width: 80, 
                                height: 80, 
                                mb: 2,
                                mx: 'auto',
                                bgcolor: theme.palette.primary.main
                              }}
                            >
                              {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                            </TeacherAvatar>
                            <Typography variant="h6" component="div" gutterBottom>
                              {teacher.first_name} {teacher.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {teacher.position}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {teacher.department}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
                              <IconButton size="small" color="primary">
                                <EmailIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="primary">
                                <PhoneIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </CardContent>
                          <CardContent sx={{ pt: 0 }}>
                            <Box display="flex" justifyContent="space-between" textAlign="center">
                              <StatsBadge>
                                <Typography variant="body2" color="text.secondary">Created</Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {new Date(teacher.created_at).toLocaleDateString()}
                                </Typography>
                              </StatsBadge>
                              <Divider orientation="vertical" flexItem />
                              <StatsBadge>
                                <Typography variant="body2" color="text.secondary">Students</Typography>
                                <Typography variant="h6" fontWeight="bold">
                                  {teacher.student_count || '0'}
                                </Typography>
                              </StatsBadge>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </StyledCard>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          )}
        </Box>

        {/* Add Teacher Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={(e) => {
                e.preventDefault();
                if (!validateForm()) return;
                handleFormSubmit(formData);
              }} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={!!formErrors.firstName}
                    helperText={formErrors.firstName}
                    margin="normal"
                    required
                    autoFocus
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={!!formErrors.lastName}
                    helperText={formErrors.lastName}
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal" error={!!formErrors.department}>
                    <InputLabel id="department-select-label">Department *</InputLabel>
                    <Select
                      labelId="department-select-label"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      label="Department *"
                      required
                    >
                      {departments.length > 0 ? (
                        departments.map((dept) => (
                          <MenuItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          No departments available
                        </MenuItem>
                      )}
                    </Select>
                    {formErrors.department && (
                      <FormHelperText>{formErrors.department}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Employee ID"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    margin="normal"
                    required
                    error={!!formErrors.employeeId}
                    helperText={formErrors.employeeId}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Grid>
              </Grid>
              <DialogActions sx={{ mt: 3, justifyContent: 'flex-end' }}>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  Add Teacher
                </Button>
              </DialogActions>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Success Message */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default TeacherSection;
