import React, { useState, useEffect, useCallback } from 'react';
import { teacherApi, departmentApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import TeacherForm from './TeacherForm';
import { 
  Grid, Typography, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogContentText, DialogTitle, IconButton, 
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, InputAdornment, Avatar, Paper, Divider,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Chip,
  TablePagination
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
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    departments: 0,
  });

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const fetchTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teachersRes, deptsRes] = await Promise.all([
        teacherApi.getAll({ page_size: 1000 }),
        departmentApi.getAll({ page_size: 1000 }),
      ]);

      const teachersData = teachersRes.data?.results || (Array.isArray(teachersRes.data) ? teachersRes.data : []);
      const deptData = deptsRes.data?.results || (Array.isArray(deptsRes.data) ? deptsRes.data : []);
      
      console.log('[TeacherSection] Available departments:', deptData.map(d => ({ id: d.department_id, name: d.name })));

      const processedTeachers = teachersData.map(teacher => {
        const userData = teacher.user || teacher;
        
        // Debug log to see the raw teacher data
        console.log('[TeacherSection] Processing teacher:', {
          name: teacher.name,
          teacher_id: teacher.teacher_id,
          departments: teacher.departments,
          department_ids: teacher.department_ids
        });
        
        // If departments array is empty but department_ids exist, create departments from available data
        let departments = Array.isArray(teacher.departments) ? teacher.departments : [];
        
        // If departments array is empty but we have department_ids, try to match with departments data
        if (departments.length === 0 && teacher.department_ids && teacher.department_ids.length > 0) {
          departments = teacher.department_ids.map(deptId => {
            // Try to find the department in the departments list we fetched
            const foundDept = deptData.find(d => d.department_id === deptId);
            if (foundDept) {
              return {
                department_id: foundDept.department_id,
                name: foundDept.name,
                code: foundDept.code
              };
            }
            // Fallback if department not found
            return {
              department_id: deptId,
              name: `Department ${deptId}`,
              code: `DEPT${deptId}`
            };
          });
        }
        
        return {
          id: teacher.id,
          uuid: teacher.uuid,
          teacher_id: teacher.teacher_id,
          name: teacher.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email || '',
          phone: userData.phone || userData.phone_number || '',
          departments: departments,
          created_at: teacher.created_at || userData.date_joined,
          avatar: userData.profile?.avatar,
          student_count: teacher.student_count || 0,
        };
      });
      
      console.log('[TeacherSection] Processed teachers with departments:', 
        processedTeachers.map(t => ({ 
          name: t.name, 
          departments: t.departments.map(d => d.name) 
        }))
      );

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
    showMessage(`Teacher ${editingTeacher ? 'updated' : 'added'} successfully!`, 'success');
    setOpenDialog(false);
    setEditingTeacher(null);
    await fetchTeacherData();
  };

    const handleTeacherCreateCancel = () => {
    setOpenDialog(false);
    setEditingTeacher(null);
  };

  const handleOpenViewDialog = (teacher) => {
    setViewTeacher(teacher);
  };

  const handleCloseViewDialog = () => {
    setViewTeacher(null);
  };

  const handleOpenEditDialog = async (teacher) => {
    if (!teacher || !teacher.teacher_id) {
      showMessage('Cannot edit teacher: Invalid data provided.', 'error');
      return;
    }
    setIsFetchingDetails(true);
    try {
      const response = await teacherApi.get(teacher.teacher_id);
      setEditingTeacher(response.data); // The full teacher object
      setOpenDialog(true);
    } catch (error) {
      console.error('Failed to fetch teacher details:', error);
      showMessage('Failed to load teacher details for editing.', 'error');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleOpenDeleteDialog = (teacher) => {
    setTeacherToDelete(teacher);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTeacherToDelete(null);
  };

  const handleDeleteTeacher = async () => {
    const teacherId = teacherToDelete?.teacher_id;

    if (!teacherId) {
      console.error('CRITICAL: Could not delete teacher. The `teacher_id` is missing from the teacher object:', teacherToDelete);
      showMessage('Could not delete teacher: ID is missing.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await teacherApi.delete(teacherId);
      showMessage('Teacher deleted successfully!', 'success');
      handleCloseDeleteDialog();
      handleCloseViewDialog(); // Also close the details view
      await fetchTeacherData();
    } catch (error) {
      console.error(`Failed to delete teacher with teacher_id ${teacherId}:`, error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete teacher. Please try again.';
      showMessage(errorMessage, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTeachers = [...teacherData]; // Keep the data structure but remove filtering

  const paginatedTeachers = filteredTeachers.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage > 0 ? page * rowsPerPage + rowsPerPage : filteredTeachers.length
  );

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
            { title: 'Subjects', value: stats.departments, icon: <BusinessIcon />, color: 'secondary' },
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
            <> 
            <Grid container spacing={3}>
              <AnimatePresence>
                {paginatedTeachers.map((teacher, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={teacher.uuid || teacher.teacher_id}>
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
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.5, mt: 1, mb: 1, minHeight: '24px' }}>
                            {teacher.departments && teacher.departments.length > 0 ? (
                              teacher.departments.map((dept, index) => {
                                console.log('[TeacherCard] Rendering department:', dept, 'for teacher:', teacher.name);
                                return (
                                  <Chip 
                                    key={dept.department_id || `dept-${index}`} 
                                    label={dept.name || `Dept ${dept.department_id}`} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ margin: 0.25 }}
                                  />
                                );
                              })
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No Department Assigned
                              </Typography>
                            )}
                          </Box>
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, backgroundColor: 'action.hover' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-around', flexGrow: 1 }}>
                            <Box textAlign="center">
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {teacher.created_at ? new Date(teacher.created_at).toLocaleDateString('en-CA') : 'N/A'}
                              </Typography>
                            </Box>
                            <Box textAlign="center">
                              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Students</Typography>
                              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                {teacher.student_count}
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(teacher); }} disabled={isFetchingDetails && editingTeacher?.teacher_id === teacher.teacher_id}>
                                {isFetchingDetails && editingTeacher?.teacher_id === teacher.teacher_id ? <CircularProgress size={20} /> : <EditIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(teacher); }}>
                                <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>

                        </Box>
                      </Paper>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
            {teacherData.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[12, 24, 36, { label: 'All', value: -1 }]}
                component="div"
                count={filteredTeachers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ mt: 3 }}
              />
            )}
            </>
          )}
        </Box>

        {/* Add Teacher Dialog */}
                <Dialog 
          open={openDialog} 
          onClose={handleTeacherCreateCancel}
          fullWidth
          maxWidth="md"
          PaperProps={{ sx: { maxHeight: '120vh' } }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
            <IconButton onClick={handleTeacherCreateCancel}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TeacherForm 
              onSuccess={handleTeacherCreateSuccess}
              onCancel={handleTeacherCreateCancel}
              teacher={editingTeacher}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the teacher "{teacherToDelete?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>Cancel</Button>
            <Button onClick={handleDeleteTeacher} color="error" disabled={isDeleting}>
              {isDeleting ? <CircularProgress color="inherit" size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
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
                  <Typography variant="body1" color="text.secondary">
                    {viewTeacher.departments && viewTeacher.departments.length > 0 
                      ? viewTeacher.departments.map(dept => dept.name).join(', ')
                      : 'No Department Assigned'
                    }
                  </Typography>
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
                    <ListItemText 
                      primary="Department" 
                      secondary={
                        viewTeacher.departments && viewTeacher.departments.length > 0 
                          ? viewTeacher.departments.map(dept => dept.name).join(', ')
                          : 'No Department Assigned'
                      } 
                    />
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
