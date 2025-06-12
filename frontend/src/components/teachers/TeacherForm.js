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
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { departmentApi } from '../../services/api';

const TeacherForm = ({ teacher = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: teacher?.name || '',
    email: teacher?.email || '',
    phone: teacher?.phone || '',
    department: teacher?.department || '',
    departmentId: teacher?.departmentId || ''
  });
  
  const [isNewDepartment, setIsNewDepartment] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const isCreatingTeacher = !teacher;
  
  useEffect(() => {
    const fetchDepartments = async () => {
      setIsLoading(true);
      try {
        const response = await departmentApi.getAll();
        const departmentsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.results || []);
        setDepartments(departmentsData);
        
        if (teacher?.departmentId) {
          setFormData(prev => ({
            ...prev,
            departmentId: teacher.departmentId
          }));
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setErrors(prev => ({
          ...prev,
          department: 'Failed to load departments. Please try again.'
        }));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDepartments();
  }, [teacher]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDepartmentChange = (event) => {
    const selectedValue = event.target.value;
    const selectedDept = departments.find(dept => dept.id === selectedValue);
    
    setFormData(prev => ({
      ...prev,
      department: selectedDept ? selectedDept.name : '',
      departmentId: selectedValue
    }));
    
    if (errors.department) {
      setErrors(prev => ({
        ...prev,
        department: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (isNewDepartment) {
      if (!formData.department || !formData.department.trim()) {
        newErrors.department = 'Please enter a department name';
      }
    } else if (!formData.department) {
      newErrors.department = 'Please select a department';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    if (isNewDepartment) {
      const success = await handleCreateDepartment(formData.department);
      if (!success) return;
    }
    
    try {
      await onSubmit({
        ...formData,
        department: formData.departmentId || formData.department
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleCreateDepartment = async (departmentName) => {
    if (!departmentName?.trim()) {
      setErrors(prev => ({
        ...prev,
        department: 'Please enter a department name'
      }));
      return false;
    }

    setIsLoading(true);
    try {
      const response = await departmentApi.create({ name: departmentName });
      const newDepartment = response.data;
      
      setDepartments(prev => [...prev, newDepartment]);
      
      setFormData(prev => ({
        ...prev,
        department: newDepartment.name,
        departmentId: newDepartment.id
      }));
      
      setIsNewDepartment(false);
      return true;
    } catch (error) {
      console.error('Error creating department:', error);
      const errorMessage = error.response?.data?.name?.[0] ||
                         error.response?.data?.detail ||
                         'Failed to create department';
      
      setErrors(prev => ({
        ...prev,
        department: errorMessage
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = (e) => {
    e.preventDefault();
    if (onCancel) {
      onCancel();
    } else {
      // Default behavior if no onCancel handler provided
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        departmentId: ''
      });
      setErrors({});
      setIsNewDepartment(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            error={!!errors.name}
            helperText={errors.name}
            required
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Mobile Number"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={!!errors.phone}
            helperText={errors.phone}
            required
            margin="normal"
          />
        </Grid>
        
        <Grid item xs={12}>
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
            margin="normal"
          />
        </Grid>
        
        <Grid item xs={12}>
          {isNewDepartment ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
              <TextField
                fullWidth
                label="New Department Name"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                error={!!errors.department}
                helperText={errors.department}
                autoFocus
                margin="normal"
              />
              <Button 
                variant="contained" 
                onClick={async (e) => {
                  e.preventDefault();
                  const success = await handleCreateDepartment(formData.department);
                  if (success) setFormData(prev => ({ ...prev, department: '' }));
                }}
                disabled={isLoading}
                sx={{ mt: 2, height: 56, minWidth: 100 }}
              >
                {isLoading ? 'Adding...' : 'Add'}
              </Button>
              <Button 
                variant="outlined" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsNewDepartment(false);
                  setErrors(prev => ({ ...prev, department: undefined }));
                }}
                disabled={isLoading}
                sx={{ mt: 2, height: 56 }}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
              <FormControl 
                fullWidth 
                error={!!errors.department} 
                required
                sx={{ flex: 1 }}
                margin="normal"
              >
                <InputLabel>Department</InputLabel>
                <Select
                  value={formData.departmentId || ''}
                  onChange={handleDepartmentChange}
                  label="Department"
                  displayEmpty
                  inputProps={{ 'aria-label': 'Select department' }}
                >
                  <MenuItem value="" disabled>
                    <em>Select a department</em>
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
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={(e) => {
                  e.preventDefault();
                  setIsNewDepartment(true);
                  setFormData(prev => ({ ...prev, department: '' }));
                  setErrors(prev => ({ ...prev, department: undefined }));
                }}
                disabled={isLoading}
                sx={{ mt: 2, height: 56 }}
              >
                New
              </Button>
            </Box>
          )}
        </Grid>
        
        <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={isLoading || isSubmitting}
            sx={{ minWidth: 120 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading || isSubmitting}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                Saving...
              </>
            ) : isCreatingTeacher ? 'Create' : 'Update'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherForm;
