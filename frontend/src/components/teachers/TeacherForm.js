
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { departmentApi } from '../../services/api';

const TeacherForm = ({ teacher = null, onSubmit, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    first_name: teacher?.first_name || '',
    last_name: teacher?.last_name || '',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    department: teacher?.department || '',
    employee_id: teacher?.employee_id || '',
    position: teacher?.position || ''
  });
  
  const [isNewDepartment, setIsNewDepartment] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Fetch departments when component mounts
    const fetchDepartments = async () => {
      try {
        const response = await departmentApi.getAll();
        // Ensure we have an array from the API response
        const departmentsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        setDepartments(departmentsData);
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

  const handleDepartmentChange = (event) => {
    setFormData(prev => ({
      ...prev,
      department: event.target.value,
    }));
  };

  const validate = () => {
    const newErrors = {};
    
    // Required fields validation
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Invalid email format';
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    // Department validation
    if (isNewDepartment) {
      if (!formData.department || !formData.department.trim()) {
        newErrors.department = 'Please enter a department name';
      }
    } else if (!formData.department) {
      newErrors.department = 'Please select a department';
    }
    
    // Employee ID validation
    if (!formData.employee_id.trim()) {
      newErrors.employee_id = 'Employee ID is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First validate all fields
    if (!validate()) {
      // If validation fails, don't proceed
      return;
    }
    
    // If we're creating a new department, handle that first
    if (isNewDepartment) {
      const success = await handleCreateDepartment(formData.department);
      if (!success) return; // Stop if department creation failed
    } else if (!formData.department) {
      setErrors(prev => ({ 
        ...prev, 
        department: 'Please select or create a department' 
      }));
      return;
    }
    
    // If we get here, all validations passed
    onSubmit(formData);
  };

  const handleCreateDepartment = async (deptName) => {
    if (!deptName || !deptName.trim()) {
      setErrors(prev => ({ ...prev, department: 'Department name is required' }));
      return false;
    }

    try {
      setIsLoading(true);
      const response = await departmentApi.create({ name: deptName });
      const newDept = response.data;
      
      // Update departments list and select the new department
      setDepartments(prev => [...prev, newDept]);
      setFormData(prev => ({
        ...prev,
        department: newDept.id
      }));
      
      setErrors(prev => ({ ...prev, department: undefined }));
      setIsNewDepartment(false);
      return true;
    } catch (error) {
      console.error('Create department error:', error);
      const errorMsg = error.response?.data?.name?.[0] || 
                     error.response?.data?.detail || 
                     'Failed to create department. Please try again.';
      setErrors(prev => ({ ...prev, department: errorMsg }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Call onSubmit with null to indicate cancellation
    if (onSubmit) {
      onSubmit(null);
    }
  };

  const isCreatingTeacher = !teacher;

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 3 }} onClick={(e) => e.stopPropagation()}>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            error={!!errors.first_name}
            helperText={errors.first_name}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            error={!!errors.last_name}
            helperText={errors.last_name}
            required
          />
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          error={!!errors.email}
          helperText={errors.email}
          required
        />
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={!!errors.phone}
            helperText={errors.phone}
            required
          />
        </Grid>

      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Employee ID"
            name="employee_id"
            value={formData.employee_id}
            onChange={handleInputChange}
            error={!!errors.employee_id}
            helperText={errors.employee_id}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Position"
            name="position"
            value={formData.position}
            onChange={handleInputChange}
            error={!!errors.position}
            helperText={errors.position}
          />
        </Grid>
      </Grid>
      
      {/* Department Field (Dropdown or Inline Add) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          {!isNewDepartment ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControl
                fullWidth
                error={!!errors.department}
                required
                sx={{
                  '& .MuiInputBase-root': {
                    height: 56, // Match TextField height
                  },
                }}
              >
                <InputLabel id="department-select-label" shrink={true}>
                  Department
                </InputLabel>
                <Select
                  labelId="department-select-label"
                  value={formData.department || ''}
                  onChange={handleDepartmentChange}
                  label="Department"
                  displayEmpty
                  inputProps={{ 'aria-label': 'Select department' }}
                  renderValue={(selected) => {
                    if (!selected) {
                      return <span style={{ opacity: 0.7 }}>Select a department</span>;
                    }
                    const dept = departments.find(d => d.id === selected);
                    return dept ? dept.name : '';
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 200,
                        marginTop: 8,
                        zIndex: 1300,
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <em>No departments available</em>
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.department && (
                  <FormHelperText>{errors.department}</FormHelperText>
                )}
              </FormControl>
              <Button
                type="button"
                variant="contained"
                size="small"
                onClick={() => {
                  setIsNewDepartment(true);
                  setFormData(prev => ({ ...prev, department: '' }));
                }}
                sx={{
                  minWidth: 40,
                  minHeight: 40,
                  p: 0,
                  fontSize: '0.75rem',
                  borderRadius: 1,
                }}
                title="Add new department"
              >
                <AddIcon fontSize="small" />
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                fullWidth
                label="New Department Name"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                error={!!errors.department}
                helperText={errors.department}
                autoFocus
                size="medium"
                sx={{
                  '& .MuiInputBase-root': {
                    height: 56
                  }
                }}
              />
              <Button
                type="button"
                variant="contained"
                size="small"
                onClick={async () => {
                  const success = await handleCreateDepartment(formData.department);
                  if (success) {
                    handleSubmit({ preventDefault: () => {} });
                  }
                }}
                disabled={isLoading}
                sx={{
                  minWidth: 40,
                  minHeight: 40,
                  p: 0,
                  fontSize: '0.75rem',
                  borderRadius: 1,
                }}
              >
                {isLoading ? '...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => {
                  setIsNewDepartment(false);
                  setFormData(prev => ({ ...prev, department: '' }));
                }}
                sx={{
                  minWidth: 40,
                  minHeight: 40,
                  p: 0,
                  fontSize: '0.75rem',
                  borderRadius: 1,
                }}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button 
          type="button"
          onClick={handleCancel}
          variant="outlined" 
          color="secondary"
          size="small"
          sx={{
            height: 36,
            minWidth: 80,
            textTransform: 'none',
            fontSize: '0.875rem',
            borderColor: 'grey.400',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'grey.600',
              backgroundColor: 'action.hover',
            },
          }}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          variant="contained" 
          color="primary" 
          size="small"
          disabled={isSubmitting || Object.keys(errors).length > 0}
          sx={{
            height: 36,
            minWidth: 80,
            textTransform: 'none',
            fontSize: '0.875rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none'
            },
            '&.Mui-disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {isSubmitting ? 'Saving...' : (teacher ? 'Update' : 'Save')}
        </Button>
      </Box>
    </Box>
  );
};

export default TeacherForm;
