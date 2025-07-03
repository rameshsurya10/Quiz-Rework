import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, SimpleGrid, VStack,
  HStack, Card, CardHeader, CardBody, CardFooter,
  Badge, Spinner, useToast, Flex, Select, Input,
  InputGroup, InputLeftElement, IconButton, Menu,
  MenuButton, MenuList, MenuItem, Divider, Tag,
  Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, ChevronDownIcon, EditIcon, ViewIcon, DeleteIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import quizService from '../../services/quizService';
import { CircularProgress } from '@mui/material';
import { Typography } from '@mui/material';
import { Edit, Delete, Visibility } from '@mui/icons-material';
import { quizApi } from '../../services/api';

const QuizListView = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // State for question view modal
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isQuestionsLoading, setQuestionsLoading] = useState(false);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await quizApi.getAll();
      const quizzesData = Array.isArray(response.data)
        ? response.data
        : (response.data.results || response.data || []);
      setQuizzes(quizzesData);
    } catch (err) {
      setError('Failed to load quizzes. Please try again.');
      console.error('Error loading quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = async (quizId) => {
    try {
      setQuestionsLoading(true);
      setViewModalOpen(true);
      const data = await quizService.getQuizDetails(quizId);
      
      console.log('Raw quiz data from backend:', data);
      
      // Process questions to normalize the data structure
      if (data.questions && Array.isArray(data.questions)) {
        data.questions = data.questions.map((question, qIndex) => {
          console.log(`Processing question ${qIndex + 1}:`, {
            question: question.question,
            type: question.type,
            correct_answer: question.correct_answer,
            options: question.options,
            options_type: typeof question.options
          });
          
          const processedQuestion = {
            ...question,
            question_text: question.question_text || question.question,
            type: question.type || 'mcq'
          };

          // Handle MCQ questions with options object
          if (question.type === 'mcq' && question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
            console.log('Converting MCQ options object to array:', question.options);
            
            // Convert options object to array format for display
            processedQuestion.options = Object.entries(question.options).map(([key, text]) => {
              // Extract the correct answer key from "B: Patrick Hitler" format
              let correctKey = question.correct_answer;
              if (correctKey && correctKey.includes(':')) {
                correctKey = correctKey.split(':')[0].trim();
              }
              
              const optionObj = {
                option_text: text,
                is_correct: key === correctKey,
                id: key
              };
              
              console.log(`  Option ${key}: "${text}", is_correct: ${key === correctKey} (correctKey: ${correctKey})`);
              return optionObj;
            });
            
            console.log('Final processed MCQ options:', processedQuestion.options);
          } else if (question.type === 'mcq' && Array.isArray(question.options)) {
            // Already in correct format
            processedQuestion.options = question.options;
            console.log('MCQ options already in array format:', processedQuestion.options);
          } else if (question.type === 'mcq') {
            // MCQ but no valid options
            processedQuestion.options = [];
            console.log('MCQ question but no valid options found');
          } else {
            // Non-MCQ questions
            processedQuestion.options = [];
          }

          // For non-MCQ questions, ensure correct_answer is properly set
          if (question.type !== 'mcq' && question.correct_answer) {
            // Clean up the correct answer (remove prefix if it exists)
            let cleanAnswer = question.correct_answer;
            if (cleanAnswer.includes(':')) {
              cleanAnswer = cleanAnswer.split(':')[1]?.trim() || cleanAnswer;
            }
            processedQuestion.correct_answer = cleanAnswer;
          }

          console.log(`Final processed question ${qIndex + 1}:`, processedQuestion);
          return processedQuestion;
        });
      }
      
      console.log('Final processed quiz data:', data);
      setSelectedQuiz(data);
    } catch (error) {
      toast({
        title: 'Error fetching quiz details',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      closeViewModal(); // Close modal on error
    } finally {
      setQuestionsLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedQuiz(null);
  };

  const handleDelete = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        await quizService.deleteQuiz(quizId);
        setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizId));
        toast({
          title: 'Quiz Deleted',
          description: 'The quiz has been successfully deleted.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: 'Error Deleting Quiz',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = !searchTerm || 
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = !statusFilter || 
      (statusFilter === 'published' && quiz.is_published) ||
      (statusFilter === 'draft' && !quiz.is_published);
      
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="contained" color="primary" onClick={loadQuizzes}>
          Retry
        </Button>
      </Box>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="textSecondary">No quizzes available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        mb={6}
        flexDir={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Heading size="lg">My Quizzes</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => navigate('/quiz/create')}
        >
          Create New Quiz
        </Button>
      </Flex>
      
      <Flex 
        mb={6} 
        gap={4} 
        flexDir={{ base: 'column', md: 'row' }}
        alignItems={{ base: 'stretch', md: 'center' }}
      >
        <InputGroup maxW={{ base: '100%', md: '300px' }}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
        
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ base: '100%', md: '200px' }}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </Flex>
      
      {filteredQuizzes.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          {quizzes.length === 0 
            ? "You haven't created any quizzes yet. Click 'Create New Quiz' to get started."
            : "No quizzes match your search criteria."
          }
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
          {filteredQuizzes.map(quiz => (
            <Card key={quiz.id} variant="outline" boxShadow="sm" d="flex" flexDirection="column" justifyContent="space-between">
                <CardHeader>
                    <Flex justifyContent="space-between" alignItems="flex-start">
                        <Box flex="1" mr={2}>
                            <Heading size="md" noOfLines={1} title={quiz.title}>
                                {quiz.title}
                            </Heading>
                            <Text fontSize="sm" color="gray.500" mt={1} noOfLines={1}>
                                {quiz.description || 'No description available.'}
                            </Text>
                        </Box>
                        <Badge colorScheme={!quiz.is_published ? 'orange' : 'green'} variant="solid" fontSize="0.8em">
                            {!quiz.is_published ? 'Draft' : 'Published'}
                        </Badge>
                    </Flex>
                </CardHeader>

                <CardBody py={4}>
                    <VStack align="stretch" spacing={2}>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">{quiz.no_of_questions || 0} Questions</Text>
                            <Text fontSize="sm" color="gray.600">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min limit` : '30 min limit'}</Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">
                              Dept: {quiz.department_name || (quiz.department && quiz.department.name) || 'Not assigned'}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Type: {quiz.quiz_type_display || quiz.quiz_type || 'Easy'}
                            </Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">
                              Pass Score: {
                                quiz.passing_score !== undefined && quiz.passing_score !== null 
                                  ? `${quiz.passing_score}%` 
                                  : 'Not set'
                              }
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {new Date(quiz.quiz_date).toLocaleDateString()}
                            </Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">
                              Pages: {
                                quiz.pages && Array.isArray(quiz.pages) && quiz.pages.length > 0 
                                  ? (typeof quiz.pages[0] === 'number' 
                                      ? quiz.pages.join(', ')
                                      : typeof quiz.pages[0] === 'object' && quiz.pages[0].start && quiz.pages[0].end
                                        ? quiz.pages.map(range => `${range.start}-${range.end}`).join(', ')
                                        : quiz.pages.join(', ')
                                    )
                                  : 'All pages'
                              }
                            </Text>
                        </HStack>
                    </VStack>
                </CardBody>

                <CardFooter pt={3} borderTop="1px solid" borderColor="gray.200">
                    <HStack spacing={2} width="100%" justify="space-between">
                        <Button 
                            colorScheme={quiz.is_published ? "green" : "blue"}
                            size="sm"
                            leftIcon={<ViewIcon />}
                            onClick={() => handleViewClick(quiz.id)}
                        >
                            {quiz.is_published ? "View Quiz" : "View & PUBLISH"}
                        </Button>
                        <HStack>
                            <IconButton
                                icon={<EditIcon />}
                                variant="ghost"
                                size="sm"
                                aria-label="Edit Quiz"
                                onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                            />
                            <IconButton
                                icon={<DeleteIcon />}
                                variant="ghost"
                                colorScheme="red"
                                size="sm"
                                aria-label="Delete Quiz"
                                onClick={() => handleDelete(quiz.id)}
                            />
                        </HStack>
                    </HStack>
                </CardFooter>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={isViewModalOpen} onClose={closeViewModal} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedQuiz?.title || 'Loading...'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isQuestionsLoading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" />
                <Text mt={4}>Loading questions...</Text>
              </Box>
            ) : selectedQuiz?.questions && selectedQuiz.questions.length > 0 ? (
              <VStack spacing={4} align="stretch">
                {selectedQuiz.questions.map((question, index) => (
                  <Card key={question.id} variant="outline">
                    <CardHeader bg="gray.50" py={2}>
                      <Flex justify="space-between" align="center">
                        <Heading size="sm">Question {index + 1}</Heading>
                      </Flex>
                    </CardHeader>
                    <CardBody>
                      <Text fontWeight="bold" mb={3}>{question.question_text}</Text>
                      
                      {/* Debug info */}
                      <Text fontSize="xs" color="gray.500" mb={2}>
                        Debug: Type={question.type}, Options={question.options?.length || 0}
                      </Text>
                      
                      {/* Multiple choice options */}
                      {question.type === 'mcq' && question.options && question.options.length > 0 && (
                        <VStack align="stretch" spacing={2} mb={3}>
                          <Text fontSize="sm" fontWeight="semibold" color="gray.600">Options:</Text>
                          {question.options.map((option, i) => (
                            <HStack key={i} p={2} bg={option.is_correct ? 'green.100' : 'gray.50'} borderRadius="md" border="1px solid" borderColor={option.is_correct ? 'green.300' : 'gray.200'}>
                              <Text fontWeight={option.is_correct ? 'bold' : 'normal'} color={option.is_correct ? 'green.700' : 'gray.700'}>
                                {String.fromCharCode(65 + i)}. {option.option_text}
                              </Text>
                              {option.is_correct && <CheckIcon color="green.500" ml="auto"/>}
                            </HStack>
                          ))}
                        </VStack>
                      )}
                      
                      {/* Show if MCQ but no options processed */}
                      {question.type === 'mcq' && (!question.options || question.options.length === 0) && (
                        <Box p={3} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200" mb={3}>
                          <Text color="red.700" fontSize="sm">
                            Debug: MCQ question but no options found. Raw options: {JSON.stringify(question.options)}
                          </Text>
                        </Box>
                      )}
                      
                      {/* True/False, Fill, or One-line answer types */}
                      {(question.type === 'truefalse' || question.type === 'fill' || question.type === 'oneline') && (
                        <Box mt={2} p={3} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200">
                          <Text fontWeight="bold" color="green.700">
                            Correct Answer: {question.correct_answer}
                          </Text>
                        </Box>
                      )}
                      
                      {question.explanation && (
                        <Box mt={3} p={3} bg="gray.100" borderRadius="md">
                          <Text fontWeight="bold">Explanation:</Text>
                          <Text fontSize="sm">{question.explanation}</Text>
                        </Box>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            ) : (
              <Text>No questions found for this quiz.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={closeViewModal} mr={3}>Close</Button>
            {selectedQuiz && !selectedQuiz.is_published && (
              <></>
            )}
            {selectedQuiz && selectedQuiz.is_published && (
              <Button colorScheme="green" variant="outline" onClick={() => {
                const shareUrl = selectedQuiz.share_url || selectedQuiz.url_link || `${window.location.origin}/quiz/${selectedQuiz.id}/join/`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  // You might want to add a toast notification here
                  console.log('Quiz link copied to clipboard!');
                }).catch(() => {
                  console.error('Failed to copy link');
                });
                closeViewModal();
              }}>
                Copy Quiz Link
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default QuizListView;
