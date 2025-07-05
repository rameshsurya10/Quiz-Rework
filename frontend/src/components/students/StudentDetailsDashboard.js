import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Avatar, LinearProgress, Paper, Chip, List, ListItem, ListItemAvatar, ListItemText, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Divider, Alert, ListItemIcon
} from '@mui/material';
import {
  School, Event, EmojiEvents, Phone, Email, HelpOutline, TrendingUp, TrendingDown, Star, BarChart as BarChartIcon,
  Class as ClassIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { reportApi, quizApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: 'none',
  border: `1px solid ${theme.palette.divider}`,
}));

const BarChart = ({ data, highlight }) => {
  const theme = useTheme();
  const maxScore = Math.max(...(data?.map(d => d.score) || [0]), 100);

  return (
    <Box sx={{ display: 'flex', height: 150, alignItems: 'flex-end', justifyContent: 'space-around', p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', mt: 2 }}>
      {data?.map((item) => (
        <Tooltip key={item.month} title={`${item.month}: ${item.score}%`}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <Box sx={{
              width: '50%',
              height: `${(item.score / maxScore) * 100}%`,
              backgroundColor: highlight,
              borderRadius: '4px 4px 0 0',
              transition: 'all 0.3s ease-in-out',
              '&:hover': { backgroundColor: alpha(highlight, 0.8) }
            }} />
            <Typography variant="caption" sx={{ mt: 1 }}>{item.month}</Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

const StudentDetailsDashboard = ({ student, onClose, dashboardData: initialData }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizAttempts, setQuizAttempts] = useState([]);

  useEffect(() => {
    const fetchQuizAttempts = async () => {
      if (!student || !student.id) return;
      setIsLoading(true);
      try {
        const response = await quizApi.getResults(); // This fetches all attempts
        const allAttempts = response.data.results || response.data.data || response.data || [];
        const studentAttempts = allAttempts.filter(
          (attempt) => (attempt.student?.id === student.id) || (attempt.student_id === student.id)
        );
        setQuizAttempts(studentAttempts);
      } catch (err) {
        setError('Failed to load quiz attempts.');
        console.error('Error fetching quiz attempts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizAttempts();
  }, [student]);

  if (isLoading) {
    return (
      <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, borderRadius: '16px', bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 72, height: 72, mr: 2, bgcolor: theme.palette.primary.main, fontSize: '2.5rem' }}>
              {(dashboardData?.name || student?.name)?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">{dashboardData?.name || student?.name || 'Student Name'}</Typography>
              <Typography variant="subtitle1" color="text.secondary">{dashboardData?.department_name || student?.department?.name || 'No Department'} | ID: {dashboardData?.student_id || student?.id || 'N/A'}</Typography>
            </Box>
          </Box>
          <Button variant="outlined" onClick={onClose}>Close</Button>
        </Box>

        <Card sx={{ borderRadius: '16px', p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ pl: 2 }}>
            Student Information
          </Typography>
          <Grid container>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon><Email /></ListItemIcon>
                  <ListItemText primary="Email Address" secondary={dashboardData?.email || 'N/A'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Phone /></ListItemIcon>
                  <ListItemText primary="Phone Number" secondary={dashboardData?.phone || 'N/A'} />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                  <ListItem>
                    <ListItemIcon><ClassIcon /></ListItemIcon>
                    <ListItemText primary="Class & Section" secondary={`${dashboardData?.class_name || 'N/A'} - ${dashboardData?.section || 'N/A'}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><School /></ListItemIcon>
                    <ListItemText primary="Register No." secondary={dashboardData?.register_number || 'N/A'} />
                  </ListItem>
              </List>
            </Grid>
          </Grid>
        </Card>

        <Grid container spacing={3}>
          {/* Key Stats */}
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.rank || 'N/A'}</Typography><Typography>Overall Rank</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.percentile || 'N/A'}</Typography><Typography>Percentile</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.averageScore || 0}%</Typography><Typography>Avg. Score</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.quizParticipation || 0}%</Typography><Typography>Participation</Typography></StatCard></Grid>

          {/* Performance Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
              <Typography variant="h6">Performance Over Time</Typography>
              <BarChart data={dashboardData?.performanceOverTime} highlight={theme.palette.primary.main} />
            </Card>
          </Grid>

          {/* Strengths & Weaknesses */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>Strengths</Typography>
                {dashboardData?.strengths?.map(item => <Chip key={item} icon={<TrendingUp />} label={item} color="success" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
              </Box>
              <Divider />
              <Box mt={2}>
                <Typography variant="h6" gutterBottom>Areas for Improvement</Typography>
                {dashboardData?.weaknesses?.map(item => <Chip key={item} icon={<TrendingDown />} label={item} color="warning" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
              </Box>
            </Card>
          </Grid>

          {/* Recent Quiz Scores Table */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Quiz History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizAttempts.length > 0 ? (
                        quizAttempts.map(item => (
                          <TableRow key={item.id} hover>
                            <TableCell>{item.quiz?.title || 'N/A'}</TableCell>
                            <TableCell>{new Date(item.attempted_at).toLocaleDateString()}</TableCell>
                            <TableCell align="right">{item.score ?? 'N/A'}</TableCell>
                            <TableCell>
                              <Chip label={item.status || 'Completed'} color="success" size="small" />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => navigate(`/quiz/result/${item.quiz.id}`)}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            No quiz attempts found for this student.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Achievements & Upcoming */}
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: '16px', height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom>Achievements</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {dashboardData?.achievements?.map(ach => (
                  <Chip key={ach} icon={<Star />} label={ach} color="warning" variant="filled" size="small" />
                ))}
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: '16px', height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom>Upcoming Quizzes</Typography>
              <List dense>
                {dashboardData?.upcomingQuizzes?.map(item => (
                  <ListItem key={item.title} disableGutters>
                    <ListItemAvatar><Avatar sx={{ bgcolor: 'info.light' }}><HelpOutline /></Avatar></ListItemAvatar>
                    <ListItemText primary={item.title} secondary={`Due in ${item.due}`} />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

        </Grid>
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  // Check if the necessary dashboard data is missing by looking for a performance-specific field
  const isDataMissing = !dashboardData || typeof dashboardData.rank === 'undefined';

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, borderRadius: '16px', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ width: 72, height: 72, mr: 2, bgcolor: theme.palette.primary.main, fontSize: '2.5rem' }}>
            {(dashboardData?.name || student?.name)?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">{dashboardData?.name || student?.name || 'Student Name'}</Typography>
            <Typography variant="subtitle1" color="text.secondary">{dashboardData?.department_name || student?.department?.name || 'No Department'} | ID: {dashboardData?.student_id || student?.id || 'N/A'}</Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </Box>
      
      <Card sx={{ borderRadius: '16px', p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ pl: 2 }}>
            Student Information
          </Typography>
          <Grid container>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemIcon><Email /></ListItemIcon>
                  <ListItemText primary="Email Address" secondary={dashboardData?.email || 'N/A'} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Phone /></ListItemIcon>
                  <ListItemText primary="Phone Number" secondary={dashboardData?.phone || 'N/A'} />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                  <ListItem>
                    <ListItemIcon><ClassIcon /></ListItemIcon>
                    <ListItemText primary="Class & Section" secondary={`${dashboardData?.class_name || 'N/A'} - ${dashboardData?.section || 'N/A'}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><School /></ListItemIcon>
                    <ListItemText primary="Register No." secondary={dashboardData?.register_number || 'N/A'} />
                  </ListItem>
              </List>
            </Grid>
          </Grid>
        </Card>

      {quizAttempts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Detailed performance data is not available for this student yet. Basic details are shown above.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Key Stats */}
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.rank || 'N/A'}</Typography><Typography>Overall Rank</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.percentile || 'N/A'}</Typography><Typography>Percentile</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.averageScore || 0}%</Typography><Typography>Avg. Score</Typography></StatCard></Grid>
          <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{dashboardData?.quizParticipation || 0}%</Typography><Typography>Participation</Typography></StatCard></Grid>

          {/* Performance Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
              <Typography variant="h6">Performance Over Time</Typography>
              <BarChart data={dashboardData?.performanceOverTime} highlight={theme.palette.primary.main} />
            </Card>
          </Grid>

          {/* Strengths & Weaknesses */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
              <Box mb={2}>
                <Typography variant="h6" gutterBottom>Strengths</Typography>
                {dashboardData?.strengths?.map(item => <Chip key={item} icon={<TrendingUp />} label={item} color="success" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
              </Box>
              <Divider />
              <Box mt={2}>
                <Typography variant="h6" gutterBottom>Areas for Improvement</Typography>
                {dashboardData?.weaknesses?.map(item => <Chip key={item} icon={<TrendingDown />} label={item} color="warning" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
              </Box>
            </Card>
          </Grid>

          {/* Recent Quiz Scores Table */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: '16px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Quiz History</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Score</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizAttempts.map(item => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.quiz?.title || 'N/A'}</TableCell>
                          <TableCell>{new Date(item.attempted_at).toLocaleDateString()}</TableCell>
                          <TableCell align="right">{item.score ?? 'N/A'}</TableCell>
                          <TableCell>
                            <Chip label={item.status || 'Completed'} color="success" size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => navigate(`/quiz/result/${item.quiz.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Achievements & Upcoming */}
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: '16px', height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom>Achievements</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {dashboardData?.achievements?.map(ach => (
                  <Chip key={ach} icon={<Star />} label={ach} color="warning" variant="filled" size="small" />
                ))}
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: '16px', height: '100%', p: 2 }}>
              <Typography variant="h6" gutterBottom>Upcoming Quizzes</Typography>
              <List dense>
                {dashboardData?.upcomingQuizzes?.map(item => (
                  <ListItem key={item.title} disableGutters>
                    <ListItemAvatar><Avatar sx={{ bgcolor: 'info.light' }}><HelpOutline /></Avatar></ListItemAvatar>
                    <ListItemText primary={item.title} secondary={`Due in ${item.due}`} />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>

        </Grid>
      )}
    </Paper>
  );
};

export default StudentDetailsDashboard;
