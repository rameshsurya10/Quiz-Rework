import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Button, Grid, useTheme, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, TableSortLabel, IconButton, Dialog, DialogTitle, 
  DialogContent
} from '@mui/material';
import { PageHeader, InfoCard, EmptyState } from '../common'; // Assuming common.js exists
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Average Score
import RateReviewIcon from '@mui/icons-material/RateReview'; // Completion Rate
import PeopleIcon from '@mui/icons-material/People'; // Total Participants
import QuizIcon from '@mui/icons-material/Quiz'; // quiz Completed
import AssessmentIcon from '@mui/icons-material/Assessment'; // For table empty state
import VisibilityIcon from '@mui/icons-material/Visibility'; // View details icon
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'; // Report icon
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';
import { visuallyHidden } from '@mui/utils';
import { alpha } from '@mui/material/styles';
import ResultReportSection from './ResultReportSection';
import apiService from '../../services/api'; // Import the API service
import QuizDetailsContent from './QuizDetailsContent';

const ResultsSection = () => {
  const navigate = useNavigate();
  
  const theme = useTheme();
  const [summaryStats, setSummaryStats] = useState(null);
  const [quizResults, setQuizResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [openQuizDialog, setOpenQuizDialog] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedQuizData, setSelectedQuizData] = useState(null);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('quizTitle');

  useEffect(() => {
    const fetchResultsData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingTable(true);

        // Try to fetch quiz attempts/results data using the API service
        try {
          console.log('Attempting to fetch quiz attempts...');
          const attemptsResponse = await apiService.get('/api/students/quiz_attempts/');
          const attemptsData = attemptsResponse.data;
          
          console.log('Quiz attempts data:', attemptsData);

          // Process the attempts data to calculate summary stats
          if (Array.isArray(attemptsData) && attemptsData.length > 0) {
            // Calculate summary statistics
            const totalAttempts = attemptsData.length;
            const totalScore = attemptsData.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0);
            const averageScore = totalScore / totalAttempts;
            const passedAttempts = attemptsData.filter(attempt => attempt.result === 'pass').length;
            const completionRate = (passedAttempts / totalAttempts) * 100;
            const uniqueQuizzes = new Set(attemptsData.map(attempt => attempt.quiz_id)).size;
            const uniqueStudents = new Set(attemptsData.map(attempt => attempt.student_name)).size;

            setSummaryStats([
              {
                title: 'Average Score',
                value: `${Math.round(averageScore)}%`,
                icon: <EmojiEventsIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.success.main,
                trend: averageScore > 75 ? 'up' : averageScore > 50 ? 'stable' : 'down',
                trendValue: Math.abs(averageScore - 75).toFixed(0),
              },
              {
                title: 'Pass Rate',
                value: `${Math.round(completionRate)}%`,
                icon: <RateReviewIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.info.main,
                trend: completionRate > 80 ? 'up' : completionRate > 60 ? 'stable' : 'down',
                trendValue: Math.abs(completionRate - 80).toFixed(0),
              },
              {
                title: 'Total Participants',
                value: uniqueStudents || 0,
                icon: <PeopleIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.secondary.main,
                trend: 'stable',
                trendValue: '0',
              },
              {
                title: 'Quizzes Taken',
                value: uniqueQuizzes || 0,
                icon: <QuizIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.warning.main,
                trend: uniqueQuizzes > 5 ? 'up' : 'stable',
                trendValue: uniqueQuizzes > 5 ? '2' : '0',
              },
            ]);

            // Group attempts by quiz to create quiz results table
            const quizMap = new Map();
            attemptsData.forEach(attempt => {
              const quizId = attempt.quiz_id;
              if (!quizMap.has(quizId)) {
                quizMap.set(quizId, {
                  id: quizId,
                  quizTitle: attempt.quiz_title,
                  attempts: [],
                  lastAttemptDate: attempt.attempted_at
                });
              }
              
              const quizData = quizMap.get(quizId);
              quizData.attempts.push(attempt);
              
              // Update last attempt date if this attempt is more recent
              if (new Date(attempt.attempted_at) > new Date(quizData.lastAttemptDate)) {
                quizData.lastAttemptDate = attempt.attempted_at;
              }
            });

            // Convert map to array and calculate statistics for each quiz
            const quizResultsArray = Array.from(quizMap.values()).map(quiz => {
              const totalAttempts = quiz.attempts.length;
              const totalScore = quiz.attempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0);
              const averageScore = Math.round(totalScore / totalAttempts);
              const passedAttempts = quiz.attempts.filter(attempt => attempt.result === 'pass').length;
              const passRate = Math.round((passedAttempts / totalAttempts) * 100);
              
              return {
                id: quiz.id,
                quizTitle: quiz.quizTitle,
                attempts: totalAttempts,
                averageScore: averageScore,
                passRate: passRate,
                lastAttemptDate: quiz.lastAttemptDate.split('T')[0] // Format date
              };
            });

            setQuizResults(quizResultsArray);
          } else {
            // No attempts data available, try dashboard fallback
            throw new Error('No quiz attempts data available');
          }
        } catch (attemptsError) {
          // If quiz attempts endpoint fails, try to fallback to dashboard data
          console.warn('Students quiz_attempts endpoint failed, trying dashboard data...', attemptsError);
          
          try {
            const dashboardResponse = await apiService.get('/api/dashboard/');
            const dashboardData = dashboardResponse.data;
            
            console.log('Dashboard data received:', dashboardData);
            
            // Use dashboard data to create summary stats
      setSummaryStats([
        {
          title: 'Average Score',
                value: `${Math.round(dashboardData.overall_quiz_average_percentage || 0)}%`,
          icon: <EmojiEventsIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.success.main,
                trend: dashboardData.overall_quiz_average_percentage > 75 ? 'up' : 'stable',
                trendValue: '0',
        },
        {
                title: 'Pass Rate',
                value: 'N/A',
          icon: <RateReviewIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.info.main,
                trend: 'stable',
                trendValue: '0',
        },
        {
          title: 'Total Participants',
                value: dashboardData.total_students_attempted || 0,
          icon: <PeopleIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.secondary.main,
          trend: 'stable',
          trendValue: '0',
        },
        {
                title: 'Quizzes Taken',
                value: dashboardData.quizzes || 0,
          icon: <QuizIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.warning.main,
                trend: 'stable',
                trendValue: '0',
        },
      ]);

            // Set empty quiz results since we don't have detailed data
            setQuizResults([]);
          } catch (dashboardError) {
            console.error('Dashboard fallback also failed:', dashboardError);
            
            // Both endpoints failed - show N/A stats
            setSummaryStats([
              {
                title: 'Average Score',
                value: 'N/A',
                icon: <EmojiEventsIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.warning.main,
                trend: 'stable',
                trendValue: '0',
              },
              {
                title: 'Pass Rate',
                value: 'N/A',
                icon: <RateReviewIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.warning.main,
                trend: 'stable',
                trendValue: '0',
              },
              {
                title: 'Total Participants',
                value: 'N/A',
                icon: <PeopleIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.warning.main,
                trend: 'stable',
                trendValue: '0',
              },
              {
                title: 'Quizzes Taken',
                value: 'N/A',
                icon: <QuizIcon sx={{ fontSize: '2rem' }} />,
                color: theme.palette.warning.main,
                trend: 'stable',
                trendValue: '0',
              },
            ]);
            setQuizResults([]);
          }
        }

      } catch (error) {
        console.error('Error fetching results data:', error);
        // Set error stats to show there's an issue but not break the UI
        setSummaryStats([
          {
            title: 'Average Score',
            value: 'N/A',
            icon: <EmojiEventsIcon sx={{ fontSize: '2rem' }} />,
            color: theme.palette.warning.main,
            trend: 'stable',
            trendValue: '0',
          },
          {
            title: 'Pass Rate',
            value: 'N/A',
            icon: <RateReviewIcon sx={{ fontSize: '2rem' }} />,
            color: theme.palette.warning.main,
            trend: 'stable',
            trendValue: '0',
          },
          {
            title: 'Total Participants',
            value: 'N/A',
            icon: <PeopleIcon sx={{ fontSize: '2rem' }} />,
            color: theme.palette.warning.main,
            trend: 'stable',
            trendValue: '0',
          },
          {
            title: 'Quizzes Taken',
            value: 'N/A',
            icon: <QuizIcon sx={{ fontSize: '2rem' }} />,
            color: theme.palette.warning.main,
            trend: 'stable',
            trendValue: '0',
          },
      ]);
        setQuizResults([]);
      } finally {
        setIsLoading(false);
      setIsLoadingTable(false);
      }
    };

    fetchResultsData();
  }, [theme]);

  // Table sorting and pagination functions
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function descendingComparator(a, b, orderByProperty) {
    if (b[orderByProperty] < a[orderByProperty]) return -1;
    if (b[orderByProperty] > a[orderByProperty]) return 1;
    return 0;
  }

  function getComparator(currentOrder, orderByProperty) {
    return currentOrder === 'desc'
      ? (a, b) => descendingComparator(a, b, orderByProperty)
      : (a, b) => -descendingComparator(a, b, orderByProperty);
  }

  const sortedRows = React.useMemo(() => {
    return [...quizResults].sort(getComparator(order, orderBy));
  }, [quizResults, order, orderBy]);

  const visibleRows = React.useMemo(() => {
    return sortedRows.slice(
      page * rowsPerPage, 
      page * rowsPerPage + rowsPerPage > 0 ? page * rowsPerPage + rowsPerPage : sortedRows.length
    );
  }, [sortedRows, page, rowsPerPage]);

  const tableHeadCells = [
    { id: 'quizTitle', numeric: false, disablePadding: false, label: 'Quiz Title' },
    { id: 'attempts', numeric: true, disablePadding: false, label: 'Attempts' },
    { id: 'averageScore', numeric: true, disablePadding: false, label: 'Avg. Score (%)' },
    { id: 'passRate', numeric: true, disablePadding: false, label: 'Pass Rate (%)' },
    { id: 'lastAttemptDate', numeric: false, disablePadding: false, label: 'Last Attempt' },
    { id: 'actions', numeric: true, disablePadding: false, label: 'Actions', sortDisabled: true },
  ];

  const handleViewQuizDetails = async (quizId) => {
    setSelectedQuizId(quizId);
    setOpenQuizDialog(true);
    
    // Find the quiz data from our results
    const quizData = quizResults.find(quiz => quiz.id === quizId);
    setSelectedQuizData(quizData);
  };

  const handleCloseQuizDialog = () => {
    setOpenQuizDialog(false);
    setSelectedQuizId(null);
    setSelectedQuizData(null);
  };

  return (
    <FullLayout>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Quiz Results & Analytics"
          subtitle="Review performance metrics and detailed results for all quiz."
          // Actions like filter buttons can be added here later
          // actions={[
          //   <Button key="filter-results" variant="outlined" startIcon={<FilterListIcon />}>
          //     Filter
          //   </Button>,
          // ]}
        />

        {isLoading && !summaryStats ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading stats...</Typography>
          </Box>
        ) : summaryStats && (
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
            {summaryStats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={stat.title}>
                <Paper
                  component={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    background: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: 'blur(6px)',
                    boxShadow: theme.shadows[2],
                    '&:hover': {
                      boxShadow: theme.shadows[8],
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.title}
                    </Typography>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '50%',
                        bgcolor: alpha(stat.color, 0.1),
                        color: stat.color
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={stat.trend === 'up' ? 'success.main' : stat.trend === 'down' ? 'error.main' : 'text.secondary'}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    {stat.trend === 'up' ? '+' : stat.trend === 'down' ? '-' : ''}{stat.trendValue}%
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {isLoadingTable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading detailed results...</Typography>
          </Box>
        ) : quizResults.length === 0 ? (
          <EmptyState
            icon={<AssessmentIcon sx={{ fontSize: 60 }} />}
            title="No quiz results yet"
            message="Start creating and PUBLISHing quiz to see results here."
            action={
              <Button variant="contained" color="primary">
                Create a Quiz
              </Button>
            }
          />
        ) : (
          <Paper
            sx={{
              width: '100%',
              overflow: 'hidden',
              borderRadius: 2,
              background: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(6px)'
            }}
          >
            <TableContainer sx={{ maxHeight: 440, overflowX: 'auto' }}>
              <Table stickyHeader aria-label="quiz results table">
                <TableHead>
                  <TableRow>
                    <TableCell>
                          <TableSortLabel
                        active={orderBy === 'quizTitle'}
                        direction={orderBy === 'quizTitle' ? order : 'asc'}
                        onClick={() => handleRequestSort('quizTitle')}
                          >
                        Quiz Title
                        {orderBy === 'quizTitle' ? (
                              <Box component="span" sx={visuallyHidden}>
                                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                              </Box>
                            ) : null}
                          </TableSortLabel>
                      </TableCell>
                    <TableCell align="center">Attempts</TableCell>
                    <TableCell align="center">Avg. Score (%)</TableCell>
                    <TableCell align="center">Pass Rate (%)</TableCell>
                    <TableCell align="center">Last Attempt</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1)
                        }
                      }}
                    >
                      <TableCell component="th" scope="row">
                        {row.quizTitle}
                      </TableCell>
                      <TableCell align="center">{row.attempts}</TableCell>
                      <TableCell align="center">{row.averageScore}%</TableCell>
                      <TableCell align="center">{row.passRate}%</TableCell>
                      <TableCell align="center">{row.lastAttemptDate}</TableCell>
                      <TableCell align="center">
                          <IconButton
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQuizDetails(row.id);
                          }}
                          sx={{
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.1)
                            }
                          }}
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
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              component="div"
              count={quizResults.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}
      </Container>
      
      {/* Comprehensive Quiz Details Dialog */}
      <Dialog
        open={openQuizDialog}
        onClose={handleCloseQuizDialog}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            minHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          m: 0, 
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main
              }}
            >
              <AssessmentIcon sx={{ fontSize: '1.5rem' }} />
            </Box>
            <Box>
              <Typography variant="h5" component="div">
                Quiz Analytics & Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedQuizData?.quizTitle || 'Quiz Details'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleCloseQuizDialog}
            sx={{
              color: theme.palette.grey[500],
              '&:hover': {
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                transform: 'scale(1.1)'
              },
              transition: 'all 0.2s'
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedQuizData && selectedQuizId && (
            <QuizDetailsContent 
              quizData={selectedQuizData} 
              quizId={selectedQuizId}
              onNavigateToQuiz={() => {
                handleCloseQuizDialog();
                navigate('/admin/quiz');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </FullLayout>
  );
};

export default ResultsSection;
