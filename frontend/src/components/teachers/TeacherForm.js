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
import { getUserFromToken } from '../../utils/auth';

// Simple country list; extend as needed
const COUNTRY_OPTIONS = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'United States' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+61', name: 'Australia' },
  { code: '+81', name: 'Japan' },
];

const TeacherForm = ({ onSuccess, onCancel, teacher }) => {
  const isEditMode = Boolean(teacher && teacher.teacher_id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country_code: '',
    country: '',
    department_ids: [], // Always use IDs in state
    join_date: '',
    join_time: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(false);
  const [allDepartments, setAllDepartments] = useState([]);
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Effect to fetch all departments once on mount
  useEffect(() => {
    const fetchDepartments = async (attempt = 1) => {
      setIsFetchingDepartments(true);
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors.form; return newErrors; }); // Clear any previous errors
      
      try {
        console.log(`Fetching departments (attempt ${attempt})...`);
        
        // Check user authentication state
        const userInfo = getUserFromToken();
        console.log('Current user info:', userInfo);
        
        const response = await departmentApi.getAll();
        console.log('Departments API response:', response);
        
        // Handle different response structures
        let fetchedDepartments = [];
        if (response.data) {
          fetchedDepartments = response.data.results || response.data || [];
        }
        
        console.log('Fetched departments:', fetchedDepartments);
        setAllDepartments(fetchedDepartments);
        setRetryCount(0); // Reset retry count on success
        
        if (fetchedDepartments.length === 0) {
          console.warn('No departments found in response');
          const userRole = userInfo?.role;
          if (userRole === 'TEACHER') {
            setErrors(prev => ({ ...prev, form: 'No subjects assigned to you. Please contact your administrator to assign subjects.' }));
          } else {
            setErrors(prev => ({ ...prev, form: 'No subjects available. Please create subjects first in the Subjects section.' }));
          }
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data
        });
        
        let errorMessage = 'Failed to load subjects.';
        let shouldRetry = false;
        
        if (error.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to access subjects.';
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
          shouldRetry = attempt < 3;
        } else if (error.message.includes('Network Error') || !error.response) {
          errorMessage = 'Network error. Please check your connection.';
          shouldRetry = attempt < 3;
        }
        
        setErrors(prev => ({ ...prev, form: errorMessage }));
        setAllDepartments([]); // Ensure departments are empty on error
        
        // Retry logic for network errors or server errors
        if (shouldRetry) {
          console.log(`Retrying in 2 seconds... (attempt ${attempt + 1})`);
          setRetryCount(attempt);
          setTimeout(() => {
            fetchDepartments(attempt + 1);
          }, 2000);
          return; // Don't set loading to false yet
        }
      } finally {
        if (retryCount === 0) { // Only set to false if not retrying
          setIsFetchingDepartments(false);
        }
      }
    };
    fetchDepartments();
  }, [retryCount]);

  // Effect to populate form when in edit mode or reset for create mode
  useEffect(() => {
    if (isEditMode && teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        country_code: teacher.country_code || '',
        country: teacher.country || '',
        // The teacher object from the list may not have a full 'departments' array.
        // It might just have a `departmentId`. We need to handle this gracefully.
        // The `teacher` object passed to the form should have the full departments array.
        department_ids: teacher.departments?.map(dept => dept.department_id).filter(id => id != null) || [],
        join_date: teacher.join_date ? teacher.join_date.split('T')[0] : (teacher.created_at ? teacher.created_at.split('T')[0] : ''),
        join_time: teacher.join_date ? teacher.join_date.split('T')[1]?.slice(0,5) : '',
      });
    } else {
      // Reset form for create mode with current UTC defaults
      const now = new Date();
      const isoDate = now.toISOString(); // e.g., 2025-06-19T09:25:30.123Z
      const today = isoDate.split('T')[0];
      const timePart = isoDate.split('T')[1].slice(0,5); // HH:MM
      setFormData({
        name: '',
        email: '',
        phone: '',
        country_code: '',
        country: '',
        department_ids: [],
        join_date: today,
        join_time: timePart,
      });
    }
  }, [teacher, isEditMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
    }
  };

  const handleDepartmentChange = (event) => {
    const { target: { value } } = event;
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
    if (!formData.join_time) newErrors.join_time = 'Join time is required';
    // Prevent past datetime
    if (formData.join_date && formData.join_time) {
      const selectedDT = new Date(`${formData.join_date}T${formData.join_time}`);
      if (selectedDT < new Date()) {
        newErrors.join_time = 'Join date/time cannot be in the past';
      }
    }
    if (formData.department_ids.length === 0) newErrors.department_ids = 'At least one department must be selected';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors(prev => { const newErrors = { ...prev }; delete newErrors.form; return newErrors; });

    const basePayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      country_code: formData.country_code,
      country: formData.country,
      // Combine date & time, assume local then convert to UTC ISO
      join_date: new Date(`${formData.join_date}T${formData.join_time}`).toISOString(),
    };

    const finalPayload = {
      ...basePayload,
      department_ids: formData.department_ids,
    };

    try {
      if (isEditMode) {
        await teacherApi.update(teacher.teacher_id, finalPayload);
      } else {
        await teacherApi.create(finalPayload);
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} teacher:`, error);
      const errorData = error.response?.data;
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} teacher. Please try again.`;
      if (errorData) {
        const fieldErrors = [];
        for (const key in errorData) {
          if (Array.isArray(errorData[key])) {
            fieldErrors.push(`${key}: ${errorData[key].join(', ')}`);
          } else if (typeof errorData[key] === 'object') {
             // Handle nested object errors
            for(const subKey in errorData[key]) {
                if (Array.isArray(errorData[key][subKey])) {
                    fieldErrors.push(`${subKey}: ${errorData[key][subKey].join(', ')}`);
                }
            }
          }
        }
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('; ');
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      }
      setErrors(prev => ({ ...prev, form: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>{isEditMode ? 'Edit Teacher' : 'Create New Teacher'}</Typography>
      {errors.form && <Typography color="error" gutterBottom>{errors.form}</Typography>}
      <Grid container spacing={3}>
        {/* Text Fields for teacher info */}
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Full Name" name="name" value={formData.name} onChange={handleInputChange} error={!!errors.name} helperText={errors.name} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} error={!!errors.email} helperText={errors.email} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone Number" name="phone" value={formData.phone} onChange={handleInputChange} error={!!errors.phone} helperText={errors.phone} required />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth>
            <InputLabel id="country-code-label">Country Code</InputLabel>
            <Select
              labelId="country-code-label"
              name="country_code"
              value={formData.country_code}
              label="Country Code"
              onChange={(e) => {
                const selectedCode = e.target.value;
                const match = COUNTRY_OPTIONS.find(c => c.code === selectedCode);
                setFormData(prev => ({
                  ...prev,
                  country_code: selectedCode,
                  country: match ? match.name : prev.country,
                }));
              }}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField fullWidth label="Country" name="country" value={formData.country} onChange={handleInputChange} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Join Date"
            name="join_date"
            type="date"
            value={formData.join_date}
            onChange={(e) => {
              handleInputChange(e);
              // if date changes and equals today, ensure time is >= now
              const selectedDate = e.target.value;
              const today = new Date().toISOString().split('T')[0];
              if (selectedDate !== today) {
                // reset time min
                setFormData(prev => ({ ...prev, join_time: prev.join_time || '00:00' }));
              }
            }}
            error={!!errors.join_date}
            helperText={errors.join_date}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split('T')[0] }}
            required
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Join Time"
            name="join_time"
            type="time"
            value={formData.join_time}
            onChange={handleInputChange}
            error={!!errors.join_time}
            helperText={errors.join_time}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: (() => {
                const today = new Date().toISOString().split('T')[0];
                return formData.join_date === today ? new Date().toISOString().slice(11,16) : '00:00';
              })(),
            }}
            required
          />
        </Grid>

        {/* Department Multi-Select */}
        <Grid item xs={12}>
          <FormControl fullWidth error={!!errors.department_ids} required>
            <InputLabel id="department-select-label">Subjects *</InputLabel>
            <Select
              labelId="department-select-label"
              id="department-select"
              multiple
              open={departmentSelectOpen}
              onOpen={() => setDepartmentSelectOpen(true)}
              onClose={() => setDepartmentSelectOpen(false)}
              value={formData.department_ids} // Use IDs for the value
              onChange={handleDepartmentChange}
              input={<OutlinedInput label="Subjects *" />}
              renderValue={(selectedIds) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selectedIds.map((id) => {
                    const department = allDepartments.find(d => d.department_id === id);
                    return <Chip key={id} label={department ? department.name : `ID: ${id}`} />;
                  })}
                </Box>
              )}
              MenuProps={{ PaperProps: { style: { maxHeight: 300, width: 250 } } }}
            >
              {isFetchingDepartments ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading subjects{retryCount > 0 ? ` (retry ${retryCount})` : ''}...
                </MenuItem>
              ) : allDepartments.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <MenuItem disabled>No subjects available.</MenuItem>
                  {errors.form && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setRetryCount(0);
                        setErrors(prev => { const newErrors = { ...prev }; delete newErrors.form; return newErrors; });
                      }}
                      sx={{ mt: 1 }}
                    >
                      Retry Loading Subjects
                    </Button>
                  )}
                </Box>
              ) : (
                [
                  ...allDepartments.map((dept) => (
                    <MenuItem key={dept.department_id} value={dept.department_id}>
                      <Checkbox checked={formData.department_ids.indexOf(dept.department_id) > -1} />
                      <ListItemText primary={dept.name} />
                    </MenuItem>
                  )),
                  <Box
                    key="done-button-container"
                    sx={{
                      position: 'sticky',
                      bottom: 0,
                      p: 1,
                      bgcolor: 'background.paper',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      zIndex: 1,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDepartmentSelectOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </Box>
                ]
              )}

            </Select>
            {errors.department_ids && <FormHelperText>{errors.department_ids}</FormHelperText>}
          </FormControl>
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isLoading || isFetchingDepartments}>
            {isLoading ? <CircularProgress size={24} /> : isEditMode ? 'Update Teacher' : 'Create Teacher'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherForm;
