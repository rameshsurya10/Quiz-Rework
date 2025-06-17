import React, { useState, useEffect, useCallback } from 'react';
import { teacherApi, departmentApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import TeacherForm from './TeacherForm';
import { 
  Grid, Typography, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, InputAdornment, Avatar, Paper, Divider,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip
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
  Phone as PhoneIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import SummaryCard from '../common/SummaryCard';

const TeacherAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  margin: '0 auto 16px',
  border: `3px solid ${theme.palette.primary.main}`,
  fontSize: '2rem',
}));

const TeacherSection = ({ initialOpenDialog = false }) => {


  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('md')); // Used for responsive behavior
  const [openDialog, setOpenDialog] = useState(initialOpenDialog);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [teacherData, setTeacherData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [viewTeacher, setViewTeacher] = useState(null);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    departments: 0,
  });

  const fetchTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teachersRes, deptsRes] = await Promise.all([
        teacherApi.getAll({ page_size: 1000 }),
        departmentApi.getAll({ page_size: 1000 }),
      ]);

      const teachersData = teachersRes.data?.results || (Array.isArray(teachersRes.data) ? teachersRes.data : []);
      const deptData = deptsRes.data?.results || (Array.isArray(deptsRes.data) ? deptsRes.data : []);

      const processedTeachers = teachersData.map(teacher => {
        const userData = teacher.user || teacher;
        const department = teacher.department || (Array.isArray(teacher.departments) && teacher.departments[0]) || { id: null, name: 'Unassigned' };
        
        return {
          id: teacher.id,
          name: teacher.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || userData.phone_number || '',
          department: typeof department === 'string' ? department : department.name,
          departmentId: department.id,
          created_at: teacher.created_at || userData.date_joined,
          avatar: userData.profile?.avatar,
          student_count: teacher.student_count || 0,
        };
      });

      setTeacherData(processedTeachers);
      setDepartments(deptData);
      
      setStats({
        totalTeachers: processedTeachers.length,
        departments: deptData.length,
      });
      
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      showMessage('Failed to load teacher data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  useEffect(() => {
    setOpenDialog(initialOpenDialog);
  }, [initialOpenDialog]);

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTeacherCreateSuccess = async () => {
    showMessage('Teacher added successfully!');
    setOpenDialog(false);
    await fetchTeacherData();
  };

  const handleTeacherCreateCancel = () => {
    setOpenDialog(false);
  };

  const handleOpenViewDialog = (teacher) => {
    setViewTeacher(teacher);
  };

  const handleCloseViewDialog = () => {
    setViewTeacher(null);
  };

  const filteredTeachers = [...teacherData]; // Keep the data structure but remove filtering

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
            { title: 'Departments', value: stats.departments, icon: <BusinessIcon />, color: 'secondary' },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <SummaryCard
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={theme.palette[stat.color]?.main || theme.palette.primary.main}
                index={index}
              />
            </Grid>
          ))}
        </Grid>

        {/* Teachers Grid */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              All Teachers
            </Typography>
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
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Your filters might be too specific. Try adjusting them.
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
                {filteredTeachers.map((teacher, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={teacher.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <Paper
                        onClick={() => handleOpenViewDialog(teacher)}
                        variant="outlined"
                        sx={{
                          borderRadius: 3,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            boxShadow: theme.shadows[8],
                            transform: 'translateY(-4px)'
                          }
                        }}
                      >
                        <Box sx={{ p: 3, textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <TeacherAvatar src={teacher.avatar}>
                            {teacher.name ? teacher.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
                          </TeacherAvatar>
                          <Typography variant="h6" component="div" noWrap>
                            {teacher.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {departments.find(d => d.id === teacher.departmentId)?.name || teacher.department || 'No Department'}
                          </Typography>
                          <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'center', gap: 1, mt: 1 }}>
                            <IconButton size="small" color="primary" component="a" href={`mailto:${teacher.email}`} disabled={!teacher.email} onClick={(e) => e.stopPropagation()}>
                              <EmailIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="primary" component="a" href={`tel:${teacher.phone}`} disabled={!teacher.phone} onClick={(e) => e.stopPropagation()}>
                              <PhoneIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 2, backgroundColor: 'action.hover' }}>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('en-CA') : 'N/A'}
                            </Typography>
                          </Box>
                          <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Students</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                              {teacher.department_student_count || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
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
          PaperProps={{ sx: { maxHeight: '90vh' } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Add New Teacher
            <IconButton onClick={() => setOpenDialog(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TeacherForm 
              onSuccess={handleTeacherCreateSuccess}
              onCancel={handleTeacherCreateCancel}
              departments={departments}
            />
          </DialogContent>
        </Dialog>

        {/* View Teacher Dialog */}
        <Dialog open={!!viewTeacher} onClose={handleCloseViewDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          {viewTeacher && (
            <>
             <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'medium' }}>
                  Details
                </Typography>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => { /* TODO: Handle Edit */ }}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => { /* TODO: Handle Delete */ }}>
                      <DeleteIcon sx={{ color: 'error.main' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Close">
                    <IconButton size="small" onClick={handleCloseViewDialog}>
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </DialogTitle>
              <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <TeacherAvatar src={viewTeacher.avatar} sx={{ width: 100, height: 100, mb: 2, fontSize: '3rem' }}>
                    {viewTeacher.name ? viewTeacher.name.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
                  </TeacherAvatar>
                  <Typography variant="h6" fontWeight="bold">{viewTeacher.name}</Typography>
                  <Typography variant="body1" color="text.secondary">{viewTeacher.department}</Typography>
                </Box>
                <List dense>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar><EmailIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Email" secondary={viewTeacher.email || 'N/A'} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar><PhoneIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Phone" secondary={viewTeacher.phone || 'N/A'} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar><BusinessIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Department" secondary={viewTeacher.department || 'N/A'} />
                  </ListItem>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar><SchoolIcon /></Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Students" secondary={viewTeacher.student_count || 0} />
                  </ListItem>
                </List>
              </DialogContent>
            </>
          )}
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
