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
  Chip,
  OutlinedInput,
  useTheme
} from '@mui/material';
import axios from 'axios';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const TeacherForm = ({ teacher = null, onSubmit, isSubmitting = false }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    first_name: teacher?.first_name || '',
    last_name: teacher?.last_name || '',
    email: teacher?.email || '',
    employee_id: teacher?.employee_id || '',
    departments: teacher?.departments || [],
    qualification: teacher?.qualification || '',
    specialization: teacher?.specialization || '',
    phone: teacher?.phone || '',
    address: teacher?.address || ''
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

  const handleDepartmentsChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData(prev => ({
      ...prev,
      departments: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email format';
    if (!formData.employee_id.trim()) newErrors.employee_id = 'Employee ID is required';
    if (formData.departments.length === 0) newErrors.departments = 'At least one department is required';
    
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
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            margin="normal"
            error={!!errors.last_name}
            helperText={errors.last_name}
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
            label="Employee ID"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleInputChange}
            margin="normal"
            error={!!errors.employee_id}
            helperText={errors.employee_id}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth margin="normal" error={!!errors.departments}>
            <InputLabel id="departments-label">Departments</InputLabel>
            <Select
              labelId="departments-label"
              id="departments-select"
              multiple
              value={formData.departments}
              onChange={handleDepartmentsChange}
              input={<OutlinedInput label="Departments" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const dept = departments.find(d => d.id === value);
                    return <Chip key={value} label={dept ? dept.name : value} />;
                  })}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))}
            </Select>
            {errors.departments && <FormHelperText>{errors.departments}</FormHelperText>}
          </FormControl>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Qualification"
            name="qualification"
            value={formData.qualification}
            onChange={handleInputChange}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Specialization"
            name="specialization"
            value={formData.specialization}
            onChange={handleInputChange}
            margin="normal"
          />
        </Grid>
      </Grid>

      <TextField
        fullWidth
        label="Phone"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        margin="normal"
        sx={{ mb: 3 }}
      />

      <TextField
        fullWidth
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleInputChange}
        multiline
        rows={3}
        margin="normal"
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
        {isSubmitting ? 'Saving...' : teacher ? 'UPDATE TEACHER' : 'CREATE TEACHER'}
      </Button>
    </Box>
  );
};

export default TeacherForm;
