import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Grid, Paper, Typography, Button, Box, Avatar,
  Pagination, TextField, InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, ListItemAvatar, ListItemText, IconButton,
  Divider, Tooltip,
  useTheme,
  CircularProgress,
  TablePagination,
  DialogContentText,
  List,
  ListItem,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
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
  Class as ClassIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Tag as TagIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { PageHeader, EmptyState } from '../../common';
import SummaryCard from '../common/SummaryCard';
import { departmentApi } from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { motion } from 'framer-motion';
import DepartmentForm from './DepartmentForm';



const DepartmentSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [departments, setDepartments] = useState([]);
  
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(9);
  const [searchTerm, setSearchTerm] = useState('');

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false); // NEW
  const [selectedDept, setSelectedDept] = useState(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail dialog state
  const [detailDept, setDetailDept] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const deptRes = await departmentApi.getAll();
      const depts = deptRes?.data?.results || deptRes?.data || [];
      // Fetch details for each department to get student count
      const deptsWithCounts = await Promise.all(
        depts.map(async (dept) => {
          try {
            const detailRes = await departmentApi.getById(dept.department_id);
            const students = detailRes.data.students || [];
            return { ...dept, student_count: students.length };
          } catch (e) {
            return { ...dept, student_count: 0 };
          }
        })
      );
      setDepartments(Array.isArray(deptsWithCounts) ? deptsWithCounts : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showSnackbar('Failed to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveDepartment = async (formData) => {
    setIsSubmitting(true);
    try {
      let savedDepartment;
      if (selectedDept?.department_id) {
        savedDepartment = await departmentApi.update(selectedDept.department_id, formData);
        showSnackbar('Subject updated successfully!', 'success');
        setDepartments(departments.map(d => d.department_id === selectedDept.department_id ? savedDepartment.data : d));
      } else {
        savedDepartment = await departmentApi.create(formData);
        showSnackbar('Subject created successfully!', 'success');
        setDepartments([savedDepartment.data, ...departments]);
      }
      setOpenFormDialog(false);
      setSelectedDept(null);
    } catch (error) {
      console.error('Failed to save subject:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to save subject', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    try {
      await departmentApi.delete(selectedDept.department_id);
      showSnackbar('Subject deleted successfully!', 'success');
      setDepartments(departments.filter(d => d.department_id !== selectedDept.department_id));
      setOpenDeleteDialog(false);
      setSelectedDept(null);
    } catch (error) {
      console.error('Failed to delete subject:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to delete subject', 'error');
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedDepartments = useMemo(() => {
    return filteredDepartments.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage > 0 ? page * rowsPerPage + rowsPerPage : filteredDepartments.length
    );
  }, [filteredDepartments, page, rowsPerPage]);

  // Aggregate totals
  // Compute unique teachers to avoid double-counting when a teacher belongs to multiple subjects
  const teacherIdSet = new Set();
  departments.forEach((dept) => {
    if (Array.isArray(dept.teachers)) {
      dept.teachers.forEach((t) => {
        const id = t?.teacher_id ?? t?.id ?? t?.uuid;
        if (id !== undefined && id !== null) {
          teacherIdSet.add(id);
        }
      });
    } else if (typeof dept.teacher_count === 'number' && !Array.isArray(dept.teachers)) {
      // Fallback – if only counts are provided and teacher list is missing, fall back to aggregated sum (may over-count)
      // In this case, we simply push placeholders to approximate uniqueness; this branch keeps previous behaviour.
      for (let i = 0; i < dept.teacher_count; i++) {
        teacherIdSet.add(`dept${dept.subject_id || dept.id}_${i}`);
      }
    }
  });
  const totalTeachers = teacherIdSet.size;
  const totalStudents = departments.reduce((acc, d) => acc + (d.student_count ?? 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  const fetchDepartmentDetails = async (departmentId) => {
    try {
      const res = await departmentApi.getById(departmentId);
      setDetailDept(res.data);
    } catch (error) {
      showSnackbar('Failed to load department details.', 'error');
      setDetailDept(null);
    }
  };


  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <PageHeader
          title="Subjects"
          subtitle="Manage academic subjects and their details"
          actions={[
            <Button
              key="add-subject"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedDept(null);
                setOpenFormDialog(true);
              }}
            >
              Add Subject
            </Button>
          ]}
        />
      </motion.div>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}><SummaryCard icon={<ClassIcon />} title="Total Subjects" value={departments.length} color={theme.palette.primary.main} index={0} /></Grid>
          <Grid item xs={12} sm={4}><SummaryCard icon={<PeopleIcon />} title="Total Teachers" value={totalTeachers} color={theme.palette.secondary.main} index={1} /></Grid>
          <Grid item xs={12} sm={4}><SummaryCard icon={<SchoolIcon />} title="Total Students" value={totalStudents} color={theme.palette.success.main} index={2} /></Grid>
        </Grid>

      <Paper sx={{ p: 3, borderRadius: 2 }} elevation={2}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {paginatedDepartments.length === 0 ? (
              <EmptyState
                title="No Subjects Found"
                message="Create a new subject to get started."
                action={() => setOpenFormDialog(true)}
                actionLabel="Add Subject"
              />
            ) : (
              <>
                <Grid container spacing={3}>
                  {paginatedDepartments.map((dept, index) => {
                    // Fix: Use array length if student_count is missing
                    const studentCount = dept.student_count ?? (Array.isArray(dept.students) ? dept.students.length : 0);
                    const teacherCount = dept.teacher_count ?? (Array.isArray(dept.teachers) ? dept.teachers.length : 0);
                    
                    return (
                      <Grid item key={dept.department_id} xs={12} sm={6} md={4}>
                        <motion.div
                          variants={itemVariants}
                          style={{ height: '100%' }}
                        >
                          <Paper 
                            onClick={() => {
                              setDetailDept(null); // show spinner while loading
                              fetchDepartmentDetails(dept.department_id);
                            }}
                            sx={{ 
                              borderRadius: 3, 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column',
                              overflow: 'hidden',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                boxShadow: theme.shadows[8],
                                transform: 'translateY(-4px)'
                              }
                            }} 
                            variant="outlined"
                          >
                            <Box sx={{ p: 3, textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Avatar sx={{ width: 72, height: 72, m: 'auto', mb: 2, bgcolor: 'primary.light', fontSize: '2.5rem', color: 'primary.contrastText' }}>
                                  {dept.name ? dept.name.charAt(0).toUpperCase() : ''}
                                </Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{dept.name || 'Unnamed Subject'}</Typography>
                                <Typography variant="body2" color="text.secondary">{dept.code}</Typography>
                            </Box>
                            
                            <Divider />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, backgroundColor: 'action.hover' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-around', flexGrow: 1 }}>
                                <Box textAlign="center">
                                  <Typography variant="caption" color="text.secondary">Teachers</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{teacherCount}</Typography>
                                </Box>
                                <Box textAlign="center">
                                  <Typography variant="caption" color="text.secondary">Students</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{studentCount}</Typography>
                                </Box>
                              </Box>
                              <Box>
                                <Tooltip title="Edit">
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedDept(dept); setOpenFormDialog(true); }}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={(e) => {
                                    e.stopPropagation();
                                    // Check if department has teachers or students
                                    const hasTeachers = (dept.teacher_count ?? (Array.isArray(dept.teachers) ? dept.teachers.length : 0)) > 0;
                                    const hasStudents = (dept.student_count ?? (Array.isArray(dept.students) ? dept.students.length : 0)) > 0;
                                    setSelectedDept(dept);
                                    if (hasTeachers || hasStudents) {
                                      setOpenRestrictDialog(true);
                                    } else {
                                      setOpenDeleteDialog(true);
                                    }
                                  }}>
                                    <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Paper>
                        </motion.div>
                      </Grid>
                    )
                  })}
                </Grid>
                <TablePagination
                  rowsPerPageOptions={[9, 18, 27, { label: 'All', value: -1 }]}
                  component="div"
                  count={filteredDepartments.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{ mt: 3 }}
                />
              </>
            )}
          </motion.div>
        )}
      </Paper>

      {/* Dialogs remain here */}
      <Dialog open={openFormDialog} onClose={() => { if (!isSubmitting) { setOpenFormDialog(false); setSelectedDept(null); } }} maxWidth="md" fullWidth>
        <DialogTitle>{selectedDept ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
        <DialogContent>
          <DepartmentForm 
            department={selectedDept} 
            onSubmit={handleSaveDepartment} 
            onCancel={() => { setOpenFormDialog(false); setSelectedDept(null); }}
            isSubmitting={isSubmitting} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the subject "{selectedDept?.name}" (Code: {selectedDept?.code})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={Boolean(detailDept)} onClose={() => setDetailDept(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon /> {detailDept?.name || 'Subject Details'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {detailDept ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Teachers</Typography>
              {Array.isArray(detailDept.teachers) && detailDept.teachers.length > 0 ? (
                <List dense>
                  {detailDept.teachers.map((t) => (
                    <ListItem key={t.teacher_id ?? t.id}>
                      <ListItemAvatar><Avatar><PersonIcon /></Avatar></ListItemAvatar>
                      <ListItemText primary={t.name} secondary={t.email} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No teachers assigned.</Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ mb: 1 }}>Students</Typography>
              {Array.isArray(detailDept.students) && detailDept.students.length > 0 ? (
                <List dense>
                  {detailDept.students.map((s) => (
                    <ListItem key={s.student_id ?? s.id}>
                      <ListItemAvatar><Avatar><PersonIcon /></Avatar></ListItemAvatar>
                      <ListItemText primary={s.name} secondary={s.email} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No students assigned.</Typography>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDept(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Restriction Dialog */}
      <Dialog open={openRestrictDialog} onClose={() => setOpenRestrictDialog(false)}>
        <DialogTitle>Cannot Delete Department</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This department has {selectedDept?.teacher_count ?? (Array.isArray(selectedDept?.teachers) ? selectedDept.teachers.length : 0)} teacher(s)
            and {selectedDept?.student_count ?? (Array.isArray(selectedDept?.students) ? selectedDept.students.length : 0)} student(s).<br/>
            Please remove all teachers and students from this department before deleting it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRestrictDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DepartmentSection;
