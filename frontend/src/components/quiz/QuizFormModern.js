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
  FormHelperText
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
  quiz_date: ''
};

const QuizFormModern = ({ onSave, onCancel }) => {
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(false);
  
  // Alias form as formData for consistency in the component
  const formData = form;

  useEffect(() => {
    api.get('/api/departments/')
      .then(({ data }) => setDepartments(data.results || data))
      .catch(console.error)
      .finally(() => setDeptLoading(false));
  }, []);

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

  const handleFilesSelect = (selectedFiles) => {
    setForm(prev => ({
      ...prev,
      files: selectedFiles
    }));
  };

  const validate = () => {
    const errs = {};
    ['title', 'complexity', 'quiz_type'].forEach(field => {
      if (!form[field]) errs[field] = 'Required';
    });
    if (!form.department.length) errs.department = 'Select at least one';
    if (!form.quiz_date) errs.quiz_date = 'Quiz date is required'; // <-- NEW
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setUploadProgress(0);
    setIsFadingOut(false);

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'files') {
        v.forEach(file => formData.append('files', file));
      } else if (Array.isArray(v)) {
        v.forEach(x => formData.append(k, x));
      } else {
        formData.append(k, v);
      }
    });

    try {
      // Use onUploadProgress to show real progress, capped at 95%
      await onSave(formData, (event) => {
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
          setIsCreating(false);
          navigate('/dashboard');
        }, 500); // Corresponds to fade-out animation duration
      }, 500); // 0.5s hold

    } catch (err) {
      console.error('Upload failed:', err);
      setLoading(false); // Hide loader on error
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 1200, mx: 'auto', position: 'relative' }}>
      <form onSubmit={handleSubmit} noValidate style={{ position: 'relative' }}>
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
                <FileUpload onFilesSelect={handleFilesSelect} />
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
                  onChange={e => handleField('no_of_questions', e.target.value)}
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
                  renderInput={params => (
                    <TextField {...params} label="Quiz Type" error={!!errors.quiz_type} helperText={errors.quiz_type} />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={['Easy','Medium','Hard','Mixed']}
                  value={form.complexity}
                  onChange={(e, v) => handleField('complexity', v)}
                  renderInput={params => (
                    <TextField {...params} label="Complexity" error={!!errors.complexity} helperText={errors.complexity} />
                  )}
                />
              </Grid>

              {/* Department Multi-select */}
              <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.department_ids} required>
            <InputLabel id="department-select-label">Departments *</InputLabel>
            <Select
              labelId="department-select-label"
              id="department-select"
              multiple
              open={departmentSelectOpen}
              onOpen={() => setDepartmentSelectOpen(true)}
              onClose={() => setDepartmentSelectOpen(false)}
              value={form.department || []}
              onChange={(e) => {
                setForm(prev => ({
                  ...prev,
                  department: e.target.value
                }));
              }}
              input={<OutlinedInput label="Departments *" />}
              renderValue={(selectedNames) => {
                // Display selected names as Chips
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedNames.map(name => <Chip key={name} label={name} />)}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300, // Increased height to accommodate button
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
                  <MenuItem key={dept.uuid} value={dept.name}> {/* Value is name */}
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
    </Paper>
  );
};

export default QuizFormModern;
