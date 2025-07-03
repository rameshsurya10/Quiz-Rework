import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import {
  Box, Drawer, List, CssBaseline, Typography, Toolbar,
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useMediaQuery, Avatar, Tooltip,
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
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { useTheme } from '@mui/material/styles';
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

// Responsive drawer widths
const drawerWidth = 280;
const collapsedDrawerWidth = 64;
const mobileDrawerWidth = 260;

const FullLayout = ({ children, hideToolbar = false }) => {
  const theme = useTheme();
  const { appearance, highContrast } = useCustomTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  // Helper to derive a clean display name from profile data
  const getDisplayName = (data) => {
    if (!data) return '';
    const combined = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    return (data.full_name && data.full_name.trim()) || combined || (data.email ? data.email.split('@')[0] : '');
  };

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
          setUserName(getDisplayName(userData));
          setUserRole(userData.role || '');
        }
      } catch (error) {
        console.error('Failed to fetch user profile for layout:', error);
        const localUser = apiService.getCurrentUser();
        if (localUser) {
          setUserName(getDisplayName(localUser));
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
          path: '/admin/dashboard',
          activePaths: ['/admin/dashboard', '/dashboard'],
          color: theme.palette.primary.main
        },
        { 
          name: 'Manage Quiz', 
          icon: <QuizIcon />, 
          path: '/admin/quiz',
          activePaths: ['/admin/quiz', '/quiz', '/admin/quiz/*', '/quiz/*'],
          color: theme.palette.primary.main
        },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { 
          name: 'Subjects',
          icon: <CategoryIcon />,
          path: '/admin/departments',
          activePaths: ['/admin/departments', '/departments'],
          color: theme.palette.secondary.main
        },
        { 
          name: 'Teachers', 
          icon: <SchoolIcon />, 
          path: '/admin/teachers',
          activePaths: ['/admin/teachers', '/teachers', '/admin/teachers/*', '/teachers/*'],
          color: theme.palette.secondary.main
        },
        { 
          name: 'Students', 
          icon: <PeopleIcon />, 
          path: '/admin/students',
          activePaths: ['/admin/students', '/students', '/admin/students/*', '/students/*'],
          color: theme.palette.secondary.main
        },
        { 
          name: 'Results', 
          icon: <AssessmentIcon />, 
          path: '/admin/results',
          activePaths: ['/admin/results', '/results', '/admin/results/*', '/results/*'],
          color: theme.palette.secondary.main
        },
        { 
          name: 'Settings', 
          icon: <SettingsIcon />, 
          path: '/admin/settings',
          activePaths: ['/admin/settings', '/settings'],
          color: theme.palette.secondary.main
        },
      ]
    }
  ];

  // Dynamic styling based on theme
  const getDrawerStyles = () => {
    if (highContrast) {
      return {
        background: theme.palette.background.paper,
        border: `2px solid ${theme.palette.text.primary}`,
      };
    }
    
    if (appearance === 'modern') {
      return {
        background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        border: 'none',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '1px',
          height: '100%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
        }
      };
    }
    
    if (appearance === 'classic') {
      return {
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
      };
    }
    
    if (appearance === 'royal') {
      return {
        background: theme.palette.mode === 'dark' 
          ? 'linear-gradient(180deg, rgba(45, 27, 105, 0.95) 0%, rgba(17, 153, 142, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)',
        backdropFilter: 'blur(15px)',
        border: 'none',
      };
    }
    
    return {
      background: theme.palette.background.paper,
    };
  };

  const getItemStyles = (item, isActive) => {
    const baseStyles = {
      minHeight: 44,
      justifyContent: open ? 'initial' : 'center',
      px: open ? 2 : 1.5,
      py: 1,
      mx: 0.5,
      borderRadius: theme.shape.borderRadius,
      color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    };

    if (highContrast) {
      return {
        ...baseStyles,
        background: isActive ? theme.palette.primary.main : 'transparent',
        color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
        border: `1px solid ${isActive ? theme.palette.primary.main : theme.palette.text.secondary}`,
        '&:hover': {
          background: theme.palette.action.hover,
          border: `1px solid ${theme.palette.primary.main}`,
        },
      };
    }

    if (appearance === 'modern') {
      return {
        ...baseStyles,
        background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        backdropFilter: isActive ? 'blur(10px)' : 'none',
        border: isActive ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
        '&::before': isActive ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: item.color,
          borderRadius: '0 2px 2px 0',
        } : {},
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          transform: 'translateY(-1px)',
          '& .MuiListItemIcon-root': {
            color: item.color,
            transform: 'scale(1.1)',
          },
        },
      };
    }

    return {
      ...baseStyles,
      background: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
      '&:hover': {
        background: alpha(theme.palette.primary.main, 0.08),
        '& .MuiListItemIcon-root': {
          color: theme.palette.primary.main,
        },
      },
    };
  };

  const drawerContent = (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...getDrawerStyles()
      }}
    >
      {/* Drawer Header */}
      <Box sx={{ 
        p: { xs: 1.5, sm: open ? 2.5 : 1.5 }, 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        borderBottom: `1px solid ${highContrast ? theme.palette.text.primary : 'rgba(255, 255, 255, 0.08)'}`,
        background: highContrast ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
        minHeight: { xs: 56, sm: 64 }
      }}>
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
            {/* Robot Avatar */}
            <Box
              sx={{
                width: { xs: 28, sm: 36 },
                height: { xs: 28, sm: 36 },
                borderRadius: '50%',
                background: highContrast 
                  ? theme.palette.primary.main
                  : 'linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(78, 205, 196, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${theme.palette.divider}`,
                animation: !highContrast ? `${subtleGlow} 4s ease-in-out infinite` : 'none',
              }}
            >
              <img 
                src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXZ3cjNzZzVjcDR6Y2s1aWx6aG9wcHNkcjNkeTNyeGV6YnZwbWw3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1R1tvI9svkIWwpVYr/giphy.gif" 
                alt="Jumbo Quiz Robot"
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: theme.palette.text.primary,
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '1.1rem' },
                background: highContrast ? 'none' : (appearance === 'modern' 
                  ? 'linear-gradient(135deg, #ffffff 0%, #4ecdc4 100%)'
                  : 'none'),
                backgroundClip: highContrast ? 'none' : 'text',
                WebkitBackgroundClip: highContrast ? 'none' : 'text',
                WebkitTextFillColor: highContrast ? theme.palette.text.primary : (appearance === 'modern' ? 'transparent' : theme.palette.text.primary),
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Jumbo Quiz
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: theme.palette.text.primary,
                fontWeight: 600,
                fontSize: '0.8rem',
                display: { xs: 'block', sm: 'none' }
              }}
            >
              JQ
            </Typography>
          </Box>
        )}
        <IconButton 
          onClick={handleDrawerToggle} 
          size="small"
          sx={{ 
            color: theme.palette.text.secondary,
            background: highContrast ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: highContrast ? 'none' : 'blur(10px)',
            border: `1px solid ${theme.palette.divider}`,
            width: { xs: 32, sm: 36 },
            height: { xs: 32, sm: 36 },
            '&:hover': {
              background: highContrast ? theme.palette.action.hover : 'rgba(255, 255, 255, 0.1)',
              color: theme.palette.primary.main
            }
          }}
        >
          {open ? <ChevronLeftIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Navigation List */}
      <List sx={{ flex: 1, px: { xs: 0.5, sm: 1 }, py: { xs: 1, sm: 2 } }}>
        {menuSections.map((section, sectionIndex) => (
          <React.Fragment key={section.title}>
            {open && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: { xs: '0.6rem', sm: '0.65rem' },
                  pt: sectionIndex > 0 ? { xs: 2, sm: 3 } : { xs: 0.5, sm: 1 },
                  pb: { xs: 0.5, sm: 1 },
                  pl: { xs: 1.5, sm: 2 },
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
                <ListItem key={item.name} disablePadding sx={{ mb: { xs: 0.25, sm: 0.5 } }}>
                  <Tooltip title={open ? '' : item.name} placement="right">
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      sx={{
                        ...getItemStyles(item, isActive),
                        minHeight: { xs: 40, sm: 44 },
                        mx: { xs: 0.25, sm: 0.5 },
                        px: open ? { xs: 1.5, sm: 2 } : { xs: 1, sm: 1.5 },
                        py: { xs: 0.75, sm: 1 },
                      }}
                    >
                      <ListItemIcon 
                        sx={{ 
                          minWidth: 0, 
                          mr: open ? { xs: 1.5, sm: 2 } : 'auto', 
                          justifyContent: 'center',
                          color: isActive ? item.color : theme.palette.text.secondary,
                          fontSize: { xs: '18px', sm: '20px' },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {React.cloneElement(item.icon, { sx: { fontSize: { xs: '18px', sm: '20px' } } })}
                      </ListItemIcon>
                      {open && (
                        <ListItemText 
                          primary={item.name} 
                          sx={{ 
                            '& .MuiListItemText-primary': { 
                              fontWeight: isActive ? 600 : 400, 
                              fontSize: { xs: '0.8rem', sm: '0.9rem' },
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
        p: open ? { xs: 1.5, sm: 2 } : { xs: 0.75, sm: 1 }, 
        borderTop: `1px solid ${theme.palette.divider}`,
        background: highContrast ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
      }}>
        <Tooltip title={open ? '' : 'Profile Menu'} placement="right">
          <Box 
            onClick={handleProfileMenuOpen} 
            sx={{
                display: 'flex', 
                alignItems: 'center', 
              gap: open ? { xs: 1, sm: 1.5 } : 0,
              p: { xs: 0.75, sm: 1 },
              borderRadius: theme.shape.borderRadius,
              background: highContrast ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
              backdropFilter: highContrast ? 'none' : 'blur(10px)',
              border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer', 
              transition: 'all 0.3s ease',
              justifyContent: open ? 'flex-start' : 'center',
              minHeight: { xs: 40, sm: 48 },
              '&:hover': {
                background: theme.palette.action.hover,
                transform: !highContrast ? 'translateY(-1px)' : 'none',
              }
            }}
          >
            <Avatar 
                sx={{ 
                width: { xs: 28, sm: 32 }, 
                height: { xs: 28, sm: 32 },
                background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.primary.main} 100%)`,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
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
                    color: theme.palette.text.primary,
                    fontWeight: 500,
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    lineHeight: 1.2
                  }}
                  noWrap
                >
                  {userName}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontSize: { xs: '0.65rem', sm: '0.7rem' }
                  }}
                  noWrap
                >
                  {userRole || 'User'}
                </Typography>
                </Box>
            )}
            {open && <ChevronRightIcon sx={{ color: theme.palette.text.secondary, fontSize: { xs: '14px', sm: '16px' } }} />}
          </Box>
        </Tooltip>

        <Menu
            anchorEl={anchorElUser}
            id="profile-menu"
            open={Boolean(anchorElUser)}
            onClose={handleProfileMenuClose}
          anchorOrigin={{ 
            vertical: 'bottom', 
            horizontal: 'center' 
          }}
          transformOrigin={{ 
            vertical: 'top', 
            horizontal: 'center' 
          }}
            PaperProps={{
            sx: {
              background: theme.palette.background.paper,
              backdropFilter: !highContrast ? 'blur(20px)' : 'none',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
                minWidth: 200,
              maxWidth: 280,
              mt: 1,
              boxShadow: highContrast ? `2px 2px 0px ${theme.palette.text.primary}` : theme.shadows[8],
              '& .MuiMenuItem-root': {
                color: theme.palette.text.primary,
                  fontSize: '0.9rem',
                py: 1.2,
                px: 2,
                  '&:hover': {
                  background: theme.palette.action.hover,
                  },
                '& .MuiListItemIcon-root': {
                    color: theme.palette.text.secondary,
                  minWidth: 36,
                  }
                }
              }
            }}
          >
          {userRole !== 'ADMIN' && (
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
          )}
          <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
          <Divider sx={{ borderColor: theme.palette.divider, my: 0.5 }}/>
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
            background: theme.palette.background.paper,
            backdropFilter: !highContrast ? 'blur(20px)' : 'none',
            border: `1px solid ${theme.palette.divider}`,
            color: theme.palette.text.primary,
            boxShadow: highContrast ? `1px 1px 0px ${theme.palette.text.primary}` : theme.shadows[4],
            '&:hover': {
              background: theme.palette.action.hover,
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
          width: { 
            xs: 0,
            md: open ? drawerWidth : collapsedDrawerWidth 
          },
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
              width: mobileDrawerWidth,
              border: 'none',
              boxShadow: theme.shadows[16],
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
          background: theme.palette.background.default,
          minHeight: '100vh',
          position: 'relative',
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          '&::before': !highContrast && appearance === 'modern' ? {
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
          } : {},
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
