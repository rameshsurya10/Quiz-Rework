import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Avatar, Paper, Button, Alert, ListItemIcon, List, ListItem, ListItemText
} from '@mui/material';
import {
  School, Email, Phone,
  Class as ClassIcon,
  Event as EventIcon,
  VerifiedUser as VerifiedIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { styled, useTheme } from '@mui/material/styles';
import { reportApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(2),
  textAlign: 'center',
  borderRadius: '16px',
  boxShadow: 'none',
  border: `1px solid ${theme.palette.divider}`,
}));

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString;
  }
};

const StudentDetailsDashboard = ({ student, onClose, dashboardData: initialData }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  // State for dashboard data can be simplified or removed if not needed
  const [dashboardData, setDashboardData] = useState(initialData);

  // Removed isLoading, error, and quizAttempts state
  // Removed useEffect that was fetching quiz attempts

  // Check if the necessary dashboard data is missing, simplified check
  const isDataMissing = !dashboardData;

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, borderRadius: '16px', bgcolor: 'background.default' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ width: 72, height: 72, mr: 2, bgcolor: theme.palette.primary.main, fontSize: '2.5rem' }}>
            {(dashboardData?.name || student?.name)?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold">{dashboardData?.name || student?.name || 'Student Name'}</Typography>
            <Typography variant="subtitle1" color="text.secondary">{dashboardData?.department_name || student?.department?.name || 'No Department'} | ID: {dashboardData?.student_id || student?.id || 'N/A'}</Typography>
          </Box>
        </Box>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </Box>

      <Card sx={{ borderRadius: '16px', p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ pl: 2 }}>
          Student Information
        </Typography>
        <Grid container>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem>
                <ListItemIcon><Email /></ListItemIcon>
                <ListItemText primary="Email Address" secondary={dashboardData?.email || 'N/A'} />
              </ListItem>
              <ListItem>
                <ListItemIcon><Phone /></ListItemIcon>
                <ListItemText primary="Phone Number" secondary={dashboardData?.phone || 'N/A'} />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
                <ListItem>
                  <ListItemIcon><ClassIcon /></ListItemIcon>
                  <ListItemText primary="Class & Section" secondary={`${dashboardData?.class_name || 'N/A'} - ${dashboardData?.section || 'N/A'}`} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><School /></ListItemIcon>
                  <ListItemText primary="Register No." secondary={dashboardData?.register_number || 'N/A'} />
                </ListItem>
            </List>
          </Grid>
        </Grid>
      </Card>
      
      <Card sx={{ borderRadius: '16px', p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ pl: 2 }}>
          Additional Information
        </Typography>
        <Grid container>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem>
                <ListItemIcon><VerifiedIcon /></ListItemIcon>
                <ListItemText primary="Verification Status" secondary={dashboardData?.is_verified ? 'Verified' : 'Not Verified'} />
              </ListItem>
              <ListItem>
                <ListItemIcon><EventIcon /></ListItemIcon>
                <ListItemText primary="Created On" secondary={formatDate(dashboardData?.created_at)} />
              </ListItem>
               <ListItem>
                <ListItemIcon><PersonIcon /></ListItemIcon>
                <ListItemText primary="Created By" secondary={dashboardData?.created_by || 'N/A'} />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6}>
            <List dense>
              <ListItem>
                <ListItemIcon><EventIcon /></ListItemIcon>
                <ListItemText primary="Last Modified On" secondary={formatDate(dashboardData?.last_modified_at)} />
              </ListItem>
              <ListItem>
                <ListItemIcon><PersonIcon /></ListItemIcon>
                <ListItemText primary="Last Modified By" secondary={dashboardData?.last_modified_by || 'N/A'} />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Card>

      {isDataMissing && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Detailed performance data is not available for this student yet. Basic details are shown above.
        </Alert>
      )}

      {/* All performance and quiz-related sections have been removed */}
      
    </Paper>
  );
};

export default StudentDetailsDashboard;
