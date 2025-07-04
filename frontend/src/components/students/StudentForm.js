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
import { studentApi } from '../../services/api';

const StudentForm = ({ student = null, departments = [], onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    class_name: '',
    section: '',
    register_number: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        department: student.department_id || student.department || '',
        phone: student.phone || '',
        class_name: student.class_name || '',
        section: student.section || '',
        register_number: student.register_number || ''
      });
    } else {
      setFormData({ name: '', email: '', department: '', phone: '', class_name: '', section: '', register_number: '' });
    }
  }, [student]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.department) newErrors.department = 'Subject is required';
    if (!formData.class_name) newErrors.class_name = 'Class is required';
    if (!formData.section) newErrors.section = 'Section is required';
    if (!formData.register_number) newErrors.register_number = 'Register number is required';
    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const studentData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department_id: formData.department,
        class_name: formData.class_name,
        section: formData.section,
        register_number: formData.register_number
      };

      if (student) {
        await studentApi.update(student.id, studentData);
      } else {
        await studentApi.create(studentData);
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (error.response?.data?.email && error.response.data.email[0]) ||
        'Failed to save student. Please check the details and try again.';
      if (onError) onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate className="glass-effect" sx={{ p: 3, borderRadius: '8px' }}>
      <TextField
        fullWidth
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        margin="normal"
        required
        error={!!errors.name}
        helperText={errors.name}
      />

      <TextField
        fullWidth
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        margin="normal"
        required
        error={!!errors.email}
        helperText={errors.email}
      />

      <FormControl fullWidth margin="normal" required error={!!errors.department}>
        <InputLabel id="department-select-label">Subject</InputLabel>
        <Select
          labelId="department-select-label"
          name="department"
          label="Subject"
          value={formData.department}
          onChange={handleInputChange}
        >
          <MenuItem value=""><em>Select a subject</em></MenuItem>
          {departments.map((dept) => (
            <MenuItem key={dept.department_id} value={dept.department_id}>
              {dept.name}
            </MenuItem>
          ))}
        </Select>
        {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
      </FormControl>

      <TextField
        fullWidth
        label="Phone Number"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.phone}
        helperText={errors.phone || 'Optional: 10-digit phone number'}
      />

      <TextField
        fullWidth
        label="Class"
        name="class_name"
        value={formData.class_name}
        onChange={handleInputChange}
        margin="normal"
        required
        error={!!errors.class_name}
        helperText={errors.class_name}
      />

      <TextField
        fullWidth
        label="Section"
        name="section"
        value={formData.section}
        onChange={handleInputChange}
        margin="normal"
        required
        error={!!errors.section}
        helperText={errors.section}
      />

      <TextField
        fullWidth
        label="Register Number"
        name="register_number"
        value={formData.register_number}
        onChange={handleInputChange}
        margin="normal"
        required
        error={!!errors.register_number}
        helperText={errors.register_number}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={isSubmitting}
        sx={{ mt: 2, py: 1.5 }}
      >
        {isSubmitting ? 'Saving...' : student ? 'Update Student' : 'Create Student'}
      </Button>
    </Box>
  );
};

export default StudentForm;
