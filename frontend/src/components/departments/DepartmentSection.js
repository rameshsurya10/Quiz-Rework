import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Button, Paper, Chip, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Divider, Tooltip, Avatar,
  CircularProgress, MenuItem, Select, FormControl, InputLabel,
  Grid, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon, 
  Person as PersonIcon, 
  People as PeopleIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Class as ClassIcon
} from '@mui/icons-material';
import { PageHeader, EmptyState } from '../common';
import { departmentApi, userApi, teacherApi } from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { motion } from 'framer-motion';
import DepartmentForm from './DepartmentForm';

const DepartmentSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getAll();
      // The API returns the array directly, not in a data property
      setDepartments(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      showSnackbar('Failed to load departments', 'error');
      setDepartments([]); // Ensure departments is always an array
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const fetchTeachers = useCallback(async () => {
    try {
      // Fetch teachers using the dedicated API service
      const response = await teacherApi.getAll();
      // The API returns the array directly, not in a data property
      setTeachers(Array.isArray(response?.data) ? response.data : []);
      console.log('Successfully fetched teachers:', response?.data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      setTeachers([]); // Ensure teachers is always an array
      // Optionally show a warning if needed
      // showSnackbar('Failed to load teachers list', 'warning');
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchDepartments();
    fetchTeachers();
  }, [fetchDepartments, fetchTeachers]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSaveDepartment = async (formData) => {
    setIsSubmitting(true);
    try {
      let savedDepartment;
      if (selectedDept?.department_id) {
        savedDepartment = await departmentApi.update(selectedDept.department_id, formData);
        showSnackbar('Department updated successfully!', 'success');
        setDepartments(departments.map(d => d.department_id === selectedDept.department_id ? savedDepartment.data : d));
      } else {
        savedDepartment = await departmentApi.create(formData);
        showSnackbar('Department created successfully!', 'success');
        setDepartments([savedDepartment.data, ...departments]);
      }
      setOpenFormDialog(false);
      setSelectedDept(null);
    } catch (error) {
      console.error('Failed to save department:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to save department', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    
    try {
      await departmentApi.delete(selectedDept.department_id);
      showSnackbar('Department deleted successfully!', 'success');
      setDepartments(departments.filter(d => d.department_id !== selectedDept.department_id));
      setOpenDeleteDialog(false);
      setSelectedDept(null);
    } catch (error) {
      console.error('Failed to delete department:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to delete department', 'error');
    }
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.head_teacher?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedDepartments = [...filteredDepartments].sort((a, b) => {
    let aVal = a[orderBy];
    let bVal = b[orderBy];

    if (orderBy === 'head_teacher') {
      aVal = a.head_teacher?.name || '';
      bVal = b.head_teacher?.name || '';
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return order === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedDepartments = sortedDepartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader 
        title="Departments" 
        subtitle="Manage academic departments and their details"
        actions={[
          <Button 
            key="add-department"
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedDept(null);
              setOpenFormDialog(true);
            }}
          >
            Add Department
          </Button>
        ]}
      />

      <Box component={Paper} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name, code, or HOD..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
      </Box>

      {/* Form Dialog for Add/Edit Department */}
      <Dialog 
        open={openFormDialog} 
        onClose={() => { if (!isSubmitting) { setOpenFormDialog(false); setSelectedDept(null); } }} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>{selectedDept?.department_id ? 'Edit Department' : 'Add New Department'}</DialogTitle>
        <DialogContent>
          {/* Render DepartmentForm only when the dialog is open to ensure fresh state/fetch for teachers */}
          {openFormDialog && (
            <DepartmentForm 
              onSubmit={handleSaveDepartment} 
              onCancel={() => { setOpenFormDialog(false); setSelectedDept(null); }}
              initialData={selectedDept}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
      ) : departments.length === 0 ? (
        <EmptyState title="No Departments Yet" message="Get started by adding a new department." />
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {['name', 'code', 'head_teacher', 'teacher_count', 'student_count'].map(headCell => (
                    <TableCell key={headCell} sortDirection={orderBy === headCell ? order : false}>
                      <TableSortLabel
                        active={orderBy === headCell}
                        direction={orderBy === headCell ? order : 'asc'}
                        onClick={() => handleRequestSort(headCell)}
                      >
                        {headCell.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDepartments.map((dept) => (
                  <TableRow hover key={dept.department_id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.light, mr: 1.5 }}>
                          <SchoolIcon fontSize="small" />
                        </Avatar>
                        {dept.name}
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={dept.code} size="small" /></TableCell>
                    <TableCell>{dept.head_teacher?.name || 'N/A'}</TableCell>
                    <TableCell align="center">{dept.teacher_count || 0}</TableCell>
                    <TableCell align="center">{dept.student_count || 0}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => { setSelectedDept(dept); setOpenDetailsDialog(true); }}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setSelectedDept(dept); setOpenFormDialog(true); }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => { setSelectedDept(dept); setOpenDeleteDialog(true); }}>
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
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sortedDepartments.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete Department</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete department: {selectedDept?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {openDetailsDialog && selectedDept && (
        <DepartmentDetailsDialog
          open={openDetailsDialog}
          onClose={() => setOpenDetailsDialog(false)}
          department={selectedDept}
        />
      )}
    </Container>
  );
};


const DepartmentDetailsDialog = ({ open, onClose, department }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (open && department?.id) {
      fetchDepartmentDetails();
    }
  }, [open, department]);

  const fetchDepartmentDetails = async () => {
    try {
      setLoading(true);
      // Fetch detailed department info
      const deptResponse = await departmentApi.getById(department.id);
      setDetails(deptResponse.data);
      
      // Fetch teachers in this department
      const teachersResponse = await teacherApi.filter({ department_id: department.id });
      setTeachers(teachersResponse.data || []);
      
      // Fetch students in this department
      const studentsResponse = await departmentApi.getStudents(department.id);
      setStudents(studentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching department details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!department) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const renderDetailItem = (label, value) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {value || 'N/A'}
      </Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon color="primary" />
          <Typography variant="h6" component="div">
            {department.name} Department
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ py: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={4}>
            {/* Basic Info Column */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main',
                pb: 1,
                borderBottom: `2px solid ${theme.palette.primary.light}`,
                mb: 2
              }}>
                Department Information
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1
                }}>
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    width: 60, 
                    height: 60,
                    mr: 2
                  }}>
                    {department.name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{department.name}</Typography>
                    <Chip 
                      label={`Code: ${department.code || 'N/A'}`} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    {renderDetailItem('Head of Department', department.head_teacher?.name || 'Not Assigned')}
                  </Grid>
                  <Grid item xs={6}>
                    {renderDetailItem('Contact Email', department.contact_email || 'N/A')}
                  </Grid>
                  <Grid item xs={6}>
                    {renderDetailItem('Contact Phone', department.contact_phone || 'N/A')}
                  </Grid>
                  <Grid item xs={6}>
                    {renderDetailItem('Established Date', formatDate(department.established_date))}
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main',
                pb: 1,
                borderBottom: `2px solid ${theme.palette.primary.light}`,
                mb: 2
              }}>
                Statistics
              </Typography>

              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: 2,
                mb: 3
              }}>
                <StatCard 
                  icon={<PeopleIcon color="primary" />} 
                  label="Teachers" 
                  value={details?.teacher_count || 0} 
                />
                <StatCard 
                  icon={<SchoolIcon color="secondary" />} 
                  label="Students" 
                  value={details?.student_count || 0} 
                />
                <StatCard 
                  icon={<ClassIcon color="action" />} 
                  label="Courses" 
                  value={details?.course_count || 0} 
                />
              </Box>
            </Grid>

            {/* Teachers & Students Column */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: 'primary.main',
                  pb: 1,
                  borderBottom: `2px solid ${theme.palette.primary.light}`,
                  mb: 2
                }}>
                  Teachers
                </Typography>
                
                {teachers.length > 0 ? (
                  <List dense>
                    {teachers.slice(0, 5).map(teacher => (
                      <ListItem key={teacher.id} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar src={teacher.avatar} alt={teacher.name}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={teacher.name} 
                          secondary={teacher.email || 'No email provided'}
                        />
                      </ListItem>
                    ))}
                    {teachers.length > 5 && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                        +{teachers.length - 5} more teachers
                      </Typography>
                    )}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No teachers assigned to this department.
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom sx={{ 
                  color: 'primary.main',
                  pb: 1,
                  borderBottom: `2px solid ${theme.palette.primary.light}`,
                  mb: 2
                }}>
                  Recent Students
                </Typography>
                
                {students.length > 0 ? (
                  <List dense>
                    {students.slice(0, 5).map(student => (
                      <ListItem key={student.id} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar src={student.avatar} alt={student.name}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={student.name} 
                          secondary={`ID: ${student.student_id || 'N/A'}`}
                        />
                      </ListItem>
                    ))}
                    {students.length > 5 && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                        +{students.length - 5} more students
                      </Typography>
                    )}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No students in this department.
                  </Typography>
                )}
              </Box>
            </Grid>

            {/* Description Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: 'primary.main',
                pb: 1,
                borderBottom: `2px solid ${theme.palette.primary.light}`,
                mb: 2
              }}>
                About
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {department.description || 'No description available for this department.'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ 
        justifyContent: 'space-between',
        px: 3,
        py: 2,
        borderTop: `1px solid ${theme.palette.divider}`
      }}>
        <Box>
          <Typography variant="caption" color="textSecondary">
            Last updated: {formatDate(department.updated_at) || 'N/A'}
          </Typography>
        </Box>
        <Box>
          <Button 
            onClick={onClose} 
            color="primary"
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<EditIcon />}
            onClick={() => {
              // Handle edit action
            }}
          >
            Edit Department
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

// Helper component for statistics cards
const StatCard = ({ icon, label, value }) => (
  <Paper 
    elevation={0} 
    sx={{ 
      p: 2, 
      textAlign: 'center',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      '&:hover': {
        boxShadow: 2,
        transform: 'translateY(-2px)',
        transition: 'all 0.2s ease-in-out'
      }
    }}
  >
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 1
    }}>
      <Box sx={{ 
        width: 48, 
        height: 48, 
        borderRadius: '50%', 
        bgcolor: 'primary.light', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'primary.contrastText',
        mb: 1
      }}>
        {icon}
      </Box>
      <Typography variant="h5" component="div" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
    </Box>
  </Paper>
);

export default DepartmentSection;
