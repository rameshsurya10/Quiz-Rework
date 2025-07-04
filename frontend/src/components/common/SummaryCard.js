import React from 'react';
import { Paper, Box, Typography, Avatar } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';

const SummaryCard = ({ icon, title, value, color = 'primary', index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Paper 
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderRadius: 2,
          height: '100%',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)',
          },
        }}
      >
        <Avatar sx={{ bgcolor: (theme) => alpha(theme.palette[color]?.main || color, 0.1), color: (theme) => theme.palette[color]?.main || color, mr: 2, width: 56, height: 56 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{value}</Typography>
          <Typography variant="body1" color="text.secondary">{title}</Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default SummaryCard;
