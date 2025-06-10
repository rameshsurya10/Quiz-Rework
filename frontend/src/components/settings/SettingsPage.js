import React, { useState, useEffect } from 'react';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup, Button, Divider, useTheme, Alert
} from '@mui/material';
import { PageHeader } from '../common';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import { motion } from 'framer-motion';
import { settingsApi } from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

const SettingsPage = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await settingsApi.getSettings();
        if (response.data) {
          // Map backend snake_case to frontend camelCase
          setSettings({
            emailNotifications: response.data.email_notifications,
            pushNotifications: response.data.push_notifications,
            darkMode: response.data.dark_mode
          });
          console.log('Settings loaded successfully');
        } else {
          // Use defaults if no data
          setSettings({ emailNotifications: true, pushNotifications: false, darkMode: false });
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        showSnackbar('Failed to load settings. Please try again or save new settings.', 'error');
        // Keep default settings or previously loaded ones if error on subsequent fetch
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [showSnackbar]);

  const handleChange = (event) => {
    setSettings({
      ...settings,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Map frontend camelCase to backend snake_case
      const backendSettings = {
        email_notifications: settings.emailNotifications,
        push_notifications: settings.pushNotifications,
        dark_mode: settings.darkMode
      };
      
      await settingsApi.updateSettings(backendSettings);
      console.log('Settings saved successfully:', settings);
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar(`Failed to save settings: ${error.response?.data?.detail || error.message || 'Please try again.'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const sectionPaperStyles = {
    p: { xs: 2, md: 3 },
    mb: 3,
    borderRadius: '12px',
    boxShadow: theme.shadows[2],
  };

  return (
    <FullLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Application Settings"
          subtitle="Manage your notification preferences, appearance, and account settings."
        />

        {isLoading && (
           <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Typography>Loading settings...</Typography>
           </Box>
        )} 

        {!isLoading && (

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Notification Settings */}
          <Paper sx={sectionPaperStyles}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'medium' }}>
              <NotificationsIcon sx={{ mr: 1, color: theme.palette.primary.main }} /> Notification Preferences
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={settings.emailNotifications} onChange={handleChange} name="emailNotifications" disabled={isSaving || isLoading} />}
                label="Email Notifications"
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ pl: 4, mb:1 }}>
                Receive important updates and summaries via email.
              </Typography>
              <FormControlLabel
                control={<Switch checked={settings.pushNotifications} onChange={handleChange} name="pushNotifications" disabled={isSaving || isLoading} />}
                label="Push Notifications"
              />
              <Typography variant="caption" color="text.secondary" sx={{ pl: 4 }}>
                Get real-time alerts directly on your device (if supported).
              </Typography>
            </FormGroup>
          </Paper>

          {/* Appearance Settings */}
          <Paper sx={sectionPaperStyles}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'medium' }}>
              <PaletteIcon sx={{ mr: 1, color: theme.palette.secondary.main }} /> Appearance
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={settings.darkMode} onChange={handleChange} name="darkMode" disabled={isSaving || isLoading} />}
                label="Dark Mode"
              />
               <Typography variant="caption" color="text.secondary" sx={{ pl: 4 }}>
                Toggle between light and dark themes for the application.
              </Typography>
            </FormGroup>
            {/* Add more appearance settings here if needed, e.g., theme color picker */}
          </Paper>

          {/* Account Settings */}
          <Paper sx={sectionPaperStyles}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', fontWeight: 'medium' }}>
              <AccountCircleIcon sx={{ mr: 1, color: theme.palette.error.main }} /> Account Management
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <Button variant="outlined" color="info" onClick={() => console.log('Export Data clicked')} disabled={isSaving || isLoading}>
                Export My Data
              </Button>
              <Button variant="outlined" color="error" onClick={() => console.log('Delete Account clicked')} disabled={isSaving || isLoading}>
                Delete My Account
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Be careful with these actions. Deleting your account is irreversible.
            </Typography>
          </Paper>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveSettings} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </Box>
        </motion.div>
        )}

      </Container>
    </FullLayout>
  );
};

export default SettingsPage;
