import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Paper, Grid, Avatar, Button, Divider, 
  List, ListItem, ListItemText, ListItemIcon, useTheme, IconButton,
  Tooltip, CircularProgress, Tabs, Tab, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, TableSortLabel,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem, alpha,
  Switch, FormGroup, FormControlLabel, FormHelperText
} from '@mui/material';
import { PageHeader, EmptyState } from '../common';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import EmailIcon from '@mui/icons-material/Email';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { motion } from 'framer-motion';
import { visuallyHidden } from '@mui/utils';
import EditProfileDialog from './EditProfileDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import CreateUserDialog from '../usermanagement/CreateUserDialog';
import ConfirmationDialog from '../ConfirmationDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { userApi } from '../../services/api';

// Default user data structure
const defaultUser = {
  name: '',
  email: '',
  role: 'User',
  avatar: null,
  date_joined: new Date().toISOString(),
  bio: '',
  get avatarUrl() {
    return this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`;
  },
  get joinedDate() {
    return new Date(this.date_joined).toLocaleDateString();
  }
};

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `profile-tab-${index}`,
    'aria-controls': `profile-tabpanel-${index}`,
  };
}

const ProfilePage = ({ initialTab = 0 }) => {
  // 1. Hooks and Context
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 2. Refs
  const fileInputRef = useRef(null);
  
  // 3. State - Profile and Settings
  const [activeTab, setActiveTab] = useState(initialTab);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form data includes both profile and settings
  const [formData, setFormData] = useState({
    // Profile fields
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    institution: '',
    avatar: null,
    
    // Settings fields
    email_notifications: true,
    push_notifications: false,
    dark_mode: false,
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  
  // 4. State - User Management
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [openConfirmDeleteUserDialog, setOpenConfirmDeleteUserDialog] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState(null);
  
  // 5. Memoized values
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    return users
      .filter(user => {
        const matchesSearch = !searchTerm || 
          (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (a[orderBy] > b[orderBy]) {
          comparison = 1;
        } else if (a[orderBy] < b[orderBy]) {
          comparison = -1;
        }
        return order === 'asc' ? comparison : -comparison;
      });
  }, [users, searchTerm, roleFilter, statusFilter, order, orderBy]);

  const paginatedUsers = useMemo(() => {
    // Ensure filteredUsers is available before trying to slice it
    if (!filteredUsers) return [];
    return filteredUsers.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredUsers, page, rowsPerPage]);
  
  // 5.1 Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleSaveProfile(e);
  };
  
  // 5.2 Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // 5.3 Handle profile and settings save
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Create form data for the request
      const formDataToSend = new FormData();
      
      // Append profile fields
      if (formData.first_name) formDataToSend.append('first_name', formData.first_name);
      if (formData.last_name) formDataToSend.append('last_name', formData.last_name);
      if (formData.bio) formDataToSend.append('bio', formData.bio);
      if (formData.institution) formDataToSend.append('institution', formData.institution);
      
      // Append settings
      formDataToSend.append('email_notifications', formData.email_notifications);
      formDataToSend.append('push_notifications', formData.push_notifications);
      formDataToSend.append('dark_mode', formData.dark_mode);
      
      // Handle avatar upload if a new file is selected
      if (formData.avatar && formData.avatar instanceof File) {
        formDataToSend.append('avatar', formData.avatar);
      }
      
      // Send the update request
      const response = await userApi.updateProfile(formDataToSend);
      
      // Update local state with the response
      if (response.data) {
        const updatedUser = response.data;
        const updatedProfile = updatedUser.profile || {};
        
        setUser(prev => ({
          ...prev,
          name: updatedUser.first_name || prev.name,
          email: updatedUser.email || prev.email,
          bio: updatedProfile.bio || prev.bio,
          institution: updatedProfile.institution || prev.institution,
          avatar: updatedProfile.avatar_url || prev.avatar
        }));
        
        // Show success message
        showSnackbar('Profile updated successfully', 'success');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to update profile. Please try again.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 6. Fetch user profile function
  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // Fetch both user profile and settings in parallel
      const [profileResponse] = await Promise.all([
        userApi.getProfile(),
      ]);
      
      console.log('Profile API response:', profileResponse);
      
      // Extract user and profile data
      const userData = profileResponse.data || profileResponse;
      const profileData = userData.profile || {};
      
      // Update user state
      setUser(prev => ({
        ...defaultUser,
        ...userData,
        id: userData.id,
        name: userData.full_name || userData.first_name || userData.email?.split('@')[0] || 'User',
        email: userData.email,
        role: userData.role || 'User',
        avatar: profileData.avatar_url || '',
        bio: profileData.bio || '',
        institution: profileData.institution || '',
        joined: userData.date_joined || new Date().toISOString().split('T')[0]
      }));
      
      // Update form data with profile and settings
      setFormData(prev => ({
        ...prev,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        bio: profileData.bio || '',
        institution: profileData.institution || '',
        email_notifications: profileData.email_notifications !== undefined 
          ? profileData.email_notifications 
          : true,
        push_notifications: profileData.push_notifications !== undefined 
          ? profileData.push_notifications 
          : false,
        dark_mode: profileData.dark_mode !== undefined 
          ? profileData.dark_mode 
          : false,
      }));
      
      setError(null);
    } catch (error) {
      console.error('Failed to fetch user profile. Full error object:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         error.message || 
                         'Failed to load user profile';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Effects
  // Fetch user profile and settings on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // 7. Functions
  const fetchUsersList = useRef(async () => {
    try {
      setIsLoadingUsers(true);
      const response = await userApi.getAllUsers();
      setUsers(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users. Please try again.', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  }).current;

  // Handle tab changes and URL synchronization
  useEffect(() => {
    const handleTabChange = () => {
      if (location.pathname.includes('/users')) {
        setActiveTab(1);
        // Ensure fetchUsersList is defined before calling
        if (typeof fetchUsersList === 'function') {
          fetchUsersList();
        }
      } else {
        setActiveTab(0);
      }
    };
    
    handleTabChange();
  }, [location.pathname, fetchUsersList]);
  
  // 8. Avatar change handler
  const handleAvatarChange = useRef(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showSnackbar('Please select a valid image file', 'error');
      return;
    }
    
    // Validate file size (e.g., 2MB limit)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      showSnackbar('Image size should be less than 2MB', 'error');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await userApi.uploadProfilePicture(formData);
      console.log('Avatar upload response:', response);
      
      // Extract avatar URL from response - the backend now returns avatar_url in the response
      const avatarUrl = response.data?.avatar_url || response.avatar_url || null;
      
      setUser(prev => ({
        ...prev,
        avatar: avatarUrl
      }));
      showSnackbar('Profile picture updated successfully!', 'success');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Failed to update profile picture. Please try again.';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }).current;

  // 9. Aliases for backward compatibility (must be after state declarations and function definitions)
  const openEditProfileDialog = isEditing;
  const isSavingProfile = isLoading;
  const openChangePasswordDialog = isChangingPassword;
  const isUploadingAvatar = isUploading;
  const handleAvatarUpload = handleAvatarChange;

  // 7. Render Profile Form
  const renderProfileForm = () => (
    <form onSubmit={handleSaveProfile}>
      <Grid container spacing={3}>
        {/* Left Column - Profile Picture */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar 
                src={avatarPreview || user?.avatar} 
                alt={user?.name}
                sx={{ 
                  width: 150, 
                  height: 150, 
                  fontSize: 60,
                  mx: 'auto',
                  mb: 2
                }}
              />
              {isEditing && (
                <>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="avatar-upload"
                    type="file"
                    onChange={handleAvatarUpload}
                    ref={fileInputRef}
                  />
                  <label htmlFor="avatar-upload">
                    <Tooltip title="Change Avatar">
                      <IconButton
                        color="primary"
                        aria-label="upload picture"
                        component="span"
                        sx={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <PhotoCameraIcon />
                      </IconButton>
                    </Tooltip>
                  </label>
                </>
              )}
            </Box>
            <Typography variant="h6" gutterBottom>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.role}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Member since {user?.joined}
            </Typography>
          </Paper>
        </Grid>

        {/* Right Column - Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  id="first_name"
                  name="first_name"
                  label="First Name"
                  fullWidth
                  autoComplete="given-name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  id="last_name"
                  name="last_name"
                  label="Last Name"
                  fullWidth
                  autoComplete="family-name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  id="email"
                  name="email"
                  label="Email Address"
                  fullWidth
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  id="bio"
                  name="bio"
                  label="Bio"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  id="institution"
                  name="institution"
                  label="Institution"
                  fullWidth
                  value={formData.institution}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </Grid>
              
              {/* Settings Section */}
              <Grid item xs={12}>
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Notification Settings
                  </Typography>
                  <Divider />
                </Box>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.email_notifications}
                        onChange={handleInputChange}
                        name="email_notifications"
                        disabled={!isEditing}
                      />
                    }
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.push_notifications}
                        onChange={handleInputChange}
                        name="push_notifications"
                        disabled={!isEditing}
                      />
                    }
                    label="Push Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.dark_mode}
                        onChange={handleInputChange}
                        name="dark_mode"
                      />
                    }
                    label="Dark Mode"
                  />
                </FormGroup>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {isEditing ? (
          <>
            <Button 
              variant="outlined" 
              onClick={() => {
                setIsEditing(false);
                // Reset form to original values
                fetchUserProfile();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setIsEditing(true)}
            startIcon={<EditIcon />}
          >
            Edit Profile
          </Button>
        )}
      </Box>
    </form>
  );

  // Render loading state
  if (isLoading && !user) {
    return (
      <FullLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
          <CircularProgress />
        </Box>
      </FullLayout>
    );
  }

  if (!user) {
    return (
      <FullLayout>
        <Container sx={{ mt: 4, mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Typography>Could not load profile information.</Typography>
        </Container>
      </FullLayout>
    );
  }

  const handleEditProfile = () => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      bio: user.bio || '',
      institution: user.institution || ''
    });
    setIsEditing(true);
  };

  const handleCloseEditProfileDialog = () => {
    setIsEditing(false);
  };
  
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleChangePassword = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setIsChangingPassword(true);
  };

  const handleCloseChangePasswordDialog = () => {
    setIsChangingPassword(false);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    // Validate password strength
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    // Additional validation - check for complexity
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumbers = /[0-9]/.test(passwordData.newPassword);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      setPasswordError('Password must include uppercase, lowercase and numbers');
      return;
    }
    
    try {
      console.log('Sending password change request');
      const response = await userApi.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      });
      console.log('Password change response:', response);
      showSnackbar('Password changed successfully!', 'success');
      setIsChangingPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to change password. Please try again.';
      
      // More detailed error handling
      if (error.response) {
        console.error('Error response data:', error.response.data);
        // Check for different error formats
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.current_password) {
          errorMessage = `Current password: ${error.response.data.current_password}`;
        } else if (error.response.data.new_password) {
          errorMessage = `New password: ${error.response.data.new_password}`;
        } else if (error.response.data.confirm_password) {
          errorMessage = `Confirm password: ${error.response.data.confirm_password}`;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setPasswordError(errorMessage);
    } finally {
      // Use the correct state variable - we don't have setIsPasswordLoading
      setIsLoading(false);
    }
  };



  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (passwordError && name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle tab change and update URL
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Update URL based on the selected tab
    if (newValue === 1) {
      navigate('/profile/users', { replace: true });
    } else {
      navigate('/profile', { replace: true });
    }
  };

  // User management handlers and effects


  // Duplicate useEffect for tab/URL sync removed; original is at lines 156-167

  // filteredUsers and paginatedUsers moved to '5. Memoized values' section

  // User management handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => (event) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleSearchChange = handleSearch;

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  // Handle edit user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsEditingUser(true);
    setOpenUserDialog(true);
  };

  const handleOpenUserDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setIsEditingUser(true);
    } else {
      setEditingUser(null);
      setIsEditingUser(false);
    }
    setOpenUserDialog(true);
  };

  const handleCloseUserDialog = () => {
    setOpenUserDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (isEditingUser) {
        await userApi.updateUser(editingUser.id, userData);
        showSnackbar('User updated successfully!', 'success');
      } else {
        await userApi.createUser(userData);
        showSnackbar('User created successfully!', 'success');
      }
      fetchUsersList();
      handleCloseUserDialog();
    } catch (error) {
      console.error('Failed to save user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save user. Please try again.';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDeleteId) return;
    
    try {
      await userApi.deleteUser(userToDeleteId);
      showSnackbar('User deleted successfully!', 'success');
      fetchUsersList();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showSnackbar('Failed to delete user. Please try again.', 'error');
    } finally {
      setOpenConfirmDeleteUserDialog(false);
      setUserToDeleteId(null);
    }
  };

  // Table headers for user management
  const userTableHeaders = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'role', label: 'Role', sortable: true },
    { id: 'joinedDate', label: 'Joined Date', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'actions', label: 'Actions', sortable: false }
  ];

  return (
    <FullLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title={activeTab === 0 ? "User Profile" : "User Management"}
          subtitle={activeTab === 0 
            ? "View and manage your profile details and account settings."
            : "Manage all users and their permissions."}
        />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="profile tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="My Profile" {...a11yProps(0)} />
            <Tab label="User Management" {...a11yProps(1)} />
          </Tabs>
        </Box>

        {/* Hidden file input for avatar upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarUpload}
          accept="image/*"
          style={{ display: 'none' }}
        />

        <TabPanel value={activeTab} index={0}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
          <Paper sx={{
            p: { xs: 2, md: 4 },
            mt: 3,
            borderRadius: '12px',
            boxShadow: theme.shadows[3],
            backgroundColor: theme.palette.background.paper,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Loading overlay */}
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  zIndex: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}

            <Grid container spacing={{ xs: 2, md: 4 }}>
              {/* Avatar and Name Section */}
              <Grid item xs={12} md={4} sx={{ textAlign: 'center', position: 'relative' }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Tooltip title="Click to change profile picture">
                    <IconButton
                      onClick={triggerFileInput}
                      disabled={isUploadingAvatar}
                      sx={{
                        p: 0,
                        '&:hover': {
                          '& .MuiAvatar-root': {
                            opacity: 0.8,
                          },
                          '& .camera-icon': {
                            opacity: 1,
                          }
                        }
                      }}
                    >
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.name}
                        sx={{
                          width: { xs: 120, md: 150 },
                          height: { xs: 120, md: 150 },
                          fontSize: '3rem',
                          border: `3px solid ${theme.palette.primary.main}`,
                          transition: 'opacity 0.3s ease',
                          position: 'relative',
                          backgroundColor: theme.palette.primary.light
                        }}
                      >
                        {!user.avatar && user.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box
                        className="camera-icon"
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          color: 'white',
                        }}
                      >
                        <PhotoCameraIcon />
                      </Box>
                    </IconButton>
                  </Tooltip>
                  {isUploadingAvatar && (
                    <CircularProgress
                      size={40}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-20px',
                        marginLeft: '-20px',
                      }}
                    />
                  )}
                </Box>

                <Typography variant="h5" component="h2" gutterBottom sx={{ 
                  fontWeight: 'bold',
                  mt: 2,
                  wordBreak: 'break-word'
                }}>
                  {user.name || 'User'}
                </Typography>
                
                <Box sx={{
                  display: 'inline-block',
                  backgroundColor: theme.palette.primary.light,
                  color: theme.palette.primary.contrastText,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  fontWeight: 'medium',
                  mb: 2
                }}>
                  {user.role || 'User'}
                </Box>

                <Box sx={{ 
                  mt: 2, 
                  display: 'flex', 
                  flexDirection: { xs: 'row', sm: 'column', md: 'row' },
                  gap: 1,
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  <Button 
                    variant="contained" 
                    startIcon={<EditIcon />} 
                    onClick={handleEditProfile}
                    size="small"
                    fullWidth={false}
                  >
                    Edit Profile
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<LockResetIcon />} 
                    onClick={handleChangePassword}
                    size="small"
                    fullWidth={false}
                  >
                    Change Password
                  </Button>
                </Box>
              </Grid>

              {/* Details Section */}
              <Grid item xs={12} md={8}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'medium', 
                    borderBottom: `1px solid ${theme.palette.divider}`, 
                    pb: 1, 
                    mb: 2 
                  }}
                >
                  Account Information
                </Typography>
                
                <List disablePadding>
                  <ListItem disablePadding sx={{ mb: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <EmailIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email Address" 
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                      secondary={user.email || 'Not provided'} 
                      secondaryTypographyProps={{ 
                        variant: 'body1',
                        color: 'text.primary',
                        sx: { wordBreak: 'break-all' }
                      }}
                    />
                  </ListItem>
                  
                  <ListItem disablePadding sx={{ mb: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <CalendarTodayIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Member Since" 
                      primaryTypographyProps={{ variant: 'subtitle2' }}
                      secondary={formatDate(user.date_joined)} 
                      secondaryTypographyProps={{ variant: 'body1', color: 'text.primary' }}
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'medium', 
                        borderBottom: `1px solid ${theme.palette.divider}`, 
                        pb: 1,
                        flexGrow: 1
                      }}
                    >
                      About Me
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    sx={{ 
                      whiteSpace: 'pre-line',
                      p: 2,
                      backgroundColor: theme.palette.mode === 'light' 
                        ? theme.palette.grey[50] 
                        : theme.palette.grey[900],
                      borderRadius: 1
                    }}
                  >
                    {user.bio || 'No biography provided.'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
          </motion.div>
        </TabPanel>
        
        {/* User Management Tab */}
        <TabPanel value={activeTab} index={1}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                label="Search users..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={handleSearch}
                sx={{ flexGrow: 1, maxWidth: 400 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  label="Role"
                  onChange={handleRoleFilterChange}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="Teacher">Teacher</MenuItem>
                  <MenuItem value="Student">Student</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusFilterChange}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenUserDialog()}
                sx={{ ml: 'auto' }}
              >
                Add User
              </Button>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {userTableHeaders.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        sortDirection={orderBy === headCell.id ? order : false}
                        sx={{ fontWeight: 'bold' }}
                      >
                        {headCell.sortable ? (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={() => handleRequestSort(headCell.id)}
                          >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                              <Box component="span" sx={visuallyHidden}>
                                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                              </Box>
                            ) : null}
                          </TableSortLabel>
                        ) : (
                          headCell.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={userTableHeaders.length} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role} 
                            size="small"
                            color={
                              user.role === 'Admin' ? 'primary' : 
                              user.role === 'Teacher' ? 'secondary' : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatDate(user.joinedDate)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.status} 
                            size="small"
                            color={user.status === 'Active' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenUserDialog(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => {
                                setUserToDeleteId(user.id);
                                setOpenConfirmDeleteUserDialog(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={userTableHeaders.length} align="center" sx={{ py: 4 }}>
                        <EmptyState 
                          icon={<GroupIcon sx={{ fontSize: 60, color: 'text.disabled' }} />}
                          title="No users found"
                          description="Try adjusting your search or filter criteria"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ mt: 2 }}
            />
          </Paper>
        </TabPanel>
      </Container>

      {user && (
        <>
          <EditProfileDialog
            open={openEditProfileDialog}
            onClose={handleCloseEditProfileDialog}
            onSave={handleSaveProfile}
            userData={{
              name: user.name,
              email: user.email,
              bio: user.bio,
              institution: user.institution
            }}
            isSaving={isSavingProfile}
          />
          <ChangePasswordDialog 
            open={openChangePasswordDialog}
            onClose={handleCloseChangePasswordDialog}
            onSave={handleSavePassword}
            isSaving={isChangingPassword}
          />
        </>
      )}
    </FullLayout>
  );
};

export default ProfilePage;
