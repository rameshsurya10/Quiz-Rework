import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  useTheme
} from '@mui/material';
import axios from 'axios';

const StudentForm = ({ student = null, onSubmit, isSubmitting = false }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    first_name: student?.first_name || '',
    last_name: student?.last_name || '',
    email: student?.email || '',
    student_id: student?.student_id || '',
    department: student?.department || '',
    phone: student?.phone || ''
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email format';
    if (!formData.student_id.trim()) newErrors.student_id = 'Student ID is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    
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
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            margin="normal"
            error={!!errors.first_name}
            helperText={errors.first_name}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name (Optional)"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            margin="normal"
          />
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.email}
        helperText={errors.email}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Student ID"
            name="student_id"
            value={formData.student_id}
            onChange={handleInputChange}
            margin="normal"
            error={!!errors.student_id}
            helperText={errors.student_id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="normal" error={!!errors.department}>
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
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Phone *"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.phone}
        helperText={errors.phone || '10-digit phone number'}
        sx={{ mb: 3 }}
      />

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
        {isSubmitting ? 'Saving...' : student ? 'UPDATE STUDENT' : 'CREATE STUDENT'}
      </Button>
    </Box>
  );
};

export default StudentForm;
