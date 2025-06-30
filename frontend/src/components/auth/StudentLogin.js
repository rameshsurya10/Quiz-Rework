import React, { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Container, Paper,
  InputAdornment, Alert, Avatar, useTheme,
  Snackbar, CircularProgress, Stack, Divider, Card, CardContent
} from '@mui/material';
import { alpha, keyframes } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import PersonIcon from '@mui/icons-material/Person';
import LinkIcon from '@mui/icons-material/Link';
import SchoolIcon from '@mui/icons-material/School';
import QuizIcon from '@mui/icons-material/Quiz';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../api';

// Gentle animations
const gentleFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0px); }
`;

const StudentLogin = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    studentId: '',
    quizLink: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  // Handle student login with quiz link
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { email, studentId, quizLink } = formData;
      
      if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
      }

      // If quiz link is provided, validate and extract quiz ID
      let quizId = null;
      if (quizLink) {
        try {
          // Extract quiz ID from various link formats
          const linkMatch = quizLink.match(/quiz[\/=](\w+)/i) || 
                           quizLink.match(/id[\/=](\w+)/i) || 
                           quizLink.match(/([a-f0-9-]{36})/i);
          
          if (linkMatch) {
            quizId = linkMatch[1];
          } else {
            // Assume the entire input is a quiz ID if it's alphanumeric
            if (/^[a-zA-Z0-9-]+$/.test(quizLink.trim())) {
              quizId = quizLink.trim();
            }
          }
        } catch (error) {
          console.log('Could not extract quiz ID from link');
        }
      }

      // Send OTP for student authentication
      const result = await apiService.otpAuth.sendOTP(email, 'STUDENT');
      
      if (result.success) {
        // Store quiz info for after authentication
        if (quizId) {
          localStorage.setItem('pending_quiz_id', quizId);
        }
        if (studentId) {
          localStorage.setItem('student_id', studentId);
        }
        
        showMessage('Verification code sent to your email!', 'success');
        
        // Navigate to OTP verification
        setTimeout(() => {
          navigate(`/auth/otp/student?email=${encodeURIComponent(email)}`);
        }, 1000);
      } else {
        showMessage(result.error, 'error');
      }
    } catch (error) {
      console.error('Student login error:', error);
      showMessage('Failed to send verification code. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccess = () => {
    if (!formData.quizLink) {
      showMessage('Please enter a quiz link first', 'error');
      return;
    }
    
    // Quick access without full authentication for public quizzes
    try {
      const linkMatch = formData.quizLink.match(/quiz[\/=](\w+)/i) || 
                       formData.quizLink.match(/id[\/=](\w+)/i) || 
                       formData.quizLink.match(/([a-f0-9-]{36})/i);
      
      if (linkMatch) {
        const quizId = linkMatch[1];
        navigate(`/quiz/take/${quizId}?guest=true`);
      } else {
        showMessage('Invalid quiz link format', 'error');
      }
    } catch (error) {
      showMessage('Could not access quiz. Please check the link.', 'error');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: `
          linear-gradient(135deg, 
            rgba(26, 26, 46, 0.95) 0%, 
            rgba(41, 50, 100, 0.95) 50%,
            rgba(32, 58, 67, 0.95) 100%
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
            radial-gradient(circle at 30% 30%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(74, 144, 226, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        }
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha('#6b73ff', 0.2)}`,
              animation: `${gentleFloat} 6s ease-in-out infinite`,
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                }}
              >
                <SchoolIcon sx={{ fontSize: 32 }} />
              </Avatar>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #45b7d1, #96c93d)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Student Access
              </Typography>
              
              <Typography variant="body1" color="text.secondary">
                Enter your details to access quizzes and tests
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleStudentLogin}>
              <Stack spacing={3}>
                {/* Student Email */}
                <TextField
                  fullWidth
                  label="Student Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#45b7d1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#45b7d1',
                      },
                    },
                  }}
                />

                {/* Student ID (Optional) */}
                <TextField
                  fullWidth
                  label="Student ID (Optional)"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#45b7d1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#45b7d1',
                      },
                    },
                  }}
                />

                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    Quiz Access
                  </Typography>
                </Divider>

                {/* Quiz/Test Link */}
                <TextField
                  fullWidth
                  label="Quiz/Test Link (Optional)"
                  name="quizLink"
                  value={formData.quizLink}
                  onChange={handleChange}
                  placeholder="Paste your quiz link here..."
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#45b7d1',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#45b7d1',
                      },
                    },
                  }}
                />

                {/* Action Buttons */}
                <Stack spacing={2}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                      boxShadow: '0 4px 15px 0 rgba(69, 183, 209, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3a9bc1 0%, #85b82d 100%)',
                        boxShadow: '0 6px 20px 0 rgba(69, 183, 209, 0.4)',
                      },
                    }}
                  >
                    {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                  </Button>

                  {formData.quizLink && (
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleQuickAccess}
                      startIcon={<QuizIcon />}
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        borderColor: '#45b7d1',
                        color: '#45b7d1',
                        '&:hover': {
                          borderColor: '#3a9bc1',
                          backgroundColor: alpha('#45b7d1', 0.05),
                        },
                      }}
                    >
                      Quick Access (Guest Mode)
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>

            {/* Info Card */}
            <Card
              sx={{
                mt: 3,
                background: alpha('#45b7d1', 0.05),
                border: `1px solid ${alpha('#45b7d1', 0.2)}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  💡 <strong>Quick Tips:</strong><br/>
                  • Use your school email for verification<br/>
                  • Paste quiz links from your teacher for direct access<br/>
                  • Guest mode available for public quizzes
                </Typography>
              </CardContent>
            </Card>

            {/* Back to Main Login */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: 'text.secondary' }}
              >
                ← Back to Main Login
              </Button>
            </Box>
          </Paper>
        </motion.div>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
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
    </Box>
  );
};

export default StudentLogin; 