import React from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Avatar, LinearProgress, Paper, Chip, List, ListItem, ListItemAvatar, ListItemText, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Divider
} from '@mui/material';
import {
  School, Event, EmojiEvents, Phone, Email, HelpOutline, TrendingUp, TrendingDown, Star, BarChart as BarChartIcon
} from '@mui/icons-material';
import { styled, useTheme, alpha } from '@mui/material/styles';

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
  const maxScore = Math.max(...data.map(d => d.score), 100);

  return (
    <Box sx={{ display: 'flex', height: 150, alignItems: 'flex-end', justifyContent: 'space-around', p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', mt: 2 }}>
      {data.map((item) => (
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

const StudentDetailsDashboard = ({ student, onClose }) => {
  const theme = useTheme();

  const mockData = {
    averageScore: 82,
    quizParticipation: 95,
    rank: '12th',
    percentile: '88th',
    performanceOverTime: [
      { month: 'Jan', score: 70 },
      { month: 'Feb', score: 75 },
      { month: 'Mar', score: 85 },
      { month: 'Apr', score: 82 },
      { month: 'May', score: 90 },
    ],
    strengths: ['General Knowledge', 'Technical Skills'],
    weaknesses: ['Logical Reasoning'],
    achievements: ['Top Scorer: GK Quiz #3', 'Perfect Score: Logic Puzzle', 'Quiz Streak: 5 Wins', 'Fastest Finisher'],
    recentQuizScores: [
      { quiz: 'General Knowledge #5', date: '2023-05-15', score: '9/10', percentile: 92 },
      { quiz: 'Logic Puzzle #4', date: '2023-05-12', score: '8/10', percentile: 85 },
      { quiz: 'Technical Skills #2', date: '2023-05-10', score: '17/20', percentile: 88 },
      { quiz: 'History Trivia', date: '2023-05-05', score: '7/10', percentile: 75 },
      { quiz: 'Science Quiz #3', date: '2023-04-28', score: '8/10', percentile: 81 },
    ],
    upcomingQuizzes: [
      { title: 'Weekly Science Quiz', due: '2 days' },
      { title: 'Pop Culture Trivia', due: '4 days' },
    ],
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, borderRadius: '16px', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ width: 72, height: 72, mr: 2, bgcolor: theme.palette.primary.main, fontSize: '2.5rem' }}>
            {student?.name?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">{student?.name || 'Student Name'}</Typography>
            <Typography variant="subtitle1" color="text.secondary">{student?.department?.name || student?.department_name || 'No Department Assigned'} | ID: {student?.student_id || 'N/A'}</Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </Box>

      <Grid container spacing={3}>
        {/* Key Stats */}
        <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{mockData.rank}</Typography><Typography>Overall Rank</Typography></StatCard></Grid>
        <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{mockData.percentile}</Typography><Typography>Percentile</Typography></StatCard></Grid>
        <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{mockData.averageScore}%</Typography><Typography>Avg. Score</Typography></StatCard></Grid>
        <Grid item xs={6} sm={3}><StatCard><Typography variant="h4" color="primary">{mockData.quizParticipation}%</Typography><Typography>Participation</Typography></StatCard></Grid>

        {/* Performance Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
            <Typography variant="h6">Performance Over Time</Typography>
            <BarChart data={mockData.performanceOverTime} highlight={theme.palette.primary.main} />
          </Card>
        </Grid>

        {/* Strengths & Weaknesses */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: '16px', p: 2, height: '100%' }}>
            <Box mb={2}>
              <Typography variant="h6" gutterBottom>Strengths</Typography>
              {mockData.strengths.map(item => <Chip key={item} icon={<TrendingUp />} label={item} color="success" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
            </Box>
            <Divider />
            <Box mt={2}>
              <Typography variant="h6" gutterBottom>Areas for Improvement</Typography>
              {mockData.weaknesses.map(item => <Chip key={item} icon={<TrendingDown />} label={item} color="warning" variant="outlined" size="small" sx={{ mr: 1, mb: 1 }} />)}
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
                      <TableCell align="right">Percentile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockData.recentQuizScores.map(item => (
                      <TableRow key={item.quiz} hover>
                        <TableCell>{item.quiz}</TableCell>
                        <TableCell>{item.date}</TableCell>
                        <TableCell align="right">{item.score}</TableCell>
                        <TableCell align="right"><Chip label={`${item.percentile}%`} color="primary" variant="outlined" size="small" /></TableCell>
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
              {mockData.achievements.map(ach => (
                <Chip key={ach} icon={<Star />} label={ach} color="warning" variant="filled" size="small" />
              ))}
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: '16px', height: '100%', p: 2 }}>
            <Typography variant="h6" gutterBottom>Upcoming Quizzes</Typography>
            <List dense>
              {mockData.upcomingQuizzes.map(item => (
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
};

export default StudentDetailsDashboard;
