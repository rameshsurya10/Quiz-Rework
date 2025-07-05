import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Button, Grid, useTheme, Paper,
  Card, CardContent, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Chip, IconButton, Dialog, 
  DialogTitle, DialogContent, LinearProgress, Divider, DialogActions
} from '@mui/material';
import { PageHeader, EmptyState } from '../../common';
import SummaryCard from '../common/SummaryCard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PeopleIcon from '@mui/icons-material/People';
import QuizIcon from '@mui/icons-material/Quiz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import apiService from '../../services/api';
import QuizDetailsContent from './QuizDetailsContent';

const ResultsSection = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Table pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchResultsData();
  }, []);

  const fetchResultsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch dashboard data and quiz attempts in parallel
      const [dashboardResponse, attemptsResponse] = await Promise.all([
        apiService.get('/api/dashboard/'),
        apiService.get('/api/students/quiz_attempts/')
      ]);
      
      setDashboardData(dashboardResponse.data);
      setQuizAttempts(attemptsResponse.data || []);
      
    } catch (error) {
      console.error('Error fetching results data:', error);
      // Set empty data on error
      setDashboardData({});
      setQuizAttempts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewQuizDetails = (quiz) => {
    setSelectedQuiz(quiz);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedQuiz(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!dashboardData) return [];

    const performanceDistribution = dashboardData.performance_distribution || {};
    const totalAttempts = dashboardData.total_quiz_attempts || 0;
    const averageScore = dashboardData.overall_quiz_average_percentage || 0;

    // Calculate pass rate from performance distribution
    const passCount = (performanceDistribution.excellent || 0) + (performanceDistribution.good || 0);
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

    return [
      {
        title: 'Average Score',
        value: `${Math.round(averageScore)}%`,
        icon: <EmojiEventsIcon />,
        color: theme.palette.success.main,
      },
      {
        title: 'Pass Rate',
        value: `${passRate}%`,
        icon: <TrendingUpIcon />,
        color: theme.palette.info.main,
      },
      {
        title: 'Total Participants',
        value: dashboardData.total_students_attempted || 0,
        icon: <PeopleIcon />,
        color: theme.palette.secondary.main,
      },
      {
        title: 'Total Quizzes',
        value: dashboardData.quizzes || 0,
        icon: <QuizIcon />,
        color: theme.palette.warning.main,
      },
    ];
  };

  // Group quiz attempts by quiz for the table
  const getQuizResultsTable = () => {
    const quizMap = new Map();
    
    quizAttempts.forEach(attempt => {
      const quizId = attempt.quiz?.id || attempt.quiz_id;
      if (!quizId) return; // Skip attempts without a quiz ID

      if (!quizMap.has(quizId)) {
        quizMap.set(quizId, {
          id: quizId,
          title: attempt.quiz?.title || attempt.quiz_title,
          attempts: [],
          lastAttemptDate: attempt.attempted_at
        });
      }
      
      const quizData = quizMap.get(quizId);
      quizData.attempts.push(attempt);
      
      if (new Date(attempt.attempted_at) > new Date(quizData.lastAttemptDate)) {
        quizData.lastAttemptDate = attempt.attempted_at;
      }
    });

    return Array.from(quizMap.values()).map(quiz => {
      const totalAttempts = quiz.attempts.length;
      const totalScore = quiz.attempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0);
      const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
      const passedAttempts = quiz.attempts.filter(attempt => attempt.result === 'pass').length;
      const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
      
      return {
        id: quiz.id,
        title: quiz.title,
        attempts: totalAttempts,
        averageScore: averageScore,
        passRate: passRate,
        lastAttemptDate: new Date(quiz.lastAttemptDate).toLocaleDateString(),
        rawData: quiz.attempts
      };
    });
  };

  // Performance breakdown component
  const PerformanceBreakdown = () => {
    const performanceDistribution = dashboardData?.performance_distribution || {};
    const total = performanceDistribution.excellent + performanceDistribution.good + 
                  performanceDistribution.average + performanceDistribution.poor;

    if (total === 0) return null;

    const performanceData = [
      { label: 'Excellent (90-100%)', count: performanceDistribution.excellent, color: theme.palette.success.main },
      { label: 'Good (70-89%)', count: performanceDistribution.good, color: theme.palette.info.main },
      { label: 'Average (40-69%)', count: performanceDistribution.average, color: theme.palette.warning.main },
      { label: 'Poor (0-39%)', count: performanceDistribution.poor, color: theme.palette.error.main },
    ];

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Performance Distribution
          </Typography>
          <Grid container spacing={2}>
            {performanceData.map((item, index) => {
              const percentage = Math.round((item.count / total) * 100);
              return (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: item.color, fontWeight: 'bold' }}>
                      {item.count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({percentage}%)
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        mt: 1,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: item.color,
                        },
                      }}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <FullLayout>
        <Container maxWidth="lg">
          <PageHeader title="Quiz Results & Analytics" subtitle="Loading..." />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        </Container>
      </FullLayout>
    );
  }

  const summaryStats = getSummaryStats();
  const quizResultsTable = getQuizResultsTable();

  return (
    <FullLayout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <PageHeader
          title="Quiz Results"
          subtitle="Review overall quiz performance and detailed analytics"
        />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <LinearProgress />
          </Box>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Grid container spacing={3}>
                {summaryStats.map((stat, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <SummaryCard {...stat} />
                  </Grid>
                ))}
              </Grid>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <PerformanceBreakdown />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ p: 1 }}>
                  All Quiz Attempts
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell>Attempts</TableCell>
                        <TableCell>Average Score</TableCell>
                        <TableCell>Pass Rate</TableCell>
                        <TableCell>Last Attempt</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizResultsTable
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((quiz) => (
                          <TableRow key={quiz.id}>
                            <TableCell>{quiz.title}</TableCell>
                            <TableCell>{quiz.attempts}</TableCell>
                            <TableCell>
                              <Chip label={`${quiz.averageScore}%`} color="primary" />
                            </TableCell>
                            <TableCell>
                              <Chip label={`${quiz.passRate}%`} color={quiz.passRate > 50 ? 'success' : 'warning'} />
                            </TableCell>
                            <TableCell>{quiz.lastAttemptDate}</TableCell>
                            <TableCell>
                              <IconButton onClick={() => handleViewQuizDetails(quiz)}>
                                <VisibilityIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={quizResultsTable.length}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </Paper>
            </motion.div>
          </>
        )}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xl" fullWidth>
          <QuizDetailsContent quizData={selectedQuiz} onBack={handleCloseDialog} />
        </Dialog>
      </Container>
    </FullLayout>
  );
};

export default ResultsSection;
