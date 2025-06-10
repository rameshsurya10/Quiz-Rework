import React, { useState, useCallback, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormHelperText,
  useTheme,
  styled
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const DropzoneArea = styled(Paper)(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
  transition: 'all 0.3s ease',
  marginBottom: theme.spacing(3),
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}));

const ComplexityOption = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.primary.light + '1a' : theme.palette.background.paper,
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
}));

const COMPLEXITY_OPTIONS = [
  {
    value: 'LITE',
    label: 'LITE',
    description: 'BASIC UNDERSTANDING AND RECALL OF MAIN CONCEPTS'
  },
  {
    value: 'MEDIUM',
    label: 'MEDIUM',
    description: 'DEEPER UNDERSTANDING AND APPLICATION OF CONCEPTS'
  },
  {
    value: 'EXPERT',
    label: 'EXPERT',
    description: 'ADVANCED ANALYSIS AND COMPLEX PROBLEM-SOLVING'
  }
];

const GenerateQuizForm = ({ onSubmit, isSubmitting = false }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    duration: 30,
    numQuestions: 10,
    description: '',
    complexity: 'MEDIUM',
    file: null,
    department: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    // Fetch departments when component mounts
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/departments');
        setDepartments(response.data || []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    
    fetchDepartments();
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFormData(prev => ({
        ...prev,
        file,
        numPages: 0 // Reset page count when new file is uploaded
      }));
      // Here you would typically extract the number of pages from the PDF
      // For now, we'll set a placeholder
      // In a real app, you'd use a PDF parsing library to get the actual page count
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'numQuestions' || name === 'numPages' 
        ? parseInt(value) || 0 
        : value
    }));
  };

  const handleComplexitySelect = (complexity) => {
    setFormData(prev => ({
      ...prev,
      complexity
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Quiz name is required';
    if (!formData.file) newErrors.file = 'Please upload a document';
    if (formData.duration <= 0) newErrors.duration = 'Duration must be greater than 0';
    if (formData.numQuestions <= 0) newErrors.numQuestions = 'Number of questions must be greater than 0';
    if (!formData.department) newErrors.department = 'Department is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.name}
        helperText={errors.name}
        sx={{ mb: 3 }}
      />

      <DropzoneArea 
        {...getRootProps()} 
        isDragActive={isDragActive}
        elevation={isDragActive ? 8 : 1}
      >
        <input {...getInputProps()} />
        <CloudUpload fontSize="large" color="action" sx={{ mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {formData.file ? formData.file.name : "Drag 'n' drop PDF files that will be turned into quizzes"}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {formData.file ? 'Click to change file' : 'or click to select files'}
        </Typography>
        {errors.file && (
          <FormHelperText error sx={{ mt: 1 }}>
            {errors.file}
          </FormHelperText>
        )}
      </DropzoneArea>



      <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 2 }}>
        Complexity
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {COMPLEXITY_OPTIONS.map((option) => (
          <Grid item xs={12} sm={6} md={3} key={option.value}>
            <ComplexityOption 
              onClick={() => handleComplexitySelect(option.value)}
              selected={formData.complexity === option.value}
            >
              <Typography variant="subtitle2" gutterBottom>
                {option.label}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {option.description}
              </Typography>
            </ComplexityOption>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Duration (minutes)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleInputChange}
            error={!!errors.duration}
            helperText={errors.duration}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Number of Questions"
            name="numQuestions"
            type="number"
            value={formData.numQuestions}
            onChange={handleInputChange}
            error={!!errors.numQuestions}
            helperText={errors.numQuestions}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        multiline
        rows={4}
        margin="normal"
        sx={{ mb: 3 }}
      />

      <FormControl fullWidth margin="normal" sx={{ mb: 3 }} error={!!errors.department}>
        <InputLabel id="department-select-label">Department</InputLabel>
        <Select
          labelId="department-select-label"
          id="department-select"
          name="department"
          label="Department"
          value={formData.department}
          onChange={handleInputChange}
        >
          <MenuItem value="">Select a department</MenuItem>
          {departments.map((dept) => (
            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
          ))}
        </Select>
        {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={isSubmitting}
        sx={{
          py: 1.5,
          borderRadius: '12px',
          textTransform: 'none',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #7B1FA2 30%, #9C27B0 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #6A1B9A 30%, #8E24AA 90%)',
          },
        }}
      >
        {isSubmitting ? 'Generating...' : 'GENERATE'}
      </Button>
    </Box>
  );
};

export default GenerateQuizForm;
