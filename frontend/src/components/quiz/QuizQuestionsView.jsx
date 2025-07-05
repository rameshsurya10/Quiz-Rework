import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Heading, Text, VStack, HStack, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge,
  Card, CardHeader, CardBody, Select, Flex, FormLabel,
  Input, InputGroup, InputRightElement, Divider,
  SimpleGrid, Tag, useToast, Alert, AlertIcon,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  IconButton, Tooltip
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

  // Add state for regeneration loading
  const [regeneratingQuestions, setRegeneratingQuestions] = useState([]);

  // Add state for regeneration count
  const [regenerationsRemaining, setRegenerationsRemaining] = useState(5);

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
        
        // Handle different question data formats from backend
        let questions = [];
        
        if (quizData.current_questions) {
          questions = quizData.current_questions;
        } else if (quizData.questions) {
          questions = quizData.questions;
        }
        
        // Handle case where questions might be a JSON string
        if (typeof questions === 'string') {
          try {
            questions = JSON.parse(questions);
          } catch (parseError) {
            console.error('Failed to parse questions JSON:', parseError);
            questions = [];
          }
        }
        
        // Ensure we have an array
        if (!Array.isArray(questions)) {
          questions = [];
        }
        
        setQuestions(questions);
        
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

  // Handle single question regeneration
  const handleRegenerateSingleQuestion = async (questionNumber) => {
    // Check if we have regenerations remaining
    if (regenerationsRemaining <= 0) {
      toast({
        title: 'No regenerations remaining',
        description: 'You have used all available regenerations for this quiz.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setRegeneratingQuestions(prev => [...prev, questionNumber]);
      
      // Call the backend to regenerate the question
      const response = await quizService.regenerateQuizQuestion(resolvedQuizId, questionNumber);
      
      // Refresh the questions
      const questionData = await quizService.getQuizQuestions(resolvedQuizId);
      let updatedQuestions = questionData.questions || [];
      
      // Process questions to normalize the data structure
      updatedQuestions = processQuestions(updatedQuestions);
      
      // Update questions while preserving question numbers
      setQuestions(updatedQuestions.map(q => ({
        ...q,
        question_number: q.question_number || questions.find(oldQ => oldQ.id === q.id)?.question_number
      })));

      // Decrease regenerations remaining
      setRegenerationsRemaining(prev => prev - 1);
      
      toast({
        title: 'Question regenerated',
        description: `Question ${questionNumber} has been regenerated successfully. ${regenerationsRemaining - 1} regenerations remaining.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error regenerating question',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRegeneratingQuestions(prev => prev.filter(num => num !== questionNumber));
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
    const questionNumber = question.question_number || (index + 1);
    const isRegenerating = regeneratingQuestions.includes(questionNumber);
    
    return (
      <Card key={questionNumber} variant="outline">
        <CardHeader bg="blue.50" py={3}>
          <Flex justify="space-between" align="center">
            <Heading size="sm">Question {questionNumber}</Heading>
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="outline">
                {(question.type || 'mcq').toUpperCase()}
              </Badge>
              {(isAdmin || isTeacher) && (
                <Tooltip label={quiz.is_published ? "Cannot regenerate questions after publishing" : "Regenerate this question"}>
                  <IconButton
                    icon={<RepeatIcon />}
                    size="sm"
                    variant="ghost"
                    isLoading={isRegenerating}
                    onClick={() => !quiz.is_published && handleRegenerateSingleQuestion(questionNumber)}
                    isDisabled={quiz.is_published}
                    opacity={quiz.is_published ? 0.5 : 1}
                    cursor={quiz.is_published ? 'not-allowed' : 'pointer'}
                    aria-label="Regenerate question"
                  />
                </Tooltip>
              )}
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody>
          <Text fontWeight="bold" mb={3} lineHeight="1.6">
            {question.question || question.question_text || 'No question text available'}
          </Text>
          
          {question.type === 'mcq' && question.options && (
            <VStack align="stretch" mt={3} spacing={2}>
              <Text fontWeight="bold" color="gray.600" fontSize="sm">Options:</Text>
              {typeof question.options === 'object' && !Array.isArray(question.options) ? (
                // Handle object format options
                Object.entries(question.options).map(([key, value]) => {
                  const isCorrect = question.correct_answer?.toString().split(':')[0].trim() === key;
                  return (
                    <Box 
                      key={key} 
                      p={3} 
                      borderRadius="md" 
                      border="2px solid" 
                      borderColor={isCorrect ? "green.400" : "gray.200"}
                      bg={isCorrect ? "green.50" : "white"}
                    >
                      <Text fontWeight={isCorrect ? "bold" : "normal"}>
                        {isCorrect && "✓ "}{key}. {String(value)}
                      </Text>
                    </Box>
                  );
                })
              ) : Array.isArray(question.options) ? (
                // Handle array format options
                question.options.map((option, optIndex) => {
                  const isCorrect = option.is_correct || false;
                  return (
                    <Box 
                      key={optIndex} 
                      p={3} 
                      borderRadius="md" 
                      border="2px solid" 
                      borderColor={isCorrect ? "green.400" : "gray.200"}
                      bg={isCorrect ? "green.50" : "white"}
                    >
                      <Text fontWeight={isCorrect ? "bold" : "normal"}>
                        {isCorrect && "✓ "}{option.id || String.fromCharCode(65 + optIndex)}. {String(option.option_text || option)}
                      </Text>
                    </Box>
                  );
                })
              ) : (
                <Text color="gray.500">No options available</Text>
              )}
            </VStack>
          )}
          
          {(question.type === 'fill' || question.type === 'oneline') && (
            <Box mt={3}>
              <Text fontWeight="bold" color="gray.600" fontSize="sm" mb={2}>Correct Answer:</Text>
              <Box p={3} borderRadius="md" border="2px solid" borderColor="green.400" bg="green.50">
                <Text fontWeight="bold" color="green.700">
                  {question.correct_answer || 'No answer provided'}
                </Text>
              </Box>
            </Box>
          )}
          
          {question.type === 'truefalse' && (
            <Box mt={3}>
              <Text fontWeight="bold" color="gray.600" fontSize="sm" mb={2}>Options:</Text>
              <HStack spacing={4}>
                <Box 
                  p={3} 
                  borderRadius="md" 
                  border="2px solid" 
                  borderColor={question.correct_answer === "True" ? "green.400" : "gray.200"}
                  bg={question.correct_answer === "True" ? "green.50" : "white"}
                  flex={1}
                >
                  <Text fontWeight={question.correct_answer === "True" ? "bold" : "normal"}>
                    {question.correct_answer === "True" && "✓ "}True
                  </Text>
                </Box>
                <Box 
                  p={3} 
                  borderRadius="md" 
                  border="2px solid" 
                  borderColor={question.correct_answer === "False" ? "green.400" : "gray.200"}
                  bg={question.correct_answer === "False" ? "green.50" : "white"}
                  flex={1}
                >
                  <Text fontWeight={question.correct_answer === "False" ? "bold" : "normal"}>
                    {question.correct_answer === "False" && "✓ "}False
                  </Text>
                </Box>
              </HStack>
            </Box>
          )}
          
          {question.explanation && (
            <Box mt={4} p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
              <Text fontWeight="bold" color="blue.700" mb={1}>Explanation:</Text>
              <Text color="blue.600">{question.explanation}</Text>
            </Box>
          )}
          
          {question.source_page && (
            <Box mt={3}>
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                Source: Page {question.source_page}
              </Text>
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
            {paginatedQuestions.filter(Boolean).map((question, index) => renderQuestion(question, index))}
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

      {!quiz.is_published && (
        <Alert status="info" mb={4}>
          <AlertIcon />
          <Text>
            Note: You can regenerate up to 5 questions for this quiz. This will use a question from the additional questions pool. You have {regenerationsRemaining} regenerations remaining.
          </Text>
        </Alert>
      )}

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
          {questions.filter(Boolean).map((question, index) => renderQuestion(question, index))}
        </VStack>
      )}
    </Box>
  );
};

export default QuizQuestionsView;
