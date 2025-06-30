import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Button, Grid, useTheme, Paper,
  Card, CardContent, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Chip, IconButton, Dialog, 
  DialogTitle, DialogContent, LinearProgress, Divider
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
      const quizId = attempt.quiz_id;
      if (!quizMap.has(quizId)) {
        quizMap.set(quizId, {
          id: quizId,
          title: attempt.quiz_title,
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

  // Quiz details dialog
  const QuizDetailsDialog = () => {
    if (!selectedQuiz) return null;

    const { rawData = [] } = selectedQuiz;
    
    // Safety check for rawData
    if (!Array.isArray(rawData)) {
      console.warn('rawData is not an array:', rawData);
      return null;
    }

    const scoreRanges = [
      { 
        range: '90-100%', 
        count: rawData.filter(a => a && a.percentage >= 90).length,
        color: theme.palette.success.main,
        bgColor: alpha(theme.palette.success.main, 0.1)
      },
      { 
        range: '80-89%', 
        count: rawData.filter(a => a && a.percentage >= 80 && a.percentage < 90).length,
        color: theme.palette.info.main,
        bgColor: alpha(theme.palette.info.main, 0.1)
      },
      { 
        range: '70-79%', 
        count: rawData.filter(a => a && a.percentage >= 70 && a.percentage < 80).length,
        color: theme.palette.warning.main,
        bgColor: alpha(theme.palette.warning.main, 0.1)
      },
      { 
        range: '60-69%', 
        count: rawData.filter(a => a && a.percentage >= 60 && a.percentage < 70).length,
        color: theme.palette.warning.dark,
        bgColor: alpha(theme.palette.warning.dark, 0.1)
      },
      { 
        range: 'Below 60%', 
        count: rawData.filter(a => a && a.percentage < 60).length,
        color: theme.palette.error.main,
        bgColor: alpha(theme.palette.error.main, 0.1)
      },
    ];

    return (
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '500px'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {selectedQuiz.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Detailed Quiz Results & Analytics
              </Typography>
            </Box>
            <IconButton 
              onClick={handleCloseDialog}
              sx={{ 
                bgcolor: alpha(theme.palette.action.hover, 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.hover, 0.2),
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Quiz Statistics Card */}
            <Grid item xs={12} md={6}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <AssessmentIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Quiz Statistics
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 1,
                        textAlign: 'center'
                      }}>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 'bold', 
                          color: theme.palette.primary.main 
                        }}>
                          {selectedQuiz.attempts}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Attempts
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        borderRadius: 1,
                        textAlign: 'center'
                      }}>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 'bold', 
                          color: theme.palette.success.main 
                        }}>
                          {selectedQuiz.averageScore}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average Score
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        borderRadius: 1,
                        textAlign: 'center'
                      }}>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 'bold', 
                          color: theme.palette.info.main 
                        }}>
                          {selectedQuiz.passRate}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pass Rate
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        borderRadius: 1,
                        textAlign: 'center'
                      }}>
                        <Typography variant="body1" sx={{ 
                          fontWeight: 'bold', 
                          color: theme.palette.secondary.main 
                        }}>
                          {selectedQuiz.lastAttemptDate}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last Attempt
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Score Distribution Card */}
            <Grid item xs={12} md={6}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <TrendingUpIcon sx={{ color: theme.palette.secondary.main, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Score Distribution
                    </Typography>
                  </Box>
                  
                  {scoreRanges.map((range, index) => {
                    const percentage = selectedQuiz.attempts > 0 
                      ? (range.count / selectedQuiz.attempts) * 100 
                      : 0;
                    const isActive = range.count > 0;
                    
                    return (
                      <Box 
                        key={index} 
                        sx={{ 
                          mb: 2, 
                          p: 2, 
                          bgcolor: isActive ? range.bgColor : alpha(theme.palette.action.hover, 0.05),
                          borderRadius: 1,
                          border: isActive ? `1px solid ${alpha(range.color, 0.3)}` : `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: isActive ? 600 : 400,
                              color: isActive ? range.color : theme.palette.text.secondary
                            }}
                          >
                            {range.range}
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: isActive ? range.color : theme.palette.text.secondary,
                                mr: 1
                              }}
                            >
                              {range.count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {range.count === 1 ? 'student' : 'students'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha(theme.palette.action.hover, 0.1),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: range.color,
                              borderRadius: 4,
                            },
                          }}
                        />
                        
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                        >
                          {percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>

            {/* Additional Student Details Table */}
            <Grid item xs={12}>
              <Card 
                elevation={0} 
                sx={{ 
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  mt: 1
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recent Attempts
                  </Typography>
                  
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Student</TableCell>
                          <TableCell align="center">Score</TableCell>
                          <TableCell align="center">Percentage</TableCell>
                          <TableCell align="center">Result</TableCell>
                          <TableCell align="center">Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rawData.slice(0, 5).map((attempt, index) => {
                          // Safety checks for attempt data
                          const studentName = attempt?.student_name || 'Unknown Student';
                          const score = attempt?.score || 0;
                          const percentage = attempt?.percentage || 0;
                          const result = attempt?.result || 'Unknown';
                          const attemptDate = attempt?.attempted_at ? new Date(attempt.attempted_at) : new Date();
                          
                          return (
                            <TableRow key={index} hover>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <SchoolIcon sx={{ color: theme.palette.text.secondary, mr: 1, fontSize: '1.2rem' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {studentName}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {score}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: percentage >= 70 ? theme.palette.success.main : 
                                           percentage >= 50 ? theme.palette.warning.main : 
                                           theme.palette.error.main
                                  }}
                                >
                                  {Math.round(percentage)}%
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={result.toUpperCase()}
                                  color={result.toLowerCase() === 'pass' ? 'success' : 'error'}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2" color="text.secondary">
                                  {attemptDate.toLocaleDateString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {rawData.length > 5 && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Showing 5 of {rawData.length} attempts
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        
        {/* Add Dialog Actions for better UX */}
        <Box sx={{ 
          p: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="body2" color="text.secondary">
            {rawData.length} total attempt{rawData.length === 1 ? '' : 's'}
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleCloseDialog}
            sx={{ minWidth: 100 }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
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
      <Container maxWidth="lg">
        <PageHeader 
          title="Quiz Results & Analytics" 
          subtitle="View comprehensive quiz performance and student results"
        />

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryStats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <SummaryCard {...stat} index={index} />
            </Grid>
          ))}
        </Grid>

        {/* Performance Breakdown */}
        {dashboardData && <PerformanceBreakdown />}

        {/* Quiz Results Table */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quiz Performance Overview
            </Typography>
            
            {quizResultsTable.length === 0 ? (
              <EmptyState
                icon={<AssessmentIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />}
                title="No Quiz Results Available"
                subtitle="Quiz results will appear here once students start taking quizzes"
              />
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Quiz Title</TableCell>
                        <TableCell align="center">Attempts</TableCell>
                        <TableCell align="center">Average Score</TableCell>
                        <TableCell align="center">Pass Rate</TableCell>
                        <TableCell align="center">Last Attempt</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {quizResultsTable
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((quiz, index) => (
                          <TableRow key={quiz.id} hover>
                            <TableCell>
                              <Typography variant="subtitle2">{quiz.title}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={quiz.attempts} color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Box display="flex" alignItems="center" justifyContent="center">
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                  {quiz.averageScore}%
                                </Typography>
                                {quiz.averageScore >= 70 ? (
                                  <TrendingUpIcon color="success" fontSize="small" />
                                ) : (
                                  <TrendingDownIcon color="error" fontSize="small" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${quiz.passRate}%`}
                                color={quiz.passRate >= 70 ? 'success' : quiz.passRate >= 50 ? 'warning' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2">{quiz.lastAttemptDate}</Typography>
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                onClick={() => handleViewQuizDetails(quiz)}
                                color="primary"
                              >
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
                  rowsPerPageOptions={[5, 10, 25]}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Quiz Details Dialog */}
        <QuizDetailsDialog />
      </Container>
    </FullLayout>
  );
};

export default ResultsSection;
