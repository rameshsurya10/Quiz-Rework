import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography } from '@mui/material';
import GenerateQuizForm from './GenerateQuizForm';

const CreateQuizDialog = ({ open, onClose, onSave, isSaving = false }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQuiz = async (formData) => {
    try {
      setIsGenerating(true);
      // Here you would typically call your API to generate the quiz
      console.log('Generating quiz with data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Call the onSave callback with the generated quiz data
      const generatedQuiz = {
        title: formData.name,
        description: formData.description,
        duration: formData.duration,
        numQuestions: formData.numQuestions,
        complexity: formData.complexity,
        // Add other fields as needed
      };
      
      onSave(generatedQuiz);
      onClose();
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={isGenerating ? undefined : onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f8f8 100%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        }
      }}
    >
      <DialogTitle 
        sx={{
          background: 'linear-gradient(45deg, #7B1FA2 0%, #9C27B0 100%)',
          color: 'white',
          textAlign: 'center',
          py: 2,
          mb: 2
        }}
      >
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
          Add Quiz
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 4 }}>
        <GenerateQuizForm 
          onSubmit={handleGenerateQuiz} 
          isSubmitting={isGenerating} 
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizDialog;
