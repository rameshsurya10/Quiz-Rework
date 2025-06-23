import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import {
  Box, Drawer, List, CssBaseline, Typography, Toolbar,
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useTheme, useMediaQuery, Avatar, Tooltip,
  Menu, MenuItem, alpha, Stack, Paper, AppBar, Toolbar as MuiToolbar,
  useScrollTrigger, Slide, Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  AccountCircle as AccountCircleIcon,
  GitHub as GitHubIcon,
  InfoOutlined as InfoOutlinedIcon,
  GetAppOutlined as GetAppOutlinedIcon,
  RemoveOutlined as RemoveOutlinedIcon,
  ViewAgendaOutlined as ViewAgendaOutlinedIcon,
  VerticalAlignBottomOutlined as VerticalAlignBottomOutlinedIcon,
  VerticalAlignTopOutlined as VerticalAlignTopOutlinedIcon,
  PeopleAltOutlined as PeopleIcon,
  AssessmentOutlined as AssessmentIcon,
  CategoryOutlined as CategoryIcon,
  HomeOutlined as HomeIcon,
  SearchOutlined as SearchIcon,
  DescriptionOutlined as DocumentsIcon,
  LocalOfferOutlined as OffersIcon,
  ScheduleOutlined as ScheduleIcon,
  ChatOutlined as ChatIcon
} from '@mui/icons-material';
import apiService from '../api';

// Subtle glow animation
const subtleGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(120, 119, 198, 0.1); }
  50% { box-shadow: 0 0 25px rgba(120, 119, 198, 0.15); }
  100% { box-shadow: 0 0 15px rgba(120, 119, 198, 0.1); }
`;

// Floating animation for elements
const gentleFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
  100% { transform: translateY(0px); }
`;

const drawerWidth = 280;

