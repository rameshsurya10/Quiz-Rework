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

const QuizQuestionsView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pageAnalytics, setPageAnalytics] = useState(null);
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
        const quizData = await quizService.getQuizDetails(quizId);
        setQuiz(quizData);
        
        // Fetch questions
        const questionData = await quizService.getQuizQuestions(quizId);
        setQuestions(questionData.questions || []);
        
        // Fetch page analytics
        const analyticsData = await quizService.getQuizPageAnalytics(quizId);
        setPageAnalytics(analyticsData);
        
        // Set regeneration default options
        if (quizData.question_batch) {
          setRegenerateOptions(prev => ({
            ...prev,
            complexity: quizData.question_batch.difficulty,
            num_questions: questions.length,
          }));
        }
      } catch (error) {
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
  }, [quizId, toast]);

  // Handle page filter change
  const handlePageFilterChange = async (e) => {
    const value = e.target.value;
    setPageFilter(value);
    
    try {
      setLoading(true);
      const questionData = await quizService.getQuizQuestions(
        quizId, 
        value || null,
        complexity || null
      );
      setQuestions(questionData.questions || []);
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
        quizId, 
        pageFilter || null,
        value || null
      );
      setQuestions(questionData.questions || []);
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
      await quizService.publishQuiz(quizId);
      
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

      const response = await quizService.regenerateQuizQuestions(quizId, dataToSubmit);
      
      // Refresh the questions and quiz data
      const updatedQuizData = await quizService.getQuizDetails(quizId);
      setQuiz(updatedQuizData);
      
      const questionData = await quizService.getQuizQuestions(quizId);
      setQuestions(questionData.questions || []);
      
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

  // Pagination controls
  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const currentQuestions = questions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

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
          <Button 
            colorScheme="blue" 
            leftIcon={<RepeatIcon />}
            onClick={onOpen}
          >
            Regenerate Questions
          </Button>
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
              <Text fontWeight="bold">Passing Score:</Text>
              <Text>{quiz.passing_score}%</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Question Count:</Text>
              <Text>{questions.length}</Text>
            </Box>
            <Box>
              <Text fontWeight="bold">Complexity:</Text>
              <Text>{quiz.question_batch?.difficulty || 'Unknown'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Questions</Tab>
          <Tab>Page Analytics</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Box mb={4}>
              <Heading size="md" mb={3}>Filter Questions</Heading>
              <HStack>
                <InputGroup maxW="xs">
                  <Input 
                    placeholder="Filter by page (e.g. 5 or 5-10)" 
                    value={pageFilter}
                    onChange={handlePageFilterChange}
                  />
                  <InputRightElement>
                    <SearchIcon color="gray.500" />
                  </InputRightElement>
                </InputGroup>
                
                <Select 
                  placeholder="Filter by complexity" 
                  value={complexity}
                  onChange={handleComplexityChange}
                  maxW="xs"
                >
                  <option value="">All Complexity Levels</option>
                  <option value="lite">Lite</option>
                  <option value="medium">Medium</option>
                  <option value="expert">Expert</option>
                </Select>
              </HStack>
            </Box>

            {loading ? (
              <Box textAlign="center" py={5}>
                <Spinner />
                <Text mt={2}>Loading questions...</Text>
              </Box>
            ) : currentQuestions.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No questions match your filters.
              </Alert>
            ) : (
              <>
                <VStack spacing={4} align="stretch">
                  {currentQuestions.map((question, index) => (
                    <Card key={question.id} variant="outline" className="glass-effect">
                      <CardHeader bg="blue.50" py={3}>
                        <Flex justify="space-between" align="center">
                          <Heading size="sm">
                            Question {(currentPage - 1) * questionsPerPage + index + 1}
                          </Heading>
                          <HStack>
                            <Badge colorScheme={
                              question.difficulty === 'lite' ? 'green' :
                              question.difficulty === 'medium' ? 'blue' :
                              question.difficulty === 'expert' ? 'red' : 'purple'
                            }>
                              {question.difficulty}
                            </Badge>
                            {question.source_page && (
                              <Tag size="sm" colorScheme="gray">
                                Page {question.source_page}
                              </Tag>
                            )}
                          </HStack>
                        </Flex>
                      </CardHeader>
                      <CardBody>
                        <Text fontWeight="bold" mb={2}>{question.question_text}</Text>
                        
                        {question.question_type === 'multiple_choice' && (
                          <VStack align="stretch" mt={3} spacing={2}>
                            {question.options.map((option, i) => (
                              <HStack key={i} p={2} bg={option.is_correct ? 'green.50' : 'white'} borderRadius="md">
                                <Text fontWeight={option.is_correct ? 'bold' : 'normal'}>
                                  {String.fromCharCode(65 + i)}. {option.option_text}
                                </Text>
                                {option.is_correct && (
                                  <Badge colorScheme="green" ml="auto">
                                    Correct
                                  </Badge>
                                )}
                              </HStack>
                            ))}
                          </VStack>
                        )}
                        
                        {question.explanation && (
                          <Box mt={3} p={3} bg="gray.50" borderRadius="md">
                            <Text fontWeight="bold">Explanation:</Text>
                            <Text>{question.explanation}</Text>
                          </Box>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </VStack>

                {/* Pagination */}
                {totalPages > 1 && (
                  <HStack justify="center" mt={6}>
                    <Button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </Button>
                    <Text mx={3}>
                      Page {currentPage} of {totalPages}
                    </Text>
                    <Button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next
                    </Button>
                  </HStack>
                )}
              </>
            )}
          </TabPanel>
          
          <TabPanel>
            <Heading size="md" mb={4}>Question Distribution by Page</Heading>
            
            {!pageAnalytics ? (
              <Spinner />
            ) : (
              <Box>
                <Text mb={4}>Total Questions: {pageAnalytics.total_questions}</Text>
                
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {pageAnalytics.page_distribution.map((item) => (
                    <Card key={item.page} variant="outline">
                      <CardBody>
                        <Heading size="sm">
                          {item.page === 'unknown' ? 'Unknown Page' : `Page ${item.page}`}
                        </Heading>
                        <Text>Questions: {item.count}</Text>
                        <Text>Percentage: {item.percentage.toFixed(1)}%</Text>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Regenerate Questions Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Regenerate Quiz Questions</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                This will generate new questions for this quiz. The existing questions will be
                preserved in the database but no longer associated with this quiz.
              </Text>
              
              <Box>
                <FormLabel>Complexity Level</FormLabel>
                <Select
                  name="complexity"
                  value={regenerateOptions.complexity}
                  onChange={handleRegenerateOptionChange}
                >
                  <option value="lite">Lite</option>
                  <option value="medium">Medium</option>
                  <option value="expert">Expert</option>
                  <option value="mixed">Mixed</option>
                </Select>
              </Box>
              
              <Box>
                <FormLabel>Number of Questions</FormLabel>
                <Input
                  type="number"
                  name="num_questions"
                  value={regenerateOptions.num_questions}
                  onChange={handleRegenerateOptionChange}
                  min={1}
                  max={50}
                />
              </Box>
              
              <Box>
                <FormLabel>Page Range (Optional)</FormLabel>
                <Flex gap={2}>
                  <Input
                    type="number"
                    name="page_start"
                    placeholder="Start Page"
                    value={regenerateOptions.page_start}
                    onChange={handleRegenerateOptionChange}
                    min={1}
                  />
                  <Input
                    type="number"
                    name="page_end"
                    placeholder="End Page"
                    value={regenerateOptions.page_end}
                    onChange={handleRegenerateOptionChange}
                    min={regenerateOptions.page_start || 1}
                  />
                </Flex>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleRegenerateQuestions}
              isLoading={loading}
            >
              Regenerate
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default QuizQuestionsView;
