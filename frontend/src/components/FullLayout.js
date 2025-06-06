import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Box, Drawer, List, CssBaseline, Typography, Toolbar,
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useTheme, useMediaQuery, Avatar, Tooltip,
  Menu, MenuItem, alpha, Stack, Paper, AppBar, Toolbar as MuiToolbar,
  useScrollTrigger, Slide
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
  CategoryOutlined as CategoryIcon
} from '@mui/icons-material';
import apiService from '../api';

// Custom styled components for better organization
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'drawerwidth' && prop !== 'open',
})(({ theme, open, drawerwidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerwidth,
    width: `calc(100% - ${drawerwidth}px)`,
    [theme.breakpoints.down('md')]: {
      marginLeft: 0,
      width: '100%',
    },
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}));

const MainContent = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: theme.spacing(7),
  ...(open && !theme.breakpoints.down('md') && {
    marginLeft: drawerWidth,
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    padding: theme.spacing(2),
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    boxSizing: 'border-box',
    ...(!open && {
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
      width: theme.spacing(7),
      [theme.breakpoints.up('sm')]: {
        width: theme.spacing(9),
      },
    }),
  },
}));


const drawerWidth = 260; 
const collapsedDrawerWidth = 80; 

const FullLayout = ({ children, hideToolbar = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);

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
      setOpen(false); // Keep sidebar closed by default on mobile
    } else {
      setOpen(true); // Keep sidebar open by default on desktop
    }
  }, [isMobile]);

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
        { 
          name: 'Dashboard', 
          icon: <DashboardIcon />, 
          path: '/dashboard',
          activePaths: ['/dashboard']
        },
        { 
          name: 'Manage Quizzes', 
          icon: <QuizIcon />, 
          path: '/quizzes',
          activePaths: ['/quizzes', '/quizzes/*']
        },
      ]
    },
    {
      title: 'Management',
      items: [
        { 
          name: 'Students', 
          icon: <PeopleIcon />, 
          path: '/students',
          activePaths: ['/students', '/students/*']
        },
        { 
          name: 'Teachers', 
          icon: <SchoolIcon />, 
          path: '/teachers',
          activePaths: ['/teachers', '/teachers/*']
        },
        { 
          name: 'Results', 
          icon: <AssessmentIcon />, 
          path: '/results',
          activePaths: ['/results', '/results/*']
        },
      ]
    },
    {
      title: 'Account',
      items: [
        { 
          name: 'Profile', 
          icon: <AccountCircleIcon />, 
          path: '/profile',
          activePaths: ['/profile']
        },
        { 
          name: 'Settings', 
          icon: <SettingsIcon />, 
          path: '/settings',
          activePaths: ['/settings']
        },
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
          justifyContent: 'space-between',
          px: 2, 
          py: 1.5,
          minHeight: '64px',
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Logo and Title - centered on mobile when open */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            flexGrow: 1,
            justifyContent: isMobile && open ? 'center' : 'flex-start',
            textAlign: isMobile && open ? 'center' : 'left'
          }}
        >
          {open && (
            <>
              <Avatar 
                sx={{ 
                  bgcolor: theme.palette.primary.main, 
                  color: theme.palette.primary.contrastText, 
                  width: 32, 
                  height: 32, 
                  mr: 1.5, 
                  fontSize: '1rem' 
                }}
              >
                Q
              </Avatar>
              <Typography 
                variant="h6" 
                noWrap 
                sx={{ 
                  color: sidebarTextColor, 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                Quiz Platform
              </Typography>
            </>
          )}
        </Box>
        
        {/* Desktop Toggle - only show on desktop */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={handleDrawerToggle} 
              sx={{ 
                color: sidebarTextColor,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.contrastText, 0.1)
                }
              }}
            >
              {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          </Box>
        )}
        {/* Show CloseIcon as a floating icon in overlay when sidebar is open on mobile */}
        {isMobile && open && (
          <IconButton
            onClick={handleDrawerToggle}
            size="small"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 2000,
              color: theme.palette.primary.main,
              bgcolor: theme.palette.background.paper,
              boxShadow: 2,
              fontSize: 20,
              width: 36,
              height: 36,
              '& .MuiSvgIcon-root': {
                fontSize: 22,
              },
              '&:hover': {
                bgcolor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
              },
              '&:active': {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
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
              const isActive = item.activePaths?.some(path => 
                path.endsWith('*') 
                  ? location.pathname.startsWith(path.replace('*', ''))
                  : location.pathname === path
              ) || false;
              
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
                      color: isActive ? theme.palette.primary.contrastText : theme.palette.text.primary,
                      backgroundColor: isActive ? theme.palette.primary.main : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive 
                          ? alpha(theme.palette.primary.main, 0.22) 
                          : theme.palette.action.hover,
                        color: isActive ? theme.palette.primary.contrastText : theme.palette.primary.main,
                      },
                      '& .MuiListItemIcon-root': {
                        color: isActive ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                      },
                      '& .MuiListItemText-primary': {
                        fontSize: '0.9rem',
                        fontWeight: isActive ? 600 : 400,
                      }
                    }}
                  >
                    <ListItemIcon>
                      {React.cloneElement(item.icon, {
                        sx: { fontSize: '1.3rem' }
                      })}
                    </ListItemIcon>
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
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <StyledAppBar 
        position="fixed" 
        open={open} 
        drawerwidth={drawerWidth}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <MuiToolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              marginRight: 2,
              color: theme.palette.primary.main,
              display: { xs: 'flex', md: 'none' } // Only show on mobile
            }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Quiz Platform
          </Typography>
        </MuiToolbar>
      </StyledAppBar>

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
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: '75%',
              maxWidth: drawerWidth,
              backgroundColor: theme.palette.background.paper,
              borderRight: 'none',
              boxShadow: theme.shadows[8],
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
              backgroundColor: theme.palette.background.paper,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              overflowX: 'hidden',
              '&:hover': {
                '& .MuiListItemIcon-root': {
                  opacity: 1,
                },
              },
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
          p: { xs: 2, sm: 3 },
          backgroundColor: theme.palette.background.default,
          overflowY: 'auto',
          minHeight: '100vh',
          width: '100%',
          marginLeft: { xs: 0, md: `${open ? drawerWidth : collapsedDrawerWidth}px` },
          paddingTop: hideToolbar ? '0 !important' : { xs: '64px', sm: '80px' },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          [theme.breakpoints.down('sm')]: {
            padding: 2,
            paddingTop: hideToolbar ? '0 !important' : '56px',
          },
        }}
      >
        <Toolbar /> {/* This pushes content down below the AppBar */}
        {children}
      </Box>
    </Box>
  );
};

export default FullLayout;
