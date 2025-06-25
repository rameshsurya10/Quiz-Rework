import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup, Button, useTheme, Tabs, Tab, Select, MenuItem, InputLabel, FormControl, Card, CardContent, useMediaQuery, Alert, CircularProgress, alpha
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import SaveIcon from '@mui/icons-material/Save';
import LanguageIcon from '@mui/icons-material/Language';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ContrastIcon from '@mui/icons-material/Contrast';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import QuizIcon from '@mui/icons-material/Quiz';
import GradingIcon from '@mui/icons-material/Grading';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TodayIcon from '@mui/icons-material/Today';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import { getTimezoneOptions } from '../../utils/localeUtils';
import { useLocation } from 'react-router-dom';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
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
  notificationFrequency: 'instant',
};

const TeacherSettingsPage = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSnackbar } = useSnackbar();
  const { mode, toggleMode, appearance, changeAppearance, highContrast, toggleHighContrast } = useCustomTheme();

  // Parse tab from URL query params
  const urlParams = new URLSearchParams(location.search);
  const tabFromUrl = urlParams.get('tab');
  const teacherTabs = ['appearance', 'notifications', 'general'];
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
      
      // Apply theme changes immediately
      if (settings.darkMode !== undefined) {
        // Update theme if changed
        const currentMode = mode === 'dark';
        if (settings.darkMode !== currentMode) {
          toggleMode();
        }
      }
      
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showSnackbar('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getCardStyles = () => ({
    background: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(20px)',
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.2),
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
    },
  });

  const tabs = [
    { label: 'Appearance', icon: <PaletteIcon />, value: 'appearance' },
    { label: 'Notifications', icon: <NotificationsIcon />, value: 'notifications' },
    { label: 'General', icon: <LanguageIcon />, value: 'general' }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Settings (Teacher)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your teaching preferences and application settings
        </Typography>
      </Box>

      {/* Settings Tabs */}
      <Paper sx={{ ...getCardStyles(), mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
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

        {/* Appearance Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Theme Settings</Typography>
                  </Box>

                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Appearance</InputLabel>
                    <Select value={appearance} onChange={(e) => changeAppearance(e.target.value)} label="Appearance">
                      <MenuItem value="modern">Modern</MenuItem>
                      <MenuItem value="classic">Classic</MenuItem>
                      <MenuItem value="royal">Royal</MenuItem>
                    </Select>
                  </FormControl>

                  <FormGroup>
                    <FormControlLabel
                      control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                          {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={<Switch checked={highContrast} onChange={toggleHighContrast} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ContrastIcon />
                          High Contrast
                        </Box>
                      }
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaletteIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Display Preview</Typography>
                  </Box>

                  <Box sx={{
                    p: 2,
                    background: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 2,
                    textAlign: 'center'
                  }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Sample Content</Typography>
                    <Typography variant="body2" color="text.secondary">
                      This is how your content will appear with the current theme settings.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <NotificationsActiveIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Notification Preferences</Typography>
                  </Box>

                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.emailNotifications}
                          onChange={handleChange}
                          name="emailNotifications"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon />
                          Email Notifications
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.pushNotifications}
                          onChange={handleChange}
                          name="pushNotifications"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NotificationsIcon />
                          Push Notifications
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.quizReminders}
                          onChange={handleChange}
                          name="quizReminders"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <QuizIcon />
                          Quiz Reminders
                        </Box>
                      }
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.gradeNotifications}
                          onChange={handleChange}
                          name="gradeNotifications"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GradingIcon />
                          Grade Notifications
                        </Box>
                      }
                    />
                  </FormGroup>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTimeIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Notification Timing</Typography>
                  </Box>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Notification Frequency</InputLabel>
                    <Select
                      value={settings.notificationFrequency}
                      onChange={handleChange}
                      name="notificationFrequency"
                      label="Notification Frequency"
                    >
                      <MenuItem value="instant">Instant</MenuItem>
                      <MenuItem value="hourly">Hourly Digest</MenuItem>
                      <MenuItem value="daily">Daily Summary</MenuItem>
                      <MenuItem value="weekly">Weekly Summary</MenuItem>
                    </Select>
                  </FormControl>

                  <Typography variant="body2" color="text.secondary">
                    Choose how often you want to receive notifications about your classes and students.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* General Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LanguageIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Regional Settings</Typography>
                  </Box>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={settings.timezone}
                      onChange={handleChange}
                      name="timezone"
                      label="Timezone"
                    >
                      {timezoneOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TodayIcon fontSize="small" />
                    Current time: {currentTime.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={getCardStyles()}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Default Landing Page</Typography>
                  </Box>

                  <FormControl fullWidth>
                    <InputLabel>Landing Page</InputLabel>
                    <Select
                      value={settings.landingPage}
                      onChange={handleChange}
                      name="landingPage"
                      label="Landing Page"
                    >
                      <MenuItem value="/teacher-dashboard">Dashboard</MenuItem>
                      <MenuItem value="/teacher/quiz">Manage Quiz</MenuItem>
                      <MenuItem value="/teacher/students">Students</MenuItem>
                      <MenuItem value="/teacher/departments">Departments</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Save Button */}
        <Box sx={{ p: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            variant="contained"
            size="large"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveSettings}
            disabled={isSaving}
            sx={{
              minWidth: 140,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                  : 'linear-gradient(135deg, #3d8bfd 0%, #00d4ff 100%)',
              }
            }}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TeacherSettingsPage; 