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
  Tabs, TabList, Tab, TabPanels, TabPanel
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
  const [quizzes, setQuizzes] = useState({
    current: [],
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isQuestionsLoading, setQuestionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await quizApi.getAll();
      
      // Handle the new response structure
      const quizzesData = {
        current: response.data.current_quizzes || [],
        upcoming: response.data.upcoming_quizzes || [],
        past: response.data.past_quizzes || []
      };
      
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
      setSelectedQuiz(data);
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
        await loadQuizzes(); // Reload all quizzes after deletion
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

  const filterQuizzes = (quizList) => {
    return quizList.filter(quiz => {
      const matchesSearch = !searchTerm || 
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quiz.description && quiz.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesStatus = !statusFilter || 
        (statusFilter === 'published' && quiz.is_published) ||
        (statusFilter === 'draft' && !quiz.is_published);
        
      return matchesSearch && matchesStatus;
    });
  };

  const renderQuizList = (quizList, listType) => {
    const filteredList = filterQuizzes(quizList);
    
    if (filteredList.length === 0) {
      return (
        <Box p={4} textAlign="center">
          <Text>No {listType} quizzes found</Text>
        </Box>
      );
    }

    return (
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {filteredList.map(quiz => (
          <Card key={quiz.id}>
            <CardHeader>
              <Heading size="md">{quiz.title}</Heading>
              <Badge colorScheme={quiz.is_published ? "green" : "yellow"} mt={2}>
                {quiz.is_published ? "Published" : "Draft"}
              </Badge>
            </CardHeader>
            <CardBody>
              <Text noOfLines={2}>{quiz.description}</Text>
              <Text mt={2}>
                <strong>Date:</strong> {new Date(quiz.quiz_date).toLocaleDateString()}
              </Text>
              <Text>
                <strong>Duration:</strong> {quiz.duration} minutes
              </Text>
            </CardBody>
            <CardFooter>
              <HStack spacing={2}>
                <IconButton
                  icon={<ViewIcon />}
                  onClick={() => handleViewClick(quiz.id)}
                  aria-label="View quiz"
                  colorScheme="blue"
                />
                <IconButton
                  icon={<EditIcon />}
                  onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                  aria-label="Edit quiz"
                  colorScheme="green"
                />
                <IconButton
                  icon={<DeleteIcon />}
                  onClick={() => handleDelete(quiz.id)}
                  aria-label="Delete quiz"
                  colorScheme="red"
                />
              </HStack>
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <VStack align="start">
          <Text>{error}</Text>
          <Button onClick={loadQuizzes} leftIcon={<RepeatIcon />} size="sm">
            Retry
          </Button>
        </VStack>
      </Alert>
    );
  }

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

      <HStack spacing={4} mb={6}>
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
      </HStack>

      <Tabs index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>Current ({quizzes.current.length})</Tab>
          <Tab>Upcoming ({quizzes.upcoming.length})</Tab>
          <Tab>Past ({quizzes.past.length})</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {renderQuizList(quizzes.current, 'current')}
          </TabPanel>
          <TabPanel>
            {renderQuizList(quizzes.upcoming, 'upcoming')}
          </TabPanel>
          <TabPanel>
            {renderQuizList(quizzes.past, 'past')}
          </TabPanel>
        </TabPanels>
      </Tabs>

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
            <Button onClick={closeViewModal}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default QuizListView;
