import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Paper,
  LinearProgress,
  useTheme,
  alpha,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
  Quiz as QuizIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../api';

const StudentQuizView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmitQuiz(true); // Auto-submit when time expires
    }
  }, [timeLeft]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      
      // Use the correct endpoint to get quiz questions for taking
      const response = await apiService.get(`/api/quiz/${quizId}/`);
      const quizData = response.data;
      
      setQuiz(quizData);
      
      // Backend returns questions in current_questions field, not questions
      const questionsData = quizData.current_questions || quizData.questions || [];
      setQuestions(questionsData);
      
      // Debug: Log the structure of questions to understand the format
      console.log('Quiz data:', quizData);
      console.log('Questions data:', questionsData);
      if (questionsData && questionsData.length > 0) {
        console.log('First question structure:', questionsData[0]);
      }
      
      // Set timer if quiz has time limit
      if (quizData.time_limit) {
        setTimeLeft(quizData.time_limit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      
      // Show more specific error messages
      if (error.response?.status === 404) {
        alert('Quiz not found or not available for students.');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to access this quiz.');
      } else {
        alert('Failed to load quiz. Please try again.');
      }
      
      navigate('/student-dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async (autoSubmit = false) => {
    try {
      // Convert answers to the format expected by backend
      const questionEntries = [];
      questions.forEach((question, index) => {
        const questionIdentifier = question.question_number || question.question_id || (index + 1);
        const questionNumber = question.question_number || (index + 1);
        const answer = answers[questionIdentifier] || answers[index];
        
        if (answer !== undefined && answer !== null) {
          questionEntries.push({
            question_id: question.question_id || questionIdentifier,
            question_number: questionNumber,
            answer: answer
          });
        }
      });

      const submissionData = {
        quiz_id: parseInt(quizId),
        questions: questionEntries
      };

      console.log('Submitting quiz with data:', submissionData);

      // Use the correct student quiz submission endpoint
      const response = await apiService.post('/api/students/quiz_submit/', submissionData);
      
      setIsSubmitted(true);
      
      // Show results or redirect
      alert(autoSubmit ? 'Quiz auto-submitted due to time limit!' : 'Quiz submitted successfully!');
      navigate('/student-dashboard');
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      
      // Show more specific error messages
      if (error.response?.status === 400) {
        alert('Invalid submission data. Please check your answers and try again.');
      } else if (error.response?.status === 403) {
        alert('You do not have permission to submit this quiz.');
      } else {
        alert('Failed to submit quiz. Please try again.');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  const getQuestionOptions = (question) => {
    // Handle different formats of question options
    if (!question) return [];
    
    // If options is an object (like {A: "option1", B: "option2", ...})
    if (question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
      return Object.values(question.options).filter(opt => opt && opt.trim && opt.trim().length > 0);
    }
    
    // If options is already an array, return it
    if (Array.isArray(question.options)) {
      return question.options;
    }
    
    // If options is a string (might be JSON or comma-separated)
    if (typeof question.options === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(question.options);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If it's an object, extract values
        if (typeof parsed === 'object') {
          return Object.values(parsed).filter(opt => opt && opt.trim && opt.trim().length > 0);
        }
      } catch (e) {
        // If JSON parsing fails, try comma-separated
        return question.options.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
      }
    }
    
    // Check for individual option fields (option_a, option_b, etc.)
    const options = [];
    ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'].forEach(key => {
      if (question[key] && question[key].trim()) {
        options.push(question[key].trim());
      }
    });
    
    if (options.length > 0) {
      return options;
    }
    
    // Fallback: check for alternatives or choices field
    if (question.alternatives && Array.isArray(question.alternatives)) {
      return question.alternatives;
    }
    
    if (question.choices && Array.isArray(question.choices)) {
      return question.choices;
    }
    
    // If all else fails, return empty array
    console.warn('No valid options found for question:', question);
    return [];
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <Typography variant="h6" color="white">
          Loading Quiz...
        </Typography>
      </Box>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          gap: 2
        }}
      >
        <Typography variant="h6" color="white">
          Quiz not found or no questions available
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/student-dashboard')}
          sx={{
            background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
          }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        p: 2,
      }}
    >
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#45b7d1', 0.2)}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {quiz.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {timeLeft !== null && (
              <Chip
                icon={<TimerIcon />}
                label={formatTime(timeLeft)}
                color={timeLeft < 300 ? 'error' : 'primary'}
                sx={{ fontWeight: 600 }}
              />
            )}
            <IconButton onClick={() => navigate('/student-dashboard')}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Question {currentQuestion + 1} of {questions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(getProgressPercentage())}% Complete
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={getProgressPercentage()}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
              }
            }}
          />
        </Box>
      </Paper>

      {/* Question Card */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          sx={{
            mb: 3,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#45b7d1', 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              {question.question || question.question_text}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              {/* Handle different question types */}
              {(question.type === 'mcq' || question.question_type === 'mcq') && getQuestionOptions(question).length > 0 ? (
                <RadioGroup
                  value={answers[question.question_number || question.question_id] || ''}
                  onChange={(e) => handleAnswerChange(question.question_number || question.question_id, e.target.value)}
                >
                  <Stack spacing={2}>
                    {getQuestionOptions(question).map((option, index) => (
                      <FormControlLabel
                        key={index}
                        value={option}
                        control={<Radio />}
                        label={option}
                        sx={{
                          border: `1px solid ${alpha('#45b7d1', 0.2)}`,
                          borderRadius: 2,
                          p: 2,
                          m: 0,
                          '&:hover': {
                            backgroundColor: alpha('#45b7d1', 0.05),
                          },
                          '& .Mui-checked': {
                            color: '#45b7d1',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              ) : (question.type === 'truefalse' || question.question_type === 'truefalse') ? (
                <RadioGroup
                  value={answers[question.question_number || question.question_id] || ''}
                  onChange={(e) => handleAnswerChange(question.question_number || question.question_id, e.target.value)}
                >
                  <Stack spacing={2}>
                    {['True', 'False'].map((option) => (
                      <FormControlLabel
                        key={option}
                        value={option}
                        control={<Radio />}
                        label={option}
                        sx={{
                          border: `1px solid ${alpha('#45b7d1', 0.2)}`,
                          borderRadius: 2,
                          p: 2,
                          m: 0,
                          '&:hover': {
                            backgroundColor: alpha('#45b7d1', 0.05),
                          },
                          '& .Mui-checked': {
                            color: '#45b7d1',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </RadioGroup>
              ) : (question.type === 'fill' || question.question_type === 'fill' || question.type === 'oneline' || question.question_type === 'oneline') ? (
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your answer here..."
                  value={answers[question.question_number || question.question_id] || ''}
                  onChange={(e) => handleAnswerChange(question.question_number || question.question_id, e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderColor: alpha('#45b7d1', 0.2),
                      '&:hover': {
                        borderColor: '#45b7d1',
                      },
                      '&.Mui-focused': {
                        borderColor: '#45b7d1',
                      },
                    },
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Unsupported question type: {question.type || question.question_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Please contact your instructor about this issue.
                  </Typography>
                </Box>
              )}
            </FormControl>
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <Paper
        sx={{
          p: 3,
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#45b7d1', 0.2)}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<PrevIcon />}
            onClick={handlePrevQuestion}
            disabled={currentQuestion === 0}
            sx={{
              borderColor: '#45b7d1',
              color: '#45b7d1',
            }}
          >
            Previous
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {questions.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 
                    answers[questions[index].question_number || questions[index].question_id] ? '#45b7d1' :
                    index === currentQuestion ? '#96c93d' : 
                    alpha('#45b7d1', 0.3),
                  cursor: 'pointer',
                }}
                onClick={() => setCurrentQuestion(index)}
              />
            ))}
          </Box>

          {currentQuestion === questions.length - 1 ? (
            <Button
              variant="contained"
              startIcon={<CheckIcon />}
              onClick={() => setShowConfirmDialog(true)}
              sx={{
                background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
              }}
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<NextIcon />}
              onClick={handleNextQuestion}
              sx={{
                background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
              }}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Submit Quiz</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your quiz? You won't be able to change your answers after submission.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Answered: {Object.keys(answers).length} / {questions.length} questions
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleSubmitQuiz(false)} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentQuizView; 