import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { quizApi } from '../../services/api';

const QuizTestComponent = () => {
  const [quizId, setQuizId] = useState('186');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testQuizAttempt = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log(`Testing GET /api/students/quiz_attempt/${quizId}`);
      const response = await quizApi.getQuizAttempt(quizId);
      
      setResult({
        success: true,
        data: response.data,
        status: response.status
      });
      
      console.log('API Response:', response.data);
    } catch (error) {
      console.error('API Error:', error);
      setResult({
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const authInfo = {
    token: localStorage.getItem('token') ? 'exists' : 'missing',
    userRole: localStorage.getItem('userRole'),
    userEmail: localStorage.getItem('user_email'),
    user: localStorage.getItem('user')
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Quiz Attempt API Test
      </Typography>
      
      {/* Authentication Status */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.100' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Authentication Status</Typography>
        <Box component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
          {JSON.stringify(authInfo, null, 2)}
        </Box>
      </Paper>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Quiz ID"
          value={quizId}
          onChange={(e) => setQuizId(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          onClick={testQuizAttempt}
          disabled={loading || !quizId}
          fullWidth
        >
          {loading ? 'Testing...' : `Test GET /api/students/quiz_attempt/${quizId}`}
        </Button>
      </Box>
      
      {result && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" color={result.success ? 'success.main' : 'error.main'}>
            {result.success ? 'Success' : 'Error'} (Status: {result.status})
          </Typography>
          
          <Box component="pre" sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: 'grey.100', 
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.8rem'
          }}>
            {JSON.stringify(result.success ? result.data : result.error, null, 2)}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default QuizTestComponent; 