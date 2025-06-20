import React, { useState, useEffect, useContext } from 'react';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Paper, Grid, Switch, FormControlLabel, FormGroup, Button, Divider, useTheme, Tabs, Tab, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, InputLabel, FormControl, RadioGroup, Radio, Card, CardContent, CardActions, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Link
} from '@mui/material';
import { PageHeader } from '../common';
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
import { useSnackbar } from '../../contexts/SnackbarContext';
import { ThemeContext } from '../../contexts/ThemeContext';
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
  emailNotifications: true, pushNotifications: false, quizReminders: true, gradeNotifications: true, notificationFrequency: 'instant',
  highContrastMode: false, autoRenew: true,
};

const SettingsPage = () => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { mode, toggleTheme, highContrastMode, toggleHighContrast, fontSize, changeFontSize } = useContext(ThemeContext);
  const [tabValue, setTabValue] = useState(0);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('professional');

  // Options lists generated once
  const timezoneOptions = React.useMemo(getTimezoneOptions, []);

  const [settings, setSettings] = useState(defaultSettings);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update real-time clock each second in selected timezone
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [settings.timezone]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
      showSnackbar('Settings saved successfully!', 'success');
    } catch (error) {
      showSnackbar(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    setConfirmOpen(false);
    showSnackbar('Account deletion initiated.', 'warning');
  };

  return (
    <FullLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <PageHeader title="Settings" subtitle="Customize your application experience."/>
        <Paper sx={{ borderRadius: '12px', boxShadow: theme.shadows[3] }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs" variant="scrollable" scrollButtons="auto">
              <Tab icon={<CreditCardIcon />} iconPosition="start" label="Subscription & Billing" />
              <Tab icon={<LanguageIcon />} iconPosition="start" label="General" />
              <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notifications" />
              <Tab icon={<PaletteIcon />} iconPosition="start" label="Appearance" />
              <Tab icon={<SecurityIcon />} iconPosition="start" label="Security" />
            </Tabs>
          </Box>

          {/* Subscription & Billing Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>Plan</Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderColor: currentPlan === 'beginner' ? 'primary.main' : 'grey.300', borderWidth: 2 }}>
                  <CardContent>
                    <Typography variant="h5">Beginner</Typography>
                    <Typography variant="h4" color="primary">$10/month</Typography>
                    <Typography variant="body2" color="text.secondary">30 days remaining</Typography>
                  </CardContent>
                  <CardActions>
                    {currentPlan === 'beginner' ? <Chip label="Current Plan" color="success" /> : <Button onClick={() => setCurrentPlan('beginner')}>Downgrade</Button>}
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ borderColor: currentPlan === 'professional' ? 'primary.main' : 'grey.300', borderWidth: 2 }}>
                  <CardContent>
                    <Typography variant="h5">Professional</Typography>
                    <Typography variant="h4" color="primary">$48/month</Typography>
                    <Typography variant="body2" color="text.secondary">365 days</Typography>
                  </CardContent>
                  <CardActions>
                    {currentPlan === 'professional' ? <Chip label="Current Plan" color="success" /> : <Button onClick={() => setCurrentPlan('professional')}>Upgrade</Button>}
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <FormControlLabel control={<Switch checked={settings.autoRenew} onChange={handleChange} name="autoRenew" />} label="Enable auto-renew" />
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>Payment Method</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CreditCardIcon color="primary"/>
                  <Box> <Typography variant="body1">Credit Card</Typography> <Typography variant="body2">**** **** **** 3542</Typography> </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} sx={{ height: '100%', width: '100%' }}>Add New Card</Button>
              </Grid>
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>Billing History</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead> <TableRow> <TableCell>Date</TableCell> <TableCell>Details</TableCell> <TableCell align="right">Amount</TableCell> <TableCell align="right">Download</TableCell> </TableRow> </TableHead>
                <TableBody>
                  {billingHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.details}</TableCell>
                      <TableCell align="right">{row.amount}</TableCell>
                      <TableCell align="right">
                        <Link href="#" underline="always"><DownloadIcon fontSize="small"/> Invoice</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* General Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            
            <Grid container spacing={3}>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    name="timezone"
                    value={settings.timezone}
                    onChange={handleChange}
                    label="Timezone"
                  >
                    {timezoneOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {settings.timezone && (
                  <Typography variant="caption" sx={{ mt: 1, ml: 1, color: 'text.secondary', display: 'block' }}>
                    Current local time: {currentTime.toLocaleTimeString(navigator.language, { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}><FormControl fullWidth margin="normal"><InputLabel>Default Landing Page</InputLabel><Select name="landingPage" value={settings.landingPage} label="Default Landing Page" onChange={handleChange}><MenuItem value="/dashboard">Dashboard</MenuItem><MenuItem value="/quizzes">My Quizzes</MenuItem><MenuItem value="/reports">Reports</MenuItem></Select></FormControl></Grid>
            </Grid>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
            <FormGroup>
              <FormControlLabel control={<Switch checked={settings.emailNotifications} onChange={handleChange} name="emailNotifications" />} label="Email Notifications" />
              <FormControlLabel control={<Switch checked={settings.pushNotifications} onChange={handleChange} name="pushNotifications" />} label="Push Notifications" />
              <Divider sx={{ my: 2 }} /><Typography variant="subtitle1" gutterBottom>Quiz Alerts</Typography>
              <FormControlLabel control={<Switch checked={settings.quizReminders} onChange={handleChange} name="quizReminders" />} label="Upcoming Quiz Reminders" />
              <FormControlLabel control={<Switch checked={settings.gradeNotifications} onChange={handleChange} name="gradeNotifications" />} label="Grade Release Notifications" />
              <Divider sx={{ my: 2 }} /><FormControl component="fieldset"><Typography variant="subtitle1" gutterBottom>Notification Frequency</Typography><RadioGroup row name="notificationFrequency" value={settings.notificationFrequency} onChange={handleChange}><FormControlLabel value="instant" control={<Radio />} label="Instant" /><FormControlLabel value="daily" control={<Radio />} label="Daily Digest" /><FormControlLabel value="weekly" control={<Radio />} label="Weekly Summary" /></RadioGroup></FormControl>
            </FormGroup>
          </TabPanel>

          {/* Appearance Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>Appearance</Typography>
            <FormGroup>
              <FormControlLabel control={<Switch checked={mode === 'dark'} onChange={toggleTheme} />} label="Dark Mode" />
              <FormControlLabel control={<Switch checked={highContrastMode} onChange={toggleHighContrast} />} label="High Contrast Mode" />
            </FormGroup>
            <FormControl fullWidth margin="normal" sx={{ mt: 2 }}><InputLabel>Font Size</InputLabel><Select value={fontSize} label="Font Size" onChange={changeFontSize}><MenuItem value="small">Small</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="large">Large</MenuItem></Select></FormControl>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom>Security Settings</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Button fullWidth variant="outlined" startIcon={<VpnKeyIcon />}>Change Password</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button fullWidth variant="outlined" startIcon={<ShieldOutlinedIcon />}>Setup Two-Factor Authentication</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button fullWidth variant="outlined" color="info" startIcon={<DownloadIcon />}>Export My Data</Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Button fullWidth variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={() => setConfirmOpen(true)}>Delete My Account</Button>
              </Grid>
            </Grid>
          </TabPanel>

          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveSettings} disabled={isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      </Container>

      <Dialog open={isConfirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Account Deletion</DialogTitle>
        <DialogContent><DialogContentText>Are you sure you want to delete your account? This action is permanent and cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" autoFocus>Confirm Deletion</Button>
        </DialogActions>
      </Dialog>
    </FullLayout>
  );
};

export default SettingsPage;
