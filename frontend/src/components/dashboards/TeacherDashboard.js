import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  useMediaQuery,
  AppBar,
  Toolbar,
  Container
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  NotificationsOutlined as NotificationsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  Palette as PaletteIcon,
  Notifications as NotificationSettingsIcon,
  Tune as TuneIcon,
  ChevronLeft,
  ChevronRight,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../api';

const DRAWER_WIDTH = 280;
const COLLAPSED_WIDTH = 80;

// Teacher Layout Wrapper Component
export const TeacherLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [notificationCount, setNotificationCount] = useState(4);
  
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalStudents: 0,
    totalDepartments: 0
  });
  
  const [userInfo, setUserInfo] = useState({
    email: localStorage.getItem('userEmail') || '',
    firstName: localStorage.getItem('userFirstName') || 'Teacher',
    lastName: localStorage.getItem('userLastName') || '',
    role: 'teacher'
  });

  useEffect(() => {
    loadStats();
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const loadStats = async () => {
    try {
      console.log('[Teacher Dashboard] Loading teacher-specific stats...');
      
      // These API endpoints already have teacher filtering implemented in the backend
      // Teachers will only see data they have relationships with
      
      const [quizResponse, studentResponse, deptResponse] = await Promise.all([
        apiService.get('/api/quiz/'),     // Backend filters: quizzes created by teacher OR in teacher's departments
        apiService.get('/api/students/'), // Backend filters: students in teacher's assigned departments
        apiService.get('/api/departments/') // Backend filters: departments teacher is assigned to
      ]);
      
      // Extract data from responses
      const quizzes = Array.isArray(quizResponse.data) ? quizResponse.data : 
                      quizResponse.data.results || [];
      
      const students = Array.isArray(studentResponse.data) ? studentResponse.data : 
                       studentResponse.data.results || [];
      
      const departments = Array.isArray(deptResponse.data) ? deptResponse.data : 
                          deptResponse.data.results || [];

      console.log('[Teacher Dashboard] Teacher-specific data loaded:', {
        quizzes: quizzes.length,
        students: students.length, 
        departments: departments.length
      });

      setStats({
        totalQuizzes: quizzes.length,
        totalStudents: students.length,
        totalDepartments: departments.length
      });
    } catch (error) {
      console.error('[Teacher Dashboard] Error loading teacher-specific stats:', error);
      
      // Show user-friendly error message
      setStats({
        totalQuizzes: 0,
        totalStudents: 0,
        totalDepartments: 0
      });
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/teacher-dashboard',
      color: '#4ecdc4'
    },
    {
      id: 'quiz',
      label: 'Manage Quiz',
      icon: <QuizIcon />,
      path: '/teacher/quiz',
      color: '#6b73ff',
      badge: stats.totalQuizzes
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: <SchoolIcon />,
      path: '/teacher/departments',
      color: '#ff6b6b'
    },
    {
      id: 'students',
      label: 'Students',
      icon: <PeopleIcon />,
      path: '/teacher/students',
      color: '#f39c12',
      badge: stats.totalStudents
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      color: '#9c27b0',
      expandable: true,
      subItems: [
        { id: 'appearance', label: 'Appearance', icon: <PaletteIcon />, path: '/teacher/settings?tab=appearance' },
        { id: 'notifications', label: 'Notifications', icon: <NotificationSettingsIcon />, path: '/teacher/settings?tab=notifications' },
        { id: 'general', label: 'General', icon: <TuneIcon />, path: '/teacher/settings?tab=general' }
      ]
    }
  ];

  const handleMenuClick = (item) => {
    if (item.expandable) {
      setSettingsExpanded(!settingsExpanded);
    } else {
      navigate(item.path);
      if (isMobile) {
        setDrawerOpen(false);
      }
    }
  };

  const handleSubMenuClick = (subItem) => {
    navigate(subItem.path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isCurrentPath = (path) => {
    if (!path) return false; // Guard against undefined path
    if (path === '/teacher-dashboard') {
      return location.pathname === '/teacher-dashboard';
    }
    return location.pathname.startsWith(path.replace('/teacher/', '/teacher/'));
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(78, 205, 196, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: drawerCollapsed ? 1 : 3,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!drawerCollapsed && (
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>
              TEACHER
            </Typography>
          )}
          {!isMobile && (
            <IconButton
              size="small"
              onClick={() => setDrawerCollapsed(!drawerCollapsed)}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                '&:hover': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              {drawerCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ p: 2, position: 'relative', zIndex: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.id}>
            <ListItem
              button
              onClick={() => handleMenuClick(item)}
              sx={{
                mb: 1,
                borderRadius: 2,
                background: isCurrentPath(item.path) 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : 'transparent',
                backdropFilter: isCurrentPath(item.path) ? 'blur(10px)' : 'none',
                border: isCurrentPath(item.path) 
                  ? '1px solid rgba(255, 255, 255, 0.2)' 
                  : '1px solid transparent',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': isCurrentPath(item.path) ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: item.color,
                  borderRadius: '0 2px 2px 0'
                } : {},
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  transform: 'translateY(-1px)',
                  '& .MuiListItemIcon-root': {
                    color: item.color,
                    transform: 'scale(1.1)'
                  }
                }
              }}
            >
              <ListItemIcon
                sx={{
                  color: isCurrentPath(item.path) ? item.color : 'rgba(255, 255, 255, 0.7)',
                  minWidth: drawerCollapsed ? 'auto' : 40,
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <Badge 
                  badgeContent={item.badge} 
                  color="secondary"
                  sx={{
                    '& .MuiBadge-badge': {
                      background: item.color,
                      color: 'white',
                      fontSize: '0.75rem'
                    }
                  }}
                >
                  {item.icon}
                </Badge>
              </ListItemIcon>
              {!drawerCollapsed && (
                <>
                  <ListItemText
                    primary={item.label}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: isCurrentPath(item.path) ? 600 : 400,
                        fontSize: '0.95rem',
                        color: isCurrentPath(item.path) ? 'white' : 'rgba(255, 255, 255, 0.8)'
                      }
                    }}
                  />
                  {item.expandable && (
                    <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {settingsExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </>
              )}
            </ListItem>

            {/* Settings Submenu */}
            {item.expandable && !drawerCollapsed && (
              <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ ml: 2 }}>
                  {item.subItems.map((subItem) => (
                    <ListItem
                      key={subItem.id}
                      button
                      onClick={() => handleSubMenuClick(subItem)}
                      sx={{
                        py: 0.5,
                        borderRadius: 1,
                        mb: 0.5,
                        background: location.search.includes(subItem.id) 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'transparent',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)'
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          minWidth: 32
                        }}
                      >
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={subItem.label}
                        sx={{
                          '& .MuiTypography-root': {
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.7)'
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* User Profile Section */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            sx={{
              width: drawerCollapsed ? 32 : 40,
              height: drawerCollapsed ? 32 : 40,
              background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
              cursor: 'pointer'
            }}
            onClick={handleMenuOpen}
          >
            <PersonIcon />
          </Avatar>
          {!drawerCollapsed && (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'white', fontSize: '0.85rem' }}>
                {userInfo.firstName} {userInfo.lastName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem' }}>
                {userInfo.email}
              </Typography>
            </Box>
          )}
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: {
              background: 'rgba(26, 26, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white'
            }
          }}
        >
          <MenuItem onClick={() => navigate('/profile')}>
            <PersonIcon sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerCollapsed && !isMobile ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerCollapsed && !isMobile ? COLLAPSED_WIDTH : DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            overflow: 'hidden'
          }
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          minHeight: '100vh',
          marginLeft: isMobile ? 0 : 0,
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          })
        }}
      >
        {/* Top Bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            color: theme.palette.text.primary
          }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// Main Teacher Dashboard Component
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalStudents: 0,
    totalDepartments: 0,
    recentActivity: []
  });
  
  const [userInfo, setUserInfo] = useState({
    email: localStorage.getItem('userEmail') || '',
    firstName: localStorage.getItem('userFirstName') || 'Teacher',
    lastName: localStorage.getItem('userLastName') || '',
    role: 'teacher'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('[Teacher Dashboard] Loading teacher-specific dashboard data...');
      
      // Use the same teacher-filtered endpoints
      const [quizResponse, studentResponse, deptResponse] = await Promise.all([
        apiService.get('/api/quiz/'),     // Backend filters: quizzes created by teacher OR in teacher's departments
        apiService.get('/api/students/'), // Backend filters: students in teacher's assigned departments  
        apiService.get('/api/departments/') // Backend filters: departments teacher is assigned to
      ]);
      
      const quizzes = Array.isArray(quizResponse.data) ? quizResponse.data : 
                      quizResponse.data.results || [];
      
      const students = Array.isArray(studentResponse.data) ? studentResponse.data : 
                       studentResponse.data.results || [];
      
      const departments = Array.isArray(deptResponse.data) ? deptResponse.data : 
                          deptResponse.data.results || [];

      console.log('[Teacher Dashboard] Dashboard data loaded for teacher:', {
        quizzes: quizzes.length,
        students: students.length,
        departments: departments.length,
        recentQuizzes: quizzes.slice(0, 5).length
      });

      setStats({
        totalQuizzes: quizzes.length,
        totalStudents: students.length,
        totalDepartments: departments.length,
        recentActivity: quizzes.slice(0, 5) // Show teacher's recent quizzes only
      });
    } catch (error) {
      console.error('[Teacher Dashboard] Error loading teacher-specific dashboard data:', error);
      
      // Set empty state on error
      setStats({
        totalQuizzes: 0,
        totalStudents: 0,
        totalDepartments: 0,
        recentActivity: []
      });
    }
  };

  const dashboardCards = [
    {
      title: 'Total Quizzes',
      value: stats.totalQuizzes,
      change: '+12%',
      icon: <QuizIcon sx={{ fontSize: 32 }} />,
      gradient: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
      action: () => navigate('/teacher/quiz')
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      change: '+8%',
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      action: () => navigate('/teacher/students')
    },
    {
      title: 'Departments',
      value: stats.totalDepartments,
      change: '+5%',
      icon: <SchoolIcon sx={{ fontSize: 32 }} />,
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
      action: () => navigate('/teacher/departments')
    }
  ];

  return (
    <TeacherLayout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Welcome back, {userInfo.firstName}!
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1 }}>
            Here's what's happening with your classes today.
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
            🔒 You're viewing data for your assigned departments and classes only
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {dashboardCards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                onClick={card.action}
                sx={{
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)'
                  },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: card.gradient
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        background: card.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Chip
                      label={card.change}
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {card.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Recent Activity */}
        <Paper
          sx={{
            p: 3,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Quizzes
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/teacher/quiz')}
              sx={{
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Create Quiz
            </Button>
          </Box>

          {stats.recentActivity.length > 0 ? (
            <Grid container spacing={2}>
              {stats.recentActivity.map((quiz, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card
                    sx={{
                      background: alpha('#f8f9fa', 0.5),
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        background: alpha('#4ecdc4', 0.1),
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {quiz.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        {quiz.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={quiz.is_published ? 'Published' : 'Draft'}
                          size="small"
                          color={quiz.is_published ? 'success' : 'default'}
                        />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QuizIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                No Quizzes Yet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Create your first quiz to get started!
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/teacher/quiz')}
                sx={{
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Create Your First Quiz
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </TeacherLayout>
  );
};

export default TeacherDashboard; 