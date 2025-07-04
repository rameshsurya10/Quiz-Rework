import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid, Typography, Card, CardContent, Box,
  Button, TextField, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, IconButton,
  FormControl, InputLabel, MenuItem, Select,
  Snackbar, Alert, useTheme, useMediaQuery, Container,
  CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Tooltip, Avatar, InputAdornment
} from "@mui/material";
import { motion } from 'framer-motion';
import { styled, alpha } from '@mui/material/styles';
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
  Close as CloseIcon,
  Class as ClassIcon,
  People as PeopleIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { studentApi, departmentApi, teacherApi } from '../../services/api';
import { format, parseISO } from 'date-fns';
import StudentForm from './StudentForm';
import SummaryCard from '../common/SummaryCard';
import StudentDetailsDashboard from './StudentDetailsDashboard';
import BulkUploadDialog from './BulkUploadDialog';

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

const StudentSection = ({ initialOpenDialog = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(initialOpenDialog);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openBulkUpload, setOpenBulkUpload] = useState(false);

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all students by handling pagination
      let allStudents = [];
      let page = 1;
      let hasMore = true;

      while(hasMore) {
          try {
              const response = await studentApi.getAll({ page });
              if (response.data && response.data.results) {
                  allStudents = allStudents.concat(response.data.results);
                  if (response.data.next) {
                      page++;
                  } else {
                      hasMore = false;
                  }
              } else {
                  // If response is not paginated, assume it's the full list
                  allStudents = response.data || [];
                  hasMore = false;
              }
          } catch (err) {
              // If a page fails, stop fetching
              console.error(`Failed to fetch page ${page} of students`, err);
              hasMore = false;
              // Optionally show a message that only partial data might be loaded
              showMessage('Could not load all students. Some data may be missing.', 'warning');
          }
      }

      const [deptsRes, teachersRes] = await Promise.all([
        departmentApi.getAll(),
        teacherApi.getAll(),
      ]);

      const deptsData = deptsRes.data?.results || deptsRes.data || [];
      const teachersData = teachersRes.data?.results || teachersRes.data || [];

      const departmentMap = deptsData.reduce((acc, dept) => {
        acc[dept.department_id] = dept;
        return acc;
      }, {});

      const processedStudents = allStudents.map(student => ({
        ...student,
        id: student.student_id,
        department: student.department_id ? departmentMap[student.department_id] : null,
      }));

      setStudents(processedStudents);
      setDepartments(deptsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showMessage('Failed to load data. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let result = students;

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(student =>
        student.name?.toLowerCase().includes(lowercasedTerm) ||
        student.email?.toLowerCase().includes(lowercasedTerm)
      );
    }

    if (selectedDept !== 'all') {
      result = result.filter(student => student.department_id === selectedDept);
    }

    setFilteredStudents(result);
    setPage(0);
  }, [students, searchTerm, selectedDept]);

  const handleDialogOpen = (student = null) => {
    setEditingStudent(student);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingStudent(null);
  };

  const handleView = (student) => {
    setViewingStudent(student);
    setOpenViewDialog(true);
  };
  
  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setViewingStudent(null);
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirm(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await studentApi.delete(studentToDelete.id);
      showMessage('Student deleted successfully.');
      fetchData(); // Refetch data to update the list
    } catch (error) {
      console.error('Failed to delete student:', error);
      showMessage(error.response?.data?.message || 'Failed to delete student.', 'error');
    } finally {
      setIsDeleting(false);
      handleCloseDeleteConfirm();
    }
  };

  const handleBulkUploadSuccess = (results) => {
    showMessage(`Bulk upload completed: ${results.success_count} students imported successfully`, 'success');
    fetchData(); // Refresh the student list
    setOpenBulkUpload(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(
      page * rowsPerPage, 
      page * rowsPerPage + rowsPerPage > 0 ? page * rowsPerPage + rowsPerPage : filteredStudents.length
    );
  }, [filteredStudents, page, rowsPerPage]);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Student Management</Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Total Students" 
            value={students.length} 
            icon={<PeopleIcon sx={{ fontSize: 40 }} />} 
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Subjects" 
            value={departments.length} 
            icon={<ClassIcon sx={{ fontSize: 40 }} />} 
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Teachers" 
            value={teachers.length} 
            icon={<SchoolIcon sx={{ fontSize: 40 }} />} 
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard 
            title="Verified Students" 
            value={students.filter(s => s.is_verified).length} 
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />} 
            color="info"
          />
        </Grid>
      </Grid>
      
      <DashboardStyledCard>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6">All Students</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  label="Subject"
                >
                  <MenuItem value="all">All Subjects</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.department_id} value={dept.department_id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleDialogOpen()}
              >
                Add Student
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setOpenBulkUpload(true)}
              >
                Bulk Upload
              </Button>
            </Box>
          </Box>
          
          {paginatedStudents.length > 0 ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell>Register No.</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedStudents.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">{student.name}</Typography>
                              <Typography variant="body2" color="text.secondary">{student.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{student.department?.name || 'N/A'}</TableCell>
                        <TableCell>{student.class_name || 'N/A'}</TableCell>
                        <TableCell>{student.section || 'N/A'}</TableCell>
                        <TableCell>{student.register_number || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleView(student)} color="primary">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit Student">
                            <IconButton onClick={() => handleDialogOpen(student)} color="secondary">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Student">
                            <IconButton onClick={() => handleDeleteClick(student)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredStudents.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          ) : (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography>No students found for the selected criteria.</Typography>
            </Box>
          )}
        </CardContent>
      </DashboardStyledCard>

      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
        <DialogContent>
          <StudentForm
            student={editingStudent}
            departments={departments}
            onSuccess={() => {
              handleDialogClose();
              fetchData();
              showMessage(editingStudent ? 'Student updated successfully.' : 'Student added successfully.');
            }}
            onError={(msg) => showMessage(msg, 'error')}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete student "{studentToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="lg" fullWidth>
        {viewingStudent && 
          <StudentDetailsDashboard student={viewingStudent} onClose={handleCloseViewDialog} />
        }
      </Dialog>

      <BulkUploadDialog
        open={openBulkUpload}
        onClose={() => setOpenBulkUpload(false)}
        onSuccess={handleBulkUploadSuccess}
        departments={departments}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentSection;