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

const QuizListView = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // State for question view modal
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isQuestionsLoading, setQuestionsLoading] = useState(false);

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
                            <Text fontSize="sm" color="gray.600">{quiz.question_count || 0} Questions</Text>
                            <Text fontSize="sm" color="gray.600">{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min limit` : 'N/A min limit'}</Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">Dept: {quiz.department?.name || 'General'} | Type: {quiz.quiz_type_display || 'Easy'}</Text>
                            <Text fontSize="sm" color="gray.600">Pass Score: {quiz.passing_score !== null ? `${quiz.passing_score}%` : 'N/A'}</Text>
                        </HStack>
                        <HStack justifyContent="space-between">
                            <Text fontSize="sm" color="gray.600">Type: {quiz.quiz_type || 'multiple_choice'}</Text>
                            <Text fontSize="sm" color="gray.600">Pages: {quiz.source_document_page_range || 'N/A'}</Text>
                        </HStack>
                    </VStack>
                </CardBody>

                <CardFooter pt={3} borderTop="1px solid" borderColor="gray.200">
                    <HStack spacing={2} width="100%" justify="space-between">
                        <Button 
                            colorScheme="blue" 
                            size="sm"
                            leftIcon={<ViewIcon />}
                            onClick={() => handleViewClick(quiz.id)}
                        >
                            View & PUBLISH
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
                      <VStack align="stretch" spacing={2}>
                        {question.options.map((option, i) => (
                          <HStack key={i} p={2} bg={option.is_correct ? 'green.100' : 'transparent'} borderRadius="md">
                            <Text fontWeight={option.is_correct ? 'bold' : 'normal'}>
                              {String.fromCharCode(65 + i)}. {option.option_text}
                            </Text>
                            {option.is_correct && <CheckIcon color="green.500" ml="auto"/>}
                          </HStack>
                        ))}
                      </VStack>
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
            <Button colorScheme="blue" onClick={() => {
              if (selectedQuiz) {
                navigate(`/PUBLISH-quiz/${selectedQuiz.id}`);
                closeViewModal();
              }
            }}>
              Proceed to PUBLISH
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default QuizListView;
