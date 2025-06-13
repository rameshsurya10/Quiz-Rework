import React, { useState, useEffect, useCallback } from 'react';
import { teacherApi, departmentApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import TeacherForm from './TeacherForm';
import { 
  Grid, Typography, Card, CardContent, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, InputAdornment, Avatar, Paper, CardActionArea, Divider
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
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
  

  // Fetch teacher data from the API
  const fetchTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch departments first
      const [teachersRes, deptsRes] = await Promise.all([
        teacherApi.getAll().catch(err => {
          console.error('Error fetching teachers:', err);
          return { data: { results: [] } };
        }),
        departmentApi.getAll().catch(err => {
          console.error('Error fetching departments:', err);
          return { data: { results: [] } };
        })
      ]);

      const teachersData = Array.isArray(teachersRes.data) 
        ? teachersRes.data 
        : (teachersRes.data?.results || []);
      
      const deptData = Array.isArray(deptsRes.data)
        ? deptsRes.data
        : (deptsRes.data?.results || []);

      console.log('Fetched data:', { teachers: teachersData.length, departments: deptData.length });

      // Process teacher data to match our form structure
      const processedTeachers = teachersData.map(teacher => {
        // Handle both possible response formats
        const userData = teacher.user || teacher;
        const department = teacher.department || 
                         (Array.isArray(teacher.departments) && teacher.departments[0]) ||
                         { id: null, name: 'Unassigned' };
        
        return {
          id: teacher.id,
          name: teacher.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || userData.phone_number || '',
          department: typeof department === 'string' ? department : department.name,
          departmentId: typeof department === 'object' ? department.id : null
        };
      });

      setTeacherData(processedTeachers);
      setDepartments(deptData);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalTeachers: processedTeachers.length,
        departments: deptData.length
      }));
      
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

  const handleTeacherCreateSuccess = async () => {
    showMessage('Teacher added successfully!');
    setOpenDialog(false);
    await fetchTeacherData(); // Refresh the list of teachers
  };

  const handleTeacherCreateCancel = () => {
    setOpenDialog(false);
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
              <DialogContent sx={{ p: 0, '& .MuiDialogContent-root': { padding: 0 } }}>
                <TeacherForm 
                  onSuccess={handleTeacherCreateSuccess} 
                  onCancel={handleTeacherCreateCancel} 
                />
              </DialogContent>
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
          disableEscapeKeyDown={false}
          disableScrollLock={true}
          PaperProps={{
            sx: {
              maxHeight: '90vh',
              minHeight: '60vh',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              '& .MuiDialogTitle-root': {
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              },
              '& .MuiDialogContent-root': {
                flex: '1 1 auto',
                overflowY: 'auto',
                position: 'relative',
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: theme.palette.action.hover,
                  borderRadius: '3px'
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: theme.palette.action.selected
                },
                '& .MuiFormControl-root': {
                  zIndex: 'auto',
                  position: 'relative'
                }
              }
            }
          }}
        >
          <DialogTitle sx={{ 
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}>
            Add New Teacher
            <IconButton 
              onClick={() => setOpenDialog(false)}
              sx={{ color: 'primary.contrastText' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ 
            padding: 0, // Use padding: 0 as TeacherForm has its own padding
            flex: '1 1 auto',
            overflowY: 'auto'
            // Removed MuiFormControl-root style, TeacherForm manages internal spacing
          }}>
            <TeacherForm 
              onSuccess={handleTeacherCreateSuccess}
              onCancel={handleTeacherCreateCancel}
            />
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
