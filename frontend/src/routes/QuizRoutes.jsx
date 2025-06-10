import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import CreateQuizForm from '../components/quizzes/CreateQuizForm';
import QuizListView from '../components/quizzes/QuizListView';
import QuizQuestionsView from '../components/quizzes/QuizQuestionsView';

const QuizRoutes = () => {
  return (
    <Box p={4}>
      <Routes>
        <Route path="/" element={<QuizListView />} />
        <Route path="/create" element={<CreateQuizForm />} />
        <Route path="/:quizId" element={<QuizQuestionsView />} />
        <Route path="*" element={<Navigate to="/quizzes" replace />} />
      </Routes>
    </Box>
  );
};

export default QuizRoutes;
