import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Skeleton,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Notifications,
  Security,
  Save,
  Edit,
  Lock,
} from '@mui/icons-material';
import { userApi, settingsApi } from '../../services/api';
import TeacherLayout from './TeacherLayout';

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const ProfileTab = ({ profile, onUpdate, snackbar, setSnackbar }) => {
  const [localProfile, setLocalProfile] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localProfile);
      setIsEditing(false);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update profile.', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!localProfile) {
    return <Grid container spacing={3}>
        <Grid item xs={12} md={4}><Skeleton variant="circular" width={120} height={120} /></Grid>
        <Grid item xs={12} md={8}><Skeleton height={56} /><Skeleton height={56} /><Skeleton height={56} /></Grid>
    </Grid>;
  }

  return (
    <Card sx={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)', borderRadius: 3 }}>
      <CardContent>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Avatar sx={{ width: 120, height: 120, margin: 'auto', bgcolor: '#e17055' }}>
              <Typography variant="h2" sx={{ color: 'white' }}>
                {localProfile.first_name?.[0]?.toUpperCase()}
              </Typography>
            </Avatar>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="First Name"
              value={localProfile.first_name || ''}
              fullWidth
              margin="normal"
              disabled={!isEditing}
              onChange={(e) => setLocalProfile({...localProfile, first_name: e.target.value})}
            />
            <TextField
              label="Last Name"
              value={localProfile.last_name || ''}
              fullWidth
              margin="normal"
              disabled={!isEditing}
              onChange={(e) => setLocalProfile({...localProfile, last_name: e.target.value})}
            />
            <TextField
              label="Email"
              value={localProfile.email || ''}
              fullWidth
              margin="normal"
              disabled
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          {isEditing ? (
            <>
              <Button variant="text" onClick={() => setIsEditing(false)} sx={{color: '#e17055'}}>
                Cancel
              </Button>
              <Button 
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />} 
                variant="contained" 
                onClick={handleSave} 
                disabled={isSaving}
                sx={{bgcolor: '#e17055', '&:hover': {bgcolor: '#d4624a'}}}
              >
                Save
              </Button>
            </>
          ) : (
            <Button 
              startIcon={<Edit />} 
              variant="contained" 
              onClick={() => setIsEditing(true)} 
              sx={{bgcolor: '#e17055', '&:hover': {bgcolor: '#d4624a'}}}
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const TeacherSettingsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [settings, setSettings] = useState({email_notifications: false});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const profileResponse = await userApi.getProfile();
      setUserProfile(profileResponse.data);
      const settingsResponse = await settingsApi.getSettings();
      setSettings(settingsResponse.data);
    } catch (err) {
      setError('Failed to load settings data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleProfileUpdate = async (updatedProfile) => {
    const { data } = await userApi.updateProfile(updatedProfile);
    setUserProfile(data);
  };

  const handleSettingsUpdate = async (event) => {
    const newSettings = { ...settings, [event.target.name]: event.target.checked };
    setSettings(newSettings);
    try {
      await settingsApi.updateSettings(newSettings);
      setSnackbar({ open: true, message: 'Settings updated!', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update settings.', severity: 'error' });
      // Revert on failure
      setSettings(settings);
    }
  };


  return (
    <TeacherLayout>
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 3 } }}>
        <Typography variant="h4" gutterBottom sx={{ color: '#333', fontWeight: 600, mb: 3 }}>
          Settings
        </Typography>
        
        {loading ? (
           <CircularProgress sx={{color: '#e17055', display: 'block', margin: 'auto', mt: 4}} />
        ) : error ? (
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        ) : (
          <>
            <Card sx={{ background: '#fff', borderRadius: 3, mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#e17055' },
                  '& .MuiTab-root': { color: '#7f8c8d' },
                  '& .Mui-selected': { color: '#e17055 !important' },
                }}
              >
                <Tab icon={<Person />} label="Profile" />
                <Tab icon={<Notifications />} label="Notifications" />
                <Tab icon={<Security />} label="Security" />
              </Tabs>
            </Card>

            <TabPanel value={activeTab} index={0}>
              <ProfileTab
                profile={userProfile}
                onUpdate={handleProfileUpdate}
                snackbar={snackbar}
                setSnackbar={setSnackbar}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <Card sx={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{mb: 2}}>Notification Settings</Typography>
                  <FormControlLabel
                    control={<Switch checked={settings.email_notifications} onChange={handleSettingsUpdate} name="email_notifications" color="primary" />}
                    label="Email Notifications"
                  />
                   <Typography variant="body2" color="text.secondary">Receive email notifications for quiz submissions and other updates.</Typography>
                </CardContent>
              </Card>
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <Card sx={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)', borderRadius: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{mb: 2}}>Security Settings</Typography>
                  <Button startIcon={<Lock />} variant="contained" sx={{bgcolor: '#e17055', '&:hover': {bgcolor: '#d4624a'}}}>
                    Change Password
                  </Button>
                   <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>It's a good practice to use a strong password that you're not using elsewhere.</Typography>
                </CardContent>
              </Card>
            </TabPanel>
          </>
        )}
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', boxShadow: 6 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </TeacherLayout>
  );
};

export default TeacherSettingsPage;
