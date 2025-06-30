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
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
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
  const { mode, toggleMode, appearance, changeAppearance, highContrast, toggleHighContrast } = useCustomTheme();
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
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              />
              
              <Tab 
                icon={<LanguageIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />} 
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
        </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ 
            ...getCardStyles(),
            overflow: 'hidden',
            minHeight: '500px'
          }}>
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
            
            {/* Plan & Billing Tab */}
            {tabValue === 0 && (
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ 
                  mb: 3,
                  color: theme.palette.text.primary,
                  fontWeight: theme.custom?.appearance === 'royal' ? 400 : 600,
                  fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                }}>
                  Current Plan
                </Typography>
                
                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
                  {/* Beginner Plan */}
                  <Grid item xs={12} sm={12} md={6}>
                    <Card variant="outlined" sx={{
                      ...getCardStyles(),
                      height: { xs: 'auto', sm: '220px' },
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      borderColor: theme.palette.divider,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      }
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" sx={{ 
                          color: theme.palette.text.primary,
                          mb: 2,
                          fontWeight: 600,
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          Beginner
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          mb: 1,
                          fontSize: { xs: '1.75rem', sm: '2rem' }
                        }}>
                          $10
                          <Typography component="span" variant="body1" sx={{ color: theme.palette.text.secondary, ml: 0.5 }}>
                            /month
                          </Typography>
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: theme.palette.text.secondary,
                          mb: { xs: 2, sm: 3 }
                        }}>
                          30 days remaining
                        </Typography>
                        <Button 
                          variant="outlined" 
                          size="small"
                          fullWidth
                          sx={{ 
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            textTransform: 'none',
                            fontWeight: 500,
                            py: { xs: 0.5, sm: 1 },
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            }
                          }}
                        >
                          Downgrade
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Professional Plan */}
                  <Grid item xs={12} sm={12} md={6}>
                    <Card variant="outlined" sx={{
                      ...getCardStyles(),
                      height: { xs: 'auto', sm: '220px' },
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      border: `2px solid ${theme.palette.primary.main}`,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
                      '&::before': theme.custom?.glassmorphism && !theme.custom?.highContrast ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
                        pointerEvents: 'none',
                      } : {},
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 }, position: 'relative', zIndex: 1 }}>
                        <Box display="flex" alignItems="center" gap={1} mb={2} flexWrap="wrap">
                          <Typography variant="h6" sx={{ 
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.25rem' }
                          }}>
                            Professional
                          </Typography>
                          <Chip 
                            label="Current Plan" 
                            size="small"
                            sx={{ 
                              backgroundColor: theme.palette.primary.main,
                              color: theme.palette.primary.contrastText,
                              fontSize: '0.7rem',
                              fontWeight: 500
                            }}
                          />
                        </Box>
                        <Typography variant="h4" sx={{ 
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          mb: 1,
                          fontSize: { xs: '1.75rem', sm: '2rem' }
                        }}>
                          $48
                          <Typography component="span" variant="body1" sx={{ color: theme.palette.text.secondary, ml: 0.5 }}>
                            /month
                          </Typography>
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: theme.palette.text.secondary
                        }}>
                          365 days remaining
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: theme.palette.divider }} />
                <FormControlLabel 
                  control={<Switch checked={settings.autoRenew} onChange={handleChange} name="autoRenew" />} 
                  label="Enable auto-renew" 
                  sx={{ color: theme.palette.text.primary }}
                />
                <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: theme.palette.divider }} />
                <Typography variant="h6" gutterBottom sx={{ 
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  mb: 2,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  Payment Method
                </Typography>
            <Grid container spacing={{ xs: 2, sm: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                    <Card variant="outlined" sx={{ 
                      ...getCardStyles(),
                      p: { xs: 1.5, sm: 2 }, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2 
                    }}>
                  <CreditCardIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}/>
                      <Box> 
                        <Typography variant="body1" sx={{ color: theme.palette.text.primary, fontSize: { xs: '0.9rem', sm: '1rem' } }}>Credit Card</Typography> 
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>**** **** **** 3542</Typography> 
                      </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                    <Button 
                      variant="outlined" 
                      startIcon={<AddCircleOutlineIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />} 
                      sx={{ 
                        height: '100%', 
                        width: '100%',
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        py: { xs: 1, sm: 1.5 },
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      Add New Card
                    </Button>
              </Grid>
            </Grid>
                <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: theme.palette.divider }} />
                <Typography variant="h6" gutterBottom sx={{ 
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  mb: { xs: 1, sm: 2 },
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}>
                  Billing History
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <TableContainer component={Paper} variant="outlined" sx={{
                    ...getCardStyles(),
                    minWidth: { xs: '100%', md: 650 }
                  }}>
                    <Table size={isMobile ? "small" : "medium"}>
                      <TableHead> 
                        <TableRow> 
                          <TableCell sx={{ color: theme.palette.text.primary, py: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Date</TableCell> 
                          <TableCell sx={{ color: theme.palette.text.primary, py: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Details</TableCell> 
                          <TableCell align="right" sx={{ color: theme.palette.text.primary, py: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Amount</TableCell> 
                          <TableCell align="right" sx={{ color: theme.palette.text.primary, py: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Download</TableCell> 
                        </TableRow> 
                      </TableHead>
                      <TableBody>
                        {billingHistory.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell sx={{ color: theme.palette.text.secondary, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{row.date}</TableCell>
                            <TableCell sx={{ color: theme.palette.text.secondary, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{row.details}</TableCell>
                            <TableCell align="right" sx={{ color: theme.palette.text.secondary, py: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{row.amount}</TableCell>
                            <TableCell align="right" sx={{ py: { xs: 1, sm: 1.5 } }}>
                              <Link href="#" underline="always" sx={{ color: theme.palette.primary.main, fontSize: { xs: '0.8rem', sm: '0.875rem' }, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                <DownloadIcon fontSize="small"/> {!isMobile && "Invoice"}
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            )}

            {/* General Tab */}
            {tabValue === 1 && (
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ 
                  color: theme.palette.text.primary,
                  fontWeight: theme.custom?.appearance === 'royal' ? 400 : 600,
                  fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                  mb: 3,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                }}>
                  General Settings
                </Typography>
                
          <Grid container spacing={3}>
                  {/* Profile Section */}
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{
                      ...getCardStyles(),
                      p: { xs: 2, sm: 3 },
                      mb: 3,
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                      {isLoading && (
                        <Box sx={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: alpha(theme.palette.background.paper, 0.7),
                          zIndex: 10
                        }}>
                          <CircularProgress />
                        </Box>
                      )}
                      {!isLoading && (
                        <>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'center', sm: 'flex-start' },
                            mb: 3,
                            gap: 3
                          }}>
                            <Box sx={{ 
                              position: { xs: 'relative', sm: 'absolute' },
                              top: { sm: -30 },
                              right: { sm: 24 },
                              mb: { xs: 2, sm: 0 }
                            }}>
                              <Avatar 
                                src={profileImage}
                                alt={`${settings.firstName} ${settings.lastName}`}
                                sx={{ 
                                  width: { xs: 80, sm: 100 }, 
                                  height: { xs: 80, sm: 100 },
                                  border: `3px solid ${theme.palette.background.paper}`,
                                  boxShadow: theme.shadows[3]
                                }}
                              >
                                {settings.firstName?.[0]}{settings.lastName?.[0]}
                              </Avatar>
                              <IconButton 
                                size="small" 
                                sx={{ 
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  backgroundColor: theme.palette.primary.main,
                                  color: theme.palette.primary.contrastText,
                                  '&:hover': {
                                    backgroundColor: theme.palette.primary.dark,
                                  },
                                  width: 32,
                                  height: 32
                                }}
                                component="label"
                              >
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*"
                                  onChange={handleProfileImageChange}
                                />
                                <EditIcon fontSize="small" />
                              </IconButton>
                  </Box>
                  
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" gutterBottom sx={{ 
                                color: theme.palette.text.primary,
                                fontWeight: 600,
                                mb: 0.5,
                                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                textAlign: { xs: 'center', sm: 'left' }
                              }}>
                                Profile Information
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                mb: 2,
                                textAlign: { xs: 'center', sm: 'left' }
                              }}>
                                Update your personal information and account settings
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: theme.palette.info.main,
                                mb: 2,
                                display: 'block',
                                textAlign: { xs: 'center', sm: 'left' },
                                fontStyle: 'italic'
                              }}>
                                Note: Only phone number, bio, and profile picture can be edited
                              </Typography>
                            </Box>
                          </Box>

                          <Grid container spacing={2}>
                            {showBasicReadonlyFields && (
                              <>
                                {/* Read-only First Name */}
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    label="First Name"
                                    name="firstName"
                                    value={settings.firstName}
                                    variant="outlined"
                                    margin="normal"
                                    size={isMobile ? "small" : "medium"}
                                    InputProps={{ readOnly: true }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: theme.palette.divider },
                                        '&:hover fieldset': { borderColor: theme.palette.divider },
                                        '&.Mui-focused fieldset': {
                                          borderColor: theme.palette.divider,
                                          borderWidth: 1,
                                        },
                                        backgroundColor: alpha(theme.palette.action.disabledBackground, 0.1),
                                      },
                                    }}
                                  />
                                </Grid>
                                {/* Read-only Last Name */}
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    label="Last Name"
                                    name="lastName"
                                    value={settings.lastName}
                                    variant="outlined"
                                    margin="normal"
                                    size={isMobile ? "small" : "medium"}
                                    InputProps={{ readOnly: true }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: theme.palette.divider },
                                        '&:hover fieldset': { borderColor: theme.palette.divider },
                                        '&.Mui-focused fieldset': {
                                          borderColor: theme.palette.divider,
                                          borderWidth: 1,
                                        },
                                        backgroundColor: alpha(theme.palette.action.disabledBackground, 0.1),
                                      },
                                    }}
                                  />
                                </Grid>
                                {/* Read-only Email */}
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    label="Email"
                                    name="email"
                                    value={settings.email}
                                    variant="outlined"
                                    margin="normal"
                                    size={isMobile ? "small" : "medium"}
                                    InputProps={{
                                      readOnly: true,
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <EmailIcon fontSize="small" color="action" />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: theme.palette.divider },
                                        '&:hover fieldset': { borderColor: theme.palette.divider },
                                        '&.Mui-focused fieldset': {
                                          borderColor: theme.palette.divider,
                                          borderWidth: 1,
                                        },
                                        backgroundColor: alpha(theme.palette.action.disabledBackground, 0.1),
                                      },
                                    }}
                                  />
                                </Grid>
                              </>
                            )}
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                      label={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    Phone
                                    <EditIcon fontSize="small" sx={{ ml: 1, fontSize: '0.8rem', color: theme.palette.primary.main }} />
                        </Box>
                      }
                                name="phone"
                                value={settings.phone}
                                onChange={handleChange}
                                variant="outlined"
                                margin="normal"
                                size={isMobile ? "small" : "medium"}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start">
                                      <PhoneIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                helperText="This field is editable"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                      borderColor: theme.palette.divider,
                                    },
                                    '&:hover fieldset': {
                                      borderColor: theme.palette.primary.main,
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: theme.palette.primary.main,
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiFormHelperText-root': {
                                    color: theme.palette.primary.main,
                                  }
                                }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                      label={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    Bio
                                    <EditIcon fontSize="small" sx={{ ml: 1, fontSize: '0.8rem', color: theme.palette.primary.main }} />
                        </Box>
                      }
                                name="bio"
                                value={settings.bio}
                                onChange={handleChange}
                                variant="outlined"
                                margin="normal"
                                multiline
                                rows={3}
                                size={isMobile ? "small" : "medium"}
                                InputProps={{
                                  startAdornment: (
                                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5, mr: 1 }}>
                                      <PersonIcon fontSize="small" color="action" />
                                    </InputAdornment>
                                  ),
                                }}
                                helperText="This field is editable"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                      borderColor: theme.palette.divider,
                                    },
                                    '&:hover fieldset': {
                                      borderColor: theme.palette.primary.main,
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: theme.palette.primary.main,
                                      borderWidth: 2,
                                    },
                                  },
                                  '& .MuiFormHelperText-root': {
                                    color: theme.palette.primary.main,
                                  }
                                }}
                              />
                            </Grid>
                          </Grid>
                        </>
                      )}
              </Card>
            </Grid>

                  {/* Time & Timezone Section */}
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{
                      ...getCardStyles(),
                      p: 3,
                      mb: 3
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        mb: 2
                      }}>
                        Time & Timezone Settings
                      </Typography>
                      
                      <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: theme.palette.text.secondary }}>Timezone</InputLabel>
                            <Select
                              name="timezone"
                              value={settings.timezone}
                              onChange={handleChange}
                              label="Timezone"
                              sx={{
                                color: theme.palette.text.primary,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.divider,
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.primary.main,
                                },
                              }}
                            >
                              {timezoneOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value} sx={{ color: theme.palette.text.primary }}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    p: 2, 
                            background: alpha(theme.palette.primary.main, 0.08),
                            borderRadius: theme.custom?.appearance === 'royal' ? '12px' : theme.custom?.appearance === 'classic' ? '6px' : '8px',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                          }}>
                            <Typography variant="subtitle2" sx={{ 
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              mb: 1
                            }}>
                              Current Time
                            </Typography>
                            <Typography variant="body1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5
                            }}>
                              {currentTime.toLocaleString('en-US', { 
                                timeZone: settings.timezone,
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.text.secondary,
                              fontSize: '0.75rem'
                            }}>
                              UTC: {currentTime.toLocaleString('en-US', { 
                                timeZone: 'UTC',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })} | Selected: {settings.timezone}
                    </Typography>
                  </Box>
                        </Grid>
                      </Grid>
              </Card>
            </Grid>
                  
                  {/* Application Settings Section */}
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{
                      ...getCardStyles(),
                      p: 3
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        mb: 2
                      }}>
                        Application Settings
                      </Typography>
                      
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel sx={{ color: theme.palette.text.secondary }}>Default Landing Page</InputLabel>
                            <Select
                              name="landingPage"
                              value={settings.landingPage}
                              onChange={handleChange}
                              label="Default Landing Page"
                              sx={{
                                color: theme.palette.text.primary,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.divider,
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: theme.palette.primary.main,
                                },
                              }}
                            >
                              <MenuItem value="/dashboard" sx={{ color: theme.palette.text.primary }}>Dashboard</MenuItem>
                              <MenuItem value="/quiz" sx={{ color: theme.palette.text.primary }}>Quiz Management</MenuItem>
                              <MenuItem value="/students" sx={{ color: theme.palette.text.primary }}>Students</MenuItem>
                              <MenuItem value="/teachers" sx={{ color: theme.palette.text.primary }}>Teachers</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="body2" sx={{ 
                            mt: 1, 
                            color: theme.palette.text.secondary,
                            fontSize: '0.85rem'
                          }}>
                            Choose which page to display when you first log in
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Box sx={{ 
                            p: 2, 
                            background: alpha(theme.palette.info.main, 0.08),
                            borderRadius: theme.custom?.appearance === 'royal' ? '12px' : theme.custom?.appearance === 'classic' ? '6px' : '8px',
                            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                          }}>
                            <Typography variant="subtitle2" sx={{ 
                              color: theme.palette.info.main,
                              fontWeight: 600,
                              mb: 1
                            }}>
                              Quick Info
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.text.secondary,
                              fontSize: '0.85rem',
                              lineHeight: 1.4
                            }}>
                              Your settings are automatically saved and synchronized across all your devices. 
                              Changes take effect immediately.
                            </Typography>
                  </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    sx={{
                      background: theme.custom?.glassmorphism
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                        : theme.palette.primary.main,
                      backdropFilter: theme.custom?.glassmorphism ? 'blur(10px)' : 'none',
                      boxShadow: theme.custom?.highContrast 
                        ? 'none'
                        : `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      px: { xs: 2, sm: 3 },
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        background: theme.custom?.glassmorphism
                          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
                          : theme.palette.primary.dark,
                      }
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </Box>
              </Box>
            )}

            {/* Notifications Tab */}
            {tabValue === 2 && (
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" gutterBottom sx={{ 
                  color: theme.palette.text.primary,
                  fontWeight: theme.custom?.appearance === 'royal' ? 400 : 600,
                  fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                  mb: 3,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                }}>
                  Notification Preferences
                </Typography>
                
                <Card variant="outlined" sx={{
                  ...getCardStyles(),
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  transition: 'all 0.3s ease',
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <NotificationsActiveIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    Communication Settings
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} lg={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        background: alpha(theme.palette.primary.main, 0.05),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.emailNotifications}
                          onChange={handleChange}
                          name="emailNotifications"
                              color="primary"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: theme.palette.primary.main,
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                                },
                              }}
                        />
                      }
                      label={
                            <Box sx={{ ml: 1, minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ 
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap'
                              }}>
                                <EmailIcon fontSize="small" color={settings.emailNotifications ? "primary" : "action"} />
                                <span style={{ 
                                  wordBreak: 'break-word',
                                  fontSize: isMobile ? '0.9rem' : '1rem'
                                }}>
                          Email Notifications
                                </span>
                                {settings.emailNotifications && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      ml: { xs: 0, sm: 'auto' }
                                    }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                lineHeight: 1.4
                              }}>
                                Receive important updates and notifications via email
                              </Typography>
                        </Box>
                      }
                          sx={{ 
                            m: 0,
                            width: '100%',
                            alignItems: 'flex-start',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1, sm: 0 }
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} lg={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        background: alpha(theme.palette.primary.main, 0.05),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.pushNotifications}
                          onChange={handleChange}
                          name="pushNotifications"
                              color="primary"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: theme.palette.primary.main,
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                                },
                              }}
                        />
                      }
                      label={
                            <Box sx={{ ml: 1, minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ 
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap'
                              }}>
                                <NotificationsIcon fontSize="small" color={settings.pushNotifications ? "primary" : "action"} />
                                <span style={{ 
                                  wordBreak: 'break-word',
                                  fontSize: isMobile ? '0.9rem' : '1rem'
                                }}>
                          Push Notifications
                                </span>
                                {settings.pushNotifications && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      ml: { xs: 0, sm: 'auto' }
                                    }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                lineHeight: 1.4
                              }}>
                                Receive instant notifications in your browser
                              </Typography>
                        </Box>
                      }
                          sx={{ 
                            m: 0,
                            width: '100%',
                            alignItems: 'flex-start',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1, sm: 0 }
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.7) }} />
                  
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <EventNoteIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    Activity Notifications
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} lg={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        background: alpha(theme.palette.primary.main, 0.05),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={settings.quizReminders} 
                              onChange={handleChange} 
                              name="quizReminders"
                              color="primary"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: theme.palette.primary.main,
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                                },
                              }}
                            />
                          }
                          label={
                            <Box sx={{ ml: 1, minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ 
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap'
                              }}>
                                <QuizIcon fontSize="small" color={settings.quizReminders ? "primary" : "action"} />
                                <span style={{ 
                                  wordBreak: 'break-word',
                                  fontSize: isMobile ? '0.9rem' : '1rem'
                                }}>
                                  Quiz Reminders
                                </span>
                                {settings.quizReminders && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      ml: { xs: 0, sm: 'auto' }
                                    }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                lineHeight: 1.4
                              }}>
                                Get notified about upcoming quizzes and deadlines
                              </Typography>
                            </Box>
                          }
                          sx={{ 
                            m: 0,
                            width: '100%',
                            alignItems: 'flex-start',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1, sm: 0 }
                          }}
                        />
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} lg={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        background: alpha(theme.palette.primary.main, 0.05),
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}>
                        <FormControlLabel
                          control={
                            <Switch 
                              checked={settings.gradeNotifications} 
                              onChange={handleChange} 
                              name="gradeNotifications"
                              color="primary"
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: theme.palette.primary.main,
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: alpha(theme.palette.primary.main, 0.5),
                                },
                              }}
                            />
                          }
                          label={
                            <Box sx={{ ml: 1, minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ 
                                color: theme.palette.text.primary,
                                fontWeight: 500,
                                mb: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                flexWrap: 'wrap'
                              }}>
                                <GradingIcon fontSize="small" color={settings.gradeNotifications ? "primary" : "action"} />
                                <span style={{ 
                                  wordBreak: 'break-word',
                                  fontSize: isMobile ? '0.9rem' : '1rem'
                                }}>
                                  Grade Notifications
                                </span>
                                {settings.gradeNotifications && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      ml: { xs: 0, sm: 'auto' }
                                    }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                lineHeight: 1.4
                              }}>
                                Get notified when grades are posted or updated
                              </Typography>
                            </Box>
                          }
                          sx={{ 
                            m: 0,
                            width: '100%',
                            alignItems: 'flex-start',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1, sm: 0 }
                          }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.7) }} />
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      color: theme.palette.text.primary,
                      fontWeight: 600,
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: { xs: '1rem', sm: '1.125rem' }
                    }}>
                      <AccessTimeIcon color="primary" fontSize="small" />
                      Notification Frequency
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8} lg={6}>
                        <FormControl 
                          fullWidth 
                          variant="outlined" 
                          size={isMobile ? "small" : "medium"}
                        >
                          <InputLabel sx={{ color: theme.palette.text.secondary }}>Notification Frequency</InputLabel>
                          <Select
                            name="notificationFrequency"
                            value={settings.notificationFrequency}
                            onChange={handleChange}
                            label="Notification Frequency"
                            sx={{
                              color: theme.palette.text.primary,
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.divider,
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main,
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.primary.main,
                                borderWidth: 2,
                              },
                            }}
                          >
                            <MenuItem value="instant" sx={{ color: theme.palette.text.primary, py: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <NotificationsActiveIcon fontSize="small" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Instant</Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    lineHeight: 1.2,
                                    display: 'block'
                                  }}>
                                    Receive notifications immediately
                                  </Typography>
                                </Box>
                                {settings.notificationFrequency === 'instant' && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.6rem',
                                      fontWeight: 500
                                    }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                            <MenuItem value="daily" sx={{ color: theme.palette.text.primary, py: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <TodayIcon fontSize="small" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Daily Digest</Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    lineHeight: 1.2,
                                    display: 'block'
                                  }}>
                                    Receive a summary once per day
                                  </Typography>
                                </Box>
                                {settings.notificationFrequency === 'daily' && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.6rem',
                                      fontWeight: 500
                                    }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                            <MenuItem value="weekly" sx={{ color: theme.palette.text.primary, py: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <DateRangeIcon fontSize="small" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Weekly Summary</Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    lineHeight: 1.2,
                                    display: 'block'
                                  }}>
                                    Receive a summary once per week
                                  </Typography>
                                </Box>
                                {settings.notificationFrequency === 'weekly' && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.6rem',
                                      fontWeight: 500
                                    }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                            <MenuItem value="none" sx={{ color: theme.palette.text.primary, py: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <NotificationsOffIcon fontSize="small" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500 }}>None</Typography>
                                  <Typography variant="caption" sx={{ 
                                    color: theme.palette.text.secondary,
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    lineHeight: 1.2,
                                    display: 'block'
                                  }}>
                                    Don't send notifications
                                  </Typography>
                                </Box>
                                {settings.notificationFrequency === 'none' && (
                                  <Chip 
                                    label="Active" 
                                    size="small"
                                    sx={{ 
                                      backgroundColor: theme.palette.primary.main,
                                      color: theme.palette.primary.contrastText,
                                      fontSize: '0.6rem',
                                      fontWeight: 500
                                    }}
                                  />
                                )}
                              </Box>
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4} lg={6}>
                        <Box sx={{ 
                          p: { xs: 1.5, sm: 2 }, 
                          background: alpha(theme.palette.info.main, 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                          height: 'fit-content',
                          mt: { xs: 0, md: 0 }
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: theme.palette.info.main,
                            fontWeight: 600,
                            fontSize: { xs: '0.75rem', sm: '0.8rem' },
                            display: 'block',
                            mb: 0.5
                          }}>
                            Current Setting
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.text.secondary,
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            lineHeight: 1.3
                          }}>
                            {settings.notificationFrequency === 'instant' && 'You will receive notifications immediately when events occur.'}
                            {settings.notificationFrequency === 'daily' && 'You will receive a daily summary of all notifications.'}
                            {settings.notificationFrequency === 'weekly' && 'You will receive a weekly summary of all notifications.'}
                            {settings.notificationFrequency === 'none' && 'You will not receive any notifications.'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    sx={{
                      background: theme.custom?.glassmorphism
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                        : theme.palette.primary.main,
                      backdropFilter: theme.custom?.glassmorphism ? 'blur(10px)' : 'none',
                      boxShadow: theme.custom?.highContrast 
                        ? 'none'
                        : `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      px: { xs: 2, sm: 3 },
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        background: theme.custom?.glassmorphism
                          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
                          : theme.palette.primary.dark,
                      }
                    }}
                  >
                    {isSaving ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </Box>
              </Box>
            )}
            
            {/* Appearance Tab */}
            <TabPanel value={tabValue} index={3}>
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ 
                  mb: 3,
                  color: theme.palette.text.primary,
                  fontWeight: theme.custom?.appearance === 'royal' ? 400 : 600,
                  fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                }}>
                  Appearance Settings
                </Typography>
                
                {/* Theme Mode Settings */}
                <Card variant="outlined" sx={{
                  ...getCardStyles(),
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  transition: 'all 0.3s ease',
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <StyleIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    Theme Mode
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${mode === 'light' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                        background: mode === 'light' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onClick={mode === 'light' ? undefined : toggleMode}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          width: '100%'
                        }}>
                          <LightModeIcon sx={{ 
                            color: mode === 'light' ? theme.palette.primary.main : theme.palette.text.secondary,
                            fontSize: '2rem'
                          }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              Light Mode
                              {mode === 'light' && (
                                <Chip 
                                  label="Active" 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              Clean and bright interface for daytime use
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${mode === 'dark' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                        background: mode === 'dark' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onClick={mode === 'dark' ? undefined : toggleMode}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          width: '100%'
                        }}>
                          <DarkModeIcon sx={{ 
                            color: mode === 'dark' ? theme.palette.primary.main : theme.palette.text.secondary,
                            fontSize: '2rem'
                          }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              Dark Mode
                              {mode === 'dark' && (
                                <Chip 
                                  label="Active" 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              Easy on the eyes for nighttime or low-light use
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3, borderColor: alpha(theme.palette.divider, 0.7) }} />

                  <Box sx={{ 
                    p: 2,
                    borderRadius: 2,
                    border: `1px solid ${highContrast ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                    background: highContrast ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: alpha(theme.palette.primary.main, 0.08),
                      transform: 'translateY(-2px)',
                    }
                  }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={highContrast} 
                          onChange={toggleHighContrast}
                          color="primary"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: theme.palette.primary.main,
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.5),
                            },
                          }}
                        />
                      }
                      label={
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="subtitle1" sx={{ 
                            color: theme.palette.text.primary,
                            fontWeight: 500,
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            <ContrastIcon fontSize="small" color={highContrast ? "primary" : "action"} />
                            High Contrast Mode
                            {highContrast && (
                              <Chip 
                                label="Active" 
                                size="small"
                                sx={{ 
                                  backgroundColor: theme.palette.primary.main,
                                  color: theme.palette.primary.contrastText,
                                  fontSize: '0.7rem',
                                  fontWeight: 500
                                }}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                            Enhanced contrast for better accessibility and readability
                          </Typography>
                        </Box>
                      }
                      sx={{ 
                        m: 0,
                        width: '100%',
                        alignItems: 'flex-start',
                      }}
                    />
                  </Box>
                </Card>

                {/* Visual Style Settings */}
                <Card variant="outlined" sx={{
                  ...getCardStyles(),
                  p: { xs: 2, sm: 3 },
                  mb: 3,
                  transition: 'all 0.3s ease',
                }}>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    mb: 2,
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <PaletteIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                    Visual Style
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${appearance === 'modern' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                        background: appearance === 'modern' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onClick={() => appearance !== 'modern' && changeAppearance('modern')}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          width: '100%'
                        }}>
                          <Box 
                            sx={{ 
                              width: 50, 
                              height: 40, 
                              borderRadius: 2,
                              background: 'linear-gradient(135deg, #4ecdc4 0%, #7877c6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }} 
                          >
                            <StyleIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              Modern Style
                              {appearance === 'modern' && (
                                <Chip 
                                  label="Active" 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              Contemporary design with glassmorphism effects
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${appearance === 'classic' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                        background: appearance === 'classic' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onClick={() => appearance !== 'classic' && changeAppearance('classic')}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          width: '100%'
                        }}>
                          <Box 
                            sx={{ 
                              width: 50, 
                              height: 40, 
                              borderRadius: 1,
                              background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }} 
                          >
                            <StyleIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              Classic Style
                              {appearance === 'classic' && (
                                <Chip 
                                  label="Active" 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              Traditional design with clean lines and familiar patterns
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${appearance === 'royal' ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.1)}`,
                        background: appearance === 'royal' ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.02),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          background: alpha(theme.palette.primary.main, 0.08),
                          transform: 'translateY(-2px)',
                        }
                      }}
                      onClick={() => appearance !== 'royal' && changeAppearance('royal')}
                      >
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          width: '100%'
                        }}>
                          <Box 
                            sx={{ 
                              width: 50, 
                              height: 40, 
                              borderRadius: 3,
                              background: 'linear-gradient(135deg, #673ab7 0%, #ff9800 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }} 
                          >
                            <StyleIcon sx={{ color: 'white', fontSize: '1.2rem' }} />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ 
                              color: theme.palette.text.primary,
                              fontWeight: 500,
                              mb: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              Royal Style
                              {appearance === 'royal' && (
                                <Chip 
                                  label="Active" 
                                  size="small"
                                  sx={{ 
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontSize: '0.7rem',
                                    fontWeight: 500
                                  }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                              Elegant and sophisticated design with premium typography
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    sx={{
                      background: theme.custom?.glassmorphism
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                        : theme.palette.primary.main,
                      backdropFilter: theme.custom?.glassmorphism ? 'blur(10px)' : 'none',
                      boxShadow: theme.custom?.highContrast 
                        ? 'none'
                        : `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                      px: { xs: 2, sm: 3 },
                      py: { xs: 1, sm: 1.5 },
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        background: theme.custom?.glassmorphism
                          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
                          : theme.palette.primary.dark,
                      }
                    }}
                  >
                    Save Appearance Settings
                  </Button>
                </Box>
              </Box>
            </TabPanel>
            
            {/* Security Tab */}
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ 
                  mb: 3,
                  color: theme.palette.text.primary,
                  fontWeight: theme.custom?.appearance === 'royal' ? 400 : 600,
                  fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                  fontSize: { xs: '1.5rem', sm: '1.75rem' }
                }}>
                  Security Settings
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ 
                      ...getCardStyles(),
                      p: { xs: 2, sm: 3 },
                      mb: { xs: 2, sm: 0 },
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <VpnKeyIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                        Password Management
                      </Typography>
                      
                      <Button 
                        variant="outlined" 
                        fullWidth
                        sx={{ 
                          mb: 2,
                          p: 1.5,
                          justifyContent: 'flex-start',
                          color: theme.palette.text.primary,
                          borderColor: theme.palette.divider,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            background: alpha(theme.palette.primary.main, 0.05),
                          }
                        }}
                      >
                        Change Password
                      </Button>
                      
                      <Button 
                        variant="outlined" 
                        fullWidth
                        sx={{ 
                          mb: 2,
                          p: 1.5,
                          justifyContent: 'flex-start',
                          color: theme.palette.text.primary,
                          borderColor: theme.palette.divider,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            background: alpha(theme.palette.primary.main, 0.05),
                          }
                        }}
                      >
                        Set Up Two-Factor Authentication
                      </Button>
                      
                      <Button 
                        variant="outlined" 
                        fullWidth
                        sx={{ 
                          p: 1.5,
                          justifyContent: 'flex-start',
                          color: theme.palette.text.primary,
                          borderColor: theme.palette.divider,
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            background: alpha(theme.palette.primary.main, 0.05),
                          }
                        }}
                      >
                        Manage Device Sessions
                      </Button>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ 
                      ...getCardStyles(),
                      p: { xs: 2, sm: 3 },
                    }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1rem', sm: '1.25rem' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        <ShieldOutlinedIcon color="primary" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
                        Account Protection
                      </Typography>
                      
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Regular password changes help keep your account secure.
                      </Alert>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" paragraph sx={{ color: theme.palette.text.secondary }}>
                          Your data is protected with industry-standard encryption and secure practices.
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" sx={{ 
                        color: '#ff5252', 
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1
                      }}>
                        <DeleteForeverIcon sx={{ fontSize: '1rem' }} />
                        Danger Zone
                      </Typography>
                      
                      <Button
                        color="error"
                        variant="outlined"
                        fullWidth
                        onClick={() => setConfirmOpen(true)}
                        sx={{
                          borderColor: alpha('#ff5252', 0.5),
                          '&:hover': {
                            borderColor: '#ff5252',
                            background: alpha('#ff5252', 0.05),
                          }
                        }}
                      >
                        Delete Account
                      </Button>
                    </Card>
                  </Grid>
                </Grid>
                
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
                    <Button onClick={() => setConfirmOpen(false)} autoFocus>Cancel</Button>
                    <Button onClick={handleDeleteAccount} color="error">
                      Delete Permanently
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            </TabPanel>
          </Box>
        </Container>
      </Box>
    </FullLayout>
  );
};

export default SettingsPage;