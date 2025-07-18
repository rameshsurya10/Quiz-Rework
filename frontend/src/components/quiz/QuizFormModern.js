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
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QuizImage from './QuizImage';
import FileUpload from './FileUpload';
import CreatingQuizLoader from './CreatingQuizLoader';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Helper Functions
const capitalize = (str) => str?.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const formatQuestionType = (value) => {
  switch (value?.toLowerCase()) {
    case 'mcq': return 'MCQ';
    case 'fill': return 'Fill ups';
    case 'truefalse': return 'True/False';
    case 'oneline': return 'One Line';
    case 'mixed': return 'Mixed';
    default: return value || '';
  }
};

// Get available question types based on standard
const getAvailableQuestionTypes = (standard) => {
  if (standard === '10') {
    // 10th standard (X) supports all question types
    return ['MCQ', 'Fill ups', 'Mixed', 'True/False', 'One Line'];
  } else {
    // 11th and 12th standards (XI, XII) support MCQ, Fill ups, Mixed, and One Line
    return ['MCQ', 'Fill ups', 'Mixed', 'One Line'];
  }
};

// Get question type description for better user understanding
const getQuestionTypeDescription = (type) => {
  switch (type) {
    case 'MCQ':
      return 'Multiple Choice Questions';
    case 'Fill ups':
      return 'Fill in the Blank Questions';
    case 'True/False':
      return 'True or False Questions';
    case 'One Line':
      return 'One Line Answer Questions';
    case 'Mixed':
      return 'Mixed Question Types';
    default:
      return '';
  }
};

const initialFormState = {
  title: '',
  description: '',
  book_name: '',
  files: [],
  filesData: [],
  no_of_questions: '',
  time_limit_minutes: '',
  complexity: '',
  quiz_type: '',
  department: '',
  passing_score: '',
  quiz_date: '',
  standard: '10', // Default to 10th standard
  section: ''
};

