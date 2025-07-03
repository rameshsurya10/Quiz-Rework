import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Fade,
  Grow,
  Skeleton,
  Alert,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  ListItemIcon,
  Divider,
  Tooltip,
  Snackbar,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Assessment,
  People,
  School,
  CheckCircle,
  Cancel,
  Email,
  Phone,
  Upload,
  Download,
  Person,
  Verified,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { studentApi, departmentApi } from '../../services/api';
import TeacherLayout from './TeacherLayout';

const TeacherStudentSection = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, departmentFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsResponse, departmentsResponse] = await Promise.all([
        studentApi.getAll(),
        departmentApi.getAll(),
      ]);

      // Process students data
      setStudents(studentsResponse.data.results || studentsResponse.data || []);

      // Process departments data
      setDepartments(departmentsResponse.data.results || departmentsResponse.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load student data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toString().includes(searchTerm)
      );
    }

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(student => student.department_id === departmentFilter);
    }

    // Filter by status
    if (statusFilter === 'verified') {
      filtered = filtered.filter(student => student.is_verified);
    } else if (statusFilter === 'not-verified') {
      filtered = filtered.filter(student => !student.is_verified);
    }

    setFilteredStudents(filtered);
  };

  const handleMenuClick = (event, student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await studentApi.delete(selectedStudent.student_id);
      setStudents(students.filter(s => s.student_id !== selectedStudent.student_id));
      setSnackbar({
        open: true,
        message: 'Student deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete student',
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
    }
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.department_id === departmentId);
    return department ? department.name : 'Unknown';
  };

  const getStatusColor = (student) => {
    if (student.is_verified) return '#4caf50';
    return '#ff9800';
  };

  const getStatusLabel = (student) => {
    if (student.is_verified) return 'Verified';
    return 'Unverified';
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
    <Grow in={true} timeout={800}>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
          border: `1px solid ${color}20`,
          borderRadius: 3,
          transition: 'all 0.3s ease',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px ${color}25`,
          } : {},
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 1 }}>
                {loading ? <Skeleton width={60} /> : value}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {title}
              </Typography>
            </Box>
            <Avatar
              sx={{
                bgcolor: color,
                width: 56,
                height: 56,
                boxShadow: `0 4px 12px ${color}30`,
              }}
            >
              <Icon sx={{ fontSize: 28 }} />
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  if (error) {
    return (
      <TeacherLayout>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchData} sx={{ bgcolor: '#e17055' }}>
          Retry
        </Button>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#333',
                mb: 1,
                background: 'linear-gradient(135deg, #e17055 0%, #f39c7a 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Student Management
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Manage and track your students
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Upload />}
              sx={{
                borderColor: '#e17055',
                color: '#e17055',
                '&:hover': {
                  borderColor: '#d4624a',
                  backgroundColor: 'rgba(225, 112, 85, 0.05)',
                },
              }}
            >
              Bulk Upload
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/student/create')}
              sx={{
                bgcolor: '#e17055',
                borderRadius: 2,
                px: 3,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#d4624a',
                },
              }}
            >
              Add Student
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Students"
              value={students.length}
              icon={People}
              color="#e17055"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Verified Students"
              value={students.filter(s => s.is_verified).length}
              icon={Verified}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Unverified Students"
              value={students.filter(s => !s.is_verified).length}
              icon={Warning}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Departments"
              value={departments.length}
              icon={School}
              color="#2196f3"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ p: 2, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search students by name, email, or roll number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#e17055' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={statusFilter}
                onChange={(e, newValue) => setStatusFilter(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                 sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#e17055' },
                  '& .Mui-selected': { color: '#e17055 !important' },
                  border: '1px solid #e1705530',
                  borderRadius: 2
                }}
              >
                <Tab label="All" value="all" />
                <Tab label="Verified" value="verified" />
                <Tab label="Not Verified" value="not-verified" />
              </Tabs>
            </Grid>
          </Grid>
        </Card>

        {/* Students Table */}
        <Card
          sx={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
            border: '1px solid rgba(225, 112, 85, 0.1)',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 3 }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} height={60} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : filteredStudents.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'rgba(225, 112, 85, 0.05)' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Student</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStudents
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((student, index) => (
                          <Fade key={student.student_id} in={true} timeout={300 + index * 50}>
                            <TableRow
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'rgba(225, 112, 85, 0.05)',
                                },
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Avatar
                                    sx={{
                                      bgcolor: '#e17055',
                                      width: 40,
                                      height: 40,
                                    }}
                                  >
                                    {student.name.charAt(0)}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {student.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      ID: {student.student_id}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{student.email}</Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getDepartmentName(student.department_id)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ color: '#666' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getStatusLabel(student)}
                                  size="small"
                                  sx={{
                                    backgroundColor: `${getStatusColor(student)}15`,
                                    color: getStatusColor(student),
                                    fontWeight: 600,
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {new Date(student.created_at).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={(e) => handleMenuClick(e, student)}
                                  sx={{ color: '#e17055' }}
                                >
                                  <MoreVert />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          </Fade>
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
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <People sx={{ fontSize: 64, color: '#e17055', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#333', mb: 1 }}>
                  No students found
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  {searchTerm || departmentFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'Add your first student to get started'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/student/create')}
                  sx={{
                    bgcolor: '#e17055',
                    '&:hover': {
                      bgcolor: '#d4624a',
                    },
                  }}
                >
                  Add Student
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(225, 112, 85, 0.15)',
            },
          }}
        >
          <MenuItem onClick={() => {
            navigate(`/student/${selectedStudent?.student_id}`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            View Profile
          </MenuItem>
          <MenuItem onClick={() => {
            navigate(`/student/${selectedStudent?.student_id}/edit`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            Edit Student
          </MenuItem>
          <MenuItem onClick={() => {
            navigate(`/student/${selectedStudent?.student_id}/results`);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <Assessment fontSize="small" />
            </ListItemIcon>
            View Results
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336' }}>
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: '#f44336' }} />
            </ListItemIcon>
            Delete Student
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Student</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{selectedStudent?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </TeacherLayout>
  );
};

export default TeacherStudentSection; 