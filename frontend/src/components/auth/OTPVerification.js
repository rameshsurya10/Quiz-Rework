import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  TextField,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  Chip,
  Paper,
  Backdrop
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import VerifiedIcon from '@mui/icons-material/Verified';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import SecurityIcon from '@mui/icons-material/Security';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Import the API service
import apiService from '../../api';

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

const OTPVerification = () => {
  const { role: urlRole } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Store the role from URL or localStorage
  const [role, setRole] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [networkError, setNetworkError] = useState(false);

  const email = searchParams.get('email') || localStorage.getItem('otp_email') || '';
  const inputRefs = useRef([]);
  
  // Retry connection function
  const retryConnection = () => {
    setNetworkError(false);
    setError('');
    // Attempt to resend OTP
    setTimeout(() => {
      handleResendOTP();
    }, 500);
  };
  
  useEffect(() => {
    // Get role from URL params or localStorage
    const storedRole = localStorage.getItem('otp_role');
    const currentRole = urlRole || storedRole || '';
    setRole(currentRole);
    
    if (currentRole && !storedRole) {
      localStorage.setItem('otp_role', currentRole);
    }
    
    // Auto-focus first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [urlRole]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setNetworkError(false);
    
    // Join OTP digits into a single string
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const emailToUse = email || localStorage.getItem('otp_email');
      const currentRole = role || localStorage.getItem('otp_role');

      if (!emailToUse || !currentRole) {
        setError('Session expired. Please try logging in again.');
        navigate('/login');
        return;
      }

      console.log('Verifying OTP with:', { email: emailToUse, role: currentRole, otp: otpString });
      
      // Use apiService for OTP verification
      const response = await apiService.post('/api/accounts/verify_otp/', {
        email: emailToUse,
        otp: otpString,
        role: currentRole
      });

      console.log('OTP verification response:', response.data);

      if (response.data?.token || response.data?.access) {
        // Store the token
        const token = response.data.token || response.data.access;
        localStorage.setItem('token', token);
        
        if (response.data.refresh) {
          localStorage.setItem('refreshToken', response.data.refresh);
        }

        // Store user info if available
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // Store role and email for consistency
        localStorage.setItem('userRole', currentRole);
        localStorage.setItem('user_email', emailToUse);

        // Clear OTP related storage
        localStorage.removeItem('otp_email');
        localStorage.removeItem('otp_role');

        setSuccess('Verification successful! Redirecting...');
        showMessage('Verification successful!', 'success');

        // Role-based redirection
        setTimeout(() => {
          const userRole = currentRole.toLowerCase();
          console.log('Redirecting based on role:', userRole);
          
          const dashboardPath = 
            userRole === 'teacher' ? '/teacher-dashboard' : 
            userRole === 'student' ? '/student-dashboard' : 
            '/dashboard';
          
          console.log('Navigating to:', dashboardPath);
          window.location.href = dashboardPath; // Use window.location.href for clean redirect
        }, 1500);
      } else {
        setError('Invalid response from server. Please try again.');
        showMessage('Invalid response from server. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      
      // Handle network errors first
      if (!error.response) {
        setNetworkError(true);
        setError('Network error. Please check your connection and try again.');
        showMessage('Network error. Please check your connection.', 'error');
      } else {
        // Handle specific error cases
        let errorMessage = 'Failed to verify OTP. Please try again.';
        
        if (error.response?.status === 400) {
          if (error.response.data?.otp) {
            errorMessage = error.response.data.otp[0] || 'Invalid OTP code.';
          } else if (error.response.data?.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data?.message) {
            errorMessage = error.response.data.message;
          }
        } else if (error.response?.status === 404) {
          errorMessage = 'Verification session expired. Please request a new OTP.';
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.non_field_errors) {
          errorMessage = error.response.data.non_field_errors[0];
        } else if (Array.isArray(error.response?.data)) {
          errorMessage = error.response.data[0];
        } else if (typeof error.response?.data === 'string') {
          errorMessage = error.response.data;
        }
        
        setError(errorMessage);
        showMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend && !networkError) return;

    // Clear previous errors
    setError('');
    setNetworkError(false);
    
    setIsLoading(true);
    try {
      const emailToUse = email || localStorage.getItem('otp_email');
      const currentRole = role || localStorage.getItem('otp_role');

      if (!emailToUse || !currentRole) {
        setError('Session expired. Please try logging in again.');
        navigate('/login');
        return;
      }

      console.log('Resending OTP for:', { email: emailToUse, role: currentRole });
      
      // Use apiService for resending OTP
      const response = await apiService.post('/api/accounts/login/', {
        email: emailToUse,
        role: currentRole
      });

      console.log('OTP resend response:', response.data);

      // Reset OTP input and timer
      setOtp(['', '', '', '', '', '']);
      setTimeLeft(300);
      setCanResend(false);
      inputRefs.current[0]?.focus();
      
      showMessage('New verification code sent to your email!', 'success');
    } catch (error) {
      console.error('Resend OTP error:', error);
      
      // Handle network errors first
      if (!error.response) {
        setNetworkError(true);
        setError('Network error. Please check your connection and try again.');
        showMessage('Network error. Please check your connection.', 'error');
      } else {
        // Special case: sometimes the API returns an error but the OTP is still sent
        if (error.response?.status === 400 && error.response?.data?.message?.includes('OTP')) {
          // OTP was sent despite the error
          setOtp(['', '', '', '', '', '']);
          setTimeLeft(300);
          setCanResend(false);
          inputRefs.current[0]?.focus();
          
          showMessage('New verification code sent to your email!', 'success');
          return;
        }
        
        // Handle other error response formats
        let errorMessage = 'Failed to resend code. Please try again.';
        
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        setError(errorMessage);
        showMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (message, severity = 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleBack = () => {
    navigate('/login');
  };

  const getRoleColor = () => {
    const currentRole = role || '';
    
    switch (currentRole.toLowerCase()) {
      case 'teacher': return '#4ecdc4';
      case 'student': return '#45b7d1';
      default: return '#7877c6';
    }
  };

  const getRoleGradient = () => {
    const currentRole = role || '';
    
    switch (currentRole.toLowerCase()) {
      case 'teacher': return 'linear-gradient(135deg, rgba(78, 205, 196, 0.8) 0%, rgba(120, 119, 198, 0.8) 100%)';
      case 'student': return 'linear-gradient(135deg, rgba(69, 183, 209, 0.8) 0%, rgba(120, 119, 198, 0.8) 100%)';
      default: return 'linear-gradient(135deg, rgba(120, 119, 198, 0.8) 0%, rgba(78, 205, 196, 0.8) 100%)';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(78, 205, 196, 0.05) 0%, transparent 50%)
          `,
        },
      }}
    >
      {/* Network Error Backdrop */}
      {networkError && (
        <Backdrop
          sx={{ color: '#fff', zIndex: 9999, flexDirection: 'column', gap: 2 }}
          open={networkError}
        >
          <Box 
            sx={{ 
              bgcolor: 'rgba(0, 0, 0, 0.8)', 
              p: 4, 
              borderRadius: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              maxWidth: '90%',
              width: '400px'
            }}
          >
            <WifiOffIcon sx={{ fontSize: 60, color: '#ff6b6b', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Network Connection Error
            </Typography>
            <Typography variant="body2" textAlign="center" sx={{ mb: 3 }}>
              Unable to connect to the server. Please check your internet connection and try again.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={retryConnection}
              startIcon={<RefreshIcon />}
            >
              Retry Connection
            </Button>
          </Box>
        </Backdrop>
      )}

      {/* Floating shapes */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '8%',
          width: 80,
          height: 80,
          borderRadius: '30%',
          background: 'rgba(120, 119, 198, 0.08)',
          backdropFilter: 'blur(30px)',
          animation: `${gentleFloat} 15s ease-in-out infinite`,
          animationDelay: '0s',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '70%',
          right: '12%',
          width: 60,
          height: 60,
          borderRadius: '40%',
          background: 'rgba(255, 107, 107, 0.06)',
          backdropFilter: 'blur(25px)',
          animation: `${gentleFloat} 12s ease-in-out infinite`,
          animationDelay: '3s',
        }}
      />

      <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: '20px',
            background: 'rgba(26, 26, 46, 0.85)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `
              0 15px 40px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            position: 'relative',
            overflow: 'hidden',
            animation: `${subtleGlow} 6s ease-in-out infinite`,
            maxWidth: '400px',
            mx: 'auto',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, #7877c6, #ff6b6b, #4ecdc4)',
              opacity: 0.7,
            }
          }}
        >
          {/* Back Button */}
          <Button
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.8rem',
              minWidth: 'auto',
              '&:hover': {
                color: getRoleColor(),
                background: 'rgba(255, 255, 255, 0.1)'
              },
            }}
          >
            Back
          </Button>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3, mt: 2 }}>
            <Box
              sx={{
                mx: 'auto',
                mb: 2,
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: getRoleGradient(),
                boxShadow: `0 6px 20px ${alpha(getRoleColor(), 0.25)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(15px)',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <VerifiedIcon sx={{ color: 'white', fontSize: 28 }} />
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
              Verification Code
            </Typography>

            <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 2 }}>
              <Chip 
                icon={<StarIcon sx={{ fontSize: 14 }} />} 
                label="Premium" 
                size="small" 
                sx={{ 
                  background: 'rgba(255, 215, 0, 0.15)',
                  color: '#ffd700',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '20px',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  backdropFilter: 'blur(10px)'
                }} 
              />
              <Chip 
                icon={<SecurityIcon sx={{ fontSize: 14 }} />} 
                label="Secure" 
                size="small" 
                sx={{ 
                  background: 'rgba(78, 205, 196, 0.15)',
                  color: '#4ecdc4',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '20px',
                  border: '1px solid rgba(78, 205, 196, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </Stack>

            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 500,
                mb: 0.5
              }}
            >
              Enter the 6-digit code sent to
            </Typography>
            
            <Typography variant="body2" sx={{ color: getRoleColor(), fontWeight: 600 }}>
              {email}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleVerify} sx={{ width: '100%' }}>
            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 2, fontSize: '0.9rem' }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.9rem' }}>
                {success}
              </Alert>
            )}

            {/* OTP Input */}
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={(el) => (inputRefs.current[index] = el)}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  variant="outlined"
                  inputProps={{
                    maxLength: 1,
                    style: { 
                      textAlign: 'center', 
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: '#ffffff'
                    }
                  }}
                  sx={{
                    width: 50,
                    height: 60,
                    '& .MuiOutlinedInput-root': {
                      height: '100%',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${digit ? getRoleColor() : 'rgba(255, 255, 255, 0.1)'}`,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        border: 'none',
                      },
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${alpha(getRoleColor(), 0.5)}`,
                      },
                      '&.Mui-focused': {
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: `2px solid ${getRoleColor()}`,
                        boxShadow: `0 0 0 2px ${alpha(getRoleColor(), 0.2)}`,
                      }
                    }
                  }}
                />
              ))}
            </Stack>

            {/* Timer */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                <AccessTimeIcon sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 16 }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: timeLeft > 60 ? 'rgba(255, 255, 255, 0.6)' : '#ff6b6b',
                    fontWeight: 500
                  }}
                >
                  {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : 'Code expired'}
                </Typography>
              </Stack>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading || otp.join('').length !== 6}
              sx={{
                mt: 1,
                mb: 2,
                py: 1.5,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '12px',
                background: getRoleGradient(),
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: `0 6px 20px ${alpha(getRoleColor(), 0.25)}`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                color: '#ffffff',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 8px 25px ${alpha(getRoleColor(), 0.35)}`,
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'none',
                  color: 'rgba(255, 255, 255, 0.5)'
                }
              }}
              startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <VerifiedIcon />}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            {/* Resend Button */}
            <Box sx={{ textAlign: 'center' }}>
              <Button
                onClick={handleResendOTP}
                disabled={!canResend || isLoading}
                startIcon={<RefreshIcon />}
                sx={{
                  color: canResend ? getRoleColor() : 'rgba(255, 255, 255, 0.4)',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  '&:hover': {
                    background: canResend ? alpha(getRoleColor(), 0.1) : 'transparent'
                  },
                  '&:disabled': {
                    color: 'rgba(255, 255, 255, 0.4)'
                  }
                }}
              >
                {canResend ? 'Resend Code' : 'Resend available when timer expires'}
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

export default OTPVerification; 