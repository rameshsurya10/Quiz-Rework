import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Button, FormControl, FormLabel, Input, Select, Textarea,
  Checkbox, HStack, VStack, Heading, Card, CardBody,
  NumberInput, NumberInputField, NumberInputStepper, 
  NumberIncrementStepper, NumberDecrementStepper,
  SimpleGrid, Text, useToast, Divider, Flex,
  FormHelperText, Switch
} from '@chakra-ui/react';
import quizService from '../../services/quizService';

const CreateQuizForm = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [formData, setFormData] = useState({
    document_id: '',
    title: '',
    description: '',
    complexity: 'medium',
    num_questions: 10,
    time_limit_minutes: 30,
    passing_score: 70,
    page_start: '',
    page_end: '',
    shuffle_questions: true,
    show_answers: true,
    max_attempts: 3,
    is_published: false
  });

  // Fetch available documents on component mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await quizService.getDocuments();
        setDocuments(docs);
      } catch (error) {
        toast({
          title: 'Error fetching documents',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    fetchDocuments();
  }, [toast]);

  // Handle document selection and fetch its details
  const handleDocumentChange = async (e) => {
    const documentId = e.target.value;
    setFormData({
      ...formData,
      document_id: documentId,
      title: '',  // Reset title when document changes
    });

    if (documentId) {
      try {
        const documentDetails = await quizService.getDocumentDetails(documentId);
        setSelectedDocument(documentDetails);
        setPageCount(documentDetails.page_count || 0);
        
        // Suggest a title based on document name
        setFormData(prev => ({
          ...prev,
          title: `Quiz on ${documentDetails.title}`,
          page_start: '1',
          page_end: documentDetails.page_count.toString()
        }));
      } catch (error) {
        toast({
          title: 'Error fetching document details',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      setSelectedDocument(null);
      setPageCount(0);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle number input changes
  const handleNumberChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Submit form to create quiz with AI-generated questions
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert page values to numbers
      const dataToSubmit = {
        ...formData,
        page_start: formData.page_start ? parseInt(formData.page_start) : undefined,
        page_end: formData.page_end ? parseInt(formData.page_end) : undefined,
      };

      const response = await quizService.createAIGeneratedQuiz(dataToSubmit);
      
      toast({
        title: 'Quiz created successfully!',
        description: `${response.title} has been created with ${response.question_count || 'multiple'} questions.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Redirect to the new quiz or quiz list
      navigate(`/quizzes/${response.id}`);
    } catch (error) {
      toast({
        title: 'Error creating quiz',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} p={4}>
      <Heading size="lg" mb={6}>Create Quiz with AI-Generated Questions</Heading>
      
      <Card mb={6} variant="outline">
        <CardBody>
          <Heading size="md" mb={4}>Document Selection</Heading>
          <FormControl isRequired mb={4}>
            <FormLabel>Select Document</FormLabel>
            <Select 
              name="document_id" 
              value={formData.document_id} 
              onChange={handleDocumentChange}
              placeholder="Select a document"
            >
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.page_count} pages)
                </option>
              ))}
            </Select>
            <FormHelperText>
              Select the document from which to generate questions
            </FormHelperText>
          </FormControl>

          {selectedDocument && (
            <Box mb={4} p={3} bg="gray.50" borderRadius="md">
              <Text fontWeight="bold">Document: {selectedDocument.title}</Text>
              <Text>Pages: {selectedDocument.page_count}</Text>
              <Text>Size: {selectedDocument.file_size_display}</Text>
            </Box>
          )}

          {pageCount > 0 && (
            <FormControl mb={4}>
              <FormLabel>Page Range</FormLabel>
              <Flex gap={3}>
                <NumberInput 
                  min={1} 
                  max={pageCount}
                  value={formData.page_start}
                  onChange={(value) => handleNumberChange('page_start', value)}
                >
                  <NumberInputField placeholder="Start Page" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text alignSelf="center">to</Text>
                <NumberInput 
                  min={parseInt(formData.page_start) || 1} 
                  max={pageCount}
                  value={formData.page_end}
                  onChange={(value) => handleNumberChange('page_end', value)}
                >
                  <NumberInputField placeholder="End Page" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Flex>
              <FormHelperText>
                Select specific pages for question generation (optional)
              </FormHelperText>
            </FormControl>
          )}
        </CardBody>
      </Card>

      <Card mb={6} variant="outline">
        <CardBody>
          <Heading size="md" mb={4}>Quiz Details</Heading>
          
          <FormControl isRequired mb={4}>
            <FormLabel>Quiz Title</FormLabel>
            <Input 
              name="title" 
              value={formData.title} 
              onChange={handleChange}
              placeholder="Enter quiz title"
            />
          </FormControl>
          
          <FormControl mb={4}>
            <FormLabel>Description</FormLabel>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description of the quiz"
              rows={3}
            />
          </FormControl>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Complexity Level</FormLabel>
              <Select
                name="complexity"
                value={formData.complexity}
                onChange={handleChange}
              >
                <option value="lite">Lite</option>
                <option value="medium">Medium</option>
                <option value="expert">Expert</option>
                <option value="mixed">Mixed</option>
              </Select>
              <FormHelperText>
                Determines the difficulty level of generated questions
              </FormHelperText>
            </FormControl>
            
            <FormControl>
              <FormLabel>Number of Questions</FormLabel>
              <NumberInput
                min={1}
                max={50}
                value={formData.num_questions}
                onChange={(value) => handleNumberChange('num_questions', value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText>
                How many questions to generate for this quiz
              </FormHelperText>
            </FormControl>
          </SimpleGrid>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
            <FormControl>
              <FormLabel>Time Limit (minutes)</FormLabel>
              <NumberInput
                min={1}
                max={180}
                value={formData.time_limit_minutes}
                onChange={(value) => handleNumberChange('time_limit_minutes', value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>Passing Score (%)</FormLabel>
              <NumberInput
                min={1}
                max={100}
                value={formData.passing_score}
                onChange={(value) => handleNumberChange('passing_score', value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>Max Attempts</FormLabel>
              <NumberInput
                min={1}
                max={100}
                value={formData.max_attempts}
                onChange={(value) => handleNumberChange('max_attempts', value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
          
          <HStack spacing={8} mb={4}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="shuffle-questions" mb="0">
                Shuffle Questions
              </FormLabel>
              <Switch
                id="shuffle-questions"
                name="shuffle_questions"
                isChecked={formData.shuffle_questions}
                onChange={handleChange}
              />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="show-answers" mb="0">
                Show Answers After Completion
              </FormLabel>
              <Switch
                id="show-answers"
                name="show_answers"
                isChecked={formData.show_answers}
                onChange={handleChange}
              />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="publish-immediately" mb="0">
                Publish Immediately
              </FormLabel>
              <Switch
                id="publish-immediately"
                name="is_published"
                isChecked={formData.is_published}
                onChange={handleChange}
              />
            </FormControl>
          </HStack>
        </CardBody>
      </Card>
      
      <HStack spacing={4} justifyContent="flex-end">
        <Button
          colorScheme="gray"
          onClick={() => navigate('/quizzes')}
        >
          Cancel
        </Button>
        <Button
          colorScheme="blue"
          type="submit"
          isLoading={loading}
          loadingText="Creating Quiz..."
        >
          Create Quiz
        </Button>
      </HStack>
    </Box>
  );
};

export default CreateQuizForm;
