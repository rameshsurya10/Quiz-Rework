import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Heading, Text, VStack, HStack, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge,
  Card, CardHeader, CardBody, Select, Flex, FormLabel,
  Input, InputGroup, InputRightElement, Divider,
  SimpleGrid, Tag, useToast, Alert, AlertIcon,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
import { SearchIcon, EditIcon, RepeatIcon } from '@chakra-ui/icons';
import quizService from '../../services/quizService';
import QuizQuestionManager from './QuizQuestionManager';

// Alias for normalizing question structures
const processQuestions = quizService.normalizeQuestions;

const QuizQuestionsView = ({ quizId, isAdmin = false, isTeacher = false }) => {
  // Retrieve quizId from URL params if not provided via props
  const { quizId: paramQuizId } = useParams();
  const resolvedQuizId = quizId || paramQuizId;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageFilter, setPageFilter] = useState('');
  const [complexity, setComplexity] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Regeneration options
  const [regenerateOptions, setRegenerateOptions] = useState({
    num_questions: 10,
    complexity: 'medium',
    page_start: '',
    page_end: '',
  });

  // Fetch quiz details
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        console.log('Fetching quiz data for ID:', resolvedQuizId);
        
        const quizData = await quizService.getQuizDetails(resolvedQuizId);
        console.log('Quiz data received:', quizData);
        
        // Set quiz data
        setQuiz(quizData);
        
        // Only use the current questions
        const currentQuestions = quizData.current_questions || [];
        setQuestions(currentQuestions);
        
      } catch (error) {
        console.error('Error in fetchQuizData:', error);
        toast({
          title: 'Error loading quiz data',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [resolvedQuizId, toast]);

  // Handle page filter change
  const handlePageFilterChange = async (e) => {
    const value = e.target.value;
    setPageFilter(value);
    
    try {
      setLoading(true);
      const questionData = await quizService.getQuizQuestions(
        resolvedQuizId, 
        value || null,
        complexity || null
      );
      let questions = questionData.questions || [];
      
      // Process questions to normalize the data structure
      questions = processQuestions(questions);
      
      setQuestions(questions);
    } catch (error) {
      toast({
        title: 'Error filtering questions',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle complexity filter change
  const handleComplexityChange = async (e) => {
    const value = e.target.value;
    setComplexity(value);
    
    try {
      setLoading(true);
      const questionData = await quizService.getQuizQuestions(
        resolvedQuizId, 
        pageFilter || null,
        value || null
      );
      let questions = questionData.questions || [];
      
      // Process questions to normalize the data structure
      questions = processQuestions(questions);
      
      setQuestions(questions);
    } catch (error) {
      toast({
        title: 'Error filtering questions',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Publish quiz
  const handlePublish = async () => {
    try {
      setLoading(true);
      await quizService.publishQuiz(resolvedQuizId);
      
      // Update quiz in state
      setQuiz(prev => ({ ...prev, is_published: true, status: 'published' }));
      
      toast({
        title: 'Quiz published',
        description: 'Quiz has been published successfully!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error publishing quiz',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle regeneration option changes
  const handleRegenerateOptionChange = (e) => {
    const { name, value } = e.target;
    setRegenerateOptions(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle regenerate questions
  const handleRegenerateQuestions = async () => {
    try {
      setLoading(true);
      onClose(); // Close the modal

      // Convert string values to numbers where needed
      const dataToSubmit = {
        ...regenerateOptions,
        page_start: regenerateOptions.page_start ? 
          parseInt(regenerateOptions.page_start) : undefined,
        page_end: regenerateOptions.page_end ? 
          parseInt(regenerateOptions.page_end) : undefined,
      };

      const response = await quizService.regenerateQuizQuestions(resolvedQuizId, dataToSubmit);
      
      // Refresh the questions and quiz data
      const updatedQuizData = await quizService.getQuizDetails(resolvedQuizId);
      setQuiz(updatedQuizData);
      
      const questionData = await quizService.getQuizQuestions(resolvedQuizId);
      let questions = questionData.questions || [];
      
      // Process questions to normalize the data structure
      questions = processQuestions(questions);
      
      setQuestions(questions);
      
      toast({
        title: 'Questions regenerated',
        description: 'Quiz questions have been regenerated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error regenerating questions',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination controls (for student view)
  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const paginatedQuestions = questions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  // Update the rendering part to handle the question types correctly
  const renderQuestion = (question, index) => {
    return (
      <Card key={question.question_number || index} variant="outline">
        <CardHeader bg="blue.50" py={3}>
          <Heading size="sm">Question {question.question_number || (index + 1)}</Heading>
        </CardHeader>
        <CardBody>
          <Text fontWeight="bold">{question.question}</Text>
          
          {question.type === 'mcq' && question.options && (
            <VStack align="stretch" mt={3} spacing={2}>
              {Object.entries(question.options).map(([key, value]) => (
                <Box 
                  key={key} 
                  p={2} 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="gray.200"
                  bg={question.correct_answer === key ? "green.50" : "white"}
                >
                  <Text>{key}. {value}</Text>
                </Box>
              ))}
            </VStack>
          )}
          
          {(question.type === 'fill' || question.type === 'oneline') && (
            <Box mt={3} p={2} borderRadius="md" border="1px dashed" borderColor="gray.300">
              <Text color="gray.600">Answer: {question.correct_answer}</Text>
            </Box>
          )}
          
          {question.type === 'truefalse' && (
            <Box mt={3}>
              <HStack spacing={4}>
                <Box 
                  p={2} 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="gray.200"
                  bg={question.correct_answer === "True" ? "green.50" : "white"}
                >
                  <Text>True</Text>
                </Box>
                <Box 
                  p={2} 
                  borderRadius="md" 
                  border="1px solid" 
                  borderColor="gray.200"
                  bg={question.correct_answer === "False" ? "green.50" : "white"}
                >
                  <Text>False</Text>
                </Box>
              </HStack>
            </Box>
          )}
          
          {question.explanation && (
            <Box mt={3} p={2} bg="yellow.50" borderRadius="md">
              <Text fontWeight="bold">Explanation:</Text>
              <Text>{question.explanation}</Text>
            </Box>
          )}
        </CardBody>
      </Card>
    );
  };

  // If loading, show spinner
  if (loading && !quiz) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading quiz...</Text>
      </Box>
    );
  }

  // If quiz not found
  if (!quiz) {
    return (
      <Alert status="error">
        <AlertIcon />
        Quiz not found or you don't have permission to view it.
      </Alert>
    );
  }

  // For student view, show a simplified version
  if (!isAdmin && !isTeacher) {
    return (
      <Box p={4}>
        <Heading size="md" mb={4}>Quiz Questions</Heading>
        {loading ? (
          <Box textAlign="center" py={5}>
            <Spinner />
            <Text mt={2}>Loading questions...</Text>
          </Box>
        ) : questions.length === 0 ? (
          <Alert status="info">
            <AlertIcon />
            No questions found for this quiz.
          </Alert>
        ) : (
          <VStack spacing={4} align="stretch">
            {paginatedQuestions.map((question, index) => renderQuestion(question, index))}
          </VStack>
        )}
      </Box>
    );
  }

  // For admin/teacher view, show the full manager
  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="lg">{quiz.title}</Heading>
        <HStack>
          {!quiz.is_published && (
            <Button 
              colorScheme="green" 
              leftIcon={<EditIcon />}
              onClick={handlePublish}
              isLoading={loading}
            >
              Publish Quiz
            </Button>
          )}
        </HStack>
      </HStack>

      <Card mb={6} variant="outline" className="glass-effect">
        <CardHeader bg="gray.50">
          <Heading size="md">Quiz Details</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontWeight="bold">Description:</Text>
              <Text>{quiz.description || 'No description'}</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Status:</Text>
              <Badge colorScheme={quiz.is_published ? 'green' : 'yellow'}>
                {quiz.is_published ? 'Published' : 'Draft'}
              </Badge>
            </Box>
            <Box>
              <Text fontWeight="bold">Time Limit:</Text>
              <Text>{quiz.time_limit_minutes} minutes</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Question Type:</Text>
              <Text>{quiz.question_type}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {loading ? (
        <Box textAlign="center" py={5}>
          <Spinner />
          <Text mt={2}>Loading questions...</Text>
        </Box>
      ) : !questions.length ? (
        <Alert status="info">
          <AlertIcon />
          No questions available for this quiz.
        </Alert>
      ) : (
        <VStack spacing={4} align="stretch">
          {questions.map((question, index) => renderQuestion(question, index))}
        </VStack>
      )}
    </Box>
  );
};

export default QuizQuestionsView;
