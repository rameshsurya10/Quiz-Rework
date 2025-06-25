import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Avatar,
  IconButton,
  useTheme,
  alpha,
  Stack,
  Badge,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Chip,
  Container,
  CircularProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../api';

const DRAWER_WIDTH = 280;

// Modern Gradient Sidebar
const ModernSidebar = ({ open, onClose, onNavigate, currentPath, teacherData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const menuItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/teacher-dashboard' },
    { label: 'Quizzes', icon: <QuizIcon />, path: '/teacher/quiz' },
    { label: 'Students', icon: <PeopleIcon />, path: '/teacher/students' },
    { label: 'Departments', icon: <SchoolIcon />, path: '/teacher/departments' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/teacher/settings' },
  ];

  // Use teacher data if available, otherwise fallback to localStorage
  const teacherName = teacherData?.name || localStorage.getItem('userFirstName') || 'Teacher';
  const teacherEmail = teacherData?.email || localStorage.getItem('userEmail') || '';

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          borderRight: 'none',
          color: 'white',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Home Icon */}
        <Box sx={{ mb: 4, mt: 2 }}>
          <IconButton 
            onClick={() => onNavigate('/teacher-dashboard')}
            sx={{ 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
            }}
          >
            <DashboardIcon />
          </IconButton>
        </Box>

        {/* Navigation Menu */}
        <Box sx={{ flex: 1 }}>
          <List sx={{ '& .MuiListItem-root': { mb: 1 } }}>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => onNavigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5, px: 2,
                    backgroundColor: currentPath === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: currentPath === item.path ? 600 : 400,
                      color: 'white',
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* User Section */}
        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', pt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              {teacherName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {teacherName}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {teacherEmail || 'Teacher'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
};

// Activity Item Component
const ActivityItem = ({ icon, title, subtitle, amount, isPositive, time }) => (
  <Box sx={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    py: { xs: 1.5, sm: 2 },
    px: { xs: 1, sm: 0 },
    borderBottom: '1px solid #f1f5f9',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: { xs: 1, sm: 0 }
  }}>
    <Stack 
      direction={{ xs: 'column', sm: 'row' }} 
      alignItems={{ xs: 'flex-start', sm: 'center' }} 
      spacing={2}
      sx={{ width: { xs: '100%', sm: 'auto' } }}
    >
      <Box sx={{
        width: 40,
        height: 40,
        borderRadius: 2,
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: '#1e293b',
            fontSize: { xs: '0.875rem', sm: '0.875rem' }
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#64748b',
            fontSize: { xs: '0.75rem', sm: '0.75rem' }
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Stack>
    <Box sx={{ 
      textAlign: { xs: 'left', sm: 'right' },
      width: { xs: '100%', sm: 'auto' },
      display: 'flex',
      justifyContent: { xs: 'space-between', sm: 'flex-end' },
      alignItems: 'center',
      gap: 2
    }}>
      <Typography variant="body2" sx={{ 
        fontWeight: 600, 
        color: isPositive ? '#10b981' : '#ef4444',
        fontSize: { xs: '0.875rem', sm: '0.875rem' }
      }}>
        {isPositive ? '+' : ''}{amount}
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          color: '#64748b',
          fontSize: { xs: '0.75rem', sm: '0.75rem' }
        }}
      >
        {time}
      </Typography>
    </Box>
  </Box>
);

// Contact Item Component
const ContactItem = ({ name, location, avatar }) => (
  <Box sx={{ 
    py: 2, 
    borderBottom: '1px solid #f1f5f9',
    '&:last-child': { borderBottom: 'none' }
  }}>
    <Stack direction="row" alignItems="center" spacing={2}>
      <Avatar sx={{ 
        width: 40, 
        height: 40, 
        bgcolor: '#6366f1',
        fontSize: '0.875rem',
        fontWeight: 600
      }}>
        {avatar}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 600, 
            color: '#1e293b',
            fontSize: '0.875rem',
            lineHeight: 1.4,
            mb: 0.5
          }}
        >
          {name}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#64748b',
            fontSize: '0.75rem',
            lineHeight: 1.2
          }}
        >
          {location}
        </Typography>
      </Box>
    </Stack>
  </Box>
);

