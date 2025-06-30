import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, Container, Paper,
  InputAdornment, IconButton, Alert, Avatar, useTheme,
  Snackbar, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Chip, Stack
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LoginIcon from '@mui/icons-material/Login';
import StarIcon from '@mui/icons-material/Star';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SendIcon from '@mui/icons-material/Send';
// Don't import Router hooks directly to avoid context errors
import apiService from '../api';

// Gentle floating animation keyframes
const gentleFloat = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const subtleGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.15); }
  100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); }
`;

// GIF bounce animation
const gifBounce = keyframes`
  0%, 100% {
    transform: translateX(-50%) translateY(0px);
    opacity: 0.6;
  }
  50% {
    transform: translateX(-50%) translateY(-20px);
    opacity: 0.8;
  }
`;

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'TEACHER'
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

  // Separate admin login function - uses isolated admin auth service
  const handleAdminLogin = async (email, password) => {
    console.log('[Login Component] Admin login initiated for:', email);
    
    try {
      // Use the separate admin authentication service
      const result = await apiService.adminAuth.login(email, password);
      
      if (result.success) {
        showMessage('Admin login successful!', 'success');
        setTimeout(() => {
          window.location.replace(result.redirectUrl);
        }, 500);
        return true;
      } else {
        showMessage(result.error, 'error');
        return false;
      }
    } catch (error) {
      console.error('[Login Component] Unexpected admin login error:', error);
      showMessage('An unexpected error occurred during admin login. Please try again.', 'error');
      return false;
    }
  };

  // Separate OTP login function for teacher/student - uses isolated OTP auth service
  const handleOTPLogin = async (email, role) => {
    console.log('[Login Component] OTP login initiated for:', role, email);
    
    try {
      // Use the separate OTP authentication service
      const result = await apiService.otpAuth.sendOTP(email, role);
      
      if (result.success) {
        showMessage('OTP sent to your email!', 'success');
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 1000);
        return true;
      } else {
        showMessage(result.error, 'error');
        return false;
      }
    } catch (error) {
      console.error('[Login Component] Unexpected OTP login error:', error);
      showMessage(`An unexpected error occurred during ${role} login. Please try again.`, 'error');
      return false;
    }
  };

  // Main submit handler - routes to appropriate login function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { email, password, role } = formData;
      
      // Route to appropriate login function based on role
      if (role === 'ADMIN') {
        await handleAdminLogin(email, password);
      } else {
        await handleOTPLogin(email, role);
      }
    } catch (error) {
      console.error('Unexpected error in handleSubmit:', error);
      showMessage('An unexpected error occurred. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Get role icon based on selected role
  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN':
        return <AdminPanelSettingsIcon sx={{ fontSize: 16, color: '#ff6b6b' }} />;
      case 'TEACHER':
        return <SchoolIcon sx={{ fontSize: 16, color: '#4ecdc4' }} />;
      case 'STUDENT':
        return <PersonIcon sx={{ fontSize: 16, color: '#45b7d1' }} />;
      default:
        return null;
    }
  };

  // Check if password is required based on role
  const isPasswordRequired = formData.role === 'ADMIN';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: `
          linear-gradient(135deg, 
            rgba(26, 26, 46, 0.95) 0%, 
            rgba(41, 50, 100, 0.95) 25%,
            rgba(15, 32, 39, 0.95) 50%,
            rgba(32, 58, 67, 0.95) 75%,
            rgba(44, 83, 100, 0.95) 100%
          )
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 107, 107, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(78, 205, 196, 0.06) 0%, transparent 50%)
          `,
          zIndex: 1,
        },
      }}
    >
      {/* Quiz Character GIF - Better positioned for visibility */}
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: '5%', sm: '8%', md: '10%' }, // Position at bottom right
          right: { xs: '5%', sm: '8%', md: '10%' },
          zIndex: 2, // Behind the form but above background gradients
          width: { xs: '180px', sm: '220px', md: '280px', lg: '320px' },
          height: { xs: '180px', sm: '220px', md: '280px', lg: '320px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: { xs: 0.4, sm: 0.5, md: 0.6 }, // More visible for better effect
          animation: `${gifBounce} 5s ease-in-out infinite`,
          // Remove blur for clearer visibility
        }}
      >
        <img 
          src="/images/giphy.gif" 
          alt="Quiz Robot Assistant"
          onError={(e) => {
            // Fallback if GIF doesn't load
            console.log('GIF failed to load, showing fallback');
            e.target.style.display = 'none';
            const fallback = e.target.nextSibling;
            if (fallback) fallback.style.display = 'flex';
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '16px',
            // Clean look with subtle shadow
            filter: 'drop-shadow(0 8px 32px rgba(120, 119, 198, 0.3))',
          }}
        />
        {/* Enhanced Fallback if GIF fails to load */}
        <Box
          sx={{
            display: 'none', // Hidden by default, shown if GIF fails
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: { xs: '80px', sm: '100px', md: '120px' },
            opacity: 0.6,
            background: 'linear-gradient(135deg, rgba(120, 119, 198, 0.2), rgba(78, 205, 196, 0.2))',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          🤖
        </Box>
      </Box>

      {/* Additional Decorative Elements for Quiz Theme */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          zIndex: 1,
          opacity: 0.1,
          transform: 'rotate(-15deg)',
          display: { xs: 'none', md: 'block' }
        }}
      >
        <Typography sx={{ fontSize: '120px', color: '#4ecdc4' }}>📚</Typography>
      </Box>
      
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          right: '15%',
          zIndex: 1,
          opacity: 0.1,
          transform: 'rotate(20deg)',
          display: { xs: 'none', md: 'block' }
        }}
      >
        <Typography sx={{ fontSize: '100px', color: '#7877c6' }}>🎓</Typography>
      </Box>

      {/* Main Form Container - Enhanced positioning */}
      <Container 
        component="main" 
        maxWidth="xs" 
        sx={{ 
          position: 'relative', 
          zIndex: 10, // Well above background elements
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box
          sx={{
            padding: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: '24px',
            background: 'rgba(26, 26, 46, 0.85)', // Slightly more transparent to show GIF
            backdropFilter: 'blur(25px)', // Stronger blur for better readability
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            boxShadow: `
              0 25px 80px rgba(0, 0, 0, 0.6),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.15),
              inset 0 -1px 0 rgba(0, 0, 0, 0.2)
            `,
            position: 'relative',
            overflow: 'hidden',
            animation: `${subtleGlow} 8s ease-in-out infinite`,
            maxWidth: '420px',
            mx: 'auto',
            mt: { xs: 4, sm: 6, md: 8 },
            mb: { xs: 4, sm: 6 },
            // Enhanced glass morphism effect
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #7877c6, #ff6b6b, #4ecdc4, #7877c6)',
              opacity: 0.8,
              borderRadius: '24px 24px 0 0',
            },
            // Side glow effect
            '&::after': {
              content: '""',
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              bottom: '10px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 50%)',
              pointerEvents: 'none',
            }
          }}
        >
          {/* Compact Header Section */}
          <Box sx={{ textAlign: 'center', mb: 2.5 }}>
            {/* Compact Robot Avatar */}
            <Box
              sx={{
                mx: 'auto',
                mb: 1.5,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(78, 205, 196, 0.8) 100%)',
                boxShadow: '0 6px 20px rgba(120, 119, 198, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(15px)',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <img 
                src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXZ3cjNzZzVjcDR6Y2s1aWx6aG9wcHNkcjNkeTNyeGV6YnZwbWw3NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/L1R1tvI9svkIWwpVYr/giphy.gif" 
                alt="Jumbo Quiz Robot"
                style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            </Box>
            
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #ffffff 0%, #7877c6 50%, #4ecdc4 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center',
                letterSpacing: '-0.01em',
              }}
            >
              Jumbo Quiz
            </Typography>
            
            <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 1.5 }}>
              <Chip 
                icon={<StarIcon sx={{ fontSize: 14 }} />} 
                label="Smart Quizzes" 
                size="small" 
                sx={{ 
                  background: 'rgba(255, 215, 0, 0.15)',
                  color: '#ffd700',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '22px',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }} 
              />
              <Chip 
                icon={<SecurityIcon sx={{ fontSize: 14 }} />} 
                label="AI Powered" 
                size="small" 
                sx={{ 
                  background: 'rgba(78, 205, 196, 0.15)',
                  color: '#4ecdc4',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '22px',
                  border: '1px solid rgba(78, 205, 196, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </Stack>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 600,
                mb: 0.5,
                fontSize: '1.1rem'
              }}
            >
              Welcome to Your Quiz Hub!
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '0.9rem',
                lineHeight: 1.4,
                textAlign: 'center'
              }}
            >
              {isPasswordRequired 
                ? 'Admin access to manage quizzes and students' 
                : 'Access your personalized quiz experience'
              }
            </Typography>
          </Box>
        
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            {/* Role Selection */}
            <FormControl 
              fullWidth 
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  height: '45px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(120, 119, 198, 0.3)',
                  },
                  '&.Mui-focused': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(120, 119, 198, 0.5)',
                  }
                },
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: '#ffffff',
                  fontSize: '0.9rem'
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: '#4ecdc4'
                  }
                }
              }}
            >
              <InputLabel id="role-select-label">Select Your Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role"
                name="role"
                value={formData.role}
                label="Role"
                onChange={handleChange}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getRoleIcon(selected)}
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {selected === 'ADMIN' ? 'Admin' : selected === 'TEACHER' ? 'Teacher' : 'Student'}
                    </Typography>
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      background: 'rgba(26, 26, 46, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      '& .MuiMenuItem-root': {
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        minHeight: '36px',
                        '&:hover': {
                          background: 'rgba(120, 119, 198, 0.2)'
                        }
                      }
                    }
                  }
                }}
              >
                <MenuItem value="ADMIN">
                  <AdminPanelSettingsIcon sx={{ fontSize: 16, color: '#ff6b6b', mr: 0.5 }} />
                  Admin
                </MenuItem>
                <MenuItem value="TEACHER">
                  <SchoolIcon sx={{ fontSize: 16, color: '#4ecdc4', mr: 0.5 }} />
                  Teacher
                </MenuItem>
                <MenuItem value="STUDENT">
                  <PersonIcon sx={{ fontSize: 16, color: '#45b7d1', mr: 0.5 }} />
                  Student
                </MenuItem>
              </Select>
            </FormControl>

            {/* Email Field */}
            <TextField
              margin="dense"
              required
              fullWidth
              id="email"
              label="Email Address *"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#4ecdc4', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: isPasswordRequired ? 1.5 : 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  height: '45px',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(120, 119, 198, 0.3)',
                  },
                  '&.Mui-focused': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(120, 119, 198, 0.5)',
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem',
                  '&.Mui-focused': {
                    color: '#4ecdc4'
                  }
                },
                '& .MuiInputBase-input': {
                  color: '#ffffff',
                  fontSize: '0.9rem'
                }
              }}
            />
            
            {/* Password Field - Only for Admin */}
            {isPasswordRequired && (
              <TextField
                margin="dense"
                required
                fullWidth
                name="password"
                label="Admin Password *"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                InputLabelProps={{ shrink: true }}
                value={formData.password}
                onChange={handleChange}
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePassword}
                        edge="end"
                        size="small"
                        sx={{ color: '#4ecdc4' }}
                      >
                        {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    height: '45px',
                    '& fieldset': {
                      border: 'none',
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(120, 119, 198, 0.3)',
                    },
                    '&.Mui-focused': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(120, 119, 198, 0.5)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.9rem',
                    '&.Mui-focused': {
                      color: '#4ecdc4'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }
                }}
              />
            )}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 0.5,
                mb: 2,
                py: 1.5,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(78, 205, 196, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 6px 20px rgba(120, 119, 198, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                color: '#ffffff',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                  transition: 'left 0.6s ease',
                },
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 8px 25px rgba(120, 119, 198, 0.35)',
                  background: 'linear-gradient(135deg, rgba(120, 119, 198, 1) 0%, rgba(78, 205, 196, 1) 100%)',
                },
                '&:hover::before': {
                  left: '100%',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'none',
                  color: 'rgba(255, 255, 255, 0.5)'
                }
              }}
              disabled={isLoading}
              startIcon={
                isLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : isPasswordRequired ? (
                  <LoginIcon sx={{ fontSize: 18 }} />
                ) : (
                  <SendIcon sx={{ fontSize: 18 }} />
                )
              }
            >
              {isLoading 
                ? (isPasswordRequired ? 'Accessing Dashboard...' : 'Sending Code...') 
                : (isPasswordRequired ? 'Access Dashboard' : 'Get Started')
              }
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '0.8rem',
                  fontWeight: 400,
                  lineHeight: 1.3
                }}
                              >
                  {isPasswordRequired 
                    ? '🔐 Secure admin dashboard for quiz management' 
                    : '📧 Get instant access with email verification'
                  }
                </Typography>
            </Box>
            
            {/* Student Portal Link */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="text"
                onClick={() => window.location.href = '/student-login'}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.85rem',
                  textTransform: 'none',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#4ecdc4',
                    background: 'transparent',
                  }
                }}
              >
                🎓 Student Portal - Quick Quiz Access
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
      
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
          sx={{ 
            width: '100%',
            borderRadius: '12px',
            background: snackbar.severity === 'success' 
              ? 'rgba(78, 205, 196, 0.9)' 
              : 'rgba(255, 107, 107, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;

