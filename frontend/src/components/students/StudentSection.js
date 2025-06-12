import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Grid, Typography, Card, CardContent, Box, 
  Button, TextField, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, 
  FormControl, FormHelperText, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Tooltip, Avatar, InputAdornment
} from "@mui/material";
import { motion } from 'framer-motion';
import { styled } from '@mui/material/styles';
import { 
  Person as PersonIcon, 
  Business as BusinessIcon,
  Add as AddIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { studentApi, departmentApi, userApi } from '../../services/api';
import { alpha } from '@mui/material/styles';
import { format, parseISO } from 'date-fns';
import StudentForm from './StudentForm';

// Styled Components
const DashboardStyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px', // Consistent with modern dashboard styles
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.03)', // Softer shadow
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

const StyledCard = DashboardStyledCard; // Keep StyledCard if used elsewhere, or remove if DashboardStyledCard replaces all uses

const StatusChip = styled('span')(({ theme, status }) => ({
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: 12,
  fontWeight: 600,
  textTransform: 'capitalize',
  backgroundColor: status === 'active' 
    ? theme.palette.success.light 
    : theme.palette.error.light,
  color: status === 'active' 
    ? theme.palette.success.dark 
    : theme.palette.error.dark,
}));

const StudentSection = ({ initialOpenDialog = false }) => {
  const theme = useTheme();
  useMediaQuery(theme.breakpoints.down('md')); // Used for responsive behavior
  
  // UI State
  const [openDialog, setOpenDialog] = useState(initialOpenDialog);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  // Data State
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Form State
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Table and Filter State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('enrollment_date');
  const [order, setOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    departments: 0,
    avgQuizzes: 0
  });

  // Fetch students and departments
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use separate try/catch for each API call to prevent one failure from affecting the other
      let studentsData = [];
      let deptData = [];
      
      try {
        const studentsRes = await userApi.getAllStudents({ page_size: 1000 });
        studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.results || []);
        console.log('Successfully fetched students:', studentsData.length);
      } catch (studentError) {
        console.error('Error fetching students:', studentError);
        // Continue execution even if student fetch fails
      }
      
      try {
        const deptsRes = await departmentApi.getAll();
        deptData = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.results || []);
        console.log('Successfully fetched departments:', deptData.length);
      } catch (deptError) {
        console.error('Error fetching departments:', deptError);
        // Continue execution even if department fetch fails
      }
      
      // Process departments to create a lookup map
      const departmentMap = {};
      deptData.forEach(dept => {
        departmentMap[dept.id] = dept;
      });
      
      // Process student data with consistent format
      const processedStudents = studentsData.map(student => {
        // Handle both nested user object and flat structure
        const userData = student.user || {};
        const deptId = student.department?.id || student.department;
        const department = deptId ? departmentMap[deptId] : null;
        
        return {
          id: student.id,
          first_name: userData.first_name || student.first_name || '',
          last_name: userData.last_name || student.last_name || '',
          email: userData.email || student.email || '',
          phone: student.phone_number || student.phone || '',
          student_id: student.student_id || '',
          department: department || null,
          enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
          graduation_year: student.graduation_year || (new Date().getFullYear() + 4).toString(),
          created_at: student.created_at || new Date().toISOString(),
          updated_at: student.updated_at || new Date().toISOString(),
          is_active: student.is_active !== false,
          address: student.address || ''
        };
      });
      
      // Calculate statistics
      const activeStudents = processedStudents.filter(s => s.is_active).length;
      
      setStudents(processedStudents);
      setDepartments(deptData);
      setStats({
        total: processedStudents.length,
        active: activeStudents,
        departments: deptData.length,
        avgQuizzes: calculateAverageGrade(processedStudents)
      });
      
      // Apply initial filtering and sorting
      applyFiltersAndSorting(processedStudents, searchTerm, selectedDept, activeTab, orderBy, order);
      
    } catch (error) {
      console.error('Error in overall fetchData process:', error);
      let errorMessage = 'Failed to load data';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || 
                     error.response.data?.message || 
                     `Server responded with ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Error setting up request';
      }
      
      showMessage(errorMessage, 'error');
      
      // Set empty data to prevent UI errors
      setStudents([]);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedDept, activeTab, orderBy, order]);
  
  // Calculate average grade (placeholder function)
  const calculateAverageGrade = (students) => {
    if (!students.length) return 0;
    const total = students.reduce((sum, student) => {
      return sum + (student.average_grade || 0);
    }, 0);
    return (total / students.length).toFixed(1);
  };
  
  // Apply filters and sorting to students
  const applyFiltersAndSorting = useCallback((studentsList, search, dept, status, sortBy, sortOrder) => {
    let result = [...studentsList];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(student => 
        (student.first_name?.toLowerCase().includes(searchLower) ||
         student.last_name?.toLowerCase().includes(searchLower) ||
         student.email?.toLowerCase().includes(searchLower) ||
         student.student_id?.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply department filter
    if (dept !== 'all') {
      result = result.filter(student => 
        student.department && student.department.id === dept
      );
    }
    
    // Apply status filter
    if (status === 'active') {
      result = result.filter(student => student.is_active);
    } else if (status === 'inactive') {
      result = result.filter(student => !student.is_active);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      // Handle nested properties for sorting
      const getValue = (obj, path) => {
        return path.split('.').reduce((o, p) => (o || {})[p], obj) || '';
      };
      
      const aValue = getValue(a, sortBy);
      const bValue = getValue(b, sortBy);
      
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });
    
    setFilteredStudents(result);
  }, []);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page on search
  };
  
  // Handle department filter change
  const handleDeptChange = (e) => {
    setSelectedDept(e.target.value);
    setPage(0); // Reset to first page on filter
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0); // Reset to first page on tab change
  };
  
  // Handle sort request
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    applyFiltersAndSorting(filteredStudents, searchTerm, selectedDept, property, isAsc ? 'desc' : 'asc');
  };
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page on rows per page change
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle initial dialog state from props
  useEffect(() => {
    setOpenDialog(initialOpenDialog);
  }, [initialOpenDialog]);

  // Show message in snackbar
  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setOpenDialog(false);
    // Clear editing state
    setTimeout(() => {
      setEditingStudent(null);
    }, 300);
  };

  // Handle edit student
  const handleEdit = (student) => {
    setEditingStudent({
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      phone: student.phone,
      student_id: student.student_id,
      department: student.department?.id || student.department,
      enrollment_date: student.enrollment_date,
      graduation_year: student.graduation_year?.toString() || (new Date().getFullYear() + 4).toString(),
      address: student.address || ''
    });
    setOpenDialog(true);
  };

  // Handle delete student
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      try {
        await studentApi.delete(id);
        showMessage('Student deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting student:', error);
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           'Failed to delete student';
        showMessage(errorMessage, 'error');
      }
    }
  };

  // Handle view student details
  const handleView = (student) => {
    // In a real app, this would navigate to a student detail page
    console.log('View student:', student);
  };

  // Handle refresh data
  const handleRefresh = () => {
    fetchData();
  };

  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);

      // Prepare student data for API
      const studentData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone.trim(),
        student_id: formData.student_id.trim(),
        department: formData.department,
        enrollment_date: formData.enrollment_date,
        graduation_year: parseInt(formData.graduation_year, 10),
        address: formData.address.trim()
      };

      // Add password for new students
      let tempPassword = '';
      if (!editingStudent?.id) {
        tempPassword = Math.random().toString(36).slice(-8) + 
                      Math.random().toString(36).slice(-8).toUpperCase();
        studentData.password = tempPassword;
      }

      // Make API call
      if (editingStudent?.id) {
        await studentApi.update(editingStudent.id, studentData);
        showMessage('Student updated successfully');
      } else {
        await studentApi.create(studentData);
        showMessage(`Student added successfully${tempPassword ? `. Temporary password: ${tempPassword}` : ''}`);
      }

      // Reset form and refresh data
      handleDialogClose();
      fetchData();
    } catch (error) {
      console.error('Error saving student:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         error.response?.data?.email?.[0] || // Handle email validation errors
                         'Failed to save student. Please try again.';
      showMessage(errorMessage, 'error');
      throw error; // Re-throw to let StudentForm handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

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
          p: 0,
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
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Student Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add Student
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={1.5} sx={{ width: '100%', m: 0, px: 2 }}>
          {[
            { title: 'Total Students', value: students.length, icon: <PersonIcon />, color: 'primary' },
            { title: 'Active Now', value: stats.active, icon: <CheckCircleIcon />, color: 'success' },
            { title: 'Departments', value: departments.length, icon: <BusinessIcon />, color: 'secondary' },
            { title: 'Avg. Score', value: `${stats.avgQuizzes}%`, icon: <SchoolIcon />, color: 'warning' },
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index} sx={{ display: 'flex', width: '100%', height: '100%' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{ width: '100%', height: '100%' }}
              >
                <DashboardStyledCard sx={{ 
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CardContent sx={{ flex: 1, p: 2, '&:last-child': { pb: 2 } }}>
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
                    <Box mt={1}> {/* Added mt for spacing if no trend line */} 
                      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {stat.value}
                      </Typography>
                      {/* Placeholder for potential future subtitle or trend, if needed */}
                      {/* <Typography variant="caption" color="textSecondary">Details if any</Typography> */}
                    </Box>
                  </CardContent>
                </DashboardStyledCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Students Table */}
        <Card>
          <CardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3
            }}>
              <Typography variant="h6" component="div">
                Student List
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search..."
                  variant="outlined"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={selectedDept}
                    label="Department"
                    onChange={handleDeptChange}
                  >
                    <MenuItem value="all">All Departments</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Enrollment Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar>
                                {student.first_name?.[0]}{student.last_name?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {student.first_name} {student.last_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {student.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{student.student_id}</TableCell>
                          <TableCell>{student.department?.name || 'N/A'}</TableCell>
                          <TableCell>{formatDate(student.enrollment_date)}</TableCell>
                          <TableCell>
                            <StatusChip 
                              label={student.is_active ? 'Active' : 'Inactive'} 
                              status={student.is_active ? 'active' : 'inactive'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Tooltip title="View">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleView(student)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEdit(student)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDelete(student.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <SchoolIcon fontSize="large" color="disabled" />
                          <Typography color="text.secondary">
                            No students found
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredStudents.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>

        {/* Add/Edit Student Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            style: {
              maxHeight: '90vh',
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle>
            {editingStudent?.id ? 'Edit Student' : 'Add New Student'}
            <IconButton
              aria-label="close"
              onClick={handleDialogClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ overflow: 'hidden' }}>
            <Box sx={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto', pr: 1 }}>
              <StudentForm 
                student={editingStudent} 
                onSubmit={handleSubmit} 
                onCancel={handleDialogClose}
                isSubmitting={isSubmitting}
                showAddress={false}
              />
            </Box>
          </DialogContent>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
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

export default StudentSection;