const FullLayout = ({ children, hideToolbar = false }) => {
  const theme = useTheme();
  const collapsedDrawerWidth = 72;
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [userRole, setUserRole] = useState('');

  // Handle drawer toggle for both mobile and desktop
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  // Close mobile drawer when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile) {
        setMobileOpen(false);
        setOpen(true);
      } else {
        setOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profileResponse = await apiService.userApi.getProfile();
        const userData = profileResponse.data || profileResponse;
        
        if (userData) {
          setUserName(userData.full_name || userData.first_name || (userData.email ? userData.email.split('@')[0] : 'Guest'));
          setUserRole(userData.role || '');
        }
      } catch (error) {
        console.error('Failed to fetch user profile for layout:', error);
        const localUser = apiService.getCurrentUser();
        if (localUser) {
          setUserName(localUser.full_name || localUser.first_name || (localUser.email ? localUser.email.split('@')[0] : 'Guest'));
          setUserRole(localUser.role || '');
        }
      }
    };

    fetchUserData();
  }, []);

  const handleProfileMenuOpen = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    apiService.logoutUser(); 
    navigate('/login');
    handleProfileMenuClose();
  };

  const menuSections = [
    {
      title: 'MENU',
      items: [
        { 
          name: 'Home', 
          icon: <HomeIcon />, 
          path: '/dashboard',
          activePaths: ['/dashboard'],
          color: '#4ecdc4'
        },
        { 
          name: 'Search', 
          icon: <SearchIcon />, 
          path: '/search',
          activePaths: ['/search'],
          color: '#4ecdc4'
        },
        { 
          name: 'Documents', 
          icon: <DocumentsIcon />, 
          path: '/documents',
          activePaths: ['/documents'],
          color: '#4ecdc4'
        },
        { 
          name: 'Offers', 
          icon: <OffersIcon />, 
          path: '/offers',
          activePaths: ['/offers'],
          color: '#4ecdc4'
        },
        { 
          name: 'Schedule', 
          icon: <ScheduleIcon />, 
          path: '/schedule',
          activePaths: ['/schedule'],
          color: '#4ecdc4'
        },
        { 
          name: 'Manage Quiz', 
          icon: <QuizIcon />, 
          path: '/quiz',
          activePaths: ['/quiz', '/quiz/*'],
          color: '#4ecdc4'
        },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { 
          name: 'Subjects',
          icon: <CategoryIcon />,
          path: '/departments',
          activePaths: ['/departments'],
          color: '#7877c6'
        },
        { 
          name: 'Teachers', 
          icon: <SchoolIcon />, 
          path: '/teachers',
          activePaths: ['/teachers', '/teachers/*'],
          color: '#7877c6'
        },
        { 
          name: 'Students', 
          icon: <PeopleIcon />, 
          path: '/students',
          activePaths: ['/students', '/students/*'],
          color: '#7877c6'
        },
        { 
          name: 'Results', 
          icon: <AssessmentIcon />, 
          path: '/results',
          activePaths: ['/results', '/results/*'],
          color: '#7877c6'
        },
        { 
          name: 'Settings', 
          icon: <SettingsIcon />, 
          path: '/settings',
          activePaths: ['/settings'],
          color: '#7877c6'
        },
      ]
    }
  ];

  const drawerContent = (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: 'none',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '1px',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
        }
      }}
    >
      {/* Drawer Header */}
      <Box sx={{ 
        p: open ? 2.5 : 1.5, 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Robot Avatar */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(78, 205, 196, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: `${subtleGlow} 4s ease-in-out infinite`,
              }}
            >
              <img 
                src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXZ3cjNzZzVjcDR6Y2s1aWx6aG9wcHNkcjNkeTNyeGV6YnZwbWw3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1R1tvI9svkIWwpVYr/giphy.gif" 
                alt="Jumbo Quiz Robot"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #ffffff 0%, #4ecdc4 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Jumbo Quiz
            </Typography>
          </Box>
        )}
        <IconButton 
          onClick={handleDrawerToggle} 
          size="small"
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#4ecdc4'
            }
          }}
        >
          {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Navigation List */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuSections.map((section, sectionIndex) => (
          <React.Fragment key={section.title}>
            {open && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  pt: sectionIndex > 0 ? 3 : 1,
                  pb: 1,
                  pl: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {section.title}
              </Typography>
            )}
            
            {section.items.map((item) => {
              const isActive = item.activePaths?.some(path => 
                path.endsWith('*') 
                  ? location.pathname.startsWith(path.replace('*', ''))
                  : location.pathname === path
              ) || false;
              
              return (
                <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip title={open ? '' : item.name} placement="right">
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      sx={{
                        minHeight: 44,
                        justifyContent: open ? 'initial' : 'center',
                        px: open ? 2 : 1.5,
                        py: 1,
                        mx: 0.5,
                        borderRadius: '12px',
                        background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        backdropFilter: isActive ? 'blur(10px)' : 'none',
                        border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': isActive ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          background: item.color || '#4ecdc4',
                          borderRadius: '0 2px 2px 0',
                        } : {},
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.08)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          transform: 'translateY(-1px)',
                          '& .MuiListItemIcon-root': {
                            color: item.color || '#4ecdc4',
                            transform: 'scale(1.1)',
                          },
                        },
                        '&.Mui-selected': {
                          background: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiListItemIcon-root': {
                            color: item.color || '#4ecdc4',
                          },
                        },
                      }}
                    >
                      <ListItemIcon 
                        sx={{ 
                          minWidth: 0, 
                          mr: open ? 2 : 'auto', 
                          justifyContent: 'center',
                          color: isActive ? (item.color || '#4ecdc4') : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '20px',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {React.cloneElement(item.icon, { sx: { fontSize: '20px' } })}
                      </ListItemIcon>
                      {open && (
                        <ListItemText 
                          primary={item.name} 
                          sx={{ 
                            '& .MuiListItemText-primary': { 
                              fontWeight: isActive ? 600 : 400, 
                              fontSize: '0.9rem',
                              color: 'inherit'
                            } 
                          }} 
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </React.Fragment>
        ))}
      </List>

      {/* User Profile Section at the bottom */}
      <Box sx={{ 
        p: open ? 2 : 1, 
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <Tooltip title={open ? '' : 'Profile Menu'} placement="right">
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: open ? 1.5 : 0,
              p: 1,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              justifyContent: open ? 'flex-start' : 'center',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)',
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                background: 'linear-gradient(135deg, #7877c6 0%, #4ecdc4 100%)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
            {open && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#ffffff',
                    fontWeight: 500,
                    fontSize: '0.85rem',
                    lineHeight: 1.2
                  }}
                  noWrap
                >
                  {userName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.7rem'
                  }}
                  noWrap
                >
                  {userRole || 'User'}
                </Typography>
              </Box>
            )}
            {open && <ChevronRightIcon sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }} />}
          </Box>
        </Tooltip>

        <Menu
          anchorEl={anchorElUser}
          id="profile-menu"
          open={Boolean(anchorElUser)}
          onClose={handleProfileMenuClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          PaperProps={{
            sx: {
              background: 'rgba(26, 26, 46, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              minWidth: 200,
              '& .MuiMenuItem-root': {
                color: '#ffffff',
                fontSize: '0.9rem',
                py: 1,
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                },
                '& .MuiListItemIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  minWidth: 36,
                }
              }
            }
          }}
        >
          <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
            <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
            <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 0.5 }}/>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <CssBaseline />
      
      {/* Mobile menu button */}
      <Box sx={{ 
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 1300,
        display: { xs: 'block', md: 'none' }
      }}>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            background: 'rgba(26, 26, 46, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            '&:hover': {
              background: 'rgba(26, 26, 46, 0.95)',
            },
          }}
        >
          {mobileOpen ? <CloseIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{
          width: { md: open ? drawerWidth : collapsedDrawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create(['width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              border: 'none',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: open ? drawerWidth : collapsedDrawerWidth,
              border: 'none',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              overflowX: 'hidden',
            },
          }}
          open={open}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          minHeight: '100vh',
          position: 'relative',
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(255, 107, 107, 0.06) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(78, 205, 196, 0.04) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default FullLayout;
