import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { quizApi } from '../../services/api';
import CreatingQuizLoader from './CreatingQuizLoader';

const DirectQuizAccess = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    // If the id is 'create', we are navigating to the form, not fetching a quiz.
    if (id === 'create') {
      setLoading(false);
      return;
    }
    
    const fetchQuizForStudent = async () => {
      try {
        const response = await quizApi.getForStudent(id);
        console.log('Quiz access successful, navigating to quiz interface');
        navigate(`/quiz/take/${id}`);
      } catch (error) {
        console.error('Direct quiz access error:', error);
        
        let errorMessage = 'Could not access quiz';
        let shouldRedirectToLogin = false;
        
        if (error.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in.';
          shouldRedirectToLogin = true;
        } else if (error.response?.status === 403) {
          errorMessage = 'Access denied. You may need to log in as a student.';
          shouldRedirectToLogin = true;
        } else if (error.response?.status === 404) {
          errorMessage = 'Quiz not found or not available.';
        } else if (!error.response) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = `Error ${error.response.status}: ${error.response.statusText}`;
        }
        
        setError({
          message: errorMessage,
          shouldRedirectToLogin,
          details: error.response?.data
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuizForStudent();
  }, [id, navigate]);

  const handleLoginRedirect = () => {
    localStorage.setItem('pending_quiz_id', id);
    navigate('/student-login');
  };

  const handleDashboardRedirect = () => {
    navigate('/student-dashboard');
  };

  if (loading) {
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <CircularProgress sx={{ color: '#45b7d1', mb: 2 }} />
            <Typography variant="h6">
              Accessing Quiz {id}...
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Please wait while we verify your access
            </Typography>
          </Box>
        </motion.div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          p: 3,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 500,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, color: 'error.main' }}>
              Quiz Access Error
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              {error.message}
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Quiz ID: {id}
            </Typography>

            {error.details && (
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  textAlign: 'left',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                  Error Details: {JSON.stringify(error.details, null, 2)}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              {error.shouldRedirectToLogin ? (
                <Button
                  variant="contained"
                  onClick={handleLoginRedirect}
                  sx={{
                    background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                  }}
                >
                  Go to Student Login
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleDashboardRedirect}
                  sx={{
                    background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                  }}
                >
                  Go to Dashboard
                </Button>
              )}
              
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{
                  borderColor: '#45b7d1',
                  color: '#45b7d1',
                }}
              >
                Try Again
              </Button>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  return null;
};

export default DirectQuizAccess; 