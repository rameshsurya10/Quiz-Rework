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

const TeacherForm = ({ onSuccess, onCancel, teacher }) => {
  const isEditMode = Boolean(teacher && teacher.teacher_id);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department_ids: [], // Always use IDs in state
    join_date: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDepartments, setIsFetchingDepartments] = useState(false);
  const [allDepartments, setAllDepartments] = useState([]);
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);

  // Effect to fetch all departments once on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      setIsFetchingDepartments(true);
      try {
        const response = await departmentApi.getAll();
        const fetchedDepartments = response.data?.results || response.data || [];
        setAllDepartments(fetchedDepartments);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setErrors(prev => ({ ...prev, form: 'Failed to load departments.' }));
      }
      setIsFetchingDepartments(false);
    };
    fetchDepartments();
  }, []);

  // Effect to populate form when in edit mode or reset for create mode
  useEffect(() => {
    if (isEditMode && teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        // The teacher object from the list may not have a full 'departments' array.
        // It might just have a `departmentId`. We need to handle this gracefully.
        // The `teacher` object passed to the form should have the full departments array.
        department_ids: teacher.departments?.map(dept => dept.department_id).filter(id => id != null) || [],
        join_date: teacher.join_date || (teacher.created_at ? teacher.created_at.split('T')[0] : ''),
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        email: '',
        phone: '',
        department_ids: [],
        join_date: '',
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
      join_date: formData.join_date,
    };

    let finalPayload;

    if (isEditMode) {
      // For updates, the backend expects 'department_ids'
      finalPayload = {
        ...basePayload,
        department_ids: formData.department_ids,
      };
    } else {
      // For creates, the backend expects 'department_names'
      finalPayload = {
        ...basePayload,
        department_names: formData.department_ids.map(id => {
          const dept = allDepartments.find(d => d.id === id);
          return dept ? dept.name : '';
        }).filter(name => name && name.trim() !== ''),
      };
    }

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
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Join Date" name="join_date" type="date" value={formData.join_date} onChange={handleInputChange} error={!!errors.join_date} helperText={errors.join_date} InputLabelProps={{ shrink: true }} required />
        </Grid>

        {/* Department Multi-Select */}
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
              value={formData.department_ids} // Use IDs for the value
              onChange={handleDepartmentChange}
              input={<OutlinedInput label="Departments *" />}
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
                <MenuItem disabled>Loading departments...</MenuItem>
              ) : allDepartments.length === 0 ? (
                <MenuItem disabled>No departments available.</MenuItem>
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
