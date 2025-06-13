import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  OutlinedInput,
  Chip,
  CircularProgress,
  Typography,
  Checkbox,
  ListItemText
} from '@mui/material';
import { departmentApi, teacherApi } from '../../services/api';

const TeacherForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_ids: [], // Will store array of department names for the payload
    join_date: '',
  });
  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(false);
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      setIsFetchingDepartments(true);
      try {
        // Assuming departmentApi.getAll() or similar exists as per memory, or use direct path
        // const response = await apiService.departmentApi.getAll(); 
        const response = await departmentApi.getAll();
        const fetchedDepartments = response.data?.results || response.data || [];
        setDepartments(fetchedDepartments);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setErrors(prev => ({ ...prev, form: 'Failed to load departments.' }));
      }
      setIsFetchingDepartments(false);
    };
    fetchDepartments();
  }, []);

  const handleMultiSelectChange = (name) => (event) => {
    setFormData(prev => ({
      ...prev,
      [name]: event.target.value,
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const handleDepartmentChange = (event) => {
    const { target: { value } } = event;
    // value is an array of selected department names
    setFormData(prev => ({ 
      ...prev, 
      department_ids: typeof value === 'string' ? value.split(',') : value,
    }));
    if (errors.department_ids) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.department_ids; return newErrors; });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s+/g, ''))) {
        newErrors.phone = 'Enter a valid phone number (e.g., +1234567890)';
    }
    if (!formData.join_date) newErrors.join_date = 'Join date is required';
    if (formData.department_ids.length === 0) newErrors.department_ids = 'At least one department must be selected';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors(prev => { const newErrors = { ...prev }; delete newErrors.form; return newErrors; });

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      department_names: formData.department_ids, // Send as department_names (array of names)
      join_date: formData.join_date,
    };

    try {
      // Using apiService.api.post as specific teacherApi might not be defined in api.js based on earlier views
      await teacherApi.create(payload);
      if (onSuccess) onSuccess();
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        department_ids: [],
        join_date: '',
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
      const errorData = error.response?.data;
      let errorMessage = 'Failed to create teacher. Please try again.';
      if (errorData) {
        const fieldErrors = [];
        for (const key in errorData) {
          if (Array.isArray(errorData[key])) {
            fieldErrors.push(`${key}: ${errorData[key].join(', ')}`);
          }
        }
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('; ');
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      }
      setErrors(prev => ({ ...prev, form: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
      <Typography variant="h6" gutterBottom>Create New Teacher</Typography>
      {errors.form && <Typography color="error" gutterBottom>{errors.form}</Typography>}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            error={!!errors.email}
            helperText={errors.email}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            error={!!errors.phone}
            helperText={errors.phone}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Join Date"
            name="join_date"
            type="date"
            value={formData.join_date}
            onChange={handleInputChange}
            error={!!errors.join_date}
            helperText={errors.join_date}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
        </Grid>
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
              value={formData.department_ids} // This will be an array of department names
              onChange={handleMultiSelectChange('department_ids')}
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
              {isFetchingDepartments ? (
                <MenuItem disabled>Loading departments...</MenuItem>
              ) : departments.length === 0 ? (
                <MenuItem disabled>No departments available or failed to load.</MenuItem>
              ) : (
                departments.map((dept) => (
                  <MenuItem key={dept.uuid} value={dept.name}> {/* Value is name */}
                    <Checkbox checked={formData.department_ids.includes(dept.name)} /> {/* Check against name */}
                    <ListItemText primary={dept.name} />
                  </MenuItem>
                ))
              )}
              <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setDepartmentSelectOpen(false)}>Done</Button>
              </Box>
            </Select>
            {errors.department_ids && <FormHelperText>{errors.department_ids}</FormHelperText>}
          </FormControl>
        </Grid>

        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isLoading || isFetchingDepartments}>
            {isLoading ? <CircularProgress size={24} /> : 'Create Teacher'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherForm;
