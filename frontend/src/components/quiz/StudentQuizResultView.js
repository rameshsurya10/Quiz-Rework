import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
  Stack,
  Paper,
  Divider,
  Alert,
  AlertTitle,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  EmojiEvents as TrophyIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { quizApi } from '../../services/api';

const StudentQuizResultView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const hasFetched = useRef(false);
  
  const [resultData, setResultData] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetailedAnswers, setShowDetailedAnswers] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchQuizResult();
      fetchAllResults();
      hasFetched.current = true;
    }
  }, [quizId]);

  const fetchQuizResult = async () => {
    try {
      setIsLoading(true);
      const response = await quizApi.getQuizAttempt(quizId);
      setResultData(response.data);
    } catch (error) {
      console.error('Error fetching quiz result:', error);
      setError('Failed to load quiz results. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllResults = async () => {
    try {
      const response = await quizApi.getAllQuizAttempts();
      setAllResults(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching all results:', error);
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 80) return '#8BC34A';
    if (percentage >= 70) return '#FFC107';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  const getPerformanceGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getPerformanceLabel = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Very Good';
    if (percentage >= 70) return 'Good';
    if (percentage >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const pieChartData = resultData ? [
    { name: 'Correct', value: resultData.correct_answer_count, color: '#4CAF50' },
    { name: 'Wrong', value: resultData.wrong_answer_count, color: '#F44336' },
    { name: 'Not Answered', value: resultData.not_answered_questions, color: '#9E9E9E' }
  ] : [];

  const performanceData = allResults
    .filter(result => result.quiz_id === parseInt(quizId))
    .map((result, index) => ({
      attempt: `Attempt ${index + 1}`,
      score: result.percentage || 0,
      date: new Date(result.attempted_at).toLocaleDateString()
    }));

  if (isLoading) {
    return (
      <Box className="min-h-screen flex items-center justify-center" sx={{ p: 3 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              Loading Quiz Results...
            </Typography>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  if (error || !resultData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          <AlertTitle>Error Loading Results</AlertTitle>
          {error || 'No quiz results found for this quiz.'}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/student-dashboard')}
          sx={{ mt: 3 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box
      className="min-h-screen"
      sx={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              mb: 4,
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: `1px solid ${alpha('#4CAF50', 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <AssessmentIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Quiz Results
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {resultData.quiz_name}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                startIcon={<BackIcon />}
                onClick={() => navigate('/student-dashboard')}
                sx={{
                  borderRadius: 3,
                  borderWidth: 2,
                  px: 3,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                Back to Dashboard
              </Button>
            </Box>

            {/* Student Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
              <PersonIcon color="primary" />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Student: {resultData.student_attend_name}
              </Typography>
              <Chip
                label={`Submitted on ${resultData.attempt_date} at ${resultData.attempt_time}`}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Box>
          </Paper>
        </motion.div>

        {/* Performance Overview */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* Score Card */}
          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card
                elevation={12}
                sx={{
                  background: `linear-gradient(135deg, ${getPerformanceColor(resultData.percentage)} 0%, ${alpha(getPerformanceColor(resultData.percentage), 0.8)} 100%)`,
                  color: 'white',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                  }
                }}
              >
                <CardContent sx={{ position: 'relative', zIndex: 1, textAlign: 'center', p: 4 }}>
                  <TrophyIcon sx={{ fontSize: 60, mb: 2, opacity: 0.9 }} />
                  <Typography variant="h2" sx={{ fontWeight: 900, mb: 1 }}>
                    {resultData.percentage}%
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    {getPerformanceLabel(resultData.percentage)}
                  </Typography>
                  <Chip
                    label={`Grade: ${getPerformanceGrade(resultData.percentage)}`}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1rem',
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Statistics Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {[
                { 
                  label: 'Score', 
                  value: `${resultData.score}/${resultData.total_questions}`, 
                  icon: <CheckIcon />, 
                  color: 'success' 
                },
                { 
                  label: 'Correct Answers', 
                  value: resultData.correct_answer_count, 
                  icon: <CheckIcon />, 
                  color: 'success' 
                },
                { 
                  label: 'Wrong Answers', 
                  value: resultData.wrong_answer_count, 
                  icon: <CancelIcon />, 
                  color: 'error' 
                },
                { 
                  label: 'Not Answered', 
                  value: resultData.not_answered_questions, 
                  icon: <TimerIcon />, 
                  color: 'warning' 
                },
                { 
                  label: 'Time Taken', 
                  value: resultData.attempt_duration, 
                  icon: <TimerIcon />, 
                  color: 'info' 
                },
                { 
                  label: 'Rank', 
                  value: resultData.rank ? `#${resultData.rank}` : 'N/A', 
                  icon: <TrophyIcon />, 
                  color: 'primary' 
                }
              ].map((stat, index) => (
                <Grid item xs={6} sm={4} key={stat.label}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 + index * 0.1 }}
                  >
                    <Card
                      elevation={6}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        borderRadius: 3,
                        background: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${alpha(theme.palette[stat.color].main, 0.2)}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 25px ${alpha(theme.palette[stat.color].main, 0.25)}`,
                        }
                      }}
                    >
                      <Box sx={{ color: `${stat.color}.main`, mb: 1 }}>
                        {stat.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {stat.label}
                      </Typography>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Performance Charts */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* Pie Chart */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card
                elevation={8}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                  Answer Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Grid>

          {/* Performance Trend */}
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card
                elevation={8}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  background: alpha(theme.palette.background.paper, 0.95),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                  Performance Trend
                </Typography>
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attempt" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" fill="#667eea" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <SchoolIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      This is your first attempt for this quiz.
                    </Typography>
                  </Box>
                )}
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Detailed Answers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card
            elevation={8}
            sx={{
              borderRadius: 4,
              background: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Detailed Answer Review
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ViewIcon />}
                  onClick={() => setShowDetailedAnswers(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 3,
                    px: 3,
                    fontWeight: 600,
                  }}
                >
                  View All Answers
                </Button>
              </Box>

              {/* Summary Table */}
              <TableContainer component={Paper} sx={{ borderRadius: 3, mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#667eea', 0.1) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Question</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Your Answer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Correct Answer</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultData.detailed_answers?.slice(0, 5).map((answer, index) => (
                      <TableRow key={index} sx={{ '&:hover': { bgcolor: alpha('#667eea', 0.05) } }}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          Question {answer.question_number}
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={answer.is_correct ? <CheckIcon /> : <CancelIcon />}
                            label={answer.is_correct ? 'Correct' : 'Incorrect'}
                            color={answer.is_correct ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          {answer.student_answer || 'Not Answered'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>
                          {answer.correct_answer}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {resultData.detailed_answers && resultData.detailed_answers.length > 5 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Showing first 5 questions. Click "View All Answers" to see complete results.
                </Typography>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Answers Dialog */}
        <Dialog
          open={showDetailedAnswers}
          onClose={() => setShowDetailedAnswers(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 4, maxHeight: '90vh' }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Complete Answer Review
            </Typography>
            <Button
              onClick={() => setShowDetailedAnswers(false)}
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <CloseIcon />
            </Button>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {resultData.detailed_answers?.map((answer, index) => (
              <Accordion
                key={index}
                expanded={expandedQuestion === index}
                onChange={(event, isExpanded) => setExpandedQuestion(isExpanded ? index : null)}
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: answer.is_correct ? alpha('#4CAF50', 0.1) : alpha('#F44336', 0.1),
                    '&:hover': {
                      bgcolor: answer.is_correct ? alpha('#4CAF50', 0.15) : alpha('#F44336', 0.15),
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip
                      icon={answer.is_correct ? <CheckIcon /> : <CancelIcon />}
                      label={`Q${answer.question_number}`}
                      color={answer.is_correct ? 'success' : 'error'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                    <Typography sx={{ fontWeight: 600, flex: 1 }}>
                      {answer.question?.substring(0, 100)}...
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Question:
                      </Typography>
                      <Typography variant="body1">
                        {answer.question}
                      </Typography>
                    </Box>

                    {answer.options && typeof answer.options === 'object' && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Options:
                        </Typography>
                        <Stack spacing={1}>
                          {Object.values(answer.options).map((option, idx) => {
                            const optionText = String(option);
                            return (
                              <Box
                                key={idx}
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  border: `2px solid ${
                                    optionText === answer.correct_answer ? '#4CAF50' :
                                    optionText === answer.student_answer ? '#F44336' : 
                                    alpha('#667eea', 0.2)
                                  }`,
                                  bgcolor: optionText === answer.correct_answer ? alpha('#4CAF50', 0.1) :
                                          optionText === answer.student_answer ? alpha('#F44336', 0.1) : 
                                          'transparent'
                                }}
                              >
                                <Typography variant="body2">
                                  {optionText}
                                  {optionText === answer.correct_answer && ' ✓ (Correct)'}
                                  {optionText === answer.student_answer && optionText !== answer.correct_answer && ' ✗ (Your Answer)'}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Your Answer:
                        </Typography>
                        <Chip
                          label={answer.student_answer || 'Not Answered'}
                          color={answer.is_correct ? 'success' : 'error'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Correct Answer:
                        </Typography>
                        <Chip
                          label={answer.correct_answer}
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </Grid>
                    </Grid>

                    {answer.explanation && (
                      <Alert severity="info" sx={{ borderRadius: 3 }}>
                        <AlertTitle>Explanation</AlertTitle>
                        {answer.explanation}
                      </Alert>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              variant="contained"
              onClick={() => setShowDetailedAnswers(false)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3,
                px: 4,
                fontWeight: 600,
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default StudentQuizResultView; 