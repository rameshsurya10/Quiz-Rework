import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Avatar, Box, 
  Paper, Button, Chip, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemAvatar, ListItemText, Divider, Stack, useTheme, alpha,
  CircularProgress, Tab, Tabs, Badge, Tooltip, MenuItem, Select,
  FormControl, InputLabel, useMediaQuery, Fab, Zoom, DialogContentText
} from '@mui/material';
import {
  Person as PersonIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  VerifiedUser as VerifiedIcon,
  PendingActions as PendingIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { studentApi, departmentApi } from '../../services/api';
import StudentForm from './StudentForm';
import BulkUploadDialog from './BulkUploadDialog';

const TeacherStudentSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery(theme.breakpoints.down(400));
  
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'email', 'department', 'status'

  // Add state for edit/delete functionality
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('[Teacher Students] Loading teacher-specific student data...');
      
      // Load students - backend filters for teacher's assigned departments
      const studentsResponse = await studentApi.getAll();
      const studentsData = Array.isArray(studentsResponse.data) 
        ? studentsResponse.data 
        : studentsResponse.data.results || [];
      setStudents(studentsData);

      // Load departments - backend filters for teacher's assigned departments  
      const departmentsResponse = await departmentApi.getAll();
      const departmentsData = Array.isArray(departmentsResponse.data)
        ? departmentsResponse.data
        : departmentsResponse.data.results || [];
      setDepartments(departmentsData);

      console.log('[Teacher Students] Teacher-specific data loaded:', {
        students: studentsData.length,
        departments: departmentsData.length,
        studentDepartments: [...new Set(studentsData.map(s => s.department_id))],
        availableDepartments: departmentsData.map(d => ({ id: d.department_id, name: d.name }))
      });
    } catch (error) {
      console.error('[Teacher Students] Error loading teacher-specific student data:', error);
      showSnackbar('Failed to load students data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSortBy('name');
  };

  // Add handler functions for edit/delete
  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (student) => {
    setDeletingStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setDeletingStudent(null);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setEditingStudent(null);
    showSnackbar('Student updated successfully!', 'success');
    loadData(); // Reload the data
  };

  const handleEditError = (message) => {
    showSnackbar(message, 'error');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    
    setIsSubmitting(true);
    try {
      await studentApi.delete(deletingStudent.student_id);
      showSnackbar('Student deleted successfully!', 'success');
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
      loadData(); // Reload the data
    } catch (error) {
      console.error('Error deleting student:', error);
      showSnackbar('Failed to delete student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add handlers for adding new students
  const handleAddClick = () => {
    setAddDialogOpen(true);
  };

  const handleAddClose = () => {
    setAddDialogOpen(false);
  };

  const handleAddSuccess = () => {
    setAddDialogOpen(false);
    showSnackbar('Student added successfully!', 'success');
    loadData(); // Reload the data
  };

  const handleAddError = (message) => {
    showSnackbar(message, 'error');
  };

  const handleBulkUploadSuccess = (results) => {
    showSnackbar(`Bulk upload completed: ${results.success_count} students imported successfully`, 'success');
    loadData(); // Refresh the student list
    setBulkUploadOpen(false);
  };

  const sortStudents = (studentsToSort) => {
    return [...studentsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'email':
          return (a.email || '').localeCompare(b.email || '');
        case 'department':
          const deptA = getDepartmentName(a.department_id);
          const deptB = getDepartmentName(b.department_id);
          return deptA.localeCompare(deptB);
        case 'status':
          return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
        default:
          return 0;
      }
    });
  };

  const filteredStudents = sortStudents(students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !selectedDepartment || 
                             student.department_id === parseInt(selectedDepartment);
    
    return matchesSearch && matchesDepartment;
  }));

  const verifiedStudents = filteredStudents.filter(s => s.is_verified);
  const pendingStudents = filteredStudents.filter(s => !s.is_verified);

  const getStudentInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDepartmentName = (departmentId) => {
    if (!departmentId) return 'No Department Assigned';
    const dept = departments.find(d => d.department_id === departmentId);
    return dept ? dept.name : 'Unknown Department';
  };

  const getStatusColor = (isVerified) => {
    return isVerified ? 'success' : 'warning';
  };

  const getStatusIcon = (isVerified) => {
    return isVerified ? <VerifiedIcon /> : <PendingIcon />;
  };

  const renderStudentCard = (student, index) => (
    <Grid item xs={12} sm={6} md={viewMode === 'grid' ? 4 : 12} lg={viewMode === 'grid' ? 3 : 12} key={student.student_id}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        whileHover={{ y: -5 }}
      >
        <Card 
          sx={{
            height: '100%',
            borderRadius: { xs: 2, sm: 3 },
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-8px)',
              boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.15)}`,
              borderColor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
          onClick={() => handleStudentClick(student)}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            {viewMode === 'grid' ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: { xs: 48, sm: 56 },
                      height: { xs: 48, sm: 56 },
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                      mr: 2,
                      fontSize: { xs: '1.2rem', sm: '1.5rem' },
                      fontWeight: 700
                    }}
                  >
                    {getStudentInitials(student.name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {student.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(student.is_verified)}
                      label={student.is_verified ? 'Verified' : 'Pending'}
                      color={getStatusColor(student.is_verified)}
                      size="small"
                      sx={{ 
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', sm: '0.75rem' }
                      }}
                    />
                  </Box>
                </Box>

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {getDepartmentName(student.department_id)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      {student.email}
                    </Typography>
                  </Box>

                  {student.roll_number && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'text.secondary' }} />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        Roll: {student.roll_number}
                      </Typography>
                    </Box>
                  )}
                </Stack>

                {/* Action Buttons */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: 1, 
                  mt: 2,
                  pt: 2,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                }}>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStudentClick(student);
                      }}
                      sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Student">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(student);
                      }}
                      sx={{
                        color: theme.palette.success.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Student">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(student);
                      }}
                      sx={{
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              // List view layout
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
                <Avatar
                  sx={{
                    width: { xs: 40, sm: 48 },
                    height: { xs: 40, sm: 48 },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                    fontSize: { xs: '1rem', sm: '1.2rem' },
                    fontWeight: 700
                  }}
                >
                  {getStudentInitials(student.name)}
                </Avatar>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      mb: 0.5,
                      fontSize: { xs: '0.9rem', sm: '1.1rem' },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {student.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: { xs: '0.7rem', sm: '0.8rem' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: { xs: 120, sm: 200 }
                      }}
                    >
                      {student.email}
                    </Typography>
                    
                    {!isSmallMobile && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: '0.8rem' }}
                      >
                        • {getDepartmentName(student.department_id)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                <Chip
                  icon={getStatusIcon(student.is_verified)}
                  label={student.is_verified ? 'Verified' : 'Pending'}
                  color={getStatusColor(student.is_verified)}
                  size="small"
                  sx={{ 
                    fontWeight: 600,
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    minWidth: { xs: 80, sm: 100 }
                  }}
                />

                {/* Action Buttons for List View */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStudentClick(student);
                      }}
                      sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Student">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(student);
                      }}
                      sx={{
                        color: theme.palette.success.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.success.main, 0.1),
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Student">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(student);
                      }}
                      sx={{
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.1),
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );

  const renderStudentList = (studentList, title, emptyMessage) => (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 2, 
          fontWeight: 600,
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        {title} ({studentList.length})
      </Typography>
      
      {studentList.length > 0 ? (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {studentList.map((student, index) => renderStudentCard(student, index))}
        </Grid>
      ) : (
        <Paper 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            textAlign: 'center',
            background: alpha(theme.palette.background.paper, 0.6),
            borderRadius: { xs: 2, sm: 3 }
          }}
        >
          <PersonIcon sx={{ fontSize: { xs: 48, sm: 60 }, color: 'text.disabled', mb: 2 }} />
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              mb: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            {emptyMessage}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {searchTerm || selectedDepartment ? 'Try adjusting your filters' : 'No students found in your assigned departments'}
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const getTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderStudentList(filteredStudents, 'All Students', 'No students found');
      case 1:
        return renderStudentList(verifiedStudents, 'Verified Students', 'No verified students found');
      case 2:
        return renderStudentList(pendingStudents, 'Pending Students', 'No pending students found');
      default:
        return renderStudentList(filteredStudents, 'All Students', 'No students found');
    }
  };

  const renderStudentDetailsDialog = () => {
    if (!selectedStudent) return null;

    const departmentName = getDepartmentName(selectedStudent.department_id);

    return (
      <Dialog 
        open={detailsDialogOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <DialogTitle sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">Student Details</Typography>
            <IconButton onClick={handleCloseDetails}><ClearIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3} sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: { xs: 80, md: 120 },
                  height: { xs: 80, md: 120 },
                  fontSize: { xs: '2rem', md: '3.5rem' },
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  mx: 'auto'
                }}
              >
                {getStudentInitials(selectedStudent.name)}
              </Avatar>
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="h4" component="h2" fontWeight="bold">{selectedStudent.name}</Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>{departmentName}</Typography>
              <Chip
                icon={getStatusIcon(selectedStudent.is_verified)}
                label={selectedStudent.is_verified ? "Verified" : "Pending Verification"}
                color={getStatusColor(selectedStudent.is_verified)}
                size="small"
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          
          {/* Simplified Student Info Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><EmailIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Email Address" secondary={selectedStudent.email} />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><PhoneIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Phone Number" secondary={selectedStudent.phone || 'N/A'} />
              </ListItem>
            </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Academic Information
            </Typography>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><SchoolIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Register Number" secondary={selectedStudent.roll_number || 'N/A'} />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><SchoolIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Class & Section" secondary={`${selectedStudent.class_name || 'N/A'} - ${selectedStudent.section || 'N/A'}`} />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom>
              Additional Information
            </Typography>
            <List>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><EventIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Created On" secondary={formatDate(selectedStudent.created_at)} />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><PersonIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Created By" secondary={selectedStudent.created_by || 'N/A'} />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><EventIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Last Modified On" secondary={formatDate(selectedStudent.last_modified_at)} />
              </ListItem>
              <ListItem>
                <ListItemAvatar>
                  <Avatar><PersonIcon /></Avatar>
                </ListItemAvatar>
                <ListItemText primary="Last Modified By" secondary={selectedStudent.last_modified_by || 'N/A'} />
              </ListItem>
            </List>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography 
          variant={isSmallMobile ? "h5" : isMobile ? "h4" : "h3"} 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Student Management
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Manage students in your assigned departments
        </Typography>
      </Box>

      {/* Controls */}
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: { xs: 3, sm: 4 },
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          borderRadius: { xs: 2, sm: 3 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }} alignItems="center">
          {/* Search */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size={isSmallMobile ? "small" : "medium"}
              placeholder="Search by name, email, or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
          </Grid>

          {/* Department Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size={isSmallMobile ? "small" : "medium"}>
              <InputLabel>Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Department"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.department_id} value={dept.department_id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Sort */}
          <Grid item xs={6} sm={6} md={2}>
            <FormControl fullWidth size={isSmallMobile ? "small" : "medium"}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort by"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* View Mode & Actions */}
          <Grid item xs={6} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              {!isSmallMobile && (
                <Tooltip title={viewMode === 'grid' ? 'List View' : 'Grid View'}>
                  <IconButton 
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    sx={{
                      color: theme.palette.primary.main,
                      '&:hover': {
                        background: alpha(theme.palette.primary.main, 0.08),
                      }
                    }}
                  >
                    {viewMode === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Clear Filters">
                <IconButton 
                  onClick={handleClearFilters}
                  disabled={!searchTerm && !selectedDepartment && sortBy === 'name'}
                  sx={{
                    color: theme.palette.secondary.main,
                    '&:hover': {
                      background: alpha(theme.palette.secondary.main, 0.08),
                    }
                  }}
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Bulk Upload Students">
                <IconButton
                  onClick={() => setBulkUploadOpen(true)}
                  sx={{
                    color: theme.palette.info.main,
                    '&:hover': {
                      background: alpha(theme.palette.info.main, 0.08),
                    }
                  }}
                >
                  <UploadIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download Report">
                <IconButton
                  sx={{
                    color: theme.palette.success.main,
                    '&:hover': {
                      background: alpha(theme.palette.success.main, 0.08),
                    }
                  }}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper 
        sx={{ 
          mb: { xs: 3, sm: 4 },
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(20px)',
          borderRadius: { xs: 2, sm: 3 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 72 },
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 500,
              px: { xs: 1, sm: 2 }
            },
          }}
        >
          <Tab
            icon={<Badge badgeContent={filteredStudents.length} color="primary" max={999} />}
            label="All Students"
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab
            icon={<Badge badgeContent={verifiedStudents.length} color="success" max={999} />}
            label="Verified"
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab
            icon={<Badge badgeContent={pendingStudents.length} color="warning" max={999} />}
            label="Pending"
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        </Tabs>
      </Paper>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {getTabContent()}
        </motion.div>
      </AnimatePresence>
      
      {renderStudentDetailsDialog()}

      {/* Edit Student Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isSmallMobile}
        PaperProps={{
          sx: {
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: isSmallMobile ? 0 : 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Edit Student
        </DialogTitle>
        <DialogContent>
          <StudentForm
            student={editingStudent}
            departments={departments}
            onSuccess={handleEditSuccess}
            onError={handleEditError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ color: 'error.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Are you sure you want to delete student "{deletingStudent?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: 1 }}>
          <Button 
            onClick={handleDeleteClose} 
            disabled={isSubmitting}
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Student Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={handleAddClose} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isSmallMobile}
        PaperProps={{
          sx: {
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: isSmallMobile ? 0 : 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          Add New Student
        </DialogTitle>
        <DialogContent>
          <StudentForm
            student={null}
            departments={departments}
            onSuccess={handleAddSuccess}
            onError={handleAddError}
          />
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Quick Add (Mobile) */}
      <Zoom in={isMobile}>
        <Fab
          color="primary"
          onClick={handleAddClick}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1000,
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={handleBulkUploadSuccess}
        departments={departments}
      />
    </Container>
  );
};

export default TeacherStudentSection;
