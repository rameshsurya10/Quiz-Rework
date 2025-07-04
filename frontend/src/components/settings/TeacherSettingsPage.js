import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup, Button, useTheme, Tabs, Tab, Select, MenuItem, InputLabel, FormControl, Card, CardContent, useMediaQuery, Alert, CircularProgress, alpha, Slider, Divider, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, TextField, Chip, Stack, Tooltip, IconButton, Avatar
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SaveIcon from '@mui/icons-material/Save';
import LanguageIcon from '@mui/icons-material/Language';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import QuizIcon from '@mui/icons-material/Quiz';
import GradingIcon from '@mui/icons-material/Grading';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TodayIcon from '@mui/icons-material/Today';
import SecurityIcon from '@mui/icons-material/Security';
import DevicesIcon from '@mui/icons-material/Devices';
import StorageIcon from '@mui/icons-material/Storage';
import BackupIcon from '@mui/icons-material/Backup';
import RefreshIcon from '@mui/icons-material/Refresh';
import SchoolIcon from '@mui/icons-material/School';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { getTimezoneOptions } from '../../utils/localeUtils';
import { useLocation } from 'react-router-dom';

// Tab Panel Component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
};

const defaultSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  landingPage: '/teacher-dashboard',
  emailNotifications: true,
  pushNotifications: false,
  quizReminders: true,
  gradeNotifications: true,
  studentSubmissions: true,
  systemUpdates: false,
  marketingEmails: false,
  notificationFrequency: 'instant',
  soundEnabled: true,
  desktopNotifications: true,
  language: 'en',
  dateFormat: 'MM/dd/yyyy',
  autoSave: true,
  compactView: false,
  animationsEnabled: true,
};

const TeacherSettingsPage = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSnackbar } = useSnackbar();

  // Parse tab from URL query params - only notifications and general now
  const urlParams = new URLSearchParams(location.search);
  const tabFromUrl = urlParams.get('tab');
  const teacherTabs = ['notifications', 'general'];
  const getTabIndex = (tabName) => Math.max(0, teacherTabs.indexOf(tabName));

  const [tabValue, setTabValue] = useState(getTabIndex(tabFromUrl));
  const [settings, setSettings] = useState(defaultSettings);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Options lists
  const timezoneOptions = React.useMemo(getTimezoneOptions, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, []);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save settings to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings));
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getCardStyles = () => ({
    background: alpha(theme.palette.background.paper, 0.9),
    backdropFilter: 'blur(20px)',
    borderRadius: { xs: 2, sm: 3 },
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.2),
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  });

  const tabs = [
    { label: 'Notifications', icon: <NotificationsIcon />, value: 'notifications' },
    { label: 'General', icon: <LanguageIcon />, value: 'general' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <Typography 
          variant={isSmallMobile ? "h5" : isMobile ? "h4" : "h3"} 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Settings
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
        >
          Manage your teaching preferences and application settings
        </Typography>
      </Box>

      {/* Settings Tabs */}
      <Paper sx={{ ...getCardStyles(), mb: { xs: 3, sm: 4 } }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 72 },
              textTransform: 'none',
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 500,
              px: { xs: 2, sm: 3 }
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.value}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          ))}
        </Tabs>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Email Notifications */}
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <EmailIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Email Notifications
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.emailNotifications}
                          onChange={handleChange}
                          name="emailNotifications"
                          color="primary"
                        />
                      }
                      label="Enable email notifications"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.quizReminders}
                          onChange={handleChange}
                          name="quizReminders"
                          disabled={!settings.emailNotifications}
                        />
                      }
                      label="Quiz deadline reminders"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.gradeNotifications}
                          onChange={handleChange}
                          name="gradeNotifications"
                          disabled={!settings.emailNotifications}
                        />
                      }
                      label="Grade submission notifications"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.studentSubmissions}
                          onChange={handleChange}
                          name="studentSubmissions"
                          disabled={!settings.emailNotifications}
                        />
                      }
                      label="Student submission alerts"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.systemUpdates}
                          onChange={handleChange}
                          name="systemUpdates"
                          disabled={!settings.emailNotifications}
                        />
                      }
                      label="System updates"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Push & Desktop Notifications */}
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <NotificationsActiveIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Push & Desktop
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.pushNotifications}
                          onChange={handleChange}
                          name="pushNotifications"
                        />
                      }
                      label="Browser push notifications"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.desktopNotifications}
                          onChange={handleChange}
                          name="desktopNotifications"
                        />
                      }
                      label="Desktop notifications"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.soundEnabled}
                          onChange={handleChange}
                          name="soundEnabled"
                        />
                      }
                      label="Notification sounds"
                    />

                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>Notification Frequency</InputLabel>
                      <Select
                        value={settings.notificationFrequency}
                        onChange={handleChange}
                        name="notificationFrequency"
                        label="Notification Frequency"
                      >
                        <MenuItem value="instant">Instant</MenuItem>
                        <MenuItem value="hourly">Hourly digest</MenuItem>
                        <MenuItem value="daily">Daily digest</MenuItem>
                        <MenuItem value="weekly">Weekly digest</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {/* Language & Region */}
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Language & Region
                    </Typography>
                  </Box>

                  <Stack spacing={3}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={settings.language}
                        onChange={handleChange}
                        name="language"
                        label="Language"
                      >
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ur">Urdu</MenuItem>
                        <MenuItem value="ar">Arabic</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={settings.timezone}
                        onChange={handleChange}
                        name="timezone"
                        label="Timezone"
                        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                      >
                        {timezoneOptions.map((tz) => (
                          <MenuItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={settings.dateFormat}
                        onChange={handleChange}
                        name="dateFormat"
                        label="Date Format"
                      >
                        <MenuItem value="MM/dd/yyyy">MM/DD/YYYY</MenuItem>
                        <MenuItem value="dd/MM/yyyy">DD/MM/YYYY</MenuItem>
                        <MenuItem value="yyyy-MM-dd">YYYY-MM-DD</MenuItem>
                      </Select>
                    </FormControl>

                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                      <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
                        Current time: {currentTime.toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Application Preferences */}
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <TodayIcon sx={{ mr: 1, color: 'secondary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Application Preferences
                    </Typography>
                  </Box>

                  <Stack spacing={3}>
                    <FormControl fullWidth>
                      <InputLabel>Default Landing Page</InputLabel>
                      <Select
                        value={settings.landingPage}
                        onChange={handleChange}
                        name="landingPage"
                        label="Default Landing Page"
                      >
                        <MenuItem value="/teacher-dashboard">Dashboard</MenuItem>
                        <MenuItem value="/teacher/quiz">Quiz Management</MenuItem>
                        <MenuItem value="/teacher/students">Student Management</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.autoSave}
                          onChange={handleChange}
                          name="autoSave"
                        />
                      }
                      label="Auto-save changes"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.compactView}
                          onChange={handleChange}
                          name="compactView"
                        />
                      }
                      label="Compact view mode"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.animationsEnabled}
                          onChange={handleChange}
                          name="animationsEnabled"
                        />
                      }
                      label="Enable animations"
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveSettings}
          disabled={isSaving}
          sx={{
            px: { xs: 3, sm: 6 },
            py: { xs: 1.5, sm: 2 },
            fontSize: { xs: '1rem', sm: '1.1rem' },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Container>
  );
};

export default TeacherSettingsPage; 