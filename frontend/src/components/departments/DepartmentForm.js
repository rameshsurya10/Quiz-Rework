import React, { useState, useCallback } from 'react';
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
  IconButton,
  useTheme,
  styled
} from '@mui/material';
import { CloudUpload, AddCircle } from '@mui/icons-material';
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

const DepartmentForm = ({ department = null, onSubmit, isSubmitting = false }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: department?.name || '',
    code: department?.code || '',
    description: department?.description || '',
    icon: department?.icon || 'school',
    color: department?.color || '#4285F4',
    studentCsvFile: null
  });
  
  const [errors, setErrors] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFormData(prev => ({
        ...prev,
        studentCsvFile: file
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Department name is required';
    if (!formData.code.trim()) newErrors.code = 'Department code is required';
    
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
        label="Department Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.name}
        helperText={errors.name}
        sx={{ mb: 3 }}
      />

      <TextField
        fullWidth
        label="Department Code"
        name="code"
        value={formData.code}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.code}
        helperText={errors.code}
        sx={{ mb: 3 }}
      />

      {!department && (
        <DropzoneArea 
          {...getRootProps()} 
          isDragActive={isDragActive}
          elevation={isDragActive ? 8 : 1}
        >
          <input {...getInputProps()} />
          <CloudUpload fontSize="large" color="action" sx={{ mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {formData.studentCsvFile ? formData.studentCsvFile.name : "Drag 'n' drop CSV file with student information"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {formData.studentCsvFile ? 'Click to change file' : 'or click to select files'}
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
            Format: email,first_name,last_name,student_id
          </Typography>
        </DropzoneArea>
      )}

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

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Icon Name"
            name="icon"
            value={formData.icon}
            onChange={handleInputChange}
            margin="normal"
            helperText="Material icon name (e.g., 'school', 'book')"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Color"
            name="color"
            type="color"
            value={formData.color}
            onChange={handleInputChange}
            margin="normal"
          />
        </Grid>
      </Grid>

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
        {isSubmitting ? 'Saving...' : department ? 'UPDATE DEPARTMENT' : 'CREATE DEPARTMENT'}
      </Button>
    </Box>
  );
};

export default DepartmentForm;
