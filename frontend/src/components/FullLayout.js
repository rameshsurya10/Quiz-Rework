import React, { useState, useEffect } from 'react';
import {
  Box, Drawer, List, CssBaseline, Typography, Toolbar, // Added Toolbar
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useTheme, useMediaQuery, Avatar, Tooltip,
  Menu, MenuItem, alpha, Stack, Paper
} from '@mui/material';
import {
  Menu as MenuIcon, // Will be used for mobile toggle
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
  // Quiz App specific icons:
  PeopleAltOutlined as PeopleIcon,
  AssessmentOutlined as AssessmentIcon,
  CategoryOutlined as CategoryIcon // For Manage Quizzes or similar general purpose
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../api'; 

const drawerWidth = 260; 
const collapsedDrawerWidth = 80; 

const FullLayout = ({ children, hideToolbar = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setOpen(false); // Keep sidebar closed by default on mobile
    } else {
      setOpen(true); // Keep sidebar open by default on desktop
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

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
      title: 'Main',
      items: [
        { name: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { name: 'Manage Quizzes', icon: <QuizIcon />, path: '/quizzes' }, // Or CategoryIcon
      ]
    },
    {
      title: 'Management',
      items: [
        { name: 'Students', icon: <PeopleIcon />, path: '/students' },
        { name: 'Teachers', icon: <PeopleIcon sx={{ transform: 'scaleX(-1)' }} />, path: '/teachers' }, // Re-using PeopleIcon, could be more specific
        { name: 'Results', icon: <AssessmentIcon />, path: '/results' },
      ]
    },
    {
      title: 'Account',
      items: [
        { name: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
        { name: 'Settings', icon: <SettingsIcon />, path: '/settings' },
      ]
    }
  ];

    // Determine current theme based on image (dark or light)
  // Using theme's primary colors
  const sidebarBackgroundColor = theme.palette.primary.dark;
  const sidebarTextColor = theme.palette.primary.contrastText; // Usually white or black
  const activeItemBackground = alpha(theme.palette.primary.light, 0.25); // Lighter shade for active item background
  const activeItemColor = theme.palette.primary.contrastText; // Keep text color consistent, or use theme.palette.primary.light for contrast

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between', // Always space-between for the new layout
          px: 2, 
          py: 1.5,
          // borderBottom: `1px solid ${alpha(sidebarTextColor, 0.2)}`, // Optional: if you want a separator
          minHeight: '64px', // Standard toolbar height
        }}
      >
        {open && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, width: 32, height: 32, mr: 1.5, fontSize: '1rem' }}>
              Q
            </Avatar>
            <Typography variant="h6" noWrap sx={{ color: sidebarTextColor, fontWeight: 'bold' }}>
              Quiz Platform
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Conditional block for icon was here, removed as icon is removed. */}
            {/* Desktop Toggle - only show if not mobile */}
            {!isMobile && (
              <IconButton onClick={handleDrawerToggle} sx={{ color: sidebarTextColor }}>
                {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>
            )}
        </Box>
      </Toolbar>
      
      <List sx={{ flexGrow: 1, pt: open ? 1 : 2, px: open ? 2 : 1.25 }}>
        {menuSections.map((section, sectionIndex) => (
          <React.Fragment key={section.title}>
            {open && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: alpha(sidebarTextColor, 0.6),
                  fontWeight: 600,
                  pt: sectionIndex > 0 ? 2.5 : 0.5, // Add top padding for subsequent sections
                  pb: 1,
                  pl: 1, // Padding to align with list items
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {section.title}
              </Typography>
            )}
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <ListItem key={item.name} disablePadding sx={{ display: 'block', my: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    selected={isActive}
                    sx={{
                      minHeight: 44,
                      justifyContent: open ? 'initial' : 'center',
                      px: open ? 2 : 1.5,
                      py: open ? 1 : 1.25,
                      borderRadius: '10px',
                      color: isActive ? activeItemColor : alpha(sidebarTextColor, 0.8),
                      backgroundColor: isActive ? activeItemBackground : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive ? alpha(activeItemBackground, 0.8) : alpha(sidebarTextColor, 0.08),
                        color: isActive ? activeItemColor : sidebarTextColor,
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'inherit',
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                      },
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 500,
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    {open && <ListItemText primary={item.name} />}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </React.Fragment>
        ))}
      </List>

      <Box sx={{ p: open ? 2 : 1, mt: 'auto', borderTop: `1px solid ${alpha(theme.palette.common.white, 0.12)}` }}>
        <Tooltip title={open ? "User Settings" : "User"}>
            <Box 
                onClick={handleProfileMenuOpen} 
                sx={{
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer', 
                    p: 1, 
                    borderRadius: '12px',
                    backgroundColor: Boolean(anchorElUser) ? alpha(theme.palette.common.white, 0.1) : 'transparent',
                    '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.08) }
                }}
            >
                <Avatar 
                    sx={{ 
                        width: open ? 40 : 32, 
                        height: open ? 40 : 32, 
                        bgcolor: alpha(theme.palette.primary.main, 0.8), 
                        color: 'white',
                        mr: open ? 1.5 : 0,
                        fontSize: open ? '1rem' : '0.9rem'
                    }}
                >
                    JD 
                </Avatar>
                {open && (
                    <Box sx={{ color: 'white' }}>
                        <Typography variant="subtitle2" sx={{lineHeight: 1.2}}>John Doe</Typography>
                        <Typography variant="caption" sx={{opacity: 0.7}}>Admin</Typography>
                    </Box>
                )}
            </Box>
        </Tooltip>
        <Menu
            anchorEl={anchorElUser}
            id="profile-menu"
            open={Boolean(anchorElUser)}
            onClose={handleProfileMenuClose}
            MenuListProps={{'aria-labelledby': 'basic-button'}}
            PaperProps={{
                elevation: 0,
                sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: -7, 
                    ml: open ? 0 : 7,
                    backgroundColor: '#374151', 
                    color: 'white',
                    borderRadius: '8px',
                    minWidth: 180,
                    '& .MuiMenuItem-root': {
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.common.white, 0.1)
                        },
                        '& .MuiSvgIcon-root': {
                            color: alpha(theme.palette.common.white, 0.7)
                        }
                    }
                },
            }}
            transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
        >
            <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>Profile
            </MenuItem>
            <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
                <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>Settings
            </MenuItem>
            <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.12) }} />
            <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Logout
            </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      {/* Mobile Toggle Button - Placed at top left of content area */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed', // Fixed position for mobile
            top: theme.spacing(2),
            left: theme.spacing(2),
            zIndex: theme.zIndex.drawer + 20, // Ensure it's above content and drawer when open
            color: theme.palette.text.primary, 
            backgroundColor: alpha(theme.palette.background.paper, 0.7),
            '&:hover': {
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
            }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
      {/* AppBar was here, now removed */}

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{ // For Drawer itself, not its paper
            width: open ? drawerWidth : (isMobile ? 0 : collapsedDrawerWidth),
            flexShrink: 0,
        }}
        PaperProps={{
          sx: {
            // width: 'inherit', // Inherit width from Drawer's sx prop
            width: open ? drawerWidth : (isMobile ? 0 : collapsedDrawerWidth), // Explicitly set paper width
            boxSizing: 'border-box',
            borderRight: 'none',
            backgroundColor: sidebarBackgroundColor,
            color: sidebarTextColor,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
            }),
            borderRadius: open && !isMobile ? '0 12px 12px 0' : '0',
            boxShadow: isMobile ? theme.shadows[8] : theme.shadows[2], // Softer shadow for desktop
            ...(isMobile && {
              // Mobile specific overrides for temporary drawer
              // e.g. backgroundColor: alpha(sidebarBackgroundColor, 0.95),
              // backdropFilter: 'blur(5px)',
            })
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 }, 
          backgroundColor: theme.palette.background.default, 
          overflowY: 'auto', 
          height: '100vh', 
          paddingTop: hideToolbar ? '0 !important' : `calc(${theme.mixins.toolbar.minHeight}px + ${theme.spacing(3)})`, 
          [theme.breakpoints.up('sm')]: {
             paddingTop: hideToolbar ? '0 !important' : `calc(64px + ${theme.spacing(3)})`, 
          },
          '&.MuiBox-root': {
            margin: 0,
            padding: 0
          },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(!isMobile && {
            // marginLeft: open ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`,
            width: `calc(100% - ${open ? drawerWidth : collapsedDrawerWidth}px)`
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default FullLayout;