// Summary Card Component
const SummaryCard = ({ title, value, trend, color }) => (
  <Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
        {title}
      </Typography>
      <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
    </Stack>
    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
      {value}
    </Typography>
    <Typography variant="caption" sx={{ color: '#64748b' }}>
      {trend}
    </Typography>
    <Box sx={{ mt: 2, height: 60 }}>
      {/* Simple chart placeholder */}
      <Box sx={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.3)} 100%)`,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '60%',
          background: color,
          borderRadius: '2px 2px 0 0',
          opacity: 0.7
        }} />
      </Box>
    </Box>
  </Box>
);

// Main Dashboard Component
const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalStudents: 0,
    totalDepartments: 0
  });
  const [teacherData, setTeacherData] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadTeacherData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quizRes, studentRes, deptRes] = await Promise.all([
        apiService.get('/api/quiz/'),
        apiService.get('/api/students/'),
        apiService.get('/api/departments/')
      ]);
      
      // Process quiz data
      const quizzes = Array.isArray(quizRes.data) ? quizRes.data : (quizRes.data.results || []);
      const students = Array.isArray(studentRes.data) ? studentRes.data : (studentRes.data.results || []);
      const departments = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.results || []);
      
      setStats({
        totalQuizzes: quizzes.length,
        totalStudents: students.length,
        totalDepartments: departments.length
      });

      // Set recent students for display with better data handling
      console.log('Loaded students data:', students);
      
      // Sort by most recent and take first 6
      const sortedStudents = students
        .filter(student => !student.is_deleted) // Filter out deleted students
        .sort((a, b) => new Date(b.created_at || b.last_modified_at || 0) - new Date(a.created_at || a.last_modified_at || 0))
        .slice(0, 6);
      
      setRecentStudents(sortedStudents);

      // Create recent activities based on real data
      const activities = [];
      
      // Add quiz-related activities
      if (quizzes.length > 0) {
        const recentQuizzes = quizzes
          .sort((a, b) => new Date(b.created_at || b.last_modified_at || 0) - new Date(a.created_at || a.last_modified_at || 0))
          .slice(0, 3);
        
        recentQuizzes.forEach((quiz, index) => {
          const timeAgo = getTimeAgo(quiz.created_at || quiz.last_modified_at);
          const departmentName = departments.find(d => d.department_id === quiz.department)?.name || 'Unknown Subject';
          
          activities.push({
            id: `quiz-${quiz.uuid || quiz.id}`,
            icon: <QuizIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />,
            title: "Quiz Created",
            subtitle: `${quiz.title} - ${departmentName}`,
            amount: `${quiz.num_questions || 0} questions`,
            isPositive: true,
            time: timeAgo
          });
        });
      }

      // Add student registration activities
      if (students.length > 0) {
        const recentStudentRegistrations = students
          .filter(student => !student.is_deleted)
          .sort((a, b) => new Date(b.created_at || b.last_modified_at || 0) - new Date(a.created_at || a.last_modified_at || 0))
          .slice(0, 2);
        
        recentStudentRegistrations.forEach(student => {
          const timeAgo = getTimeAgo(student.created_at || student.last_modified_at);
          const departmentName = departments.find(d => d.department_id === student.department_id)?.name || 'Unknown Subject';
          
          activities.push({
            id: `student-${student.student_id || student.id}`,
            icon: <PeopleIcon sx={{ color: '#10b981', fontSize: 20 }} />,
            title: "New Student Registration",
            subtitle: `${student.name} enrolled in ${departmentName}`,
            amount: "1 student",
            isPositive: true,
            time: timeAgo
          });
        });
      }

      // Sort activities by most recent
      activities.sort((a, b) => {
        const timeA = getTimeValue(a.time);
        const timeB = getTimeValue(b.time);
        return timeA - timeB;
      });

      setRecentActivities(activities.slice(0, 5)); // Show top 5 activities
      
      console.log('Recent activities set:', activities.slice(0, 5));
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays to prevent undefined errors
      setRecentStudents([]);
      setRecentActivities([]);
      
      // Fallback activities if API fails
      setRecentActivities([
        {
          id: 'fallback-1',
          icon: <QuizIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />,
          title: "Welcome to Dashboard",
          subtitle: "Start by creating your first quiz",
          amount: "Get started",
          isPositive: true,
          time: "now"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'unknown';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      const diffInWeeks = Math.floor(diffInDays / 7);
      return `${diffInWeeks}w ago`;
    } catch (error) {
      return 'unknown';
    }
  };

  // Helper function to convert time string to numeric value for sorting
  const getTimeValue = (timeString) => {
    if (!timeString || timeString === 'unknown') return Infinity;
    if (timeString === 'just now') return 0;
    
    const match = timeString.match(/(\d+)([mhd]w?)/);
    if (!match) return Infinity;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'm': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      case 'w': return value * 60 * 24 * 7;
      default: return Infinity;
    }
  };

  const loadTeacherData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        // Find teacher by email
        const response = await apiService.get('/api/teachers/');
        const teachers = Array.isArray(response.data) ? response.data : (response.data.results || []);
        const teacher = teachers.find(t => t.email === userEmail);
        if (teacher) {
          setTeacherData(teacher);
        }
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
      // Fallback to localStorage data if API fails
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  const getCurrentHour = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = teacherData?.name || localStorage.getItem('userFirstName') || 'Teacher';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Sidebar */}
      <ModernSidebar 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleNavigation}
        currentPath={location.pathname}
        teacherData={teacherData}
      />

      {/* Main Content */}
      <Box sx={{ 
        flexGrow: 1,
        width: !isMobile && drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
        minHeight: '100vh'
      }}>
        {/* Top Header */}
        <Box sx={{ 
          p: { xs: 2, sm: 3, md: 4 }, 
          bgcolor: 'white',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              {isMobile && (
                <IconButton
                  onClick={() => setDrawerOpen(true)}
                  sx={{ mb: 1, color: '#64748b' }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
                {getCurrentHour()} {displayName}!
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button
                variant="outlined"
                sx={{ 
                  borderColor: '#e2e8f0',
                  color: '#64748b',
                  textTransform: 'none',
                  borderRadius: 2,
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                Personal Account
              </Button>
              <Badge badgeContent={3} color="error">
                <IconButton sx={{ 
                  bgcolor: '#6366f1', 
                  color: 'white',
                  '&:hover': { bgcolor: '#5856eb' }
                }}>
                  <NotificationsIcon />
                </IconButton>
              </Badge>
              <Avatar sx={{ bgcolor: '#f97316' }}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} sx={{ alignItems: 'flex-start' }}>
            {/* Left Column - Activities */}
            <Grid item xs={12} lg={8}>
              {/* All Activities Card */}
              <Paper sx={{ 
                borderRadius: 4, 
                p: { xs: 2, sm: 3, md: 4 }, 
                mb: { xs: 2, sm: 3, md: 4 },
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    All Activities
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" sx={{ border: '1px solid #e2e8f0' }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ border: '1px solid #e2e8f0' }}>
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>

                {/* This Week Summary */}
                <Box sx={{ 
                  bgcolor: '#f8fafc', 
                  borderRadius: 3, 
                  p: { xs: 2, sm: 3 }, 
                  mb: { xs: 2, sm: 3, md: 4 },
                  border: '1px solid #e2e8f0'
                }}>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                    Account Overview
                  </Typography>
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    alignItems={{ xs: 'flex-start', sm: 'center' }} 
                    spacing={3}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {stats.totalQuizzes}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        {stats.totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}
                      </Typography>
                    </Stack>
                    {stats.totalQuizzes > 0 && (
                      <Chip 
                        label={`${Math.min(100, Math.round((stats.totalQuizzes / 10) * 100))}% active`} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#dcfce7', 
                          color: '#16a34a',
                          border: 'none'
                        }} 
                      />
                    )}
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      {stats.totalStudents} {stats.totalStudents === 1 ? 'student' : 'students'} in {stats.totalDepartments} {stats.totalDepartments === 1 ? 'subject' : 'subjects'}
                    </Typography>
                  </Stack>
                </Box>

                {/* Activity List */}
                <Box>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        icon={activity.icon}
                        title={activity.title}
                        subtitle={activity.subtitle}
                        amount={activity.amount}
                        isPositive={activity.isPositive}
                        time={activity.time}
                      />
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        No recent activities found
                      </Typography>
                      <Typography variant="caption">
                        Create quizzes or add students to see activities here
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Quick Summary Cards */}
              <Paper sx={{ 
                borderRadius: 4, 
                p: { xs: 2, sm: 3, md: 4 },
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Quick Summary On Your Account
                  </Typography>
                  <Button 
                    variant="text" 
                    sx={{ color: '#6366f1', textTransform: 'none' }}
                    onClick={() => handleNavigation('/teacher/quiz')}
                  >
                    View All
                  </Button>
                </Stack>

                <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box 
                      onClick={() => handleNavigation('/teacher/quiz')}
                      sx={{ cursor: 'pointer' }}
                    >
                      <SummaryCard
                        title="Active Quizzes"
                        value={`${stats.totalQuizzes}`}
                        trend="Total"
                        color="#6366f1"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box 
                      onClick={() => handleNavigation('/teacher/students')}
                      sx={{ cursor: 'pointer' }}
                    >
                      <SummaryCard
                        title="Total Students"
                        value={`${stats.totalStudents}`}
                        trend="Enrolled"
                        color="#10b981"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box 
                      onClick={() => handleNavigation('/teacher/departments')}
                      sx={{ cursor: 'pointer' }}
                    >
                      <SummaryCard
                        title="Subjects"
                        value={`${stats.totalDepartments}`}
                        trend="Active"
                        color="#8b5cf6"
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mb: 1 }}>
                        Performance
                      </Typography>
                      <Box sx={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%',
                        background: 'conic-gradient(#6366f1 0deg 252deg, #e2e8f0 252deg 360deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        mb: 2
                      }}>
                        <Box sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            85%
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Overall
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Right Column - Students */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ 
                borderRadius: 4, 
                p: { xs: 2, sm: 3 },
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                height: 'fit-content',
                position: 'sticky',
                top: { xs: 20, lg: 24 }
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '1.125rem' }}>
                    Recent Students
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleNavigation('/teacher/students')}
                    sx={{ 
                      color: '#6366f1',
                      bgcolor: '#f8fafc',
                      '&:hover': { bgcolor: '#e2e8f0' }
                    }}
                  >
                    🔍
                  </IconButton>
                </Stack>

                <Typography variant="body2" sx={{ color: '#64748b', mb: 3, fontSize: '0.875rem' }}>
                  Last quiz submitted 2 days ago
                </Typography>

                <Box sx={{ 
                  maxHeight: { xs: 'auto', lg: '400px' }, 
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '2px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#c1c1c1',
                    borderRadius: '2px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: '#a8a8a8',
                  },
                }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : recentStudents.length > 0 ? (
                    recentStudents.map((student, index) => (
                      <ContactItem
                        key={student.id || student.student_id || index}
                        name={student.name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student'}
                        location={student.department_name || student.department || 'Not Assigned'}
                        avatar={
                          student.name 
                            ? student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : student.full_name 
                              ? student.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              : `${student.first_name?.[0] || 'S'}${student.last_name?.[0] || ''}`.toUpperCase()
                        }
                      />
                    ))
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>
                      <PersonIcon sx={{ fontSize: 48, color: '#e2e8f0', mb: 2 }} />
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        No students yet
                      </Typography>
                      <Typography variant="caption">
                        Students will appear here once they register
                      </Typography>
                    </Box>
                  )}
                </Box>

                {recentStudents.length > 6 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleNavigation('/teacher/students')}
                      sx={{ 
                        color: '#6366f1',
                        textTransform: 'none',
                        fontSize: '0.875rem'
                      }}
                    >
                      View All Students
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

// Layout wrapper for other teacher pages  
export const TeacherLayout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        // Find teacher by email
        const response = await apiService.get('/api/teachers/');
        const teachers = Array.isArray(response.data) ? response.data : (response.data.results || []);
        const teacher = teachers.find(t => t.email === userEmail);
        if (teacher) {
          setTeacherData(teacher);
        }
      }
    } catch (error) {
      console.error('Error loading teacher data:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  const displayName = teacherData?.name || localStorage.getItem('userFirstName') || 'Teacher';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <ModernSidebar 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleNavigation}
        currentPath={location.pathname}
        teacherData={teacherData}
      />

      <Box sx={{ 
        flexGrow: 1,
        width: !isMobile && drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%'
      }}>
        <Box sx={{ 
          p: { xs: 2, sm: 3 }, 
          bgcolor: 'white', 
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <IconButton
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ color: '#64748b' }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
            Teacher Portal
          </Typography>
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#6366f1' }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default TeacherDashboard; 