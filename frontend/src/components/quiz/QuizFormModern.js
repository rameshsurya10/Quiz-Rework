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

const initialFormState = {
  title: '',
  description: '',
  files: [],
  no_of_questions: '',
  time_limit_minutes: '',
  complexity: '',
  quiz_type: '',
  department: [],
  passing_score: '',
  quiz_date: '',
  page_ranges: '',
  metadata: {}
};

const QuizFormModern = ({ onSave, onCancel, departments: initialDepartments }) => {
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
  
  // Alias form as formData for consistency in the component
  const formData = form;

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
  
  const handlePageRangesChange = useCallback((pageRanges) => {
    // Only update if the value has actually changed
    if (form.page_ranges !== pageRanges) {
      setForm(prev => ({
        ...prev,
        page_ranges: pageRanges,
        metadata: {
          ...prev.metadata,
          page_ranges_str: pageRanges
        }
      }));
      
      // Clear any existing page range errors when the value changes
      if (errors.page_ranges) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.page_ranges;
          return newErrors;
        });
      }
    }
  }, [form.page_ranges, errors.page_ranges]);

  const validate = () => {
    const errs = {};
    ['title', 'complexity', 'quiz_type'].forEach(field => {
      if (!form[field]) errs[field] = 'Required';
    });
    if (!form.department.length) errs.department = 'Select at least one';
    if (!form.quiz_date) errs.quiz_date = 'Quiz date is required';
    
    // Check number of questions limit
    if (form.no_of_questions && parseInt(form.no_of_questions) > MAX_QUESTIONS) {
      errs.no_of_questions = `Maximum ${MAX_QUESTIONS} questions allowed`;
    }
    
    // Validate page ranges if provided
    if (form.page_ranges) {
      const pattern = /^(\d+(-\d+)?)(,\d+(-\d+)?)*$/;
      if (!pattern.test(form.page_ranges)) {
        errs.page_ranges = 'Invalid page range format';
      } else {
        // Check that ranges are valid (start <= end)
        const rangeParts = form.page_ranges.split(',');
        for (const part of rangeParts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (start > end) {
              errs.page_ranges = `Invalid range: ${start}-${end}. Start must be <= end.`;
              break;
            }
            if (start <= 0) {
              errs.page_ranges = "Page numbers must be positive";
              break;
            }
          } else if (parseInt(part) <= 0) {
            errs.page_ranges = "Page numbers must be positive";
            break;
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
      'MCQ': 'multiple_choice',
      'Fill ups': 'fill_in_blanks',
      'True/False': 'true_false',
      'One Line': 'one_line',
      'Mixed': 'mixed'
    };

    // Create a copy of the form data
    const payload = {
      ...form,
      quiz_type: form.complexity,
      question_type: questionTypeMapping[form.quiz_type] || form.quiz_type,
    };
    delete payload.complexity;
    
    // Ensure page_ranges are included in both the payload and metadata
    if (form.page_ranges) {
      if (!payload.metadata) {
        payload.metadata = {};
      }
      payload.metadata.page_ranges_str = form.page_ranges;
      payload.page_ranges = form.page_ranges;
    }

    try {
      // Use onUploadProgress to show real progress, capped at 95%
      await onSave(payload, (event) => {
        if (event.lengthComputable) {
          const progress = Math.min(95, Math.round((100 * event.loaded) / event.total));
          setUploadProgress(progress);
        }
      });

      // When upload is complete, jump to 100%
      setUploadProgress(100);

      // Hold at 100% for 0.5s, then fade out
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setLoading(false);
        }, 500); // Corresponds to fade-out animation duration
      }, 500); // 0.5s hold

    } catch (err) {
      console.error('Upload failed:', err);
      setLoading(false); // Hide loader on error
      
      // Check for limit error responses
      if (err.response && err.response.data) {
        const { title, message } = err.response.data;
        if (title && message) {
          // Show error dialog with the server's message
          setErrorDialog({
            open: true,
            title: title,
            message: message
          });
          return;
        }
      }
      
      // Generic error handling
      setErrorDialog({
        open: true,
        title: 'Error',
        message: 'Failed to create quiz. Please try again.'
      });
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 1200, mx: 'auto' }} className="glass-effect">
      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={4}>
          {/* Left Column */}
          <Grid item xs={12} md={6}>
            <Typography variant="h5" fontWeight={600} mb={3}>
              Create a New Quiz
            </Typography>

            <Grid container spacing={3}>
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
                />
              </Grid>

              {/* File Upload */}
              <Grid item xs={12}>
                <FileUpload 
                  onFilesSelect={handleFilesSelect} 
                  onPageRangesChange={handlePageRangesChange}
                />
                
                {form.page_ranges && (
                  <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 1 }}>
                    <Typography variant="caption" color="primary">
                      <strong>Selected Pages:</strong> {form.page_ranges}
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
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Time Limit (min)"
                  value={form.time_limit_minutes}
                  onChange={e => handleField('time_limit_minutes', e.target.value)}
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
                  helperText={errors.quiz_date}
                />
              </Grid>


              {/* Quiz Type & Complexity */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
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
                  options={['Easy','Medium','Hard','Mixed']}
                  value={form.complexity}
                  onChange={(e, v) => handleField('complexity', v)}
                  isOptionEqualToValue={(option, value) => option === value}
                  renderInput={params => (
                    <TextField {...params} label="Complexity" error={!!errors.complexity} helperText={errors.complexity} />
                  )}
                />
              </Grid>

              {/* Department Multi-select */}
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.department} required>
                  <InputLabel id="department-select-label">Subjects *</InputLabel>
                  <Select
                    labelId="department-select-label"
                    id="department-select"
                    multiple
                    open={departmentSelectOpen}
                    onOpen={() => setDepartmentSelectOpen(true)}
                    onClose={() => setDepartmentSelectOpen(false)}
                    value={form.department || []}
                    onChange={(e) => {
                      const { target: { value } } = e;
                      handleField(
                        'department',
                        // On autofill we get a stringified value.
                        typeof value === 'string' ? value.split(',') : value,
                      );
                    }}
                    input={<OutlinedInput label="Subjects *" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(Array.isArray(selected) ? selected : []).map((name) => (
                          <Chip key={name} label={name} />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          width: 250,
                        },
                      },
                    }}
                  >
                    {deptLoading ? (
                      <MenuItem disabled>Loading departments...</MenuItem>
                    ) : departments.length === 0 ? (
                      <MenuItem disabled>No departments available or failed to load.</MenuItem>
                    ) : (
                      departments.map((dept) => (
                        <MenuItem key={dept.uuid} value={dept.name}>
                          <Checkbox checked={(form.department || []).includes(dept.name)} />
                          <ListItemText primary={dept.name} />
                        </MenuItem>
                      ))
                    )}
                    <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button size="small" onClick={() => setDepartmentSelectOpen(false)}>Done</Button>
                    </Box>
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
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" textAlign="right" display="block">{uploadProgress}% Uploaded</Typography>
              </Box>
            )}

            <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
              <Button variant="outlined" onClick={onCancel} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}>
                {loading ? 'Creating...' : 'Create Quiz'}
              </Button>
            </Box>
          </Grid>

          {/* Right Column: Illustration */}
          <Grid item xs={12} md={6} display={{ xs: 'none', md: 'block' }}>
            <QuizImage />
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
