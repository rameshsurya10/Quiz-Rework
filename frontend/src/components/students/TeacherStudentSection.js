import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Avatar, Box, 
  Paper, Button, Chip, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem,
  ListItemAvatar, ListItemText, Divider, Stack, useTheme, alpha,
  CircularProgress, Tab, Tabs, Badge, Tooltip
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
  PendingActions as PendingIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { studentApi, departmentApi } from '../../services/api';

const TeacherStudentSection = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.roll_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !selectedDepartment || 
                             student.department_id === parseInt(selectedDepartment);
    
    return matchesSearch && matchesDepartment;
  });

  const verifiedStudents = filteredStudents.filter(s => s.is_verified);
  const pendingStudents = filteredStudents.filter(s => !s.is_verified);

  const getStudentInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDepartmentName = (departmentId) => {
    const dept = departments.find(d => d.department_id === departmentId);
    return dept ? dept.name : 'Unknown';
  };

  const getStatusColor = (isVerified) => {
    return isVerified ? 'success' : 'warning';
  };

  const getStatusIcon = (isVerified) => {
    return isVerified ? <VerifiedIcon /> : <PendingIcon />;
  };

  const renderStudentCard = (student, index) => (
    <Grid item xs={12} sm={6} md={4} key={student.student_id}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05 }}
        whileHover={{ y: -5 }}
      >
        <Card 
          sx={{
            height: '100%',
            borderRadius: 3,
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
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                  mr: 2,
                  fontSize: '1.5rem',
                  fontWeight: 700
                }}
              >
                {getStudentInitials(student.name)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {student.name}
                </Typography>
                <Chip
                  icon={getStatusIcon(student.is_verified)}
                  label={student.is_verified ? 'Verified' : 'Pending'}
                  color={getStatusColor(student.is_verified)}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>

            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {getDepartmentName(student.department_id)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {student.email}
                </Typography>
              </Box>

              {student.roll_number && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Roll: {student.roll_number}
                  </Typography>
                </Box>
              )}

              {student.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {student.phone}
                  </Typography>
                </Box>
              )}
            </Stack>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Joined: {new Date(student.created_at || student.date_joined).toLocaleDateString()}
              </Typography>
              <IconButton size="small" sx={{ color: 'primary.main' }}>
                <VisibilityIcon />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );

  const getTabContent = () => {
    switch (activeTab) {
      case 0: return filteredStudents;
      case 1: return verifiedStudents;
      case 2: return pendingStudents;
      default: return filteredStudents;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Students Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Export
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          View and manage student information and progress
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            fontStyle: 'italic',
            background: alpha(theme.palette.info.main, 0.1),
            p: 1,
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}
        >
          🔒 Showing only students from your assigned departments
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ borderRadius: 2 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Filter by Department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ borderRadius: 2 }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.name}
                </option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {filteredStudents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 64,
            },
          }}
        >
          <Tab 
            label={
              <Badge badgeContent={filteredStudents.length} color="primary">
                All Students
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={verifiedStudents.length} color="success">
                Verified
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={pendingStudents.length} color="warning">
                Pending
              </Badge>
            } 
          />
        </Tabs>
      </Paper>

      {/* Students Grid */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <AnimatePresence mode="wait">
          {getTabContent().length > 0 ? (
            <Grid container spacing={3}>
              {getTabContent().map((student, index) => renderStudentCard(student, index))}
            </Grid>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <PersonIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                  No Students Found
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  {activeTab === 0 
                    ? "No students match your search criteria"
                    : activeTab === 1
                    ? "No verified students found"
                    : "No pending students found"
                  }
                </Typography>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Student Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
          color: 'white',
          fontWeight: 700
        }}>
          Student Details
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedStudent && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                    mr: 3,
                    fontSize: '2rem',
                    fontWeight: 700
                  }}
                >
                  {getStudentInitials(selectedStudent.name)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    {selectedStudent.name}
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedStudent.is_verified)}
                    label={selectedStudent.is_verified ? 'Verified Student' : 'Pending Verification'}
                    color={getStatusColor(selectedStudent.is_verified)}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Email Address
                  </Typography>
                  <Typography variant="body1">{selectedStudent.email}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Department
                  </Typography>
                  <Typography variant="body1">
                    {getDepartmentName(selectedStudent.department_id)}
                  </Typography>
                </Box>

                {selectedStudent.roll_number && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Roll Number
                    </Typography>
                    <Typography variant="body1">{selectedStudent.roll_number}</Typography>
                  </Box>
                )}

                {selectedStudent.phone && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Phone Number
                    </Typography>
                    <Typography variant="body1">{selectedStudent.phone}</Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Registration Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedStudent.created_at || selectedStudent.date_joined).toLocaleDateString()}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDetails} sx={{ textTransform: 'none' }}>
            Close
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AssessmentIcon />}
            sx={{ 
              textTransform: 'none',
              background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
            }}
          >
            View Results
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherStudentSection;
