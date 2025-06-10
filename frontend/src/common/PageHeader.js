import React from 'react';
import { Box, Typography, Button, Stack, Divider } from '@mui/material';

const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="subtitle1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && actions.length > 0 && (
          <Stack direction="row" spacing={1.5} alignItems="center">
            {actions.map((action, index) => (
              <React.Fragment key={index}>{action}</React.Fragment>
            ))}
          </Stack>
        )}
      </Stack>
      <Divider />
    </Box>
  );
};

export default PageHeader;
