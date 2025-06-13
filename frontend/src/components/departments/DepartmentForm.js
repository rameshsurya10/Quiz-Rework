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
  CircularProgress,
  Typography
} from '@mui/material';
import { teacherApi } from '../../services/api'; // Assuming teacherApi is set up for /api/teachers/

const DepartmentForm = ({ department = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState(''); // For HOD
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeachers(true);
      try {
        // Ensure teacherApi.getAll() fetches from /api/teachers/ and returns array with teacher_id and name
        const response = await teacherApi.getAll(); 
        setTeachers(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setErrors(prev => ({ ...prev, teachers: 'Failed to load teachers.' }));
      } finally {
        setLoadingTeachers(false);
      }
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        code: department.code || '',
        description: department.description || '',
      });
      // If editing, and department has HOD info (e.g., department.teacher_id), set it
      // This part depends on how HOD info is passed for an existing department
      setSelectedTeacherId(department.teacher_id || ''); 
    } else {
      setFormData({ name: '', code: '', description: '' });
      setSelectedTeacherId('');
    }
  }, [department]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTeacherSelectChange = (event) => {
    setSelectedTeacherId(event.target.value);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Department name is required.';
    if (!formData.code.trim()) newErrors.code = 'Department code is required.';
    // Add more validation as needed (e.g., code format)
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
      };
      if (selectedTeacherId) {
        payload.teacher_id = parseInt(selectedTeacherId, 10); // Ensure it's an integer
      }
      onSubmit(payload); // This will be departmentApi.create(payload) from the parent
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        {department ? 'Edit Department' : 'Create New Department'}
      </Typography>
      <TextField
        fullWidth
        label="Department Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.name}
        helperText={errors.name}
        required
        variant="outlined"
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
        required
        variant="outlined"
      />
      <TextField
        fullWidth
        label="Description (Optional)"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        margin="normal"
        multiline
        rows={3}
        variant="outlined"
      />
      <FormControl fullWidth margin="normal" variant="outlined" error={!!errors.teachers}>
        <InputLabel id="hod-select-label">Head of Department (Optional)</InputLabel>
        <Select
          labelId="hod-select-label"
          id="hod-select"
          value={selectedTeacherId}
          onChange={handleTeacherSelectChange}
          label="Head of Department (Optional)"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {loadingTeachers ? (
            <MenuItem disabled value="">
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading teachers...
            </MenuItem>
          ) : teachers.length === 0 && !errors.teachers ? (
            <MenuItem disabled value="">
              No teachers available.
            </MenuItem>
          ) : (
            teachers.map((teacher) => (
              // Ensure teacher object has teacher_id (PK) and name
              <MenuItem key={teacher.teacher_id} value={teacher.teacher_id}>
                {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
              </MenuItem>
            ))
          )}
        </Select>
        {errors.teachers && <FormHelperText>{errors.teachers}</FormHelperText>}
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isSubmitting || loadingTeachers}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Saving...' : (department ? 'Update Department' : 'Create Department')}
        </Button>
      </Box>
    </Box>
  );
};

export default DepartmentForm;
