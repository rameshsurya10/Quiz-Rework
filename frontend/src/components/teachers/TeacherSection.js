import React, { useState, useEffect } from 'react';
import { 
  Grid, Typography, Card, CardContent, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, InputLabel, MenuItem, Select,
  Skeleton, Snackbar, Alert, Chip, alpha, Paper,
  Avatar, Divider, useTheme, useMediaQuery, Container,
  CircularProgress, InputAdornment, CardActionArea, CardActions
} from "@mui/material";
import { motion, AnimatePresence } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { 
  Person as PersonIcon, 
  Business as BusinessIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Work as WorkIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import apiService from "../../api";


// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 0.3s ease',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.paper,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.1)'
  }
}));

const StatsBadge = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  borderRadius: 12,
  background: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    background: theme.palette.action.hover,
    transform: 'translateY(-2px)'
  }
}));

const TeacherAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  fontSize: '2rem',
  margin: '0 auto 16px',
  boxShadow: theme.shadows[3]
}));

const DepartmentChip = styled(Chip)(({ theme }) => ({
  margin: '4px',
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  fontWeight: 500
}));

const TeacherSection = ({ initialOpenDialog = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(initialOpenDialog);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department_id: '',
    qualification: '',
    phone: ''
  });
  
  // Keep track of sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Filter teachers based on search and department
  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || 
                            (teacher.departments && teacher.departments.some(dept => 
                              dept.name === selectedDepartment));
    return matchesSearch && matchesDepartment;
  });

  // Toggle sidebar
  const toggleSidebar = () => {
    // This should be implemented in the parent component
    // and passed as a prop if needed
    console.log('Toggle sidebar');
  };

  // Fetch teachers and departments
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch teachers
      const [teachersResponse, deptResponse] = await Promise.all([
        apiService.api.get('api/accounts/teachers/'),
        apiService.api.get('api/departments/')
      ]);

      if (teachersResponse?.data) {
        setTeachers(teachersResponse.data);
      }

      if (deptResponse?.data) {
        setDepartments(deptResponse.data);
      }

      showMessage('Data loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Failed to load data. Please try again later.', 'error');
      // Clear any existing data on error
      setTeachers([]);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update document title
  useEffect(() => {
    document.title = 'Teachers | Quiz App';
  }, []);

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.email || !formData.department_id) {
        showMessage('Please fill all required fields', 'error');
        return;
      }

      const response = await apiService.api.post('api/accounts/teachers/', formData);
      if (response.data) {
        setTeachers([...teachers, response.data]);
        showMessage('Teacher added successfully', 'success');
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
      showMessage(error.response?.data?.message || 'Failed to add teacher', 'error');
    }
  };

  // Calculate stats
  const stats = {
    totalTeachers: teachers.length,
    totalDepartments: departments.length,
    totalQuizzes: teachers.reduce((sum, t) => sum + (t.quizzes_created || 0), 0),
    publishedQuizzes: teachers.reduce((sum, t) => sum + (t.quizzes_published || 0), 0)
  };

  // Define drawer width for the layout calculation
  const drawerWidth = 240;

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 2.5,
        m: 0,
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container 
        maxWidth={false} 
        disableGutters
        sx={{ 
          width: '100%',
          p: 0,
          maxWidth: '100% !important'
        }}
      >
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 4,
          gap: 2,
          position: 'relative',
          zIndex: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              Teacher Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage all teachers and their information
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            Add Teacher
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            size={isMobile ? 'small' : 'medium'}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Search and Filter */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth={isMobile}
          variant="outlined"
          placeholder="Search teachers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ 
            maxWidth: 400,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Department</InputLabel>
          <Select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            label="Department"
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.name}>
                {dept.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Teachers', value: stats.totalTeachers, icon: <PersonIcon />, color: 'primary' },
          { label: 'Departments', value: stats.totalDepartments, icon: <BusinessIcon />, color: 'secondary' },
          { label: 'Quizzes Created', value: stats.totalQuizzes, icon: <SchoolIcon />, color: 'success' },
          { label: 'Published', value: stats.publishedQuizzes, icon: <CheckCircleIcon />, color: 'info' }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StyledCard>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '50%',
                        bgcolor: `${stat.color}.light`,
                        color: `${stat.color}.dark`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {React.cloneElement(stat.icon, { fontSize: 'large' })}
                    </Box>
                  </Box>
                </CardContent>
              </StyledCard>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Teachers Grid */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            {filteredTeachers.length} {filteredTeachers.length === 1 ? 'Teacher' : 'Teachers'} Found
          </Typography>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<FilterListIcon />}
            onClick={() => {
              // Handle filter dialog open
            }}
          >
            Filters
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          <AnimatePresence>
            {teachers.map((teacher, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={teacher.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <StyledCard>
                    <CardActionArea>
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <TeacherAvatar 
                          src={teacher.avatar}
                          sx={{ 
                            bgcolor: 'primary.main',
                            mb: 2,
                            width: 80,
                            height: 80,
                            fontSize: '2rem',
                            margin: '0 auto 16px',
                            boxShadow: theme.shadows[3]
                          }}
                        >
                          {teacher.name.charAt(0)}
                        </TeacherAvatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {teacher.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'center' }}>
                            <EmailIcon color="action" sx={{ fontSize: 16, mr: 1 }} />
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {teacher.email}
                            </Typography>
                          </Box>
                          
                          {teacher.phone_number && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'center' }}>
                              <PhoneIcon color="action" sx={{ fontSize: 16, mr: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {teacher.phone_number}
                              </Typography>
                            </Box>
                          )}
                          
                          {teacher.departments && teacher.departments.length > 0 && (
                            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5 }}>
                              {teacher.departments.map((dept, idx) => (
                                <Chip 
                                  key={idx}
                                  label={dept.name}
                                  size="small"
                                  icon={<WorkIcon />}
                                  sx={{ 
                                    bgcolor: 'primary.light',
                                    color: 'primary.contrastText',
                                    '& .MuiChip-icon': {
                                      color: 'primary.contrastText',
                                      opacity: 0.8
                                    }
                                  }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                        <Button size="small" color="primary">
                          View Profile
                        </Button>
                        <Button size="small" color="primary" variant="outlined">
                          Message
                        </Button>
                      </CardActions>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <CardContent sx={{ pt: 0 }}>
                        <Box display="flex" justifyContent="space-between" textAlign="center">
                          <StatsBadge>
                            <Typography variant="body2" color="text.secondary">Created</Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {teacher.quizzes_created || 0}
                            </Typography>
                          </StatsBadge>
                          <StatsBadge>
                            <Typography variant="body2" color="text.secondary">Published</Typography>
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                              {teacher.quizzes_published || 0}
                            </Typography>
                          </StatsBadge>
                          <StatsBadge>
                            <Typography variant="body2" color="text.secondary">Rate</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                              {teacher.quizzes_created 
                                ? `${Math.round(((teacher.quizzes_published || 0) / teacher.quizzes_created) * 100)}%`
                                : '0%'}
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

      {/* Add Teacher Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add New Teacher</DialogTitle>
        <DialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Department</InputLabel>
                  <Select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleInputChange}
                    label="Department"
                    required
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmit}
          >
            Add Teacher
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
