import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { InboxOutlined as InboxIcon } from '@mui/icons-material'; // Or any other suitable icon

const EmptyState = ({ 
  title = 'No Data Found',
  message = 'There is no data to display at the moment.',
  icon, 
  actionButton 
}) => {
  const IconComponent = icon || <InboxIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />;

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        textAlign: 'center', 
        p: { xs: 3, sm: 5 }, 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: 'divider',
        // minHeight: 300, // Optional: to give it some default height
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)'
      }}
    >
      {IconComponent}
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mb: actionButton ? 2 : 0 }}>
        {message}
      </Typography>
      {actionButton && (
        <Box sx={{ mt: 2.5 }}>
          {actionButton}
        </Box>
      )}
    </Paper>
  );
};

export default EmptyState;
