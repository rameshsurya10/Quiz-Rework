import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

const LoaderOverlay = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: theme.palette.background.default,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  transition: 'opacity 0.3s ease',
  '&.hidden': {
    opacity: 0,
    pointerEvents: 'none',
  }
}));

const LoaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(3),
  animation: 'fadeIn 0.5s ease-in-out',
  '@keyframes fadeIn': {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  }
}));

const PageLoader = ({ 
  loading = true, 
  message = 'Loading...', 
  showProgress = true 
}) => {
  const theme = useTheme();

  if (!loading) return null;

  return (
    <LoaderOverlay className={loading ? '' : 'hidden'}>
      <LoaderContent>
        {showProgress && (
          <CircularProgress 
            size={60} 
            thickness={4}
            sx={{
              color: theme.palette.primary.main,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }}
          />
        )}
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ 
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: '300px'
          }}
        >
          {message}
        </Typography>
      </LoaderContent>
    </LoaderOverlay>
  );
};

export default PageLoader; 