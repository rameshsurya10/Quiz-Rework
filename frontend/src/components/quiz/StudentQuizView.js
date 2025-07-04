import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TextField,
  Alert,
  AlertTitle,
  Snackbar,
  Container,
  Fade,
  Slide,
  Zoom,
  Grow,
  InputAdornment,
  Divider,
  Avatar,
  CircularProgress,
  Backdrop
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
  Quiz as QuizIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  Send as SendIcon,
  Flag as FlagIcon,
  Psychology as BrainIcon,
  Security as SecurityIcon,
  Lightbulb as LightbulbIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { quizApi } from '../../services/api';

// Persistent Quiz Session Manager
class QuizSessionManager {
  constructor(quizId) {
    this.quizId = quizId;
    this.sessionKey = `quiz_session_${quizId}`;
    this.answersKey = `quiz_answers_${quizId}`;
    this.startTimeKey = `quiz_start_time_${quizId}`;
  }

  // Initialize or restore quiz session
  initializeSession(quizData) {
    const existingSession = this.getSession();
    const now = Date.now();
    
    if (existingSession && existingSession.quizId === this.quizId) {
      // Restore existing session
      console.log('Restoring existing quiz session');
      return existingSession;
    } else {
      // Create new session
      const newSession = {
        quizId: this.quizId,
        startTime: now,
        duration: (quizData.time_limit_minutes || quizData.duration || 20) * 60 * 1000, // in milliseconds
        totalQuestions: quizData.no_of_questions || quizData.total_questions,
        isActive: true,
        attempts: 0,
        lastActivity: now
      };
      
      this.saveSession(newSession);
      this.saveAnswers({});
      console.log('Created new quiz session');
      return newSession;
    }
  }

  // Save session data
  saveSession(sessionData) {
    localStorage.setItem(this.sessionKey, JSON.stringify({
      ...sessionData,
      lastActivity: Date.now()
    }));
  }

  // Get session data
  getSession() {
    try {
      const data = localStorage.getItem(this.sessionKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error parsing session data:', error);
      return null;
    }
  }

  // Save answers
  saveAnswers(answers) {
    localStorage.setItem(this.answersKey, JSON.stringify(answers));
  }

  // Get answers
  getAnswers() {
    try {
      const data = localStorage.getItem(this.answersKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error parsing answers data:', error);
      return {};
    }
  }

  // Calculate remaining time based on start time
  getRemainingTime() {
    const session = this.getSession();
    if (!session || !session.isActive) return 0;
    
    const now = Date.now();
    const elapsed = now - session.startTime;
    const remaining = Math.max(0, session.duration - elapsed);
    
    return Math.floor(remaining / 1000); // return in seconds
  }

  // Check if session is expired
  isExpired() {
    return this.getRemainingTime() <= 0;
  }

  // End session
  endSession() {
    const session = this.getSession();
    if (session) {
      session.isActive = false;
      session.endTime = Date.now();
      this.saveSession(session);
    }
  }

  // Clear session data
  clearSession() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.answersKey);
    localStorage.removeItem(this.startTimeKey);
  }

  // Check for refresh/reload
  wasRefreshed() {
    const session = this.getSession();
    if (!session) return false;
    
    // If there's a gap of more than 5 seconds in activity, consider it a refresh
    const now = Date.now();
    const timeSinceLastActivity = now - (session.lastActivity || session.startTime);
    return timeSinceLastActivity > 5000; // 5 seconds gap indicates refresh
  }

  // Check if quiz is being accessed from multiple tabs
  checkMultipleTabAccess() {
    const tabId = Date.now() + Math.random();
    const activeTabKey = `quiz_active_tab_${this.quizId}`;
    
    // Set current tab as active
    sessionStorage.setItem(activeTabKey, tabId);
    
    // Check after a small delay if our tab is still the active one
    setTimeout(() => {
      const currentActiveTab = sessionStorage.getItem(activeTabKey);
      if (currentActiveTab !== tabId.toString()) {
        return false; // Another tab is active
      }
    }, 100);
    
    return true;
  }

  // Update activity timestamp
  updateActivity() {
    const session = this.getSession();
    if (session && session.isActive) {
      session.lastActivity = Date.now();
      this.saveSession(session);
    }
  }
}

