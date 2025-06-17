import React from 'react';
import { Box } from '@mui/material';

const QuizImage = () => {
  return (
    <Box
      component="img"
      src="/images/Quiz-Form.jpg"
      alt="Quiz Form Illustration"
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        borderRadius: 2,
      }}
    />
  );
};

export default QuizImage;
