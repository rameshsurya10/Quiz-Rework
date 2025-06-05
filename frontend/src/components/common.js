import React from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, Paper, 
  alpha, useTheme, IconButton, Divider, Button 
} from '@mui/material';

// Info Card component for dashboard metrics
export const InfoCard = ({ title, value, icon, color, subtitle, trend, trendValue }) => {
  const theme = useTheme();
  const isPositive = trend === 'up';
  
  return (
    <Card sx={{ 
      height: '100%',
      borderRadius: 3,
      boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
      background: `linear-gradient(135deg, ${alpha(color || theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.5)} 100%)`,
      backdropFilter: 'blur(10px)',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 25px 0 rgba(0,0,0,0.1)'
      }
    }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" color="textSecondary">{title}</Typography>
          <Box sx={{
            p: 1,
            borderRadius: '50%',
            bgcolor: alpha(color || theme.palette.primary.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
        </Box>
        <Box display="flex" alignItems="flex-end" mb={0.5}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {value}
          </Typography>
          {trendValue && (
            <Box display="flex" alignItems="center" ml={1} mb={0.5}>
              {isPositive ? (
                <Box color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography 
                    variant="caption" 
                    color="success.main"
                    sx={{ ml: 0.5, fontWeight: 'medium' }}
                  >
                    +{trendValue}%
                  </Typography>
                </Box>
              ) : (
                <Box color="error.main" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography 
                    variant="caption" 
                    color="error.main"
                    sx={{ ml: 0.5, fontWeight: 'medium' }}
                  >
                    -{trendValue}%
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
        {subtitle && (
          <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
        )}
      </CardContent>
    </Card>
  );
};

// Jumbo Card Quick component for sections with nice styling
export const JumboCardQuick = ({ children, title, subheader, action, bgColor, sx }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'relative',
        p: 4,
        borderRadius: 3,
        backgroundColor: bgColor || theme.palette.background.paper,
        mb: 4,
        ...sx
      }}
    >
      {(title || subheader || action) && (
        <Box mb={3} display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            {title && <Typography variant="h5" component="h2">{title}</Typography>}
            {subheader && (
              <Typography variant="subtitle2" color="text.secondary" mt={0.5}>
                {subheader}
              </Typography>
            )}
          </Box>
          {action && <Box>{action}</Box>}
        </Box>
      )}
      {children}
    </Paper>
  );
};

// Section Header component for page sections
export const SectionHeader = ({ title, subtitle, action }) => {
  return (
    <Box mb={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" component="h2" gutterBottom>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
};

// Empty state component for when there's no data
export const EmptyState = ({ title, description, icon, action }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 3,
        bgcolor: alpha(theme.palette.primary.light, 0.05),
        borderRadius: 2,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
            '& svg': {
              fontSize: '4rem',
              color: alpha(theme.palette.text.primary, 0.2),
            },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      {action && action}
    </Box>
  );
};

// Page header component
export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box display="flex" gap={2}>
          {actions}
        </Box>
      )}
    </Box>
  );
};
