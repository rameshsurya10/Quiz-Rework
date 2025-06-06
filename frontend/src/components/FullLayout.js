import React, { useState, useEffect } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, CssBaseline, Typography,
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useTheme, useMediaQuery, Avatar, Tooltip,
  Menu, MenuItem, alpha, Stack
} from '@mui/material';
import {
  Menu as MenuIcon, 
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
  Notifications as NotificationsIcon,
  Brightness4 as Brightness4Icon, 
  AccountCircle as AccountCircleIcon 
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../api'; 

const drawerWidth = 260; 
const collapsedDrawerWidth = 80; 

const FullLayout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); 
  const [open, setOpen] = useState(!isMobile);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(!isMobile);
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

  const menuItems = [
    { name: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { name: 'Quizzes', icon: <QuizIcon />, path: '/quizzes' },
    { name: 'Students', icon: <SchoolIcon />, path: '/students' },
    { name: 'Teachers', icon: <PsychologyIcon />, path: '/teachers' },
    { name: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ];

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: open ? 2 : 1.5, 
          py: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
        }}
      >
        {open && (
          <Typography component={Link} to="/dashboard" sx={{ textDecoration: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
            QuizApp
          </Typography>
        )}
        {!open && (
            <Brightness4Icon sx={{ color: 'white', fontSize: '1.8rem' }} /> 
        )}
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'white' }}>
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
      
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.name} disablePadding sx={{ display: 'block', px: open ? 1.5 : 1, py: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: open ? 2 : 1.5,
                  py: 1.2,
                  borderRadius: '12px',
                  color: isActive ? theme.palette.common.white : alpha(theme.palette.common.white, 0.7),
                  backgroundColor: isActive ? alpha(theme.palette.common.white, 0.15) : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                    color: theme.palette.common.white,
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    fontSize: '1.4rem', 
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.name} sx={{ opacity: open ? 1 : 0, span: { fontSize: '0.95rem', fontWeight: 500 } }} />}
              </ListItemButton>
            </ListItem>
          );
        })}
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
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: theme.palette.background.paper, 
          boxShadow: theme.shadows[1],
          zIndex: theme.zIndex.drawer + 1,
          width: `calc(100% - ${(open && !isMobile) ? drawerWidth : (!isMobile ? collapsedDrawerWidth : 0)}px)`,
          ml: `${(open && !isMobile) ? drawerWidth : (!isMobile ? collapsedDrawerWidth : 0)}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
            {isMobile && (
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>
            )}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: theme.palette.text.primary }}>
            Dashboard
          </Typography>
          <Tooltip title="Notifications">
            <IconButton size="large" aria-label="show new notifications" color="inherit" sx={{ mr: 1 }}>
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined} 
        sx={{
          width: (open || !isMobile) ? (open ? drawerWidth : collapsedDrawerWidth) : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedDrawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none', 
            backgroundColor: '#1E293B', 
            color: theme.palette.common.white,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
            }),
            ...(isMobile && {
                width: drawerWidth, 
                backgroundColor: alpha('#1E293B', 0.95), 
                backdropFilter: 'blur(5px)',
            })
          },
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
          paddingTop: `calc(${theme.mixins.toolbar.minHeight}px + ${theme.spacing(3)})`, 
          [theme.breakpoints.up('sm')]: {
             paddingTop: `calc(64px + ${theme.spacing(3)})`, 
          },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(!isMobile && {
            marginLeft: open ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`,
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