const StudentQuizView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const submissionStarted = useRef(false);
  const securityViolationTimeout = useRef(null);
  
  // Initialize session manager
  const [sessionManager] = useState(() => new QuizSessionManager(quizId));
  
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timePerQuestion, setTimePerQuestion] = useState(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isFocusLost, setIsFocusLost] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [alertSeverity, setAlertSeverity] = useState('warning');
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [quizSession, setQuizSession] = useState(null);
  const [wasRefreshed, setWasRefreshed] = useState(false);

  const getUnansweredQuestions = useCallback(() => {
    return questions.filter(q => !answers[q.uniqueId] || answers[q.uniqueId].trim() === '');
  }, [questions, answers]);

  const showAlert = useCallback((message, severity = 'warning', duration = 4000) => {
    setWarningMessage(message);
    setAlertSeverity(severity);
    setShowSnackbar(true);
    
    if (severity === 'error') {
      setShowSecurityAlert(true);
      setTimeout(() => setShowSecurityAlert(false), duration);
    }
  }, []);

  const generateSubmissionPayload = useCallback((currentAnswers) => {
    return {
      quiz_id: parseInt(quizId),
      questions: questions.map((question, index) => {
        const userAnswer = currentAnswers[question.uniqueId] || '';
        
        let options = {};
        if (question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
          options = question.options;
        } else if (question.question_options && typeof question.question_options === 'object') {
          options = question.question_options;
        } else if (Array.isArray(question.options)) {
          options = question.options.reduce((acc, opt, idx) => {
            acc[String.fromCharCode(65 + idx)] = opt;
            return acc;
          }, {});
        }

        return {
          question_id: question.id || question.question_id || question.uniqueId,
          question_number: index + 1,
          question: question.question || question.text || question.content,
          question_type: question.question_type || 'text',
          options: options,
          answer: userAnswer,
          is_correct: false
        };
      })
    };
  }, [quizId, questions]);

  const handleSubmitQuiz = useCallback(async (autoSubmit = false) => {
    if (submissionStarted.current) {
      return;
    }
    const unansweredQuestions = getUnansweredQuestions();
    
    if (!autoSubmit && unansweredQuestions.length > 0) {
      showAlert(`Please answer all questions before submitting. ${unansweredQuestions.length} questions remaining.`, 'warning');
      return;
    }

    submissionStarted.current = true;

    try {
      setIsLoading(true);
      
      const submissionData = generateSubmissionPayload(answers);

      console.log('Submitting quiz with payload:', submissionData);

      // Use the correct submission endpoint
      const response = await quizApi.submitQuizAttempt(submissionData);
      
      if (response.status === 201 || response.status === 200) {
        setIsSubmitted(true);
        
        // End the session and clear data
        sessionManager.endSession();
        setTimeout(() => {
          sessionManager.clearSession();
        }, 1000);
        
        showAlert('Quiz submitted successfully! Redirecting to dashboard...', 'success');
        
        setTimeout(() => {
          navigate('/student-dashboard');
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit quiz. Please try again.';
      showAlert(errorMessage, 'error');
      submissionStarted.current = false; // Allow re-submission on error
    } finally {
      setIsLoading(false);
    }
  }, [answers, generateSubmissionPayload, getUnansweredQuestions, navigate, sessionManager, showAlert]);

  // Centralized Security Violation Handler
  const handleSecurityViolation = useCallback((message) => {
    if (submissionStarted.current) return;

    showAlert(message, 'error', 3000);
    setWarningMessage(message);
    setShowWarningDialog(true);
    
    if (securityViolationTimeout.current) {
      clearTimeout(securityViolationTimeout.current);
    }

    securityViolationTimeout.current = setTimeout(() => {
      if (!submissionStarted.current) {
        handleSubmitQuiz(true); // true for auto-submit
      }
    }, 2000);
  }, [showAlert, handleSubmitQuiz]);

  // Handler for focus loss (app switching)
  const handleBlur = useCallback(() => {
    if (!isSubmitted && quizSession?.isActive) {
      setTimeout(() => {
        if (!document.hasFocus()) {
          setIsFocusLost(true);
          handleSecurityViolation('Leaving the quiz window is not allowed. Your quiz will be submitted.');
        }
      }, 100);
    }
  }, [isSubmitted, quizSession, handleSecurityViolation]);

  const handleFocus = useCallback(() => {
    if (isFocusLost) {
      setIsFocusLost(false);
    }
  }, [isFocusLost]);

  // Tab change detection with immediate submission
  const handleTabChange = useCallback(() => {
    setTabChangeCount(prev => {
      const newCount = prev + 1;
      handleSecurityViolation('Tab switching detected! Quiz will be submitted automatically for security.');
      return newCount;
    });
  }, [handleSecurityViolation]);

  const handleBeforeUnload = useCallback((e) => {
    if (!submissionStarted.current && !isSubmitted && questions.length > 0 && quizSession && quizSession.isActive) {
      submissionStarted.current = true;
      // Check if session is still valid
      if (sessionManager.isExpired()) {
        sessionManager.clearSession();
        return;
      }
      
      const currentAnswers = sessionManager.getAnswers();
      const submissionData = generateSubmissionPayload(currentAnswers);

      // Auto-submit and prevent reload dialog
      setIsSubmitted(true);
      
      // End the session
      sessionManager.endSession();
      
      // Use sendBeacon for reliable submission
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/students/quiz_submit/`;

      if (navigator.sendBeacon) {
        const formData = new FormData();
        formData.append('data', JSON.stringify(submissionData));
        formData.append('token', token);
        navigator.sendBeacon(url, formData);
      } else {
        fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(submissionData),
          keepalive: true
        }).catch(err => console.log('Auto-submit failed:', err));
      }
      
      // Prevent the default reload dialog
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  }, [isSubmitted, questions, quizSession, sessionManager, generateSubmissionPayload]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && !isSubmitted && quizSession?.isActive) {
      handleTabChange();
    }
  }, [handleTabChange, isSubmitted, quizSession]);

  // Enhanced security monitoring
  const requestFullScreen = useCallback(() => {
    const element = document.documentElement;
    const requestMethod = element.requestFullscreen || 
                         element.mozRequestFullScreen || 
                         element.webkitRequestFullscreen || 
                         element.msRequestFullscreen;
    
    if (requestMethod) {
      requestMethod.call(element).then(() => {
        setIsFullscreen(true);
        showAlert('Fullscreen mode activated for secure quiz environment.', 'success');
      }).catch(() => {
        setIsFullscreen(false);
        showAlert('Please enable fullscreen mode for better security.', 'info');
      });
    }
  }, [showAlert]);

  const exitFullScreen = useCallback(() => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) {
        const exitMethod = document.exitFullscreen || 
                          document.mozCancelFullScreen || 
                          document.webkitExitFullscreen || 
                          document.msExitFullscreen;
        
        if (exitMethod) {
          exitMethod.call(document).then(() => setIsFullscreen(false)).catch(() => {
            setIsFullscreen(false);
          });
        }
      }
    } catch (error) {
      console.log('Fullscreen exit error (non-critical):', error);
      setIsFullscreen(false);
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!document.fullscreenElement;
    setIsFullscreen(isCurrentlyFullscreen);
    if (!isCurrentlyFullscreen && !isSubmitted && quizSession?.isActive) {
        showAlert('You must be in fullscreen to continue the quiz.', 'warning');
    }
  }, [isSubmitted, quizSession, showAlert]);

  useEffect(() => {
    if (!hasLoadedOnce && quizId) {
      loadQuiz();
      setHasLoadedOnce(true);
      requestFullScreen();
    }
    
    // Enhanced security setup
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    const handleContextMenu = (e) => {
      e.preventDefault();
      showAlert('Right-click is disabled during quiz for security.', 'info');
    };
    document.addEventListener('contextmenu', handleContextMenu);
    
    const handleKeyDown = (e) => {
      const blockedKeys = [
        { condition: e.ctrlKey && ['c', 'v', 'a', 'r', 's'].includes(e.key), message: 'Copy/paste shortcuts are disabled' },
        { condition: e.key === 'F12', message: 'Developer tools are disabled' },
        { condition: e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key), message: 'Developer shortcuts are disabled' },
        { condition: e.altKey && e.key === 'Tab', message: 'Alt+Tab is disabled during quiz' },
        { condition: e.key === 'PrintScreen', message: 'Screenshots are disabled' }
      ];
      
      const blocked = blockedKeys.find(block => block.condition);
      if (blocked) {
        e.preventDefault();
        showAlert(blocked.message, 'warning');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (securityViolationTimeout.current) {
        clearTimeout(securityViolationTimeout.current);
      }
    };
  }, [quizId, hasLoadedOnce, handleVisibilityChange, handleBeforeUnload, handleTabChange, requestFullScreen, showAlert, handleFullscreenChange, handleBlur, handleFocus]);

  // On unmount, ensure we exit fullscreen
  useEffect(() => {
    return () => {
      exitFullScreen();
    };
  }, [exitFullScreen]);

  // Timer effect - now uses persistent session time
  useEffect(() => {
    if (quizSession && quizSession.isActive) {
      const updateTimer = () => {
        const remaining = sessionManager.getRemainingTime();
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          showAlert('Time\'s up! Submitting quiz automatically.', 'error');
          handleSubmitQuiz(true);
          return;
        }
      };
      
      updateTimer(); // Initial update
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [quizSession, sessionManager, showAlert]);

  // Per-question timer
  useEffect(() => {
    if (questionTimeLeft > 0) {
      const timer = setTimeout(() => setQuestionTimeLeft(questionTimeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (questionTimeLeft === 0 && timePerQuestion) {
      showAlert('Time for this question is up! Moving to next question.', 'warning');
      if (currentQuestion < questions.length - 1) {
        handleNextQuestion();
        setQuestionTimeLeft(timePerQuestion); // Reset timer for next question
      }
    }
  }, [questionTimeLeft, timePerQuestion, currentQuestion, questions.length, showAlert]);

  // Reset question timer when changing questions
  useEffect(() => {
    if (timePerQuestion) {
      setQuestionTimeLeft(timePerQuestion);
    }
  }, [currentQuestion, timePerQuestion]);

  // Warn if multiple tabs are open for the same quiz
  useEffect(() => {
    if (!sessionManager.checkMultipleTabAccess()) {
      showAlert('Warning: Quiz is open in multiple tabs. Only one tab is allowed!', 'error', 8000);
    }
    // Clean up on unmount
    return () => {
      const activeTabKey = `quiz_active_tab_${quizId}`;
      sessionStorage.removeItem(activeTabKey);
    };
  }, [quizId, sessionManager, showAlert]);

  // Update activity on every answer and navigation
  useEffect(() => {
    sessionManager.updateActivity();
  }, [answers, currentQuestion]);

  const loadQuiz = async () => {
    try {
      setIsLoading(true);
      
      // Check if session exists and is expired or submitted
      const existingSession = sessionManager.getSession();
      if (existingSession) {
        if (sessionManager.isExpired()) {
          showAlert('Quiz session has expired. Redirecting to dashboard.', 'error');
          sessionManager.clearSession();
          setTimeout(() => navigate('/student-dashboard'), 2000);
          return;
        }
        if (!existingSession.isActive) {
          showAlert('This quiz has already been submitted. Redirecting to dashboard.', 'info');
          sessionManager.clearSession();
          setTimeout(() => navigate('/student-dashboard'), 2000);
          return;
        }
      }
      
      // Check if quiz has already been attempted (prevent multiple attempts)
      try {
        const attemptsResponse = await quizApi.getResults();
        const attempts = attemptsResponse.data.results || attemptsResponse.data || [];
        const hasAttempted = attempts.some(attempt => 
          (attempt.quiz_id || attempt.quiz?.quiz_id || attempt.quiz?.id) === parseInt(quizId)
        );
        
        if (hasAttempted) {
          showAlert('You have already attempted this quiz. Each quiz can only be taken once.', 'error');
          setTimeout(() => navigate('/student-dashboard'), 2000);
          return;
        }
      } catch (error) {
        console.log('Could not check previous attempts, continuing...', error);
      }
      
      // Use the correct student endpoint
      const response = await quizApi.getForStudent(quizId);
      const quizData = response.data;
      
      setQuiz(quizData);
      
      // Initialize or restore session
      const session = sessionManager.initializeSession(quizData);
      setQuizSession(session);
      
      // Check if this was a refresh
      const refreshDetected = sessionManager.wasRefreshed();
      setWasRefreshed(refreshDetected);
      
      if (refreshDetected) {
        showAlert('Page refresh detected. Quiz timer continues from where it left off.', 'warning', 3000);
      }
      
      let questionsData = quizData.current_questions || quizData.questions || [];
      
      if (typeof questionsData === 'string') {
        try {
          questionsData = JSON.parse(questionsData);
        } catch (e) {
          console.error("Failed to parse questions data:", e);
        }
      }

      const flattenedQuestions = [];
      let questionIndex = 0;

            console.log('Processing questions data:', questionsData);
      console.log('Quiz no_of_questions:', quizData.no_of_questions);

      if (Array.isArray(questionsData)) {
        questionsData.forEach((questionBlock, blockIndex) => {
          if (Array.isArray(questionBlock)) {
            // Handle nested array of questions
            questionBlock.forEach((question, subIndex) => {
              if (question && typeof question === 'object' && (question.question || question.text)) {
                flattenedQuestions.push({
                  ...question,
                  uniqueId: `${blockIndex}-${subIndex}`,
                  displayIndex: questionIndex++,
                });
              }
            });
          } else if (typeof questionBlock === 'object' && questionBlock !== null && (questionBlock.question || questionBlock.text)) {
            // Handle single question object
            flattenedQuestions.push({
              ...questionBlock,
              uniqueId: `${blockIndex}`,
              displayIndex: questionIndex++,
            });
          }
        });
      }

      // Filter valid questions and limit to the quiz's specified count
      let validQuestions = flattenedQuestions.filter(q => 
        q && (q.question || q.text || q.content) && (q.question || q.text || q.content).trim() !== ''
      );

      // Limit to the actual number of questions specified in the quiz
      const maxQuestions = quizData.no_of_questions || quizData.total_questions || validQuestions.length;
      if (validQuestions.length > maxQuestions) {
        validQuestions = validQuestions.slice(0, maxQuestions);
      }

      console.log('Valid questions found:', validQuestions.length, 'out of max:', maxQuestions);

      setQuestions(validQuestions);
      
      // Restore answers from session
      const savedAnswers = sessionManager.getAnswers();
      setAnswers(savedAnswers);
      
      // Set timer based on session (remaining time)
      const remainingTime = sessionManager.getRemainingTime();
      setTimeLeft(remainingTime);
      
      // Calculate time per question (distribute remaining time equally)
      if (validQuestions.length > 0 && remainingTime > 0) {
        const timePerQuestionSeconds = Math.floor(remainingTime / validQuestions.length);
        setTimePerQuestion(timePerQuestionSeconds);
        setQuestionTimeLeft(timePerQuestionSeconds);
      }
      
            if (refreshDetected) {
        showAlert(`Quiz resumed after refresh. ${Object.keys(savedAnswers).length} answers restored. Time continues from ${formatTime(remainingTime)}.`, 'info', 5000);
      } else {
        showAlert(`Quiz loaded successfully! ${validQuestions.length} questions to answer. Duration: ${formatTime(remainingTime)}.`, 'success');
      }
      
    } catch (error) {
      console.error('Error loading quiz:', error);
      showAlert('Failed to load quiz. Please check your connection and try again.', 'error');
      
      setTimeout(() => {
        navigate('/student-dashboard');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(newAnswers);
    
    // Save answers to persistent session
    sessionManager.saveAnswers(newAnswers);
    
    // Update session activity
    if (quizSession) {
      sessionManager.saveSession(quizSession);
    }
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (questions.length === 0) return 0;
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(answers).filter(key => answers[key] && answers[key].trim() !== '').length;
  };

  // Enhanced input component for different question types
  const renderQuestionInput = (question) => {
    const questionType = question.question_type?.toLowerCase() || 'text';
    
    // True/False questions
    if (questionType.includes('truefalse')) {
      const tfOptions = ['True', 'False'];
      return (
        <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
          <RadioGroup
            value={answers[question.uniqueId] || ''}
            onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
          >
            {tfOptions.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <FormControlLabel
                  value={option}
                  control={<Radio sx={{ color: theme.palette.primary.main }} />}
                  label={option}
                  sx={{
                    color: 'black',
                    margin: 1,
                    padding: 2,
                    borderRadius: 2,
                    backgroundColor: answers[question.uniqueId] === option 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha('#fff', 0.7),
                    border: `2px solid ${answers[question.uniqueId] === option 
                      ? theme.palette.primary.main 
                      : 'transparent'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      transform: 'translateX(4px)',
                    }
                  }}
                />
              </motion.div>
            ))}
          </RadioGroup>
        </FormControl>
      );
    }

    // Multiple choice questions
    if (questionType.includes('mcq')) {
      const optionsSource = question.options || question.question_options;
      let mcqOptions = [];

      if (Array.isArray(optionsSource)) {
        mcqOptions = optionsSource;
      } else if (typeof optionsSource === 'object' && optionsSource !== null) {
        mcqOptions = Object.values(optionsSource);
      }

      if (mcqOptions.length > 0) {
        return (
          <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
            <RadioGroup
              value={answers[question.uniqueId] || ''}
              onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
            >
              {mcqOptions.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <FormControlLabel
                    value={option}
                    control={<Radio sx={{ color: theme.palette.primary.main }} />}
                    label={option}
                    sx={{
                      color: 'black',
                      margin: 1,
                      padding: 2,
                      borderRadius: 2,
                      backgroundColor: answers[question.uniqueId] === option 
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha('#fff', 0.7),
                      border: `2px solid ${answers[question.uniqueId] === option 
                        ? theme.palette.primary.main 
                        : 'transparent'}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateX(4px)',
                      }
                    }}
                  />
                </motion.div>
              ))}
            </RadioGroup>
          </FormControl>
        );
      }
    }

    // Fill-in-the-blank questions
    if (questionType.includes('fill') || questionType.includes('blank')) {
      return (
        <TextField
          fullWidth
          multiline={false}
          rows={1}
          variant="outlined"
          placeholder="Type your answer here..."
          value={answers[question.uniqueId] || ''}
          onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
          sx={{
            mt: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(227, 242, 253, 0.95)',
              borderRadius: 2,
              border: '2px solid rgba(33, 150, 243, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(227, 242, 253, 1)',
                border: '2px solid rgba(33, 150, 243, 0.5)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(227, 242, 253, 1)',
                border: '2px solid #2196f3',
              }
            },
            '& .MuiInputBase-input': {
              color: '#333 !important',
              fontWeight: '600 !important',
              fontSize: '1.1rem !important'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LightbulbIcon color="primary" />
              </InputAdornment>
            ),
          }}
        />
      );
    }
    
    // One-line text questions
    if (questionType.includes('text') || questionType.includes('short')) {
      return (
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Enter your answer..."
          value={answers[question.uniqueId] || ''}
          onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
          sx={{
            mt: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(243, 229, 245, 0.95)',
              borderRadius: 2,
              border: '2px solid rgba(156, 39, 176, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(243, 229, 245, 1)',
                border: '2px solid rgba(156, 39, 176, 0.5)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(243, 229, 245, 1)',
                border: '2px solid #9c27b0',
              }
            },
            '& .MuiInputBase-input': {
              color: '#333 !important',
              fontWeight: '600 !important',
              fontSize: '1.1rem !important'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BrainIcon color="secondary" />
              </InputAdornment>
            ),
          }}
        />
      );
    }
    
    // Fallback for array-based options if question_type is not 'mcq'
    const options = question.options || question.question_options || [];
    if (Array.isArray(options) && options.length > 0) {
      return (
        <FormControl component="fieldset" fullWidth sx={{ mt: 2 }}>
          <RadioGroup
            value={answers[question.uniqueId] || ''}
            onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
          >
            {options.map((option, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <FormControlLabel
                  value={option}
                  control={<Radio sx={{ color: theme.palette.primary.main }} />}
                  label={option}
                  sx={{
                    color: 'black',
                    margin: 1,
                    padding: 2,
                    borderRadius: 2,
                    backgroundColor: answers[question.uniqueId] === option 
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha('#fff', 0.7),
                    border: `2px solid ${answers[question.uniqueId] === option 
                      ? theme.palette.primary.main 
                      : 'transparent'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      transform: 'translateX(4px)',
                    }
                  }}
                />
              </motion.div>
            ))}
          </RadioGroup>
        </FormControl>
      );
    }
    
    // Default text area for long answers
    return (
      <TextField
        fullWidth
        multiline
        rows={4}
        variant="outlined"
        placeholder="Write your detailed answer here..."
        value={answers[question.uniqueId] || ''}
        onChange={(e) => handleAnswerChange(question.uniqueId, e.target.value)}
        sx={{
          mt: 2,
          '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 243, 224, 0.95)',
              borderRadius: 2,
              border: '2px solid rgba(255, 152, 0, 0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255, 243, 224, 1)',
                border: '2px solid rgba(255, 152, 0, 0.5)',
              },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255, 243, 224, 1)',
                border: '2px solid #ff9800',
              }
            },
            '& .MuiInputBase-input': {
              color: '#333 !important',
              fontWeight: '600 !important',
              fontSize: '1.1rem !important'
            }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <QuizIcon color="warning" />
            </InputAdornment>
          ),
        }}
      />
    );
  };

  // Loading screen with attractive design
  if (isLoading && !quiz) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              background: alpha('#fff', 0.95),
              backdropFilter: 'blur(20px)',
            }}
          >
            <Avatar sx={{ mx: 'auto', mb: 3, bgcolor: 'primary.main', width: 64, height: 64 }}>
              <QuizIcon fontSize="large" />
            </Avatar>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              Preparing Your Quiz
        </Typography>
            <Typography variant="body1" color="text.secondary">
              Setting up secure environment...
            </Typography>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          <AlertTitle>Quiz Not Available</AlertTitle>
          Unable to load quiz questions. Please contact your instructor.
        </Alert>
        <Button 
          startIcon={<CloseIcon />}
          onClick={() => navigate('/student-dashboard')}
          sx={{ mt: 3 }}
        >
          Return to Dashboard
        </Button>
      </Container>
    );
  }

  const currentQuestionData = questions[currentQuestion];

  return (
    <Container
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 2,
      }}
      maxWidth="lg"
    >
      {/* Fullscreen enforcement overlay */}
      {!isFullscreen && !isSubmitted && quizSession?.isActive && (
        <Backdrop
          sx={{ color: '#fff', zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.9)', flexDirection: 'column' }}
          open={true}
        >
          <WarningIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>Fullscreen Required</Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You must be in fullscreen to take the quiz.
          </Typography>
          <Button variant="contained" color="success" onClick={requestFullScreen}>
            Re-enter Fullscreen
          </Button>
        </Backdrop>
      )}

      {/* Attractive Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 48, height: 48 }}>
                  <HelpOutlineIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'white' }}>
                    {quiz.title}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, color: 'white' }}>
                    Question {currentQuestion + 1} of {questions.length}
                  </Typography>
                </Box>
              </Box>
            
              {/* Timer */}
              {timeLeft !== null && (
                <Paper
                  elevation={4}
                  sx={{
                    p: 1.5,
                    background: timeLeft <= 300 ? 'linear-gradient(45deg, #ff6b6b, #ffa500)' : alpha('#fff', 0.2),
                    color: 'white',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    minWidth: 'auto'
                  }}
                >
                  <TimerIcon fontSize="small" />
                  <Typography variant="body1" sx={{ 
                    fontWeight: '700 !important', 
                    fontFamily: 'monospace', 
                    fontSize: '1rem !important',
                    color: 'white !important',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                  }}>
                    {formatTime(timeLeft)}
                  </Typography>
                </Paper>
              )}
              
              {/* Per-Question Timer */}
              {questionTimeLeft !== null && timePerQuestion && (
                <Paper
                  elevation={3}
                  sx={{
                    p: 1,
                    mt: 1,
                    background: questionTimeLeft <= 30 ? 'linear-gradient(45deg, #ff6b6b, #ffa500)' : 'linear-gradient(45deg, #4caf50, #66bb6a)',
                    color: 'white',
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    minWidth: 'auto'
                  }}
                >
                  <AssignmentIcon fontSize="small" />
                  <Typography variant="caption" sx={{ 
                    fontWeight: '600 !important', 
                    fontFamily: 'monospace', 
                    fontSize: '0.8rem !important',
                    color: 'white !important',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.6)'
                  }}>
                    Q{currentQuestion + 1}: {formatTime(questionTimeLeft)}
                  </Typography>
                </Paper>
              )}
            </Stack>
            
            {/* Progress Bar */}
            <Box sx={{ mt: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, color: 'white', fontWeight: 600 }}>
                  Progress: {Math.round(getProgressPercentage())}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, color: 'white', fontWeight: 600 }}>
                  Answered: {getAnsweredQuestionsCount()}/{questions.length}
                </Typography>
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha('#fff', 0.3),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                  },
                }}
              />
            </Box>
          </Box>
          
          {/* Decorative background */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              background: alpha('#fff', 0.1),
              borderRadius: '50%',
              zIndex: 1
            }}
          />
        </Paper>
      </motion.div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 4,
              background: alpha('#fff', 0.98),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha('#667eea', 0.1)}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Question Number Badge */}
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 3,
                fontWeight: 600
              }}
            >
              Q{currentQuestion + 1}
            </Box>
            
            {/* Question Content */}
            <Box sx={{ pr: 8 }}>
              <Chip
                icon={<FlagIcon />}
                label={currentQuestionData.question_type || 'General'}
                color="primary"
                variant="outlined"
                sx={{ mb: 3 }}
              />
              
              <Typography 
                variant="h6" 
                sx={{
                  mb: 3, 
                  fontWeight: 600,
                  lineHeight: 1.6,
                  color: '#333 !important',
                  fontSize: '1.3rem !important'
                }}
              >
                {currentQuestionData.question || currentQuestionData.text || currentQuestionData.content || 'Question text not available'}
              </Typography>
              
              {renderQuestionInput(currentQuestionData)}
            </Box>
            
            {/* Answer Status Indicator */}
            {answers[currentQuestionData.uniqueId] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    Question answered
                </Typography>
              </Box>
              </motion.div>
            )}
          </Paper>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 3,
            borderRadius: 3,
            background: alpha('#fff', 0.95),
            backdropFilter: 'blur(20px)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button
              startIcon={<PrevIcon />}
              onClick={handlePrevQuestion}
              disabled={currentQuestion === 0}
              variant="outlined"
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2,
                borderColor: alpha('#667eea', 0.5),
                color: '#667eea',
                '&:hover': {
                  borderColor: '#667eea',
                  backgroundColor: alpha('#667eea', 0.1),
                  transform: 'translateX(-2px)',
                },
                '&:disabled': {
                  opacity: 0.3
                }
              }}
            >
              Previous
            </Button>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {questions.map((_, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Box
                    onClick={() => setCurrentQuestion(index)}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: index === currentQuestion 
                        ? '#667eea' 
                        : answers[questions[index]?.uniqueId] 
                          ? '#4CAF50' 
                          : alpha('#000', 0.2),
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.2)',
                      }
                    }}
                  />
                </motion.div>
              ))}
            </Box>

            {currentQuestion === questions.length - 1 ? (
              <Button
                startIcon={<SendIcon />}
                onClick={() => setShowConfirmDialog(true)}
                variant="contained"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #45a049, #7cb342)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                  }
                }}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                endIcon={<NextIcon />}
                onClick={handleNextQuestion}
                variant="contained"
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                    transform: 'translateX(2px)',
                  }
                }}
              >
                Next
              </Button>
            )}
          </Stack>
        </Paper>
      </motion.div>

      {/* Enhanced Security Alert Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: 9999, backgroundColor: alpha('#000', 0.8) }}
        open={showSecurityAlert}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
        >
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
              color: 'white',
              textAlign: 'center',
              maxWidth: 400
            }}
          >
            <SecurityIcon sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              Security Alert!
            </Typography>
            <Typography variant="body1">
              {warningMessage}
            </Typography>
          </Paper>
        </motion.div>
      </Backdrop>

      {/* Beautiful Snackbar Alerts */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Slide}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={alertSeverity}
          variant="filled"
          sx={{
            borderRadius: 3,
            fontWeight: 600,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {warningMessage}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: alpha('#fff', 0.98),
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: 'warning.main', width: 56, height: 56 }}>
            <SendIcon fontSize="large" />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'black' }}>
            Submit Quiz?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 0 }}>
          <Typography variant="body1" sx={{ mb: 2, color: 'black' }}>
            You have answered {getAnsweredQuestionsCount()} out of {questions.length} questions.
          </Typography>
          {getUnansweredQuestions().length > 0 && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {getUnansweredQuestions().length} questions are still unanswered. 
              You must answer all questions before submitting.
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: 'black' }}>
            Once submitted, you cannot make changes to your answers.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            variant="outlined"
            sx={{ px: 3, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              setShowConfirmDialog(false);
              handleSubmitQuiz(false);
            }}
            variant="contained"
            disabled={getUnansweredQuestions().length > 0}
            sx={{
              px: 3,
              borderRadius: 2,
              background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
            }}
          >
            Submit Quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog
        open={showWarningDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
            color: 'white',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <WarningIcon sx={{ fontSize: 64, mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Security Violation Detected
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1">
            Maximum tab switches exceeded. Your quiz will be submitted automatically for security reasons.
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {isLoading && (
        <Backdrop sx={{ color: '#fff', zIndex: 9998 }} open={isLoading}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <CircularProgress size={60} />
          </motion.div>
        </Backdrop>
      )}
    </Container>
  );
};

export default StudentQuizView;