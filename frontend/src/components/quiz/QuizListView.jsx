import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, SimpleGrid, VStack,
  HStack, Card, CardHeader, CardBody, CardFooter,
  Badge, Spinner, useToast, Flex, Select, Input,
  InputGroup, InputLeftElement, IconButton, Menu,
  MenuButton, MenuList, MenuItem, Divider, Tag,
  Alert, AlertIcon, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Tabs, TabList, Tab, TabPanels, TabPanel, CircularProgress
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, ChevronDownIcon, EditIcon, ViewIcon, DeleteIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import quizService from '../../services/quizService';

const QuizListView = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [quizzes, setQuizzes] = useState({
    current: [],
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isQuestionsLoading, setQuestionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const data = await quizService.getUserquiz();
        setQuizzes(data || []);
      } catch (error) {
        toast({
          title: 'Error fetching quizzes',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [toast]);
  
  const handleViewClick = async (quizId) => {
    try {
      setQuestionsLoading(true);
      setViewModalOpen(true);
      const data = await quizService.getQuizDetails(quizId);
      
      // Handle different question data formats from backend
      let questions = [];
      
      if (data.current_questions) {
        questions = data.current_questions;
      } else if (data.questions) {
        questions = data.questions;
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
      
      // Process questions for better display
      const processedQuestions = questions
      .filter(Boolean) // Filter out any null or undefined questions
      .map((q, index) => ({
        ...q,
        question_text: q.question || q.question_text || 'No question text',
        type: q.question_type || q.type || 'mcq',
        question_number: q.question_number || (index + 1)
      }));
      
      setSelectedQuiz({
        ...data,
        questions: processedQuestions
      });
    } catch (error) {
      toast({
        title: 'Error fetching quiz details',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      closeViewModal();
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
        // Reload all quizzes after deletion
        const data = await quizService.getUserquiz();
        setQuizzes(data || []);
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

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Quizzes</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => navigate('/quiz/create')}
        >
          Create Quiz
        </Button>
      </Flex>

      <Flex gap={4} mb={6}>
        <InputGroup maxW="300px">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW="200px"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </Flex>
      
      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
          <Text mt={4}>Loading quizzes...</Text>
        </Box>
      ) : filteredQuizzes.length === 0 ? (
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

      <Modal isOpen={isViewModalOpen} onClose={closeViewModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedQuiz?.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {isQuestionsLoading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : selectedQuiz ? (
              <VStack align="stretch" spacing={4}>
                <Text><strong>Description:</strong> {selectedQuiz.description}</Text>
                <Text><strong>Duration:</strong> {selectedQuiz.duration} minutes</Text>
                <Text><strong>Date:</strong> {new Date(selectedQuiz.quiz_date).toLocaleString()}</Text>
                <Divider />
                <Heading size="md">Questions</Heading>
                {selectedQuiz.questions?.map((question, index) => (
                  <Box key={index} p={4} borderWidth={1} borderRadius="md">
                    <Text><strong>Q{index + 1}:</strong> {question.question_text}</Text>
                    {question.type === 'mcq' && question.options?.length > 0 && (
                      <VStack align="stretch" mt={2} pl={4}>
                        {question.options.map((option, optIndex) => (
                          <Text key={optIndex} color={option.is_correct ? "green.500" : "inherit"}>
                            {option.is_correct && <CheckIcon mr={2} />}
                            {String(option.option_text || option)}
                          </Text>
                        ))}
                      </VStack>
                    )}
                    {question.type !== 'mcq' && (
                      <Text mt={2} color="green.500">
                        <strong>Answer:</strong> {question.correct_answer}
                      </Text>
                    )}
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text>No quiz details available</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={closeViewModal} mr={3}>Close</Button>
            {selectedQuiz && !selectedQuiz.is_published && (
              <Button colorScheme="blue" onClick={() => {
                if (selectedQuiz) {
                  navigate(`/PUBLISH-quiz/${selectedQuiz.id}`);
                  closeViewModal();
                }
              }}>
                Proceed to PUBLISH
              </Button>
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
