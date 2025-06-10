import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Grid
} from '@mui/material';

const EditProfileDialog = ({ open, onClose, onSave, userData, isSaving }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userData && open) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        bio: userData.bio || '',
      });
      setErrors({}); // Clear errors when dialog opens with new data
    } else if (!open) {
      // Reset form when dialog is closed externally, if not already reset by internal close
      setFormData({ name: '', email: '', bio: '' });
      setErrors({});
    }
  }, [userData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
      handleClose(); // Close after successful save
    }
  };

  const handleClose = () => {
    // Don't reset form here if onClose is called externally before saving
    // Resetting is handled by useEffect when open becomes false
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Profile</DialogTitle>
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
            <Grid item xs={12}>
              <TextField
                label="Bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                multiline
                rows={4}
                fullWidth
                disabled={isSaving}
                placeholder="Tell us a little about yourself..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleClose} color="inherit" disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditProfileDialog;
