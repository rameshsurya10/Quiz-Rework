import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Grid, IconButton, InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const ChangePasswordDialog = ({ open, onClose, onSave, isSaving }) => {
  const defaultFormData = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(defaultFormData); // Reset form when dialog opens
      setErrors({});
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    let tempErrors = {};
    if (!formData.currentPassword) tempErrors.currentPassword = 'Current password is required.';
    if (!formData.newPassword) {
      tempErrors.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 6) {
      tempErrors.newPassword = 'New password must be at least 6 characters.';
    }
    if (!formData.confirmNewPassword) {
      tempErrors.confirmNewPassword = 'Confirm new password is required.';
    } else if (formData.newPassword !== formData.confirmNewPassword) {
      tempErrors.confirmNewPassword = 'New passwords do not match.';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // In a real app, you'd verify currentPassword against the backend here.
      // For this mock, we'll assume it's correct if provided.
      onSave({ 
        currentPassword: formData.currentPassword, 
        newPassword: formData.newPassword 
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    onClose();
  };

  const createToggleVisibilityHandler = (setter) => () => setter(show => !show);
  const handleMouseDownPassword = (event) => event.preventDefault();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Current Password"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={handleChange}
                error={!!errors.currentPassword}
                helperText={errors.currentPassword}
                fullWidth
                required
                autoFocus
                disabled={isSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={createToggleVisibilityHandler(setShowCurrentPassword)}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="New Password"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                error={!!errors.newPassword}
                helperText={errors.newPassword}
                fullWidth
                required
                disabled={isSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={createToggleVisibilityHandler(setShowNewPassword)}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Confirm New Password"
                name="confirmNewPassword"
                type={showConfirmNewPassword ? 'text' : 'password'}
                value={formData.confirmNewPassword}
                onChange={handleChange}
                error={!!errors.confirmNewPassword}
                helperText={errors.confirmNewPassword}
                fullWidth
                required
                disabled={isSaving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={createToggleVisibilityHandler(setShowConfirmNewPassword)}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showConfirmNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleClose} color="inherit" disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
