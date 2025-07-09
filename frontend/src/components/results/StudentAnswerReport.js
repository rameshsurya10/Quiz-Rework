import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Divider,
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

const StudentAnswerReport = ({ open, onClose, reportData, isLoading }) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) {
    return null;
  }

  const { student_attend_name, quiz_name, detailed_answers } = reportData;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          {quiz_name}: {student_attend_name}'s Report
        </Typography>
        <IconButton aria-label="close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {detailed_answers && detailed_answers.length > 0 ? (
          detailed_answers.map((q, index) => (
            <Paper key={q.question_number || index} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {index + 1}. {q.question}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Your Answer:</Typography>
                  <Chip
                    label={q.student_answer || 'Not Answered'}
                    variant="outlined"
                    sx={{ mt: 0.5, height: 'auto', '& .MuiChip-label': { display: 'block', whiteSpace: 'normal' } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Correct Answer:</Typography>
                  <Chip
                    label={q.correct_answer}
                    variant="outlined"
                    color="success"
                    sx={{ mt: 0.5, height: 'auto', '& .MuiChip-label': { display: 'block', whiteSpace: 'normal' } }}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                {q.is_correct ? (
                  <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <HighlightOffIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="body2" color={q.is_correct ? 'success.main' : 'error.main'} fontWeight="bold">
                  {q.is_correct ? 'Correct' : 'Incorrect'}
                </Typography>
              </Box>
              {q.explanation && (
                <Box mt={2} p={2} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, backgroundColor: alpha(theme.palette.info.light, 0.1) }}>
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">Explanation:</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{q.explanation}</Typography>
                </Box>
              )}
            </Paper>
          ))
        ) : (
          <Typography sx={{ p: 3, textAlign: 'center' }}>
            No detailed question data available for this attempt.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentAnswerReport; 