const QuizFormModern = ({ onSave, onCancel, departments: initialDepartments, initialQuizData = null }) => {
  const { showSnackbar } = useSnackbar();

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState(initialDepartments || []);
  const [deptLoading, setDeptLoading] = useState(!initialDepartments);
  const [errors, setErrors] = useState({});
  const [hasPdf, setHasPdf] = useState(false);
  const [complexityCounts, setComplexityCounts] = useState({ easy: '', medium: '', hard: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    setDepartments(initialDepartments || []);
    if (initialDepartments) setDeptLoading(false);
  }, [initialDepartments]);

  useEffect(() => {
    if (initialQuizData) {
      const {
        title,
        description,
        book_name,
        no_of_questions,
        time_limit_minutes,
        complexity,
        quiz_type,
        department_id,
        passing_score,
        quiz_date,
        standard,
        section,
        pages = []
      } = initialQuizData;

      let complexityCountsFromBackend = { easy: '', medium: '', hard: '' };
      if (typeof complexity === 'object' && complexity !== null) {
        complexityCountsFromBackend = {
          easy: complexity.easy || '',
          medium: complexity.medium || '',
          hard: complexity.hard || ''
        };
      }

      setForm({
        title: title || '',
        description: description || '',
        book_name: book_name || '',
        no_of_questions: no_of_questions?.toString() || '',
        time_limit_minutes: time_limit_minutes?.toString() || '',
        complexity: typeof complexity === 'string' ? capitalize(complexity) : 'Mixed',
        quiz_type: formatQuestionType(quiz_type),
        department: department_id || '',
        passing_score: passing_score?.toString() || '',
        quiz_date: quiz_date ? quiz_date.slice(0, 16) : '',
        standard: standard || '10',
        section: section || '',
        files: [],
        filesData: pages.map(p => ({
          filename: p.filename,
          page_range: p.page_range,
          is_pdf: true
        })),
      });

      setComplexityCounts(complexityCountsFromBackend);
      setHasPdf(pages.length > 0);
    }
  }, [initialQuizData]);

  useEffect(() => {
    if (form.complexity === 'Mixed') {
      const { easy, medium, hard } = complexityCounts;
      const total = (parseInt(easy, 10) || 0) + (parseInt(medium, 10) || 0) + (parseInt(hard, 10) || 0);
      const totalQuestions = parseInt(form.no_of_questions, 10) || 0;

      // Only show error if user has started entering counts and they don't add up
      if ((easy || medium || hard) && totalQuestions > 0 && total !== totalQuestions) {
        setErrors(prev => ({
          ...prev,
          complexity: `The sum of easy, medium, and hard questions must equal the total number of questions (${totalQuestions}).`
        }));
      } else {
        // Otherwise, clear the specific error
        setErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.complexity?.startsWith('The sum of easy')) {
             delete newErrors.complexity;
          }
          return newErrors;
        });
      }
    } else {
        // Also clear if complexity is not Mixed
        setErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.complexity?.startsWith('The sum of easy')) {
             delete newErrors.complexity;
          }
          return newErrors;
        });
    }
  }, [complexityCounts, form.no_of_questions, form.complexity]);

  const handleField = useCallback((key, value) => {
    if (key.startsWith('complexity_')) {
      const type = key.split('_')[1];
      setComplexityCounts(prev => ({ ...prev, [type]: value.target.value }));
    } else {
      const fieldValue = value && value.target ? value.target.value : value;
      setForm(prev => {
        const newForm = { ...prev, [key]: fieldValue };
        
        // If standard is changed, check if current quiz_type is still available
        if (key === 'standard') {
            if (fieldValue !== 'other') {
                newForm.section = '';
            }
          const availableTypes = getAvailableQuestionTypes(fieldValue);
          if (newForm.quiz_type && !availableTypes.includes(newForm.quiz_type)) {
            newForm.quiz_type = ''; // Reset quiz_type if not available for new standard
          }
        }
        
        return newForm;
      });
    }

    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [errors]);

  const handleFilesSelect = useCallback((selectedFiles) => {
    const containsPdf = selectedFiles.some(file => file.type === 'application/pdf');
    setHasPdf(containsPdf);
    setForm(prev => ({ ...prev, files: selectedFiles }));
  }, []);

  const handleFilesDataChange = useCallback((filesData) => {
    setForm(prev => ({
      ...prev,
      filesData: filesData,
      files: filesData.map(fd => fd.file)
    }));

    const containsPdf = filesData.some(fd => fd.is_pdf);
    setHasPdf(containsPdf);

    if (errors.files || errors.page_ranges) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.files;
        delete newErrors.page_ranges;
        return newErrors;
      });
    }
  }, [errors]);

  const validate = () => {
    const errs = {};
    ['title', 'complexity', 'quiz_type', 'standard'].forEach(field => {
      if (!form[field]) errs[field] = 'Required';
    });
    if (!form.department) errs.department = 'Please select a subject';

    if (form.complexity === 'Mixed') {
      const { easy, medium, hard } = complexityCounts;
      // Only validate if user has provided counts.
      if (easy || medium || hard) {
        const total = (parseInt(easy) || 0) + (parseInt(medium) || 0) + (parseInt(hard) || 0);
        const totalQuestions = parseInt(form.no_of_questions) || 0;
        if (total !== totalQuestions) {
          errs.complexity = `The sum of easy, medium, and hard questions must equal the total number of questions (${totalQuestions}).`;
        }
      }
    }

    if (form.files && form.files.length > 0) {
      const emptyFiles = form.files.filter(file => file.size === 0);
      if (emptyFiles.length > 0) {
        errs.files = `Empty files: ${emptyFiles.map(f => f.name).join(', ')}`;
      }
    }

    if (form.filesData) {
      for (const fileData of form.filesData) {
        if (fileData.is_pdf && fileData.page_range) {
          const pattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
          if (!pattern.test(fileData.page_range)) {
            errs.page_ranges = `Invalid page range format for ${fileData.filename}`;
            break;
          }
          const parts = fileData.page_range.split(',');
          for (const part of parts) {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map(Number);
              if (start > end || start <= 0) {
                errs.page_ranges = `Invalid range: ${start}-${end} in ${fileData.filename}`;
                break;
              }
            } else if (parseInt(part) <= 0) {
              errs.page_ranges = `Invalid page number in ${fileData.filename}`;
              break;
            }
          }
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
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
      const quizPayload = {
        title: form.title,
        description: form.description,
        book_name: form.book_name,
        no_of_questions: parseInt(form.no_of_questions),
        time_limit_minutes: parseInt(form.time_limit_minutes),
        quiz_date: form.quiz_date,
        question_type: questionTypeMapping[form.quiz_type],
        quiz_type: form.complexity === 'Mixed' ? complexityCounts : complexityMapping[form.complexity],
        department_id: form.department,
        passing_score: parseInt(form.passing_score),
        class_name: form.standard,
        section: form.section,
        pages: form.filesData?.map(fd => ({ filename: fd.filename, page_range: fd.page_range })) || []
      };

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
                  size="small"
                  value={form.title}
                  onChange={e => handleField('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                />
              </Grid>

              {/* Book Name */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Book Name"
                  name="book_name"
                  size="small"
                  value={form.book_name}
                  onChange={e => handleField('book_name', e.target.value)}
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
                  size="small"
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
                  size="small"
                  value={form.no_of_questions}
                  onChange={(e) => handleField('no_of_questions', e.target.value)}
                  error={!!errors.no_of_questions}
                  helperText={errors.no_of_questions}
                  inputProps={{
                    min: 1,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Time Limit (min)"
                  size="small"
                  value={form.time_limit_minutes}
                  onChange={e => handleField('time_limit_minutes', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Quiz Date & Time"
                  size="small"
                  value={form.quiz_date}
                  onChange={(e) => handleField('quiz_date', e.target.value)}
                  inputProps={{
                    min: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 11) + '00:00', // Prevent past dates
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.quiz_date}
                  helperText={errors.quiz_date || "Optional - defaults to current time if not set"}
                />
              </Grid>

              {/* Standard Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset" error={!!errors.standard}>
                  <FormLabel component="legend" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Standard *
                  </FormLabel>
                  <RadioGroup
                    row
                    value={form.standard}
                    onChange={(e) => handleField('standard', e.target.value)}
                    sx={{ gap: 3 }}
                  >
                    <FormControlLabel 
                      value="10" 
                      control={<Radio />} 
                      label="X (10th)" 
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 'medium'
                        }
                      }}
                    />
                    <FormControlLabel 
                      value="11" 
                      control={<Radio />} 
                      label="XI (11th)" 
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 'medium'
                        }
                      }}
                    />
                    <FormControlLabel 
                      value="12" 
                      control={<Radio />} 
                      label="XII (12th)" 
                      sx={{ 
                        '& .MuiFormControlLabel-label': { 
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 'medium'
                        }
                      }}
                    />
                  </RadioGroup>
                  {errors.standard && <FormHelperText>{errors.standard}</FormHelperText>}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Available Question Types:</strong>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {form.standard === '10' 
                        ? '• X (10th): All types (MCQ, Fill ups, Mixed, True/False, One Line)'
                        : form.standard === '11'
                        ? '• XI (11th): MCQ, Fill ups, Mixed, One Line'
                        : '• XII (12th): MCQ, Fill ups, Mixed, One Line'
                      }
                    </Typography>
                  </Box>
                </FormControl>
              </Grid>

              {/* Section */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Section"
                  name="section"
                  size="small"
                  value={form.section}
                  onChange={e => handleField('section', e.target.value)}
                />
              </Grid>

              {/* Quiz Type */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  disableClearable
                  options={getAvailableQuestionTypes(form.standard)}
                  value={form.quiz_type}
                  onChange={(e, v) => handleField('quiz_type', v)}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {option}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getQuestionTypeDescription(option)}
                      </Typography>
                    </Box>
                  )}
                  renderInput={params => (
                    <TextField 
                      {...params} 
                      label="Question Type" 
                      size="small"
                      error={!!errors.quiz_type} 
                      helperText={errors.quiz_type || `Available for Standard ${form.standard === '10' ? 'X' : form.standard === '11' ? 'XI' : 'XII'}`}
                    />
                  )}
                />
              </Grid>

              {/* Complexity */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  disableClearable
                  options={['Easy', 'Medium', 'Hard', 'Mixed']}
                  value={form.complexity}
                  onChange={(e, val) => handleField('complexity', val)}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={params => (
                    <TextField {...params} label="Complexity" size="small" error={!!errors.complexity} helperText={errors.complexity} />
                  )}
                />
              </Grid>

              {form.complexity === 'Mixed' && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Easy Questions"
                      type="number"
                      size="small"
                      value={complexityCounts.easy}
                      onChange={(e) => handleField('complexity_easy', e)}
                      error={!!errors.complexity}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Medium Questions"
                      type="number"
                      size="small"
                      value={complexityCounts.medium}
                      onChange={(e) => handleField('complexity_medium', e)}
                      error={!!errors.complexity}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Hard Questions"
                      type="number"
                      size="small"
                      value={complexityCounts.hard}
                      onChange={(e) => handleField('complexity_hard', e)}
                      error={!!errors.complexity}
                    />
                  </Grid>
                </>
              )}

              {/* Department Single Select */}
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.department} required>
                <Autocomplete
                  id="department-select"
                  freeSolo
                  value={
                      departments.find(d => d.department_id === form.department)?.name ||
                      (typeof form.department === 'string' ? form.department : '')
                  }
                  options={departments.map(d => d.name)}
                  onChange={(e, value) => {
                      const selectedDept = departments.find(d => d.name === value);
                      if (selectedDept) {
                          handleField('department', selectedDept.department_id);
                      } else {
                          handleField('department', value);
                      }
                  }}
                  renderInput={params => (
                      <TextField 
                          {...params} 
                          label="Subject *" 
                          size="small"
                          error={!!errors.department} 
                          helperText={errors.department}
                      />
                  )}
              />
                </FormControl>
              </Grid>
              {/* Passing Score */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Passing Score"
                  size="small"
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
                    <Typography variant="body2" color="text.secondary">Book Name:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.book_name || 'Not set'}</Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Standard:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">
                      {form.standard === '10' ? 'X (10th)' : form.standard === '11' ? 'XI (11th)' : form.standard === '12' ? 'XII (12th)' : 'Not set'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Section:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" fontWeight="medium">{form.section || 'Not set'}</Typography>
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
                    <Typography variant="body2" fontWeight="medium">
                      {form.quiz_type || 'Not set'}
                      {form.quiz_type && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                          {getQuestionTypeDescription(form.quiz_type)}
                        </Typography>
                      )}
                    </Typography>
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
