import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, SimpleGrid, VStack,
  HStack, Card, CardHeader, CardBody, CardFooter,
  Badge, Spinner, useToast, Flex, Select, Input,
  InputGroup, InputLeftElement, IconButton, Menu,
  MenuButton, MenuList, MenuItem, Divider, Tag,
  Alert, AlertIcon
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, ChevronDownIcon, EditIcon, ViewIcon, DeleteIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import quizService from '../../services/quizService';

const QuizListView = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [quiz, setquiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    const fetchquiz = async () => {
      try {
        setLoading(true);
        const data = await quizService.getUserquiz();
        setquiz(data || []);
      } catch (error) {
        toast({
          title: 'Error fetching quiz',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchquiz();
  }, [toast]);

  // Handle publishing a quiz
  const handlePublish = async (quizId) => {
    try {
      setLoading(true);
      await quizService.publishQuiz(quizId);
      
      // Update the quiz status in the list
      setquiz(prevquiz => 
        prevquiz.map(quiz => 
          quiz.id === quizId 
            ? { ...quiz, is_published: true, status: 'published' } 
            : quiz
        )
      );
      
      toast({
        title: 'Quiz published',
        description: 'Quiz has been published successfully!',
        status: 'success',
        duration: 3000,
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

  const handleDelete = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        await quizService.deleteQuiz(quizId);
        setquiz(prevquiz => prevquiz.filter(q => q.id !== quizId));
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

  // Filter quiz based on search term and status
  const filteredquiz = quiz.filter(quiz => {
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
        <Heading size="lg">My quiz</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={() => navigate('/quiz/create')}
        >
          Create New Quiz
        </Button>
      </Flex>
      
      {/* Filters */}
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
            placeholder="Search quiz..."
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
          <Text mt={4}>Loading quiz...</Text>
        </Box>
      ) : filteredquiz.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          {quiz.length === 0 
            ? "You haven't created any quiz yet. Click 'Create New Quiz' to get started."
            : "No quiz match your search criteria."
          }
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredquiz.map(quiz => (
            <Card key={quiz.id} variant="outline" boxShadow="sm" height="100%" className="glass-effect">
              <CardHeader bg={quiz.is_published ? 'blue.50' : 'gray.50'} pb={3}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading size="md" noOfLines={1} title={quiz.title}>
                    {quiz.title}
                  </Heading>
                  <Badge colorScheme={quiz.is_published ? 'green' : 'yellow'}>
                    {quiz.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </Flex>
              </CardHeader>
              
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <Text noOfLines={2} fontSize="sm" color="gray.600">
                    {quiz.description || 'No description'}
                  </Text>
                  
                  <Divider />
                  
                  <HStack>
                    <Tag size="sm">
                      {quiz.question_count || 0} questions
                    </Tag>
                    {quiz.question_batch?.difficulty && (
                      <Tag size="sm" colorScheme={
                        quiz.question_batch.difficulty === 'lite' ? 'green' :
                        quiz.question_batch.difficulty === 'medium' ? 'blue' :
                        quiz.question_batch.difficulty === 'expert' ? 'red' : 'purple'
                      }>
                        {quiz.question_batch.difficulty}
                      </Tag>
                    )}
                  </HStack>
                  
                  <HStack>
                    <Text fontSize="sm">Time: {quiz.time_limit_minutes} min</Text>
                    <Text fontSize="sm">Pass: {quiz.passing_score}%</Text>
                  </HStack>
                </VStack>
              </CardBody>
              
              <CardFooter pt={0}>
                <HStack spacing={2} width="100%">
                  <Button 
                    leftIcon={<ViewIcon />} 
                    colorScheme="blue" 
                    variant="outline"
                    size="sm"
                    flex="1"
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                  >
                    View
                  </Button>
                  
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<ChevronDownIcon />}
                      variant="outline"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem 
                        icon={<EditIcon />}
                        onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                      >
                        Edit Quiz
                      </MenuItem>
                      
                      {!quiz.is_published && (
                        <MenuItem 
                          icon={<CheckIcon />}
                          onClick={() => handlePublish(quiz.id)}
                        >
                          Publish Quiz
                        </MenuItem>
                      )}
                      
                      <MenuItem 
                        icon={<RepeatIcon />}
                        onClick={() => navigate(`/quiz/${quiz.id}?tab=regenerate`)}
                      >
                        Regenerate Questions
                      </MenuItem>
                      
                      <MenuItem 
                        icon={<DeleteIcon />}
                        color="red.500"
                        onClick={() => handleDelete(quiz.id)}
                      >
                        Delete Quiz
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
              </CardFooter>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
};

export default QuizListView;
