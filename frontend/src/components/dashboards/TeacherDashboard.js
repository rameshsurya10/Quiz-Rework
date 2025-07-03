import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Chip,
  IconButton,
  Fade,
  Grow,
  Skeleton,
  Alert,
  useTheme,
  Stack,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Quiz as QuizIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  TrendingUp,
  Add,
  Visibility,
  Assessment,
  Schedule,
  CheckCircle,
  Cancel,
  Person,
  Book,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, quizApi, studentApi, teacherApi, userApi } from '../../services/api';
import TeacherLayout from '../teacher/TeacherLayout';
import { fetchTeacherDashboardData } from '../../services/api';
import SummaryCard from '../common/SummaryCard';

const TeacherDashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTeacherDashboardData();
        setDashboardData(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []); // Empty dependency array means this runs once on mount

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, dashboardRes, quizRes] = await Promise.all([
        userApi.getProfile(),
        dashboardApi.getStats(),
        quizApi.getAll({ ordering: '-created_at', limit: 5 })
      ]);

      setTeacherProfile(profileRes.data);
      setDashboardData(dashboardRes.data);
      setQuizzes(quizRes.data.results || []);

    } catch (err) {
      console.error("Error refetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, onClick, loading }) => (
    <Grow in={!loading}>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
          border: `1px solid ${color}20`,
          borderRadius: 3,
          transition: 'all 0.3s ease',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px ${color}25`,
          } : {},
        }}
        onClick={onClick}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              {loading ? (
                <>
                  <Skeleton variant="rectangular" width="80%" height={30} sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" width="50%" height={20} />
                </>
              ) : (
                <>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 1 }}>
                    {value}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {title}
                  </Typography>
                  {trend && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ fontSize: 16, color: '#4caf50', mr: 0.5 }} />
                      <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                        {trend}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
            <Avatar
                sx={{ 
                bgcolor: color,
                width: 56,
                height: 56,
                boxShadow: `0 4px 12px ${color}30`,
              }}
            >
              <Icon sx={{ fontSize: 28 }} />
              </Avatar>
        </Box>
        </CardContent>
      </Card>
    </Grow>
  );

  const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => (
    <Fade in={true} timeout={1000}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
          border: '1px solid rgba(225, 112, 85, 0.1)',
                  borderRadius: 3, 
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(225, 112, 85, 0.15)',
            borderColor: color,
          },
        }}
        onClick={onClick}
      >
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Avatar
            sx={{
              bgcolor: `${color}15`,
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              border: `2px solid ${color}30`,
            }}
          >
            <Icon sx={{ fontSize: 32, color: color }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
            {title}
                      </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
                      </Typography>
        </CardContent>
      </Card>
    </Fade>
  );

  const RecentQuizItem = ({ quiz, index }) => (
    <Fade in={true} timeout={600 + index * 100}>
      <ListItem
                        sx={{ 
          border: '1px solid rgba(225, 112, 85, 0.1)',
          borderRadius: 2,
          mb: 1,
          background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)',
          '&:hover': {
            backgroundColor: 'rgba(225, 112, 85, 0.05)',
          },
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: '#e17055', width: 40, height: 40 }}>
            <QuizIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333' }}>
              {quiz.title}
                    </Typography>
          }
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                label={quiz.is_published ? 'Published' : 'Draft'}
                size="small"
                color={quiz.is_published ? 'success' : 'warning'}
                sx={{ fontSize: '0.75rem' }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {quiz.questions?.length || 0} questions
                      </Typography>
                    </Box>
          }
        />
        <IconButton
          onClick={() => navigate(`/teacher/quiz/${quiz.quiz_id}`)}
          sx={{ color: '#e17055' }}
        >
          <Visibility />
        </IconButton>
      </ListItem>
    </Fade>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <TeacherLayout>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: '#333' }}>
          Welcome back, Teacher!
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
          Here's a snapshot of your current activities.
        </Typography>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Total Students"
              value={dashboardData?.totalStudents || 0}
              icon="school"
              color="#4CAF50"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Total Quizzes"
              value={dashboardData?.totalQuizzes || 0}
              icon="quiz"
              color="#2196F3"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Active Quizzes"
              value={dashboardData?.activeQuizzes || 0}
              icon="assignment"
              color="#FF9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <SummaryCard
              title="Completed Quizzes"
              value={dashboardData?.completedQuizzes || 0}
              icon="done_all"
              color="#E91E63"
            />
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Box mt={4}>
          <Typography variant="h5" gutterBottom style={{ color: '#2C3E50' }}>
            Recent Activity
          </Typography>
          <Paper elevation={3} style={{ padding: '20px' }}>
            {dashboardData?.recentActivity?.length > 0 ? (
              dashboardData.recentActivity.map((activity, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="body1" color="textPrimary">
                    {activity.description}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(activity.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography color="textSecondary">No recent activity</Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </TeacherLayout>
  );
};

export default TeacherDashboard; 