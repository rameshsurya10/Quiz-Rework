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
  Typography,
  OutlinedInput,
  Chip,
  RadioGroup,
  FormLabel,
  Radio,
  FormControlLabel,
} from '@mui/material';
import { teacherApi } from '../../services/api'; // Assuming teacherApi is set up for /api/teachers/

const DepartmentForm = ({ department = null, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    class_name: '', // Add class_name to form state
    sections: '', // New field for sections
  });
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]); // Multiple teacher IDs
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
        class_name: department.class_name || '', // Pre-fill if editing
        sections: department.sections || '', // Pre-fill if editing
      });
      // If editing, and department has HOD info (e.g., department.teacher_id), set it
      // This part depends on how HOD info is passed for an existing department
      if (Array.isArray(department.teachers)) {
        setSelectedTeacherIds(department.teachers.map((t) => t.teacher_id ?? t.id));
      } else {
        setSelectedTeacherIds(department.teacher_ids || []);
      }
    } else {
      setFormData({ name: '', code: '', description: '', class_name: '', sections: '' });
      setSelectedTeacherIds([]);
    }
  }, [department]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTeacherSelectChange = (event) => {
    const {
      target: { value },
    } = event;
    // On autofill we get a stringified value
    setSelectedTeacherIds(typeof value === 'string' ? value.split(',') : value);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Subject name is required.';
    if (!formData.code.trim()) newErrors.code = 'Subject code is required.';
    if (!formData.class_name) newErrors.class_name = 'Standard is required.';
    // Optionally validate sections if required
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
        class_name: formData.class_name, // Add class_name to payload
        sections: formData.sections, // Add sections to payload
      };
      if (selectedTeacherIds && selectedTeacherIds.length > 0) {
        payload.teacher_ids = selectedTeacherIds.map((id) => parseInt(id, 10));
      }
      onSubmit(payload); // This will be departmentApi.create(payload) from the parent
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} className="glass-effect" sx={{ p: 3, borderRadius: '8px', minWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        {department ? 'Edit Subject' : 'Create New Subject'}
      </Typography>
      <TextField
        fullWidth
        label="Subject Name"
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
        label="Sections"
        name="sections"
        value={formData.sections}
        onChange={handleInputChange}
        margin="normal"
        placeholder="e.g. A, B, C"
        variant="outlined"
      />
      <TextField
        fullWidth
        label="Subject Code"
        name="code"
        value={formData.code}
        onChange={handleInputChange}
        margin="normal"
        error={!!errors.code}
        helperText={errors.code}
        required
        variant="outlined"
      />
      <FormControl component="fieldset" margin="normal" required error={!!errors.class_name}>
        <FormLabel component="legend">Standard *</FormLabel>
        <RadioGroup
          row
          name="class_name"
          value={formData.class_name}
          onChange={handleInputChange}
        >
          <FormControlLabel value="10" control={<Radio />} label="X" />
          <FormControlLabel value="11" control={<Radio />} label="XI" />
          <FormControlLabel value="12" control={<Radio />} label="XII" />
        </RadioGroup>
        {errors.class_name && <FormHelperText>{errors.class_name}</FormHelperText>}
      </FormControl>
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
        <InputLabel id="teacher-multi-select-label">Teachers (Optional)</InputLabel>
        <Select
          labelId="teacher-multi-select-label"
          id="teacher-multi-select"
          multiple
          value={selectedTeacherIds}
          onChange={handleTeacherSelectChange}
          input={<OutlinedInput label="Teachers (Optional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const teacherObj = teachers.find((t) => (t.teacher_id ?? t.id) === value);
                return <Chip key={value} label={teacherObj?.name || value} />;
              })}
            </Box>
          )}
        >
          {loadingTeachers ? (
            <MenuItem disabled value="">
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading teachers...
            </MenuItem>
          ) : teachers.length === 0 && !errors.teachers ? (
            <MenuItem disabled value="">
              No teachers available.
            </MenuItem>
          ) : (
            teachers.map((teacher) => {
              const tId = teacher.teacher_id ?? teacher.id;
              return (
                <MenuItem key={tId} value={tId}>
                  {teacher.name} {teacher.email ? `(${teacher.email})` : ''}
                </MenuItem>
              );
            })
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
          {isSubmitting ? 'Saving...' : (department ? 'Update Subject' : 'Create Subject')}
        </Button>
      </Box>
    </Box>
  );
};

export default DepartmentForm;
