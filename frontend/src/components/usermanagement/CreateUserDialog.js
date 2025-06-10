import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Grid, Select, MenuItem, FormControl, InputLabel, FormHelperText, Switch, FormControlLabel, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const CreateUserDialog = ({ open, onClose, onSave, initialData, isEditing, isSaving }) => {
  const defaultFormData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student',
    status: true, // Active by default
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          password: '', // Password fields are typically not pre-filled for editing
          confirmPassword: '',
          role: initialData.role || 'Student',
          status: initialData.status === 'Active' || initialData.status === true, // Handle both string and boolean
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({}); // Clear errors when dialog opens or mode changes
    }
  }, [open, isEditing, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    let tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = 'Name is required.';
    if (!formData.email.trim()) {
      tempErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      tempErrors.email = 'Email is not valid.';
    }

    if (!isEditing || formData.password) { // Password required for new users or if being changed
      if (!formData.password) tempErrors.password = 'Password is required.';
      else if (formData.password.length < 6) tempErrors.password = 'Password must be at least 6 characters.';
      if (formData.password !== formData.confirmPassword) tempErrors.confirmPassword = 'Passwords do not match.';
    }
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const dataToSave = { ...formData };
      if (!isEditing || !formData.password) { // Don't send empty password if not changed during edit
        delete dataToSave.password;
        delete dataToSave.confirmPassword;
      }
      onSave(dataToSave, isEditing ? initialData.id : null);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData(defaultFormData);
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  const handleMouseDownPassword = (event) => event.preventDefault();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
                autoFocus
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                fullWidth
                required
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password}
                fullWidth
                required={!isEditing} // Required only if creating or explicitly changing
                disabled={isSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                fullWidth
                required={!isEditing || !!formData.password} // Required if password field has content
                disabled={isSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleClickShowConfirmPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.role}>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <MenuItem value="Student">Student</MenuItem>
                  <MenuItem value="Teacher">Teacher</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                </Select>
                {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Switch checked={formData.status} onChange={handleChange} name="status" disabled={isSaving} />}
                label={formData.status ? 'Status: Active' : 'Status: Inactive'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleClose} color="inherit" disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateUserDialog;
