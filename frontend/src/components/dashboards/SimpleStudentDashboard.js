import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  IconButton,
  useTheme,
  alpha,
  Stack,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Quiz as QuizIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../api';

const SimpleStudentDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [userInfo, setUserInfo] = useState({
    email: localStorage.getItem('user_email') || '',
    studentId: localStorage.getItem('student_id') || '',
    role: 'student'
  });
  const [quizLink, setQuizLink] = useState('');
  const [availableQuizzes, setAvailableQuizzes] = useState([]);

  useEffect(() => {
    loadAvailableQuizzes();
    // Check for pending quiz from login
    const pendingQuizId = localStorage.getItem('pending_quiz_id');
    if (pendingQuizId) {
      localStorage.removeItem('pending_quiz_id');
      navigate(`/quiz/take/${pendingQuizId}`);
    }
  }, [navigate]);

  const loadAvailableQuizzes = async () => {
    try {
      // Try student-specific endpoint first, fallback to general if needed
      let response;
      try {
        response = await apiService.get('/api/students/available-quizzes/');
      } catch (studentEndpointError) {
        console.log('Student endpoint not available, using general quiz endpoint');
        response = await apiService.get('/api/quiz/');
      }
      
      const quizzes = response.data.results || response.data || [];
      
      // Ensure quizzes is an array
      if (!Array.isArray(quizzes)) {
        console.warn('Quizzes data is not an array:', quizzes);
        setAvailableQuizzes([]);
        return;
      }
      
      const publishedQuizzes = quizzes.filter(quiz => 
        quiz && typeof quiz === 'object' && quiz.is_published
      );
      setAvailableQuizzes(publishedQuizzes.slice(0, 5)); // Show recent 5
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setAvailableQuizzes([]);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/student-login');
  };

  const handleQuizLinkSubmit = async () => {
    if (!quizLink.trim()) return;
    
    try {
      console.log('Processing quiz link:', quizLink);
      
      // Extract quiz ID from various link formats
      const patterns = [
        /quiz[\/=](\d+)/i,           // quiz/186 or quiz=186
        /quiz[\/=](\w+)[\/]/i,       // quiz/186/join/ 
        /id[\/=](\d+)/i,             // id/186 or id=186
        /\/(\d+)\/join/i,            // /186/join
        /quiz_id[\/=](\d+)/i,        // quiz_id/186 or quiz_id=186
        /([a-f0-9-]{36})/i,          // UUID format
        /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i // Full UUID
      ];
      
      let quizId = null;
      
      // Try each pattern
      for (const pattern of patterns) {
        const match = quizLink.match(pattern);
        if (match) {
          quizId = match[1];
          console.log(`Extracted quiz ID "${quizId}" using pattern:`, pattern);
          break;
        }
      }
      
      // If no pattern matched, check if the entire input is just a quiz ID
      if (!quizId && /^[a-zA-Z0-9-]+$/.test(quizLink.trim())) {
        quizId = quizLink.trim();
        console.log(`Using entire input as quiz ID: ${quizId}`);
      }
      
      if (!quizId) {
        console.error('Could not extract quiz ID from:', quizLink);
        alert('Invalid quiz link format. Please check the link and try again.');
        return;
      }
      
      // Test the quiz attempt endpoint before navigating
      console.log(`Testing quiz access for quiz ID: ${quizId}`);
      await handleTakeQuiz(quizId);
      
    } catch (error) {
      console.error('Error with quiz link:', error);
      alert('Could not access quiz. Please check the link.');
    }
  };

  const handleTakeQuiz = async (quizId) => {
    try {
      // Get the quiz questions for taking the quiz (not attempt results)
      console.log(`Getting quiz questions for quiz ID: ${quizId}`);
      console.log('Current user info:', {
        token: localStorage.getItem('token') ? 'exists' : 'missing',
        userRole: localStorage.getItem('userRole'),
        userEmail: localStorage.getItem('user_email'),
        user: localStorage.getItem('user')
      });
      
      // Use the correct endpoint to get quiz questions for taking
      const response = await apiService.get(`/api/quiz/${quizId}/`);
      
      console.log('Quiz data response:', response.data);
      
      if (response.data) {
        // Quiz is accessible, navigate to the quiz taking interface
        navigate(`/quiz/take/${quizId}`);
      }
    } catch (error) {
      console.error('Error getting quiz:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      let errorMessage = 'Unable to access quiz. ';
      
      if (error.response?.status === 404) {
        errorMessage = 'Quiz not found or not available. The quiz may have been deleted or is not published yet.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to access this quiz. Please make sure you are logged in as a student.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
        // Clear invalid tokens and redirect to login
        localStorage.clear();
        navigate('/student-login');
        return;
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        errorMessage += `Error ${error.response.status}: ${error.response.statusText}`;
      }
      
      alert(errorMessage);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        p: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 3,
          border: `1px solid ${alpha('#45b7d1', 0.2)}`,
        }}
      >
        <Box>
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
            Student Portal
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Welcome, {userInfo.email}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
            }}
          >
            <PersonIcon />
          </Avatar>
          <IconButton onClick={handleLogout} sx={{ color: 'text.secondary' }}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Quiz Link Access */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#45b7d1', 0.2)}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <LinkIcon color="primary" />
                  Access Quiz by Link
                </Typography>
                
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    placeholder="Paste your quiz link here..."
                    value={quizLink}
                    onChange={(e) => setQuizLink(e.target.value)}
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
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleQuizLinkSubmit}
                    disabled={!quizLink.trim()}
                    startIcon={<PlayIcon />}
                    sx={{
                      px: 3,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3a9bc1 0%, #85b82d 100%)',
                      },
                    }}
                  >
                    Start Quiz
                  </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  💡 Paste the quiz link provided by your teacher to start the test
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Student Info */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#45b7d1', 0.2)}`,
                borderRadius: 3,
                height: 'fit-content'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <PersonIcon color="primary" />
                  Student Details
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {userInfo.email}
                    </Typography>
                  </Box>
                  
                  {userInfo.studentId && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Student ID
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {userInfo.studentId}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Role
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {userInfo.role}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Available Quizzes */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha('#45b7d1', 0.2)}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <QuizIcon color="primary" />
                  Available Quizzes
                </Typography>

                {availableQuizzes.length > 0 ? (
                  <List>
                    {availableQuizzes.map((quiz, index) => (
                      <ListItem
                        key={quiz.quiz_id}
                        sx={{
                          border: `1px solid ${alpha('#45b7d1', 0.1)}`,
                          borderRadius: 2,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: alpha('#45b7d1', 0.05),
                          },
                        }}
                      >
                        <ListItemIcon>
                          <AssignmentIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={quiz.title}
                          secondary={`Created: ${new Date(quiz.created_at).toLocaleDateString()}`}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<PlayIcon />}
                          onClick={() => handleTakeQuiz(quiz.quiz_id)}
                          sx={{
                            borderColor: '#45b7d1',
                            color: '#45b7d1',
                            '&:hover': {
                              borderColor: '#3a9bc1',
                              backgroundColor: alpha('#45b7d1', 0.05),
                            },
                          }}
                        >
                          Start
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 4,
                      color: 'text.secondary'
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body1">
                      No quizzes available at the moment
                    </Typography>
                    <Typography variant="body2">
                      Check back later or use the quiz link from your teacher
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimpleStudentDashboard; 