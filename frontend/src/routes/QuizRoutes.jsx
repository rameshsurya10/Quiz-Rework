import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import CreateQuizForm from '../components/quiz/CreateQuizForm';
import QuizListView from '../components/quiz/QuizListView';
import QuizQuestionsView from '../components/quiz/QuizQuestionsView';

const QuizRoutes = () => {
  return (
    <Box p={4}>
      <Routes>
        <Route path="/" element={<QuizListView />} />
        <Route path="/create" element={<CreateQuizForm />} />
        <Route path="/:quizId" element={<QuizQuestionsView />} />
        <Route path="*" element={<Navigate to="/quiz" replace />} />
      </Routes>
    </Box>
  );
};

export default QuizRoutes;
