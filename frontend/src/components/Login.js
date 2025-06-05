import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, Container, Paper,
  InputAdornment, IconButton, Alert, Avatar, useTheme,
  Snackbar, FormControl, InputLabel, Select, MenuItem,
  CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
// Don't import Router hooks directly to avoid context errors
import apiService from '../api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'TEACHER' // Default role is now TEACHER instead of STUDENT
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });
  // Don't use Router hooks directly to avoid context errors
  const [redirectTo, setRedirectTo] = useState(null);
  const theme = useTheme();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showMessage = (message, severity = 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Making login request with email:', formData.email, 'and role:', formData.role);
      
      // Use our improved apiService for login
      const loginResult = await apiService.loginUser({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      
      console.log('Login result:', loginResult);
      
      if (loginResult.success) {
        // Show success message
        showMessage('Login successful!', 'success');
        
        // Use window.location for navigation instead of React Router
        // This is more reliable when component might be rendered outside Router context
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      } else {
        // Show specific error from response if available
        showMessage(loginResult.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      showMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // This function is no longer needed as apiService.loginUser handles token storage
  // Keeping as a comment for reference
  /*
  const handleLoginSuccess = (data) => {
    console.log('Login successful, storing tokens and user info');
    
    // This functionality is now handled in the apiService.loginUser function
    // Redirect happens in the handleSubmit function
  };
  */

  // Don't use Navigate component to avoid Router context errors

  return (
    <Container component="main" maxWidth="xs" sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #121212 0%, #1E1E1E 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)',
    }}>
      <Paper
        elevation={6}
        sx={{
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 3,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          background: theme.palette.background.paper,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }
        }}
      >
        <Avatar
          sx={{
            m: 1,
            bgcolor: theme.palette.primary.main,
            width: 56,
            height: 56,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <LockOutlinedIcon fontSize="large" />
        </Avatar>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Quiz App
        </Typography>
        <Typography component="h2" variant="h5" sx={{ mb: 3 }}>
          Sign In
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="role-select-label">Role</InputLabel>
            <Select
              labelId="role-select-label"
              id="role"
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleChange}
            >
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="TEACHER">Teacher</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              mb: 2,
              py: 1.5,
              fontWeight: 'bold',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.2)',
                top: 0,
                left: '-100%',
                transform: 'skewX(-15deg)',
                transition: 'all 0.5s ease',
              },
              '&:hover::after': {
                left: '100%',
              }
            }}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
          
        </Box>
      </Paper>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;
