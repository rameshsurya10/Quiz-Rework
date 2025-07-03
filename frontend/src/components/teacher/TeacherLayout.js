import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Paper,
  Fade,
  Slide,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  AccountCircle,
  Logout,
  Notifications,
  ChevronLeft,
  Home,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { userApi } from '../../services/api';

const drawerWidth = 280;

const TeacherLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedItem, setSelectedItem] = useState('dashboard');

  useEffect(() => {
    fetchUserProfile();
    // Set selected item based on current path
    const path = location.pathname;
    if (path.includes('dashboard')) setSelectedItem('dashboard');
    else if (path.includes('quiz')) setSelectedItem('quiz');
    else if (path.includes('students')) setSelectedItem('students');
    else if (path.includes('subjects')) setSelectedItem('subjects');
    else if (path.includes('settings')) setSelectedItem('settings');
  }, [location]);

  const fetchUserProfile = async () => {
    try {
      const response = await userApi.getProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, path: '/teacher/dashboard' },
    { id: 'quiz', label: 'Quiz Management', icon: QuizIcon, path: '/teacher/quiz' },
    { id: 'students', label: 'Student Management', icon: PeopleIcon, path: '/teacher/students' },
    { id: 'subjects', label: 'Subject Management', icon: SchoolIcon, path: '/teacher/subjects' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, path: '/teacher/settings' },
  ];

  const handleNavigation = (item) => {
    setSelectedItem(item.id);
    navigate(item.path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', background: 'linear-gradient(180deg, #fff5f0 0%, #fff8f5 100%)' }}>
      {/* Header with Dashboard Image */}
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #e17055 0%, #f39c7a 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/Quiz-Form.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.1,
            filter: 'blur(1px)',
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Avatar
            sx={{
              width: 60,
              height: 60,
              mx: 'auto',
              mb: 2,
              border: '3px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            {userProfile?.name?.charAt(0) || 'T'}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {userProfile?.name || 'Teacher'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
            Teacher Portal
          </Typography>
        </Box>
      </Box>

      {/* Navigation Items */}
      <List sx={{ p: 2 }}>
        {navigationItems.map((item, index) => (
          <Slide
            key={item.id}
            direction="right"
            in={true}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => handleNavigation(item)}
                selected={selectedItem === item.id}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  px: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(225, 112, 85, 0.1)',
                    transform: 'translateX(8px)',
                    boxShadow: '0 4px 12px rgba(225, 112, 85, 0.15)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(225, 112, 85, 0.15)',
                    borderLeft: '4px solid #e17055',
                    '&:hover': {
                      backgroundColor: 'rgba(225, 112, 85, 0.2)',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: selectedItem === item.id ? '#e17055' : 'rgba(0,0,0,0.6)',
                    minWidth: 40,
                    transition: 'color 0.3s ease',
                  }}
                >
                  <item.icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: selectedItem === item.id ? 600 : 500,
                    color: selectedItem === item.id ? '#e17055' : 'rgba(0,0,0,0.8)',
                    fontSize: '0.95rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          </Slide>
        ))}
      </List>

      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          background: 'linear-gradient(180deg, transparent 0%, rgba(225, 112, 85, 0.05) 100%)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            color: 'rgba(0,0,0,0.5)',
            fontSize: '0.75rem',
          }}
        >
          Quiz Management System
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
          color: '#333',
          boxShadow: '0 2px 20px rgba(225, 112, 85, 0.1)',
          borderBottom: '1px solid rgba(225, 112, 85, 0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Teacher Dashboard
          </Typography>

          <IconButton
            color="inherit"
            sx={{
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(225, 112, 85, 0.1)',
              },
            }}
          >
            <Notifications />
          </IconButton>

          <IconButton
            onClick={handleMenuClick}
            color="inherit"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(225, 112, 85, 0.1)',
              },
            }}
          >
            <AccountCircle />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                boxShadow: '0 8px 32px rgba(225, 112, 85, 0.15)',
                borderRadius: 2,
              },
            }}
          >
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => navigate('/teacher/settings')}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          background: 'linear-gradient(135deg, #fafafa 0%, #fff5f0 100%)',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Fade in={true} timeout={800}>
          <Box>
            {children}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};

export default TeacherLayout;