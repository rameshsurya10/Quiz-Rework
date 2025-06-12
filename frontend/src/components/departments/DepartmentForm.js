import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress
} from '@mui/material';
import { userApi } from '../../services/api';

const DepartmentForm = ({ department = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    teachers: [],
  });
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await userApi.getAllTeachers();
        setTeachers(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        teachers: department.teachers?.map(t => t.id) || [],
      });
    } else {
      setFormData({ name: '', teachers: [] });
    }
  }, [department]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTeacherChange = (event) => {
    const { value } = event.target;
    setFormData(prev => ({ ...prev, teachers: typeof value === 'string' ? value.split(',') : value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Department name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const payload = {
        name: formData.name,
        teacher_ids: formData.teachers,
      };
      onSubmit(payload);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>;
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="Department Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.name}
        helperText={errors.name || 'Enter the name of the department'}
        sx={{ mb: 3 }}
        required
        variant="outlined"
      />
      <FormControl fullWidth sx={{ mb: 3 }} variant="outlined">
        <InputLabel id="teachers-label">Teachers</InputLabel>
        <Select
          labelId="teachers-label"
          id="teachers-select"
          multiple
          value={formData.teachers}
          onChange={handleTeacherChange}
          input={<OutlinedInput label="Teachers" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const teacher = teachers.find(t => t.id === value);
                return teacher ? (
                  <Chip 
                    key={value} 
                    label={`${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`}
                    size="small"
                  />
                ) : null;
              })}
            </Box>
          )}
        >
          {teachers.map((teacher) => (
            <MenuItem key={teacher.id} value={teacher.id}>
              {`${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`}
              {teacher.employee_id ? ` (${teacher.employee_id})` : ''}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Select one or more teachers for this department</FormHelperText>
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Saving...' : (department ? 'Update Department' : 'Create Department')}
        </Button>
      </Box>
    </Box>
  );
};

export default DepartmentForm;
