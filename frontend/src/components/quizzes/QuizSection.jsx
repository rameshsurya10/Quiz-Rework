import React from 'react';
import { Box, Container } from '@chakra-ui/react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import FullLayout from '../FullLayout';
import CreateQuizForm from './CreateQuizForm';
import QuizListView from './QuizListView';
import QuizQuestionsView from './QuizQuestionsView';

const QuizSection = () => {
  const location = useLocation();
  
  return (
    <FullLayout>
      <Container maxW="container.xl" py={4}>
        <Routes>
          <Route index element={<QuizListView />} />
          <Route path="create" element={<CreateQuizForm />} />
          <Route path=":quizId" element={<QuizQuestionsView />} />
          <Route path="*" element={<Navigate to="/quizzes" replace />} />
        </Routes>
      </Container>
    </FullLayout>
  );
};

export default QuizSection;
