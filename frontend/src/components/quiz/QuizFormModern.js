import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
  InputAdornment,
  Checkbox,
  IconButton,
  LinearProgress,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
  FormControl,
  ListItemText,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QuizImage from './QuizImage';
import FileUpload from './FileUpload';

import CreatingQuizLoader from './CreatingQuizLoader';
import api from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

const initialFormState = {
  title: '',
  description: '',
  files: [],
  filesData: [],
  no_of_questions: '',
  time_limit_minutes: '',
  complexity: '',
  quiz_type: '',
  department: '',
  passing_score: '',
  quiz_date: ''
};

const QuizFormModern = ({ onSave, onCancel, departments: initialDepartments }) => {
  const { showSnackbar } = useSnackbar();
  // Add constants for limits
  const MAX_FILE_SIZE = 60; // 60MB
  const MAX_QUESTIONS = 35;
  
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState(initialDepartments || []);
  const [deptLoading, setDeptLoading] = useState(!initialDepartments);
  const [errors, setErrors] = useState({});
  const [hasPdf, setHasPdf] = useState(false);
  // Add state for error dialog
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(false);
  
  useEffect(() => {
    setDepartments(initialDepartments || []);
    if (initialDepartments) {
      setDeptLoading(false);
    }
  }, [initialDepartments]);

  const handleField = useCallback((key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: Array.isArray(prev[key]) ? value : value.target?.value || value
    }));
    if (errors[key]) setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  }, [errors]);

  const handleFilesSelect = useCallback((selectedFiles) => {
    // Check if at least one PDF file is included
    const containsPdf = selectedFiles.some(file => file.type === 'application/pdf');
    setHasPdf(containsPdf);
    
    setForm(prev => ({
      ...prev,
      files: selectedFiles
    }));
  }, []);
  
  const handleFilesDataChange = useCallback((filesData) => {
    // Update form with structured files data
      setForm(prev => ({
        ...prev,
      filesData: filesData,
      files: filesData.map(fd => fd.file)
    }));
    
    // Check if at least one PDF file is included
    const containsPdf = filesData.some(fd => fd.is_pdf);
    setHasPdf(containsPdf);
      
    // Clear any existing file-related errors
    if (errors.files || errors.page_ranges) {
        setErrors(prev => {
          const newErrors = { ...prev };
        delete newErrors.files;
          delete newErrors.page_ranges;
          return newErrors;
        });
      }
  }, [errors.files, errors.page_ranges]);

  const validate = () => {
    const errs = {};
    ['title', 'complexity', 'quiz_type'].forEach(field => {
      if (!form[field]) errs[field] = 'Required';
    });
    if (!form.department) errs.department = 'Please select a subject';
    
    // Files are now optional for initial creation, so we remove the validation for their presence.
    // We can still validate for empty or oversized files if they are selected.
    if (form.files && form.files.length > 0) {
      const emptyFiles = form.files.filter(file => file.size === 0);
      if (emptyFiles.length > 0) {
        errs.files = `The following files are empty: ${emptyFiles.map(f => f.name).join(', ')}`;
      }
      
      const oversizedFiles = form.files.filter(file => file.size > MAX_FILE_SIZE * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        errs.files = `The following files exceed the size limit: ${oversizedFiles.map(f => f.name).join(', ')}`;
      }
    }
    
    // Check number of questions limit
    if (form.no_of_questions && parseInt(form.no_of_questions) > MAX_QUESTIONS) {
      errs.no_of_questions = `Maximum ${MAX_QUESTIONS} questions allowed`;
    }
    
    if (form.filesData) {
      for (const fileData of form.filesData) {
        if (fileData.is_pdf && fileData.page_range) {
      const pattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
          if (!pattern.test(fileData.page_range)) {
            errs.page_ranges = `Invalid page range format for ${fileData.filename}`;
            break;
      } else {
            const rangeParts = fileData.page_range.split(',');
        for (const part of rangeParts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (start > end) {
                  errs.page_ranges = `Invalid range: ${start}-${end} in ${fileData.filename}. Start must be <= end.`;
              break;
            }
            if (start <= 0) {
                  errs.page_ranges = `Page numbers must be positive in ${fileData.filename}`;
              break;
            }
          } else if (parseInt(part) <= 0) {
                errs.page_ranges = `Page numbers must be positive in ${fileData.filename}`;
            break;
              }
            }
            if (errs.page_ranges) break;
          }
        }
      }
    }
    
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setUploadProgress(0);
    setIsFadingOut(false);

    const questionTypeMapping = {
      'MCQ': 'mcq',
      'Fill ups': 'fill',
      'True/False': 'truefalse',
      'One Line': 'oneline',
      'Mixed': 'mixed'
    };
    const complexityMapping = {
      'Easy': 'easy',
      'Medium': 'medium',
      'Hard': 'hard',
      'Mixed': 'mixed'
    };

    try {
      // Step 1: Create the Quiz with JSON data
      const quizPayload = {
        title: form.title,
        description: form.description,
        no_of_questions: form.no_of_questions ? parseInt(form.no_of_questions, 10) : undefined,
        time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes, 10) : undefined,
        quiz_date: form.quiz_date || undefined,
        question_type: questionTypeMapping[form.quiz_type] || form.quiz_type,
        quiz_type: complexityMapping[form.complexity] || form.complexity,
        department_id: form.department || undefined,
        passing_score: form.passing_score ? parseInt(form.passing_score, 10) : null,
        pages: form.filesData
            ? form.filesData.map(fd => ({
                filename: fd.filename,
                page_range: fd.page_range
              }))
            : []
      };

      console.log('Step 1: Creating quiz with payload:', quizPayload);
      setUploadProgress(10); // Initial progress
      
      const createdQuiz = await onSave.createQuiz(quizPayload);
      const quizId = createdQuiz.quiz_id;

      if (!quizId) {
        throw new Error('Failed to get quiz_id after creation.');
      }
      
      console.log(`Step 1 successful. Quiz created with ID: ${quizId}`);
      setUploadProgress(30);

      // Step 2: Upload files if they exist
      const filesToUpload = form.files || [];
      if (filesToUpload.length > 0) {
        console.log(`Step 2: Uploading ${filesToUpload.length} files...`);
        const totalFiles = filesToUpload.length;
        let filesUploaded = 0;

        for (const file of filesToUpload) {
          try {
            // Find the page range for this specific file
            const fileData = form.filesData?.find(fd => fd.file === file);
            const pageRange = fileData?.page_range || null;
            
            console.log(`Uploading ${file.name} with page range: ${pageRange}`);
            await onSave.uploadFile(quizId, file, pageRange);
            filesUploaded++;
            // Update progress based on number of files uploaded
            const fileProgress = (filesUploaded / totalFiles) * 60; // Files upload takes 60% of progress
            setUploadProgress(30 + fileProgress);
          } catch (uploadError) {
            console.error(`Failed to upload ${file.name}:`, uploadError);
            // Decide if you want to continue or stop on first file error
          }
        }
      } else {
          // If no files, just jump progress to near completion
          setUploadProgress(90);
      }

      console.log('All steps completed successfully!');
      setUploadProgress(100);
      
      // Use the snackbar from context for success message
      showSnackbar('Quiz created successfully!', 'success');

      // Hold at 100% for a bit, then fade out and redirect
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setLoading(false);
          onCancel(); // Call onCancel to go back to the list view
        }, 500);
      }, 1000); // Hold for 1 second to show completion

    } catch (err) {
      console.error('Quiz creation process failed:', err);
      setLoading(false);
      setErrorDialog({
        open: true,
        title: 'Error',
        message: err.message || 'An unexpected error occurred.'
      });
    }
  };

  return (
    <Paper sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      maxWidth: 1200, 
      mx: 'auto',
      m: { xs: 1, sm: 2 }
    }} className="glass-effect">
      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
          {/* Left Column */}
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h5" 
              fontWeight={600} 
              mb={3}
              sx={{ 
                fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.5rem' },
                textAlign: { xs: 'center', md: 'left' }
              }}
            >
              Create a New Quiz
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {/* Quiz Title */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Quiz Title"
                  name="title"
                  value={form.title}
                  onChange={e => handleField('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>

              {/* File Upload */}
              <Grid item xs={12}>
                <FileUpload 
                  onFilesSelect={handleFilesSelect} 
                  onFilesDataChange={handleFilesDataChange}
                />
                
                {errors.files && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(244, 67, 54, 0.08)', borderRadius: 1 }}>
                    <Typography variant="caption" color="error">
                      {errors.files}
                    </Typography>
                  </Box>
                )}
                
                {form.filesData && form.filesData.some(fd => fd.page_range) && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                    <Typography variant="caption" color="primary">
                      <strong>Page Selections:</strong>
                      {form.filesData.filter(fd => fd.page_range).map(fd => (
                        <div key={fd.file_id}>
                          {fd.filename}: {fd.page_range}
                        </div>
                      ))}
                    </Typography>
                  </Box>
                )}
                
                {errors.page_ranges && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(244, 67, 54, 0.08)', borderRadius: 1 }}>
                    <Typography variant="caption" color="error">
                      {errors.page_ranges}
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={form.description}
                  onChange={e => handleField('description', e.target.value)}
                />
              </Grid>

              {/* Questions & Time */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Questions"
                  value={form.no_of_questions}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > MAX_QUESTIONS) {
                      setErrors(prev => ({
                        ...prev,
                        no_of_questions: `Maximum ${MAX_QUESTIONS} questions allowed`
                      }));
                      // Optionally cap the value at MAX_QUESTIONS
                      handleField('no_of_questions', MAX_QUESTIONS.toString());
                    } else {
                      handleField('no_of_questions', e.target.value);
                      if (errors.no_of_questions) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.no_of_questions;
                          return newErrors;
                        });
                      }
                    }
                  }}
                  error={!!errors.no_of_questions}
                  helperText={errors.no_of_questions || `Maximum ${MAX_QUESTIONS} questions allowed`}
                  inputProps={{
                    min: 1,
                    max: MAX_QUESTIONS
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Time Limit (min)"
                  value={form.time_limit_minutes}
                  onChange={e => handleField('time_limit_minutes', e.target.value)}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Quiz Date"
                  value={form.quiz_date}
                  onChange={(e) => handleField('quiz_date', e.target.value)}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0], // Prevent past dates
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.quiz_date}
                  helperText={errors.quiz_date || "Optional - defaults to current time if not set"}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>


              {/* Quiz Type & Complexity */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  disableClearable
                  options={['MCQ','Fill ups','Mixed','True/False','One Line']}
                  value={form.quiz_type}
                  onChange={(e, v) => handleField('quiz_type', v)}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={params => (
                    <TextField {...params} label="Question Type" error={!!errors.quiz_type} helperText={errors.quiz_type} />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  disableClearable
                  options={['Easy','Medium','Hard','Mixed']}
                  value={form.complexity}
                  onChange={(e, v) => handleField('complexity', v)}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={params => (
                    <TextField {...params} label="Complexity" error={!!errors.complexity} helperText={errors.complexity} />
                  )}
                />
              </Grid>

              {/* Department Single Select */}
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.department} required>
                  <InputLabel id="department-select-label">Subject *</InputLabel>
                  <Select
                    labelId="department-select-label"
                    id="department-select"
                    value={form.department || ''}
                    onChange={(e) => handleField('department', e.target.value)}
                    label="Subject *"
                  >
                    {deptLoading ? (
                      <MenuItem disabled>Loading subjects...</MenuItem>
                    ) : departments.length === 0 ? (
                      <MenuItem disabled>No subjects available.</MenuItem>
                    ) : (
                      departments.map((dept) => (
                        <MenuItem key={dept.uuid} value={dept.department_id}>
                          {dept.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
                </FormControl>
              </Grid>
              {/* Passing Score */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Passing Score"
                  value={form.passing_score}
                  onChange={e => handleField('passing_score', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />
            {loading && (
              <Box width="100%" mb={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      backgroundColor: theme => uploadProgress >= 100 ? theme.palette.success.main : theme.palette.primary.main,
                    }
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="textSecondary">
                    {uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {uploadProgress}% {uploadProgress < 100 ? 'Uploaded' : 'Complete'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box 
              display="flex" 
              justifyContent={{ xs: 'center', sm: 'flex-end' }} 
              gap={2} 
              mt={3}
              flexDirection={{ xs: 'column', sm: 'row' }}
            >
              <Button 
                variant="outlined" 
                onClick={onCancel} 
                disabled={loading}
                sx={{ 
                  minHeight: { xs: 48, sm: 40 },
                  fontSize: { xs: '0.9rem', sm: '0.875rem' }
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ 
                  minHeight: { xs: 48, sm: 40 },
                  fontSize: { xs: '0.9rem', sm: '0.875rem' }
                }}
              >
                {loading ? 'Creating...' : 'Create Quiz'}
              </Button>
            </Box>
          </Grid>

          {/* Right Column: Illustration & Summary */}
          <Grid item xs={12} md={6} display={{ xs: 'none', md: 'flex' }} sx={{ flexDirection: 'column' }}>
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: { md: 400, lg: 500 },
              p: 3,
              position: 'sticky',
              top: 20
            }}>
              <QuizImage />
              
              <Paper elevation={2} sx={{ 
                  p: 3, 
                  mt: 3, 
                  width: '100%',
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: '16px',
                  background: theme => `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Quiz Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Title:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.title || 'Not set'}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Questions:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.no_of_questions || 'Not set'}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Question Type:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.quiz_type || 'Not set'}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Complexity:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.complexity || 'Not set'}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Passing Score:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.passing_score ? `${form.passing_score}%` : 'Not set'}</Typography>
                  </Grid>
                  
                  {hasPdf && form.page_ranges && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">PDF Page Ranges:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" fontWeight="medium">{form.page_ranges}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </form>
      {loading && <CreatingQuizLoader progress={uploadProgress} isFadingOut={isFadingOut} />}
      {/* Error Dialog */}
      {errorDialog.open && (
        <Dialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ ...errorDialog, open: false })}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{errorDialog.title}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              {errorDialog.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrorDialog({ ...errorDialog, open: false })} color="primary" autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
};

export default QuizFormModern;
