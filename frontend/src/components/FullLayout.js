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
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.black, 0.1) : alpha(theme.palette.grey[50], 0.95), // Subtle background for main content area
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
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.grey[900], 0.97) : theme.palette.common.white,
    borderRight: theme.palette.mode === 'dark' ? `1px solid ${alpha(theme.palette.divider, 0.15)}` : 'none',
    boxShadow: theme.palette.mode === 'light' ? '0px 4px 12px rgba(0,0,0,0.05)' : '0px 4px 15px rgba(0,0,0,0.2)',
    '& .MuiListItemButton-root': {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
      marginBottom: theme.spacing(0.5),
      borderRadius: theme.shape.borderRadius * 2,
      margin: theme.spacing(0.5, 1.5),
      '&:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.08),
        color: theme.palette.primary.main,
        '& .MuiListItemIcon-root': {
          color: theme.palette.primary.main,
        },
      },
      '&.Mui-selected': {
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        color: theme.palette.primary.main,
        fontWeight: 'bold',
        '& .MuiListItemIcon-root': {
          color: theme.palette.primary.main,
        },
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.15),
        }
      },
    },
    '& .MuiListItemIcon-root': {
      minWidth: 'auto',
      marginRight: theme.spacing(2),
      color: theme.palette.text.secondary,
    },
    '& .MuiListItemText-primary': {
      fontSize: '0.95rem',
      color: theme.palette.text.primary,
    },
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


const drawerWidth = 280; // Slightly wider for better spacing 

