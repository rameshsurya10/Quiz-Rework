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
  People as PeopleIcon
} from '@mui/icons-material';
import { studentApi, departmentApi, teacherApi } from '../../services/api';
import { format, parseISO } from 'date-fns';
import StudentForm from './StudentForm';
import SummaryCard from '../common/SummaryCard';
import StudentDetailsDashboard from './StudentDetailsDashboard';

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

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsRes, deptsRes, teachersRes] = await Promise.all([
        studentApi.getAll({ page_size: 1000 }),
        departmentApi.getAll(),
        teacherApi.getAll(),
      ]);

      const studentsData = studentsRes.data?.results || studentsRes.data || [];
      const deptsData = deptsRes.data?.results || deptsRes.data || [];
      const teachersData = teachersRes.data?.results || teachersRes.data || [];

      const departmentMap = deptsData.reduce((acc, dept) => {
        acc[dept.department_id] = dept;
        return acc;
      }, {});

      const processedStudents = studentsData.map(student => ({
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Student Management</Typography>

      {/* <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}><SummaryCard icon={<SchoolIcon />} title="Total Students" value={students.length} color={theme.palette.primary.main} index={0} /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard icon={<PeopleIcon />} title="Total Teachers" value={teachers.length} color={theme.palette.secondary.main} index={1} /></Grid>
        <Grid item xs={12} sm={4}><SummaryCard icon={<ClassIcon />} title="Total Subjects" value={departments.length} color={theme.palette.success.main} index={2} /></Grid>
      </Grid> */}
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search Students"
                variant="outlined"
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
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
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
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleDialogOpen()}
              >
                Add Student
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Mobile No.</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.department ? student.department.name : 'N/A'}</TableCell>
                  <TableCell>{student.phone || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton onClick={() => handleView(student)}><VisibilityIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleDialogOpen(student)}><EditIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteClick(student)} disabled={isDeleting}><DeleteIcon /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
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
      </Card>

      {/* Add/Edit Dialog */}
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

      {/* Delete Confirmation Dialog */}
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

      {/* View Dialog - New Dashboard */}
      <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="lg" fullWidth>
        {viewingStudent && 
          <StudentDetailsDashboard student={viewingStudent} onClose={handleCloseViewDialog} />
        }
      </Dialog>

      {/* Old View Dialog - Commented out */}
      {/* {viewingStudent && (
        <Dialog open={openViewDialog} onClose={handleCloseViewDialog} maxWidth="sm" fullWidth>
          <DialogTitle>Student Details</DialogTitle>
          <DialogContent>
            <Typography variant="h6">{viewingStudent.name}</Typography>
            <Typography color="text.secondary" gutterBottom>ID: {viewingStudent.student_id}</Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}><Typography><strong>Email:</strong> {viewingStudent.email}</Typography></Grid>
                <Grid item xs={12} sm={6}><Typography><strong>Phone:</strong> {viewingStudent.phone || 'N/A'}</Typography></Grid>
                <Grid item xs={12}><Typography><strong>Department:</strong> {viewingStudent.department ? viewingStudent.department.name : 'N/A'}</Typography></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseViewDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      )} */}

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