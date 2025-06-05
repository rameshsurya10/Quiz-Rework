import React, { useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, CssBaseline, Typography,
  Divider, IconButton, ListItem, ListItemButton, ListItemIcon,
  ListItemText, useTheme, useMediaQuery, Avatar, Tooltip,
  Menu, MenuItem, alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import apiService from '../api';

// Drawer width for sidebar
const drawerWidth = 240;

const FullLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const location = useLocation?.() || { pathname: '/dashboard' }; // Fallback if not using react-router

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    apiService.logoutUser();
    window.location.href = '/login';
    handleMenuClose();
  };

  // Navigation items
  const menuItems = [
    { name: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { name: 'Quizzes', icon: <QuizIcon />, path: '/quizzes' },
    { name: 'Students', icon: <SchoolIcon />, path: '/students' },
    { name: 'Teachers', icon: <PsychologyIcon />, path: '/teachers' },
    { name: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  ];

  // Profile menu items
  const profileMenu = (
    <Menu
      anchorEl={anchorEl}
      id="account-menu"
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.10))',
          mt: 1.5,
          borderRadius: 2,
          '& .MuiMenuItem-root': {
            px: 2,
            py: 1,
            my: 0.5,
            borderRadius: 1,
            mx: 1,
          },
        },
      }}
    >
      <MenuItem onClick={handleMenuClose} component={Link} to="/profile">
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={handleMenuClose} component={Link} to="/settings">
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        Settings
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            width: `calc(100% - ${drawerWidth}px)`,
            marginLeft: `${drawerWidth}px`,
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              marginRight: 5,
            }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 600,
              background: theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, #64B5F6, #42A5F5)'
              : 'linear-gradient(90deg, #1E88E5, #0D47A1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Quiz App
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Notification icon */}
          <Tooltip title="Notifications">
            <IconButton
              size="large"
              aria-label="show new notifications"
              color="inherit"
              sx={{
                mr: 2,
                bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                '&:hover': {
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.15),
                },
              }}
            >
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
          
          {/* Profile avatar and menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleProfileMenuOpen}
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              color="inherit"
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: theme.palette.primary.main
                }}
              >
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      
      {/* Side drawer / navigation */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          },
        }}
      >
        <Toolbar 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: [1],
            py: 2
          }}
        >
          <Typography
            variant="h5"
            noWrap
            component="div"
            align="center"
            sx={{ fontWeight: 700 }}
          >
            Quiz Portal
          </Typography>
        </Toolbar>
        <Divider />
        
        {/* Menu items */}
        <List sx={{ pt: 2 }}>
          {menuItems.map((item) => (
            <ListItem 
              key={item.name} 
              disablePadding 
              sx={{ 
                display: 'block',
                mb: 0.5
              }}
            >
              <ListItemButton
                component={Link}
                to={item.path}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  py: 1,
                  mx: 1,
                  borderRadius: 2,
                  justifyContent: open ? 'initial' : 'center',
                  backgroundColor: location.pathname === item.path
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  color: location.pathname === item.path
                    ? theme.palette.primary.main
                    : theme.palette.text.primary,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: location.pathname === item.path
                      ? theme.palette.primary.main
                      : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  sx={{ 
                    opacity: open ? 1 : 0,
                    '& .MuiTypography-root': {
                      fontWeight: location.pathname === item.path ? 600 : 400
                    }
                  }} 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
          ml: { sm: `${open ? drawerWidth : 0}px` },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacing to push content below app bar */}
        {children}
      </Box>
      
      {/* Profile menu */}
      {profileMenu}
    </Box>
  );
};

export default FullLayout;