const FullLayout = ({ children, hideToolbar = false }) => {
  const theme = useTheme();
  const collapsedDrawerWidth = theme.spacing(9); // Consistent with MUI spacing
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
      setOpen(false); // Keep sidebar closed by default on mobile
    } else {
      setOpen(true); // Keep sidebar open by default on desktop
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
      title: 'Main',
      items: [
        { 
          name: 'Dashboard', 
          icon: <DashboardIcon />, 
          path: '/dashboard',
          activePaths: ['/dashboard']
        },
        { 
          name: 'Manage Quiz', 
          icon: <QuizIcon />, 
          path: '/quiz',
          activePaths: ['/quiz', '/quiz/*']
        },
      ]
    },
    {
      title: 'Management',
      items: [
        { 
          name: 'Departments',
          icon: <CategoryIcon />,
          path: '/departments',
          activePaths: ['/departments']
        },
        { 
          name: 'Teachers', 
          icon: <SchoolIcon />, 
          path: '/teachers',
          activePaths: ['/teachers', '/teachers/*']
        },
        // {
        //   name: 'Student Reports',
        //   icon: <AssessmentIcon />,
        //   path: '/student-reports',
        //   activePaths: ['/student-reports']
        // },
        { 
          name: 'Students', 
          icon: <PeopleIcon />, 
          path: '/students',
          activePaths: ['/students', '/students/*']
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
  const sidebarPaperBg = theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.common.white;
  const sidebarTextColor = theme.palette.text.secondary; 
  const sidebarIconColor = theme.palette.text.secondary;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: sidebarPaperBg }}>
      {/* Drawer Header */}
      <DrawerHeader sx={{ px: open ? 2.5 : (collapsedDrawerWidth / 8 - 2.5), justifyContent: 'space-between', alignItems: 'center' }}>
        {open && (
          <Box component={Link} to="/dashboard" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText, width: 40, height: 40, mr: open ? 1.5 : 0 }}>
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
            <Typography variant="h6" noWrap sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
              QuizMaster
            </Typography>
          </Box>
        )}
        <IconButton onClick={handleDrawerToggle} sx={{ color: theme.palette.text.secondary, ml: open ? 0 : 'auto', mr: open ? 0 : 'auto' }}>
           {isMobile ? (open ? <CloseIcon /> : <MenuIcon />) : (open ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
        </IconButton>
      </DrawerHeader>
      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.2) }} />

      {/* Navigation List */}
      <List sx={{ flexGrow: 1, pt: 1, px: open ? 1.5 : 1 }}>
        {menuSections.map((section, sectionIndex) => (
          <React.Fragment key={section.title + '-' + sectionIndex}>
            {open && section.title && (
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  color: alpha(sidebarTextColor, 0.7),
                  fontWeight: 500,
                  pt: sectionIndex > 0 ? 2.25 : 1,
                  pb: 0.75,
                  pl: 1.5, 
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontSize: '0.65rem'
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
                <ListItem key={item.name} disablePadding sx={{ display: 'block', my: open ? 0.25 : 0.5 }}>
                  <Tooltip title={open ? '' : item.name} placement="right">
                    <ListItemButton
                      component={Link}
                      to={item.path}
                      selected={isActive}
                      sx={{
                        minHeight: 46,
                        justifyContent: open ? 'initial' : 'center',
                        px: open ? 2 : (collapsedDrawerWidth / 8 - 2.75),
                        py: open ? 1.1 : 1.25,
                        borderRadius: theme.shape.borderRadius * 1.5,
                        color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                        backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                        '&:hover': {
                          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.2 : 0.5),
                          color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                          '& .MuiListItemIcon-root': {
                            color: isActive ? theme.palette.primary.main : (theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main),
                          },
                        },
                        '&.Mui-selected': {
                          color: theme.palette.primary.main,
                          fontWeight: '600',
                          backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          '& .MuiListItemIcon-root': {
                            color: theme.palette.primary.main,
                          },
                           '&:hover': {
                             backgroundColor: alpha(theme.palette.primary.main, 0.15),
                           }
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: isActive ? theme.palette.primary.main : sidebarIconColor, fontSize: '1.3rem' }}>
                        {React.cloneElement(item.icon, { sx: { fontSize: 'inherit' } })}
                      </ListItemIcon>
                      {open && <ListItemText primary={item.name} sx={{ '& .MuiListItemText-primary': { fontWeight: isActive ? 500 : 400, fontSize: '0.92rem' } }} />}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </React.Fragment>
        ))}
      </List>

      {/* User Profile Section at the bottom of the drawer */}
      <Box sx={{ p: open ? 2 : (collapsedDrawerWidth / 8 - 2.5), py: 2, mt: 'auto', borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>
        <Tooltip title={open ? '' : 'User Profile'} placement="right">
          <Box 
            id="profile-button-anchor"
            aria-controls={Boolean(anchorElUser) ? 'profile-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorElUser) ? 'true' : undefined}
            onClick={handleProfileMenuOpen} 
            sx={{
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer', 
                p: open ? 1 : 0.5, 
                borderRadius: '10px',
                backgroundColor: Boolean(anchorElUser) ? alpha(theme.palette.action.selected, 0.5) : 'transparent',
                '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.7) },
                justifyContent: open ? 'flex-start' : 'center'
            }}
          >
            <Avatar 
                sx={{ 
                    width: open ? 36 : 30, 
                    height: open ? 36 : 30, 
                    bgcolor: theme.palette.primary.main, 
                    color: theme.palette.primary.contrastText,
                    mr: open ? 1.5 : 0,
                    fontSize: open ? '1rem' : '0.85rem'
                }}
            >
                {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </Avatar>
            {open && (
                <Box sx={{ color: theme.palette.text.primary, textAlign: 'left', flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{lineHeight: 1.2, fontWeight: 500}}>{userName}</Typography>
                    <Typography variant="caption" sx={{opacity: 0.8, color: theme.palette.text.secondary}}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</Typography>
                </Box>
            )}
            {open && <ChevronRightIcon sx={{ color: theme.palette.text.secondary, opacity: 0.7 }} />}
          </Box>
        </Tooltip>
        <Menu
            anchorEl={anchorElUser}
            id="profile-menu"
            open={Boolean(anchorElUser)}
            onClose={handleProfileMenuClose}
            MenuListProps={{ 'aria-labelledby': 'profile-button-anchor' }}
            anchorOrigin={{ vertical: 'top', horizontal: open ? 'right' : 'left' }}
            transformOrigin={{ vertical: 'bottom', horizontal: open ? 'right' : 'left' }}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                mt: open ? -7.5 : -7, 
                ml: open ? 0 : 1.5,
                minWidth: 200,
                borderRadius: '10px',
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                '& .MuiMenuItem-root': {
                  fontSize: '0.9rem',
                  py: 1.25,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                  '& .MuiSvgIcon-root': {
                    color: theme.palette.text.secondary,
                    marginRight: theme.spacing(1.5),
                  }
                }
              }
            }}
          >
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }} component={Link} to="/profile">
              <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings'); }} component={Link} to="/settings">
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            <Divider sx={{ my: 0.5 }}/>
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
      
      {/* Mobile menu button only */}
      <Box sx={{ 
        position: 'fixed',
        top: 10,
        left: 10,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: { xs: 'block', md: 'none' } // Only show on mobile
      }}>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            color: theme.palette.primary.main,
            backgroundColor: theme.palette.background.paper,
            boxShadow: 1,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
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
          p: 0,
          m: 0,
          backgroundColor: theme.palette.background.default,
          overflowY: 'auto',
          minHeight: '100vh',
          width: '100%',
          marginLeft: 0,
          paddingTop: 0,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          '& > *': {
            p: 0,
            m: 0,
          },
          [theme.breakpoints.down('sm')]: {
            paddingTop: 0,
          },
        }}
      >
        <Toolbar sx={{ minHeight: '0 !important', p: 0, m: 0 }} />
        <Box sx={{ p: 0, m: 0, width: '100%' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default FullLayout;
