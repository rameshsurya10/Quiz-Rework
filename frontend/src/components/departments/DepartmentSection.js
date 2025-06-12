import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Button, Paper, Chip, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Divider, Tooltip, Avatar,
  CircularProgress, MenuItem, Select, FormControl, InputLabel
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
  Close as CloseIcon
} from '@mui/icons-material';
import { PageHeader, EmptyState } from '../common';
import { departmentApi, userApi } from '../../services/api';
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
      // Fetch teachers using the dedicated method
      const response = await userApi.getAllTeachers(); 
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
    try {
      let savedDepartment;
      if (selectedDept?.id) {
        savedDepartment = await departmentApi.update(selectedDept.id, formData);
        showSnackbar('Department updated successfully!', 'success');
        setDepartments(departments.map(d => d.id === selectedDept.id ? savedDepartment.data : d));
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
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    
    try {
      await departmentApi.delete(selectedDept.id);
      showSnackbar('Department deleted successfully!', 'success');
      setDepartments(departments.filter(d => d.id !== selectedDept.id));
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
                  <TableRow hover key={dept.id}>
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

      {/* Department Form Dialog */}
      <Dialog 
        open={openFormDialog}
        onClose={() => {
          setOpenFormDialog(false);
          setSelectedDept(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDept ? 'Edit Department' : 'Create New Department'}
        </DialogTitle>
        <DialogContent>
          <DepartmentForm 
            department={selectedDept} 
            onSubmit={handleSaveDepartment}
            isSubmitting={false}
          />
        </DialogContent>
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
  
  if (!department) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Department Details
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 60, height: 60 }}>
            <SchoolIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" component="div">{department.name}</Typography>
            <Chip label={`Code: ${department.code}`} size="small" />
          </Box>
        </Box>
        
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Head of Department</Typography>
        <Typography paragraph>{department.head_teacher?.name || 'Not Assigned'}</Typography>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Statistics</Typography>
        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Chip icon={<PersonIcon />} label={`${department.teacher_count || 0} Teachers`} />
          <Chip icon={<PeopleIcon />} label={`${department.student_count || 0} Students`} />
        </Box>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Description</Typography>
        <Typography paragraph sx={{ whiteSpace: 'pre-wrap', color: department.description ? 'text.primary' : 'text.secondary' }}>
          {department.description || 'No description provided.'}
        </Typography>
        
        {/* TODO: Add lists of teachers and students if needed */}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DepartmentSection;
