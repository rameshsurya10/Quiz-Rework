import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Quiz as QuizIcon,
  ArrowBack as BackIcon,
  Assessment as AssessmentIcon,
  Timer as TimerIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { quizApi } from '../../services/api';

const QuizResultView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuizResult();
  }, [quizId]);

  const loadQuizResult = async () => {
    try {
      setLoading(true);
      const response = await quizApi.getResultById(quizId);
      setResult(response.data);
    } catch (error) {
      console.error('Error loading quiz result:', error);
      setError('Failed to load quiz result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = () => {
    if (!result) return { score: 0, total: 0, percentage: 0 };
    
    // Handle different response structures from the API
    if (result.questions && Array.isArray(result.questions)) {
      // If questions array is available
      const correctAnswers = result.questions.filter(q => q.is_correct).length;
      const totalQuestions = result.questions.length;
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      return {
        score: correctAnswers,
        total: totalQuestions,
        percentage
      };
    } else if (result.score !== undefined && result.total_questions !== undefined) {
      // If direct score and total are available
      const percentage = result.total_questions > 0 ? Math.round((result.score / result.total_questions) * 100) : 0;
      
      return {
        score: result.score || 0,
        total: result.total_questions || 0,
        percentage
      };
    } else if (result.detailed_answers && Array.isArray(result.detailed_answers)) {
      // If detailed_answers array is available
      const correctAnswers = result.detailed_answers.filter(q => q.is_correct).length;
      const totalQuestions = result.detailed_answers.length;
      const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      
      return {
        score: correctAnswers,
        total: totalQuestions,
        percentage
      };
    }
    
    return { score: 0, total: 0, percentage: 0 };
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'error';
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
            Loading Quiz Results...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 3, mb: 3 }}>
          {error}
        </Alert>
        <Button 
          startIcon={<BackIcon />}
          onClick={() => navigate('/student-dashboard')}
          variant="contained"
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 3, mb: 3 }}>
          No quiz result found.
        </Alert>
        <Button 
          startIcon={<BackIcon />}
          onClick={() => navigate('/student-dashboard')}
          variant="contained"
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const { score, total, percentage } = calculateScore();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 3,
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
            elevation={6}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 }, mb: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 } }}>
                <AssessmentIcon fontSize={window.innerWidth < 600 ? "medium" : "large"} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  Quiz Results
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                  {result.quiz_title || result.quiz?.title || 'Quiz Result'}
                </Typography>
              </Box>
            </Box>
            
            <Button
              startIcon={<BackIcon />}
              onClick={() => navigate('/student-dashboard')}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                fontSize: { xs: '0.8rem', md: '0.9rem' },
                px: { xs: 2, md: 3 },
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
              variant="outlined"
              size={window.innerWidth < 600 ? "small" : "medium"}
            >
              Back to Dashboard
            </Button>
          </Paper>
        </motion.div>

        {/* Score Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, mb: 3, borderRadius: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: { xs: 60, md: 80 },
                      height: { xs: 60, md: 80 },
                      mx: 'auto',
                      mb: 2,
                      bgcolor: `${getScoreColor(percentage)}.main`,
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 'bold'
                    }}
                  >
                    {percentage}%
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    Final Score
                  </Typography>
                  <Chip
                    label={`${score} / ${total} Correct`}
                    color={getScoreColor(percentage)}
                    size="large"
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Box sx={{ pl: { xs: 0, md: 2 } }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    Quiz Summary
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <QuizIcon color="primary" sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">Total</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{total}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <CheckIcon color="success" sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">Correct</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{score}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1 }}>
                        <GradeIcon color={getScoreColor(percentage)} sx={{ mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">Score</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{percentage}%</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>

        {/* Detailed Results */}
        {(() => {
          // Determine which questions array to use
          const questionsArray = result.questions || result.detailed_answers || [];
          
          if (questionsArray.length > 0) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    Question by Question Review
                  </Typography>
                  
                  {questionsArray.map((question, index) => (
                    <Card 
                      key={index} 
                      sx={{ 
                        mb: 2, 
                        border: question.is_correct ? '2px solid #4caf50' : '2px solid #f44336',
                        borderRadius: 2
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, md: 2 } }}>
                          <Avatar
                            sx={{
                              bgcolor: question.is_correct ? 'success.main' : 'error.main',
                              width: { xs: 24, md: 32 },
                              height: { xs: 24, md: 32 }
                            }}
                          >
                            {question.is_correct ? <CheckIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
                          </Avatar>
                          
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                              Question {question.question_number || index + 1}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                              {question.question}
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Your Answer:
                              </Typography>
                              <Chip
                                label={question.answer || question.student_answer || 'No answer provided'}
                                color={question.is_correct ? 'success' : 'error'}
                                variant="outlined"
                                size="small"
                              />
                            </Box>
                            
                            {!question.is_correct && question.correct_answer && (
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  Correct Answer:
                                </Typography>
                                <Chip
                                  label={question.correct_answer}
                                  color="success"
                                  variant="filled"
                                  size="small"
                                />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Paper>
              </motion.div>
            );
          } else {
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Paper elevation={6} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Quiz Completed Successfully!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your score: {score} out of {total} questions ({percentage}%)
                  </Typography>
                </Paper>
              </motion.div>
            );
          }
        })()}
      </Container>
    </Box>
  );
};

export default QuizResultView; 