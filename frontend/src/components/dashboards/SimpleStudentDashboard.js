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
  ListItemText,
  Container,
  Divider,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Quiz as QuizIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  PendingActions as PendingIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { quizApi } from '../../services/api';
import ConfirmationDialog from '../../common/ConfirmationDialog';

const SimpleStudentDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [studentDetails, setStudentDetails] = useState(null);

  // Get student name from localStorage with better fallback logic
  const getStudentName = () => {
    // First check if we have API data
    if (studentDetails) {
      const apiName = studentDetails.name || studentDetails.full_name || studentDetails.first_name || 
                     (studentDetails.user && (studentDetails.user.name || studentDetails.user.first_name));
      if (apiName && apiName.trim() && !apiName.includes('@')) {
        return apiName.trim();
      }
    }

    // Check all possible sources for student name
    const directName = localStorage.getItem('user_name') || 
                      localStorage.getItem('student_name') || 
                      localStorage.getItem('name');
    
    if (directName && directName !== 'null' && directName !== 'undefined' && !directName.includes('@')) {
      return directName;
    }

    // Parse user object from localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user && typeof user === 'object') {
        // Try different name fields
        const possibleNames = [
          user.name,
          user.full_name,
          user.first_name,
          user.username,
          user.student_name,
          user.display_name
        ];
        
        for (const name of possibleNames) {
          if (name && typeof name === 'string' && name.trim() && 
              name !== 'null' && name !== 'undefined' && !name.includes('@')) {
            return name.trim();
          }
        }
      }
    } catch (error) {
      console.log('Error parsing user data:', error);
    }

    // Extract name from email if that's all we have
    const email = getStudentEmail();
    if (email && email.includes('@') && email !== 'student@example.com') {
      const nameFromEmail = email.split('@')[0];
      
      // Special handling for email pattern like "deepikaks75488+32@gmail.com"
      let cleanName = nameFromEmail;
      
      // Remove everything after + sign if present
      if (cleanName.includes('+')) {
        cleanName = cleanName.split('+')[0];
      }
      
      // Clean up the email username (remove numbers at the end, dots, etc.)
      cleanName = cleanName
        .replace(/[0-9]+$/g, '') // Remove trailing numbers
        .replace(/[._-]/g, ' ') // Replace dots, underscores, dashes with spaces
        .trim();
      
      if (cleanName && cleanName.length > 2) {
        // Capitalize first letter of each word
        return cleanName.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }

    return 'Student';
  };

  const getStudentEmail = () => {
    // Check direct email storage
    const directEmail = localStorage.getItem('user_email') || 
                       localStorage.getItem('student_email') || 
                       localStorage.getItem('email');
    
    if (directEmail && directEmail !== 'null' && directEmail !== 'undefined') {
      return directEmail;
    }

    // Parse user object
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user && typeof user === 'object') {
        return user.email || user.student_email || user.username || 'student@example.com';
      }
    } catch (error) {
      console.log('Error parsing user email:', error);
    }

    return 'student@example.com';
  };
  
  const [userInfo, setUserInfo] = useState({
    name: getStudentName(),
    email: getStudentEmail(),
    studentId: localStorage.getItem('student_id') || '',
    role: 'student'
  });
  const [quizLink, setQuizLink] = useState('');
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the confirmation dialog
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [quizToConfirm, setQuizToConfirm] = useState(null);
  const [isConfirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Check for pending quiz from login
    const pendingQuizId = localStorage.getItem('pending_quiz_id');
    if (pendingQuizId) {
      localStorage.removeItem('pending_quiz_id');
      navigate(`/quiz/take/${pendingQuizId}`);
    }

    // Refresh user info in case it was updated after login
    setUserInfo(prev => ({
      ...prev,
      name: getStudentName(),
      email: getStudentEmail()
    }));
  }, [navigate]);

  // Update userInfo when studentDetails changes
  useEffect(() => {
    if (studentDetails) {
      setUserInfo(prev => ({
        ...prev,
        name: getStudentName(),
        email: getStudentEmail()
      }));
    }
  }, [studentDetails]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Load attempts first to ensure the list is up-to-date
      const attempts = await loadQuizAttempts();
      // Then load student details and available quizzes in parallel
      await Promise.all([
        loadStudentDetails(),
        loadAvailableQuizzes(attempts)
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async () => {
    try {
      const studentId = localStorage.getItem('student_id');
      if (!studentId) {
        console.warn('No student ID found, skipping profile fetch');
        return;
      }
      const response = await quizApi.getById(studentId);
      setStudentDetails(response.data);
    } catch (err) {
      console.error('Failed to load student details:', err);
    }
  };

  const loadAvailableQuizzes = async (attempts) => {
    try {
      // Fetch all quizzes using the general endpoint
      const response = await quizApi.getAll();
      const data = response.data;
      
      console.log('All quizzes received:', data);
      
      // Handle different response structures for all quizzes
      let allFetchedQuizzes = [];
      if (data.current_quizzes || data.upcoming_quizzes || data.past_quizzes) {
          allFetchedQuizzes = [
              ...(data.current_quizzes || []),
              ...(data.upcoming_quizzes || []),
              ...(data.past_quizzes || []),
          ];
      } else {
          allFetchedQuizzes = data.results || (Array.isArray(data) ? data : []);
      }
      
      setAllQuizzes(allFetchedQuizzes);
      
      // Filter for published quizzes that haven't been attempted
      const attemptedQuizIds = new Set(attempts.map(a => a.quiz?.id || a.quiz?.quiz_id || a.quiz_id));
      
      const filteredQuizzes = allFetchedQuizzes
        .filter(q => q.is_published) // Ensure we only show published quizzes
        .filter(q => !attemptedQuizIds.has(q.id || q.quiz_id));
  
      setAvailableQuizzes(filteredQuizzes);
    } catch (error) {
      console.error('Error loading available quizzes:', error);
      setError('An error occurred while fetching quizzes.');
    }
  };

  const loadQuizAttempts = async () => {
    try {
      // Use the correct API method for getting quiz results
      const response = await quizApi.getResults();
      const data = response.data;
      
      console.log('Quiz attempts received:', data);
      
      // Handle different response structures
      const attempts = data.results || data.data || data || [];
      
      if (Array.isArray(attempts)) {
        // Sort by attempt date (newest first) and get recent attempts
        const sortedAttempts = attempts.sort((a, b) => 
          new Date(b.attempted_at || b.created_at) - new Date(a.attempted_at || a.created_at)
        );
        setQuizAttempts(sortedAttempts);
        return sortedAttempts;
      } else {
        console.warn('Quiz attempts data is not an array:', attempts);
        setQuizAttempts([]);
        return [];
      }
    } catch (error) {
      console.error('Error loading quiz attempts:', error);
      setQuizAttempts([]);
      return [];
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/student-login');
  };

  const handleQuizLinkSubmit = () => {
    if (!quizLink.trim()) return;

    console.log('Processing quiz link:', quizLink);

    const patterns = [
      /quiz[\/=](\d+)/i,
      /quiz[\/=](\w+)[\/]/i,
      /id[\/=](\d+)/i,
      /\/(\d+)\/join/i,
      /quiz_id[\/=](\d+)/i,
      /([a-f0-9-]{36})/i,
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    ];
    let quizId = null;

    for (const pattern of patterns) {
      const match = quizLink.match(pattern);
      if (match) {
        quizId = match[1];
        break;
      }
    }

    if (!quizId && /^[a-zA-Z0-9-]+$/.test(quizLink.trim())) {
      quizId = quizLink.trim();
    }

    if (!quizId) {
      setError('Invalid quiz link format. Please check the link and try again.');
      return;
    }

    handleTakeQuiz(quizId);
  };

  const handleTakeQuiz = async (quizId) => {
    const attemptedQuiz = quizAttempts.find(attempt =>
      (attempt.quiz_id || attempt.quiz?.quiz_id || attempt.quiz?.id) === parseInt(quizId)
    );

    if (attemptedQuiz) {
      setQuizToConfirm({
        id: quizId,
        hasAttempted: true,
        isAvailable: false,
        details: attemptedQuiz.quiz,
      });
      setConfirmDialogOpen(true);
      return;
    }

    const availableQuiz = availableQuizzes.find(quiz =>
      (quiz.id || quiz.quiz_id) === parseInt(quizId)
    );

    if (availableQuiz) {
      setQuizToConfirm({
        id: quizId,
        hasAttempted: false,
        isAvailable: true,
        details: availableQuiz,
      });
      setConfirmDialogOpen(true);
      return;
    }

    // If not found, fetch from API
    setConfirmLoading(true);
    setConfirmDialogOpen(true);
    try {
      const response = await quizApi.getById(quizId);
      const quizDetails = response.data;

      if (quizDetails && quizDetails.is_published) {
        setQuizToConfirm({
          id: quizId,
          hasAttempted: false,
          isAvailable: true,
          details: quizDetails,
        });
      } else {
        // Quiz is not published or invalid
        setQuizToConfirm({ id: quizId, hasAttempted: false, isAvailable: false, details: null });
      }
    } catch (err) {
      console.error('Failed to fetch quiz details by ID:', err);
      setQuizToConfirm({ id: quizId, hasAttempted: false, isAvailable: false, details: null });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleViewResult = (attempt) => {
    console.log('Attempt object:', attempt);
    if (isResultAvailable(attempt)) {
      const quizId = attempt.quiz_id || attempt.quiz?.quiz_id || attempt.quiz?.id;
      navigate(`/quiz/result/${quizId}`);
    } else {
      const remainingTime = getTimeUntilResult(attempt);
      setError(`Results will be available in approximately ${remainingTime}.`);
    }
  };

  const findFullQuiz = (attempt) => {
    const attemptQuizId = attempt.quiz_id || attempt.quiz?.id || attempt.quiz?.quiz_id;
    return allQuizzes.find(q => (q.id || q.quiz_id) === attemptQuizId);
  };

  const isResultAvailable = (attempt) => {
    // Use the actual time when the student took the quiz
    const attemptedAtRaw = attempt.attempted_at || attempt.created_at || attempt.completed_at;
    
    if (!attemptedAtRaw) {
      return false;
    }

    const attemptTime = new Date(attemptedAtRaw);
    const resultWaitMinutes = 10; // wait 10 minutes after quiz attempt

    const resultAvailableTime = new Date(attemptTime.getTime() + (resultWaitMinutes * 60 * 1000));
    return new Date() >= resultAvailableTime;
  };

  const getTimeUntilResult = (attempt) => {
    // Use the actual time when the student took the quiz
    const attemptedAtRaw = attempt.attempted_at || attempt.created_at || attempt.completed_at;

    if (!attemptedAtRaw) {
      return 'Result time unavailable';
    }

    const attemptTime = new Date(attemptedAtRaw);
    const resultWaitMinutes = 10;
    const resultAvailableTime = new Date(attemptTime.getTime() + (resultWaitMinutes * 60 * 1000));

    const now = new Date();
    if (now >= resultAvailableTime) {
      return 'Result is available';
    }

    const remainingMilliseconds = resultAvailableTime - now;
    const remainingMinutes = Math.ceil(remainingMilliseconds / (60 * 1000));
    return `${remainingMinutes} min`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={8} sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
            Loading Dashboard...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 3,
      }}
    >
      <Container maxWidth="lg">
        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError('')} 
            sx={{ mb: 3, borderRadius: 3 }}
          >
            {error}
          </Alert>
        )}

        <ConfirmationDialog
          open={isConfirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={() => {
            if (quizToConfirm && quizToConfirm.isAvailable && !quizToConfirm.hasAttempted) {
              navigate(`/quiz/take/${quizToConfirm.id}`);
            }
            setConfirmDialogOpen(false);
          }}
          title={
            isConfirmLoading
            ? "Loading Quiz..."
            : quizToConfirm?.hasAttempted 
              ? "Quiz Already Attempted" 
              : !quizToConfirm?.isAvailable
              ? "Quiz Not Found"
              : "Confirm Quiz Start"
          }
          content={
            isConfirmLoading
            ? "Please wait while we fetch the quiz details."
            : quizToConfirm?.hasAttempted
              ? "You have already completed this quiz. Each quiz can only be taken once."
              : !quizToConfirm?.isAvailable
              ? "The quiz link seems to be invalid or the quiz is not available to you. Please check the link."
              : `You are about to start the quiz: "${quizToConfirm?.details?.title || 'Unknown Quiz'}". Are you sure you want to proceed?`
          }
          confirmText={isConfirmLoading || quizToConfirm?.hasAttempted || !quizToConfirm?.isAvailable ? "OK" : "Start Quiz"}
          cancelText={isConfirmLoading || quizToConfirm?.hasAttempted || !quizToConfirm?.isAvailable ? "" : "Cancel"}
          isLoading={isConfirmLoading}
          confirmButtonProps={{
            disabled: isConfirmLoading
          }}
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 3,
              mb: 4,
              background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
              color: 'white',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 56, height: 56 }}>
                    <PersonIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
            Student Portal
          </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9, color: 'white' }}>
                      Welcome, {userInfo.name}
          </Typography>
                  </Box>
        </Box>

                <IconButton
                  onClick={handleLogout}
            sx={{
                    color: 'white',
                    bgcolor: alpha('#fff', 0.1),
                    '&:hover': {
                      bgcolor: alpha('#fff', 0.2),
                      transform: 'scale(1.05)',
                    }
                  }}
                >
            <LogoutIcon />
          </IconButton>
              </Stack>
      </Box>

            {/* Decorative background */}
            <Box
              sx={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: alpha('#fff', 0.1),
                borderRadius: '50%',
                zIndex: 1
              }}
            />
          </Paper>
        </motion.div>

        <Grid container spacing={4}>
          {/* Left Side - Quiz Access */}
          <Grid item xs={12} md={8}>
            {/* Quiz Link Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Paper
                elevation={8}
                  sx={{
                  p: 4,
                  mb: 4,
                  borderRadius: 4,
                  background: alpha('#fff', 0.98),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#4CAF50', 0.1)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    <LinkIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Access Quiz by Link
                </Typography>
                </Box>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="http://localhost:3000/quiz/207/join/"
                    value={quizLink}
                    onChange={(e) => setQuizLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuizLinkSubmit()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: alpha('#e3f2fd', 0.3),
                        borderRadius: 3,
                        '&:hover': {
                          backgroundColor: alpha('#e3f2fd', 0.5),
                        },
                        '&.Mui-focused': {
                          backgroundColor: alpha('#e3f2fd', 0.7),
                        }
                      },
                      '& .MuiInputBase-input': {
                        color: '#333',
                        fontWeight: 500
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LinkIcon color="primary" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleQuizLinkSubmit}
                    disabled={!quizLink.trim()}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                      color: 'white',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(45deg, #45a049, #7cb342)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                      }
                    }}
                    startIcon={<PlayIcon />}
                  >
                    Start Quiz
                  </Button>
                </Stack>

                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: '#666' }}>
                  💡 Paste the quiz link provided by your teacher to start the test
                </Typography>
              </Paper>
          </motion.div>

            {/* Available Quizzes */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Paper
                elevation={8}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: alpha('#fff', 0.98),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#4CAF50', 0.1)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
                    <QuizIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                    Available Quizzes ({availableQuizzes.length})
                  </Typography>
                </Box>

                {availableQuizzes.length > 0 ? (
                  <List sx={{ p: 0 }}>
                    {availableQuizzes.map((quiz, index) => (
          <motion.div
                        key={quiz.quiz_id || index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
          >
                        <ListItem
              sx={{
                            mb: 2,
                            bgcolor: alpha('#f3e5f5', 0.3),
                borderRadius: 3,
                            border: `1px solid ${alpha('#9c27b0', 0.1)}`,
                            '&:hover': {
                              bgcolor: alpha('#f3e5f5', 0.5),
                              transform: 'translateX(4px)',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <ListItemIcon>
                            <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
                              <AssignmentIcon />
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                                {quiz.title}
                              </Typography>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <Chip
                                  icon={<TimerIcon />}
                                  label={`${quiz.time_limit_minutes || quiz.duration || 'Unknown'} min`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <Chip
                                  icon={<QuizIcon />}
                                  label={`${quiz.question_count || quiz.actual_question_count || quiz.total_questions || quiz.questions?.length || 'Unknown'} questions`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              </Stack>
                            }
                          />
                          <Button
                            variant="contained"
                            onClick={() => handleTakeQuiz(quiz.quiz_id)}
                            sx={{
                              borderRadius: 2,
                              background: 'linear-gradient(45deg, #9c27b0, #e91e63)',
                              color: 'white',
                              fontWeight: 600,
                              '&:hover': {
                                background: 'linear-gradient(45deg, #7b1fa2, #c2185b)',
                              }
                            }}
                            startIcon={<PlayIcon />}
                          >
                            Take Quiz
                          </Button>
                        </ListItem>
                      </motion.div>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'grey.200', width: 64, height: 64 }}>
                      <SchoolIcon fontSize="large" sx={{ color: 'grey.400' }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ mb: 1, color: '#666' }}>
                      No quizzes available at the moment
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#888' }}>
                      Check back later or use the quiz link from your teacher
                    </Typography>
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Grid>

          {/* Right Side - Student Details & Recent Attempts */}
          <Grid item xs={12} md={4}>
            {/* Student Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Paper
                elevation={8}
                  sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 4,
                  background: alpha('#fff', 0.98),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#ff9800', 0.1)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                    <PersonIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'warning.main' }}>
                  Student Details
                </Typography>
                </Box>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>
                      Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#333' }}>
                      {userInfo.name}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#333' }}>
                      {userInfo.email}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>
                      Role
                    </Typography>
                    <Chip
                      label="Student"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Stack>
              </Paper>
          </motion.div>

            {/* Quiz Attempts & Results */}
          <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Paper
                elevation={8}
                  sx={{
                  p: 3,
                  borderRadius: 4,
                  background: alpha('#fff', 0.98),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha('#2196f3', 0.1)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                    <AssessmentIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'info.main' }}>
                    Quiz Attempts ({quizAttempts.length})
                </Typography>
                </Box>

                {quizAttempts.length > 0 ? (
                  <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
                    {quizAttempts.map((attempt, index) => (
                      <motion.div
                        key={attempt.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ListItem
                          sx={{
                            mb: 1,
                            bgcolor: alpha('#e3f2fd', 0.3),
                            borderRadius: 2,
                            border: `1px solid ${alpha('#2196f3', 0.1)}`,
                            '&:hover': {
                              bgcolor: alpha('#e3f2fd', 0.5),
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <ListItemIcon>
                            {isResultAvailable(attempt) ? (
                              <CheckIcon color="success" />
                            ) : (
                              <PendingIcon color="warning" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                {attempt.quiz_title || attempt.quiz?.title || 'Quiz'}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                  Score: {attempt.percentage || 0}%
                                </Typography>
                                {!isResultAvailable(attempt) && (
                                  <Typography variant="caption" sx={{ display: 'block', color: '#f57c00' }}>
                                    Result in: {getTimeUntilResult(attempt)}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          {isResultAvailable(attempt) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewResult(attempt)}
                              startIcon={<ViewIcon />}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 600
                              }}
                            >
                              View Result
                        </Button>
                          )}
                      </ListItem>
                      </motion.div>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'grey.200', width: 48, height: 48 }}>
                      <TrendingUpIcon sx={{ color: 'grey.400' }} />
                    </Avatar>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      No quiz attempts yet
                    </Typography>
                  </Box>
                )}
              </Paper>
          </motion.div>
        </Grid>
      </Grid>
      </Container>
    </Box>
  );
};

export default SimpleStudentDashboard;