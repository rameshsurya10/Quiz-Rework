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
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Quiz as QuizIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  NotificationsOutlined as NotificationsIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [stats, setStats] = useState({
    availableQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    recentQuizzes: []
  });
  const [userInfo, setUserInfo] = useState({
    email: localStorage.getItem('userEmail') || '',
    role: 'student'
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load available quizzes
      const quizResponse = await apiService.get('/api/quiz/');
      const quizzes = quizResponse.data.results || quizResponse.data || [];
      
      // Filter published quizzes for students
      const publishedQuizzes = quizzes.filter(quiz => quiz.is_published);

      // For now, we'll simulate completed quizzes and scores
      // In a real app, you'd have an endpoint for student results
      const completedCount = Math.floor(publishedQuizzes.length * 0.6); // 60% completed
      const averageScore = 85; // Simulated average score

      setStats({
        availableQuizzes: publishedQuizzes.length,
        completedQuizzes: completedCount,
        averageScore: averageScore,
        recentQuizzes: publishedQuizzes.slice(0, 5) // Get latest 5 quizzes
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleTakeQuiz = () => {
    navigate('/quiz');
  };

  const handleViewResults = () => {
    navigate('/results');
  };

  const dashboardCards = [
    {
      title: 'Available Quizzes',
      value: stats.availableQuizzes,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: '#6b73ff',
      gradient: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
      action: handleTakeQuiz,
      actionText: 'Take Quiz'
    },
    {
      title: 'Completed Quizzes',
      value: stats.completedQuizzes,
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: '#4ecdc4',
      gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      action: handleViewResults,
      actionText: 'View Results'
    },
    {
      title: 'Average Score',
      value: `${stats.averageScore}%`,
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
      action: handleViewResults,
      actionText: 'View Details'
    }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getPerformanceLevel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Average';
    if (score >= 60) return 'Below Average';
    return 'Needs Improvement';
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
          border: `1px solid ${alpha('#6b73ff', 0.2)}`,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6b73ff, #9644a4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            Student Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Welcome back! Continue your learning journey with available quizzes.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton sx={{ color: 'text.secondary' }}>
            <NotificationsIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                background: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
                cursor: 'pointer',
              }}
              onClick={handleMenuOpen}
            >
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {userInfo.email}
              </Typography>
              <Chip
                label="Student"
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
                  color: 'white',
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <SettingsIcon sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Dashboard Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardCards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                background: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                border: `1px solid ${alpha(card.color, 0.2)}`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${alpha(card.color, 0.3)}`,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: card.gradient,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      background: card.gradient,
                      width: 60,
                      height: 60,
                      mr: 2,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>
                      {card.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {card.title}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={card.action}
                  sx={{
                    background: card.gradient,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      background: card.gradient,
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {card.actionText}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Progress Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha('#6b73ff', 0.2)}`,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Overall Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Quiz Completion Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.completedQuizzes / stats.availableQuizzes) * 100 || 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha('#6b73ff', 0.1),
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
                    borderRadius: 4,
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                {stats.completedQuizzes} of {stats.availableQuizzes} quizzes completed
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                Performance Level
              </Typography>
              <Chip
                label={getPerformanceLevel(stats.averageScore)}
                sx={{
                  background: `linear-gradient(135deg, ${getScoreColor(stats.averageScore)}, ${getScoreColor(stats.averageScore)}dd)`,
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha('#4ecdc4', 0.2)}`,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={handleTakeQuiz}
                sx={{
                  background: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                }}
              >
                Take a New Quiz
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={handleViewResults}
                sx={{
                  borderColor: '#4ecdc4',
                  color: '#4ecdc4',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  justifyContent: 'flex-start',
                  '&:hover': {
                    borderColor: '#4ecdc4',
                    background: alpha('#4ecdc4', 0.1),
                  },
                }}
              >
                Review My Results
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Available Quizzes */}
      <Paper
        sx={{
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: `1px solid ${alpha('#6b73ff', 0.2)}`,
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Available Quizzes
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={handleTakeQuiz}
            sx={{
              background: 'linear-gradient(135deg, #6b73ff 0%, #9644a4 100%)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Start Quiz
          </Button>
        </Box>

        {stats.recentQuizzes.length > 0 ? (
          <Grid container spacing={2}>
            {stats.recentQuizzes.map((quiz, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card
                  sx={{
                    background: alpha('#f8f9fa', 0.5),
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      background: alpha('#6b73ff', 0.1),
                      transform: 'translateY(-2px)',
                    },
                  }}
                  onClick={handleTakeQuiz}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {quiz.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {quiz.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label="Available"
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                          color: 'white',
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Published: {new Date(quiz.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SchoolIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
              No Quizzes Available
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Check back later for new quizzes from your teachers!
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default StudentDashboard;