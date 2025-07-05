import React, { useState, useEffect } from 'react';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup, Button, Divider, useTheme, Tabs, Tab, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, InputLabel, FormControl, RadioGroup, Radio, Card, CardContent, CardActions, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link, alpha, useMediaQuery, Avatar, CircularProgress, InputAdornment, IconButton, Alert
} from '@mui/material';
import { PageHeader } from '../../common';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import LanguageIcon from '@mui/icons-material/Language';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ContrastIcon from '@mui/icons-material/Contrast';
import StyleIcon from '@mui/icons-material/Style';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EventNoteIcon from '@mui/icons-material/EventNote';
import QuizIcon from '@mui/icons-material/Quiz';
import GradingIcon from '@mui/icons-material/Grading';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import api from '../../services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useThemeContext } from '../../contexts/ThemeContext';
import { getTimezoneOptions } from '../../utils/localeUtils';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Mock Data for Billing
const billingHistory = [
  { date: '2024-07-01', details: 'Professional Plan - Monthly', amount: '$48.00', id: 'inv-001' },
  { date: '2024-06-01', details: 'Professional Plan - Monthly', amount: '$48.00', id: 'inv-002' },
  { date: '2024-05-01', details: 'Beginner Plan - Monthly', amount: '$10.00', id: 'inv-003' },
];

const defaultSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  landingPage: '/dashboard',
  emailNotifications: true, 
  pushNotifications: false, 
  quizReminders: true, 
  gradeNotifications: true, 
  notificationFrequency: 'instant',
  autoRenew: true,
};

const SettingsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSnackbar } = useSnackbar();
  const { mode, toggleMode, appearance, changeAppearance, highContrast, toggleHighContrast } = useThemeContext();
  const [tabValue, setTabValue] = useState(0);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('professional');
  const [profileImage, setProfileImage] = useState(null);

  // Options lists generated once
  const timezoneOptions = React.useMemo(getTimezoneOptions, []);

  const [settings, setSettings] = useState(defaultSettings);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Hide read-only duplicates of first/last name and email in the General Settings form.
  // If you ever need them back, flip this flag to true.
  const showBasicReadonlyFields = false;

  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Get the authentication token from localStorage - check all possible token keys
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     localStorage.getItem('access_token') || 
                     localStorage.getItem('accessToken');
        
        // If no token, try to get user data from localStorage as fallback
        if (!token) {
          console.warn('No authentication token found, using localStorage data');
          setError('Authentication token not found. Please log in again.');
          const userData = {
            firstName: localStorage.getItem('userFirstName') || 'John',
            lastName: localStorage.getItem('userLastName') || 'Doe',
            email: localStorage.getItem('userEmail') || 'john.doe@example.com',
            phone: localStorage.getItem('userPhone') || '+1 (555) 123-4567',
            bio: localStorage.getItem('userBio') || 'Mathematics teacher with 5+ years of experience',
            profileImage: localStorage.getItem('userProfileImage') || null
          };
          
          setSettings(prev => ({
            ...prev,
            ...userData
          }));
          
          setProfileImage(userData.profileImage);
          setIsLoading(false);
          return;
        }
        
        // Fetch both user details and profile data
        const [userResponse, profileResponse] = await Promise.all([
          api.get('/api/accounts/me/'),
          api.get('/api/accounts/profile/')
        ]);
        
        // Process the response data
        if (userResponse.data && profileResponse.data) {
          const userData = userResponse.data;
          const profileData = profileResponse.data;
          
          console.log('User data fetched successfully:', { user: userData, profile: profileData });
          
          // Update settings with user data
          setSettings(prev => ({
            ...prev,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: profileData.phone || '',
            bio: profileData.bio || '',
          }));
          
          // Set profile image
          setProfileImage(profileData.avatar_url || null);
          
          // Load other settings from localStorage
          const savedSettings = localStorage.getItem('appSettings');
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setSettings(prev => ({
              ...prev,
              timezone: parsedSettings.timezone || prev.timezone,
              landingPage: parsedSettings.landingPage || prev.landingPage,
              emailNotifications: profileData.email_notifications !== undefined ? profileData.email_notifications : prev.emailNotifications,
              pushNotifications: profileData.push_notifications !== undefined ? profileData.push_notifications : prev.pushNotifications,
              quizReminders: parsedSettings.quizReminders !== undefined ? parsedSettings.quizReminders : prev.quizReminders,
              gradeNotifications: parsedSettings.gradeNotifications !== undefined ? parsedSettings.gradeNotifications : prev.gradeNotifications,
              notificationFrequency: parsedSettings.notificationFrequency || prev.notificationFrequency,
              autoRenew: parsedSettings.autoRenew !== undefined ? parsedSettings.autoRenew : prev.autoRenew,
            }));
          }
        } else {
          throw new Error('No data received from API');
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        
        // Set error message based on error type
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 401 || error.response.status === 403) {
            setError('Authentication failed. Please log in again.');
          } else {
            setError(`Server error: ${error.response.status}. Please try again later.`);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setError('Network error. Please check your connection and try again.');
        } else {
          // Something happened in setting up the request that triggered an Error
          setError(`Error: ${error.message}`);
        }
        
        // Fallback to localStorage data
        const userData = {
          firstName: localStorage.getItem('userFirstName') || 'John',
          lastName: localStorage.getItem('userLastName') || 'Doe',
          email: localStorage.getItem('userEmail') || 'john.doe@example.com',
          phone: localStorage.getItem('userPhone') || '+1 (555) 123-4567',
          bio: localStorage.getItem('userBio') || 'Mathematics teacher with 5+ years of experience',
          profileImage: localStorage.getItem('userProfileImage') || null
        };
        
        setSettings(prev => ({
          ...prev,
          ...userData
        }));
        
        setProfileImage(userData.profileImage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Update real-time clock each second in selected timezone
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [settings.timezone]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    // Only allow editing bio, phone and profile picture
    if (name === 'bio' || name === 'phone') {
      setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Get the authentication token from localStorage - check all possible token keys
      const token = localStorage.getItem('token') || 
                   localStorage.getItem('authToken') || 
                   localStorage.getItem('access_token') || 
                   localStorage.getItem('accessToken');
      
      // If no token, save to localStorage only
      if (!token) {
        console.warn('No authentication token found, saving to localStorage only');
        
        // Save editable fields to localStorage
        if (tabValue === 1) { // General tab (profile)
          localStorage.setItem('userPhone', settings.phone);
          localStorage.setItem('userBio', settings.bio);
        }
        
        // Save notification settings to localStorage
        if (tabValue === 2) { // Notifications tab
          const savedSettings = localStorage.getItem('appSettings') ? 
            JSON.parse(localStorage.getItem('appSettings')) : {};
          
          localStorage.setItem('appSettings', JSON.stringify({
            ...savedSettings,
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        quizReminders: settings.quizReminders,
        gradeNotifications: settings.gradeNotifications,
        notificationFrequency: settings.notificationFrequency,
          }));
        }
        
        // Save other settings to localStorage
        const savedSettings = localStorage.getItem('appSettings') ? 
          JSON.parse(localStorage.getItem('appSettings')) : {};
        
        localStorage.setItem('appSettings', JSON.stringify({
          ...savedSettings,
          timezone: settings.timezone,
          landingPage: settings.landingPage,
          autoRenew: settings.autoRenew
        }));
        
        showSnackbar('Settings saved locally (offline mode)', 'success');
        setIsSaving(false);
        return;
      }
      
      // Save profile changes to API
      if (tabValue === 1) { // General tab (profile)
        await api.patch('/api/accounts/profile/', {
          bio: settings.bio,
          phone: settings.phone,
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Save to localStorage as backup
        localStorage.setItem('userPhone', settings.phone);
        localStorage.setItem('userBio', settings.bio);
      }
      
      // Save notification settings to API
      if (tabValue === 2) { // Notifications tab
        await api.patch('/api/accounts/profile/', {
            email_notifications: settings.emailNotifications,
            push_notifications: settings.pushNotifications,
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Save other notification settings to localStorage since they're not in the API
        const savedSettings = localStorage.getItem('appSettings') ? 
          JSON.parse(localStorage.getItem('appSettings')) : {};
        
        localStorage.setItem('appSettings', JSON.stringify({
          ...savedSettings,
          quizReminders: settings.quizReminders,
          gradeNotifications: settings.gradeNotifications,
          notificationFrequency: settings.notificationFrequency,
        }));
      }
      
      // Save other app settings to localStorage
      const savedSettings = localStorage.getItem('appSettings') ? 
        JSON.parse(localStorage.getItem('appSettings')) : {};
      
      localStorage.setItem('appSettings', JSON.stringify({
        ...savedSettings,
        timezone: settings.timezone,
        landingPage: settings.landingPage,
        autoRenew: settings.autoRenew
      }));
      
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar(`Failed to save settings: ${error.message}`, 'error');
      
      // Still save to localStorage as fallback
      if (tabValue === 1) { // General tab (profile)
        localStorage.setItem('userPhone', settings.phone);
        localStorage.setItem('userBio', settings.bio);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    setConfirmOpen(false);
    showSnackbar('Account deletion initiated.', 'warning');
  };

  const getCardStyles = () => ({
    background: theme.custom?.glassmorphism && !theme.custom?.highContrast
      ? 'rgba(255, 255, 255, 0.08)'
      : theme.palette.background.paper,
    backdropFilter: theme.custom?.glassmorphism && !theme.custom?.highContrast ? 'blur(20px)' : 'none',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.custom?.appearance === 'royal' ? '16px' : theme.custom?.appearance === 'classic' ? '8px' : '12px',
    boxShadow: theme.custom?.highContrast 
      ? `2px 2px 0px ${theme.palette.text.primary}`
      : theme.shadows[1],
    transition: 'all 0.3s ease',
  });

  const handleProfileImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        // Show loading state
        setIsLoading(true);
        
        // Get the authentication token from localStorage - check all possible token keys
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     localStorage.getItem('access_token') || 
                     localStorage.getItem('accessToken');
        
        // If no token, just update locally
        if (!token) {
          console.warn('No authentication token found, updating profile image locally only');
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfileImage(reader.result);
            localStorage.setItem('userProfileImage', reader.result);
            showSnackbar('Profile image updated locally (offline mode)', 'success');
          };
          reader.readAsDataURL(file);
          setIsLoading(false);
          return;
        }
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Upload to API
        const response = await api.post('/api/accounts/me/avatar/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Update UI with the new image URL from response
        if (response && response.data) {
          const imageUrl = response.data.avatar_url;
          
          if (imageUrl) {
            setProfileImage(imageUrl);
            localStorage.setItem('userProfileImage', imageUrl);
          } else {
            // Fallback to local preview if API doesn't return the image URL
            const reader = new FileReader();
            reader.onloadend = () => {
              setProfileImage(reader.result);
              localStorage.setItem('userProfileImage', reader.result);
            };
            reader.readAsDataURL(file);
          }
        } else {
          throw new Error('No data received from API');
        }
        
        showSnackbar('Profile image updated successfully!', 'success');
      } catch (error) {
        console.error('Failed to upload profile image:', error);
        showSnackbar('Failed to upload profile image. Using local preview instead.', 'warning');
        
        // Fallback to local preview if API fails
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result);
          localStorage.setItem('userProfileImage', reader.result);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <FullLayout>
      <Box sx={{ 
        minHeight: '100vh',
        background: theme.palette.background.default,
        padding: { xs: 1, sm: 2, md: 3 }
      }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
          {/* Header */}
          <Box sx={{ 
            mb: { xs: 3, sm: 4 },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: theme.custom?.appearance === 'royal' ? 400 : 700,
              fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
              color: theme.palette.text.primary,
              mb: 1,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' }
            }}>
              Settings
        </Typography>
            <Typography variant="body1" sx={{ 
              color: theme.palette.text.secondary,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}>
              Customize your application experience
        </Typography>
      </Box>

          {/* Tabs */}
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            mb: { xs: 3, sm: 4 },
            overflowX: 'auto'
          }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
              variant="scrollable"
          scrollButtons="auto"
              allowScrollButtonsMobile
          sx={{
                minHeight: { xs: 40, sm: 48 },
            '& .MuiTab-root': {
                  minHeight: { xs: 40, sm: 48 },
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 1, sm: 1.5 },
              textTransform: 'none',
              fontWeight: 500,
                  minWidth: { xs: 'auto', sm: 120 }
                }
          }}
        >
            <Tab
                icon={<CreditCardIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="Plan & Billing" 
              iconPosition="start"
            />
            <Tab 
                icon={<PersonIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="General" 
                iconPosition="start"
            />
            <Tab 
                icon={<NotificationsIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="Notifications" 
                iconPosition="start"
            />
            <Tab 
                icon={<PaletteIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="Appearance" 
                iconPosition="start"
            />
            <Tab 
                icon={<SecurityIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="Security" 
                iconPosition="start"
            />
            <Tab 
                icon={<LanguageIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
                label="Region & Language" 
                iconPosition="start"
            />
        </Tabs>
          </Box>

          {/* Tab Content */}
          <Box>
            <TabPanel value={tabValue} index={0}>
              <BillingSettings 
                  currentPlan={currentPlan}
                  onPlanChange={setCurrentPlan}
                  billingHistory={billingHistory}
                  cardStyles={getCardStyles()}
                  isMobile={isMobile}
                  settings={settings}
                  handleChange={handleChange}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <GeneralSettings 
                settings={settings} 
                handleChange={handleChange} 
                profileImage={profileImage}
                handleProfileImageChange={handleProfileImageChange}
                cardStyles={getCardStyles()}
                isLoading={isLoading}
                showBasicReadonlyFields={showBasicReadonlyFields}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <NotificationSettings 
                settings={settings}
                handleChange={handleChange}
                cardStyles={getCardStyles()}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <AppearanceSettings 
                mode={mode}
                toggleMode={toggleMode}
                appearance={appearance}
                changeAppearance={changeAppearance}
                highContrast={highContrast}
                toggleHighContrast={toggleHighContrast}
                cardStyles={getCardStyles()}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={4}>
              <SecuritySettings 
                settings={settings}
                handleChange={handleChange}
                onOpenConfirm={() => setConfirmOpen(true)}
                cardStyles={getCardStyles()}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={5}>
              <RegionSettings 
                settings={settings}
                handleChange={handleChange}
                timezoneOptions={timezoneOptions}
                currentTime={currentTime}
                cardStyles={getCardStyles()}
              />
            </TabPanel>
          </Box>
        </Container>
      </Box>
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            m: 2, 
            display: 'flex', 
            alignItems: 'center',
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
          onClose={() => setError(null)}
        >
          <Typography variant="body1">{error}</Typography>
        </Alert>
      )}
      
      {/* Confirmation Dialog */}
      <Dialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Are you sure you want to delete your account?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This will permanently delete your account and all associated data. 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error">Delete My Account</Button>
        </DialogActions>
      </Dialog>
    </FullLayout>
  );
};


// Sub-components for each settings tab
// ... existing code ...
const GeneralSettings = ({ settings, handleChange, profileImage, handleProfileImageChange, cardStyles, isLoading, showBasicReadonlyFields }) => {
  const theme = useTheme();

  return (
    <Card sx={cardStyles}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Profile Information</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <Avatar 
            src={profileImage} 
            alt="Profile"
            sx={{ 
              width: 80, 
              height: 80, 
              mr: 3,
              border: `2px solid ${theme.palette.primary.main}`
            }} 
          >
            {settings?.firstName?.charAt(0)}
          </Avatar>
          <Box>
            <Button
              variant="outlined"
              component="label"
              disabled={isLoading}
            >
              Change Picture
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleProfileImageChange}
              />
            </Button>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              JPG, PNG, GIF. Max 2MB.
            </Typography>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          {showBasicReadonlyFields && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField 
                  label="First Name" 
                  name="firstName"
                  value={settings.firstName} 
                  fullWidth 
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  label="Last Name" 
                  name="lastName"
                  value={settings.lastName} 
                  fullWidth 
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  label="Email Address" 
                  name="email"
                  value={settings.email} 
                  fullWidth 
                  InputProps={{ readOnly: true }}
                  helperText="Email cannot be changed."
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sm={6}>
            <TextField 
              label="Phone Number" 
              name="phone"
              value={settings.phone} 
              onChange={handleChange}
              fullWidth 
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Short Bio"
              name="bio"
              value={settings.bio}
              onChange={handleChange}
              multiline
              rows={4}
              fullWidth
              placeholder="Tell us a little about yourself"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const NotificationSettings = ({ settings, handleChange, cardStyles }) => (
    <Card sx={cardStyles}>
        <CardContent>
            <Typography variant="h6" gutterBottom>Email Notifications</Typography>
            <FormGroup>
                <FormControlLabel
                    control={<Switch checked={settings.emailNotifications} onChange={(e) => handleChange({ target: { name: 'emailNotifications', checked: e.target.checked, type: 'checkbox' }})} />}
                    label="General updates and announcements"
                />
                <FormControlLabel
                    control={<Switch checked={settings.quizReminders} onChange={(e) => handleChange({ target: { name: 'quizReminders', checked: e.target.checked, type: 'checkbox' }})} />}
                    label="Reminders for upcoming quizzes"
                />
                <FormControlLabel
                    control={<Switch checked={settings.gradeNotifications} onChange={(e) => handleChange({ target: { name: 'gradeNotifications', checked: e.target.checked, type: 'checkbox' }})} />}
                    label="Notifications when new grades are posted"
                />
            </FormGroup>
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom>Push Notifications</Typography>
            <FormGroup>
                <FormControlLabel
                    control={<Switch checked={settings.pushNotifications} onChange={(e) => handleChange({ target: { name: 'pushNotifications', checked: e.target.checked, type: 'checkbox' }})} />}
                    label="Enable browser push notifications"
                />
            </FormGroup>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Notification Frequency</Typography>
            <FormControl component="fieldset">
                <RadioGroup row name="notificationFrequency" value={settings.notificationFrequency} onChange={handleChange}>
                    <FormControlLabel value="instant" control={<Radio />} label="Instant" />
                    <FormControlLabel value="daily" control={<Radio />} label="Daily Digest" />
                    <FormControlLabel value="weekly" control={<Radio />} label="Weekly Digest" />
                </RadioGroup>
            </FormControl>
        </CardContent>
    </Card>
);

const AppearanceSettings = ({ mode, toggleMode, appearance, changeAppearance, highContrast, toggleHighContrast, cardStyles }) => {
  const theme = useTheme();
  return (
    <Grid container spacing={3}>
      {/* Theme Mode */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Theme Mode</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
              <Button 
                variant={mode === 'light' ? 'contained' : 'outlined'} 
                onClick={() => toggleMode('light')}
                startIcon={<LightModeIcon />}
                sx={{ p: 2, flexDirection: 'column', height: 100, width: '45%' }}
              >
                Light
              </Button>
              <Button 
                variant={mode === 'dark' ? 'contained' : 'outlined'} 
                onClick={() => toggleMode('dark')}
                startIcon={<DarkModeIcon />}
                sx={{ p: 2, flexDirection: 'column', height: 100, width: '45%' }}
              >
                Dark
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* High Contrast Mode */}
      <Grid item xs={12} md={6}>
        <Card sx={cardStyles}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Accessibility</Typography>
            <FormGroup>
              <FormControlLabel
                control={<Switch checked={highContrast} onChange={toggleHighContrast} />}
                label="High Contrast Mode"
              />
            </FormGroup>
            <Typography variant="body2" color="text.secondary">
              Increases text and background contrast for better readability.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Appearance Style */}
      <Grid item xs={12}>
        <Card sx={cardStyles}>
          <CardContent>
            <Typography variant="h6" gutterBottom>UI Appearance</Typography>
            <FormControl component="fieldset" fullWidth>
                <RadioGroup row name="appearance" value={appearance} onChange={(e) => changeAppearance(e.target.value)}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel value="default" control={<Radio />} label={
                          <Box>
                            <Typography>Default</Typography>
                            <Typography variant="caption" color="textSecondary">Modern and clean</Typography>
                          </Box>
                        } />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel value="royal" control={<Radio />} label={
                          <Box>
                            <Typography>Royal</Typography>
                            <Typography variant="caption" color="textSecondary">Elegant and formal</Typography>
                          </Box>
                        } />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel value="classic" control={<Radio />} label={
                          <Box>
                            <Typography>Classic</Typography>
                            <Typography variant="caption" color="textSecondary">Sharp and simple</Typography>
                          </Box>
                        } />
                      </Grid>
                    </Grid>
                </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};


const SecuritySettings = ({ settings, handleChange, onOpenConfirm, cardStyles }) => (
    <Grid container spacing={3}>
        <Grid item xs={12}>
            <Card sx={cardStyles}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Password</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        It's a good idea to use a strong password that you're not using elsewhere.
                    </Typography>
                    <Button variant="outlined" startIcon={<VpnKeyIcon />}>Change Password</Button>
                </CardContent>
            </Card>
        </Grid>
        <Grid item xs={12}>
            <Card sx={cardStyles}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Two-Factor Authentication</Typography>
                     <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Add an additional layer of security to your account by requiring more than just a password to log in.
                    </Typography>
                    <Button variant="outlined" startIcon={<ShieldOutlinedIcon />}>Enable Two-Factor Auth</Button>
                </CardContent>
            </Card>
        </Grid>
         <Grid item xs={12}>
            <Card sx={{ ...cardStyles, borderColor: 'error.main' }}>
                <CardContent>
                    <Typography variant="h6" color="error" gutterBottom>Delete Account</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Permanently delete your account and all of your content. This action is not reversible.
                    </Typography>
                    <Button variant="contained" color="error" startIcon={<DeleteForeverIcon />} onClick={onOpenConfirm}>
                        Delete My Account
                    </Button>
                </CardContent>
            </Card>
        </Grid>
    </Grid>
);

const RegionSettings = ({ settings, handleChange, timezoneOptions, currentTime, cardStyles }) => (
  <Card sx={cardStyles}>
    <CardContent>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Timezone</Typography>
          <FormControl fullWidth>
            <InputLabel>Select Timezone</InputLabel>
            <Select
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
              label="Select Timezone"
            >
              {timezoneOptions.map(tz => (
                <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Current time: {currentTime.toLocaleTimeString('en-US', { timeZone: settings.timezone })}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Landing Page</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose the first page you see after logging in.
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup row name="landingPage" value={settings.landingPage} onChange={handleChange}>
              <FormControlLabel value="/dashboard" control={<Radio />} label="Dashboard" />
              <FormControlLabel value="/quizzes" control={<Radio />} label="Quizzes" />
              <FormControlLabel value="/students" control={<Radio />} label="Students" />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);


const BillingSettings = ({ currentPlan, onPlanChange, billingHistory, cardStyles, isMobile, settings, handleChange }) => {
  const theme = useTheme();

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} lg={4}>
        <Typography variant="h6" sx={{ mb: 2 }}>Current Plan</Typography>
        <Card sx={{ ...cardStyles, textAlign: 'center' }}>
          <CardContent>
            <Chip 
              label={currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} 
              color={currentPlan === 'professional' ? 'success' : 'primary'}
              sx={{ mb: 2, fontWeight: 'bold' }}
            />
            <Typography variant="h3" sx={{ mb: 1 }}>
              {currentPlan === 'professional' ? '$48' : '$10'}
              <Typography variant="h6" component="span" color="text.secondary">/mo</Typography>
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {currentPlan === 'professional' ? 'Unlimited quizzes & advanced analytics.' : 'Basic features for getting started.'}
            </Typography>
            <Button variant="contained" fullWidth>Upgrade Plan</Button>
            <FormControlLabel
              control={<Switch checked={settings.autoRenew} onChange={(e) => handleChange({ target: { name: 'autoRenew', checked: e.target.checked, type: 'checkbox' }})} />}
              label="Auto-renew subscription"
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} lg={8}>
        <Typography variant="h6" sx={{ mb: 2 }}>Billing History</Typography>
        <Card sx={cardStyles}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Invoice</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {billingHistory.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.details}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell>
                      <Link href="#" sx={{ display: 'flex', alignItems: 'center' }}>
                        <DownloadIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                        PDF
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  );
};


export default SettingsPage;