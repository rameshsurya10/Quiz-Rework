import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Input,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  Tooltip,
  useToast,
  Divider,
  Switch,
  Tag
} from '@chakra-ui/react';
import { 
  FaEdit, 
  FaExchangeAlt, 
  FaTrash, 
  FaPlus, 
  FaCheck, 
  FaTimes,
  FaArrowUp,
  FaArrowDown,
  FaRedo
} from 'react-icons/fa';
import apiService from '../../services/api';

const QuestionEditor = ({ question, onSave, onCancel }) => {
  const [editedQuestion, setEditedQuestion] = useState(question);
  const [options, setOptions] = useState(
    question.type === 'mcq' 
      ? Object.entries(question.options).map(([key, value]) => ({ key, value, isCorrect: key === question.correct_answer }))
      : []
  );

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    if (field === 'isCorrect') {
      // Uncheck other options
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    setOptions(newOptions);
  };

  const handleSave = () => {
    const updatedQuestion = {
      ...editedQuestion,
      options: question.type === 'mcq' 
        ? Object.fromEntries(options.map(opt => [opt.key, opt.value]))
        : {},
      correct_answer: question.type === 'mcq'
        ? options.find(opt => opt.isCorrect)?.key || 'A'
        : editedQuestion.correct_answer
    };
    onSave(updatedQuestion);
  };

  return (
    <VStack spacing={4} align="stretch" p={4}>
      <FormControl>
        <FormLabel>Question Text</FormLabel>
        <Textarea
          value={editedQuestion.question}
          onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
        />
      </FormControl>

      {question.type === 'mcq' && (
        <FormControl>
          <FormLabel>Options</FormLabel>
          <VStack spacing={2} align="stretch">
            {options.map((option, index) => (
              <HStack key={index}>
                <Input
                  value={option.value}
                  onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                  placeholder={`Option ${option.key}`}
                />
                <Switch
                  isChecked={option.isCorrect}
                  onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                />
              </HStack>
            ))}
          </VStack>
        </FormControl>
      )}

      {question.type !== 'mcq' && (
        <FormControl>
          <FormLabel>Correct Answer</FormLabel>
          <Input
            value={editedQuestion.correct_answer}
            onChange={(e) => setEditedQuestion({ ...editedQuestion, correct_answer: e.target.value })}
          />
        </FormControl>
      )}

      <FormControl>
        <FormLabel>Explanation</FormLabel>
        <Textarea
          value={editedQuestion.explanation}
          onChange={(e) => setEditedQuestion({ ...editedQuestion, explanation: e.target.value })}
        />
      </FormControl>

      <HStack justify="flex-end" spacing={4}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button colorScheme="blue" onClick={handleSave}>Save Changes</Button>
      </HStack>
    </VStack>
  );
};

const QuizQuestionManager = ({ quizId, initialQuestions, additionalQuestions }) => {
  const [currentQuestions, setCurrentQuestions] = useState(initialQuestions);
  const [exchangeableQuestions, setExchangeableQuestions] = useState(additionalQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const handleExchange = (currentIndex, newQuestion) => {
    // Exchange questions
    const updatedCurrent = [...currentQuestions];
    const oldQuestion = updatedCurrent[currentIndex];
    updatedCurrent[currentIndex] = { ...newQuestion, exchanged: true };
    
    // Update exchangeable questions
    const updatedExchangeable = exchangeableQuestions.map(q => 
      q.question_number === newQuestion.question_number 
        ? { ...oldQuestion, exchanged: true }
        : q
    );

    setCurrentQuestions(updatedCurrent);
    setExchangeableQuestions(updatedExchangeable);
    setExchangeMode(false);

    toast({
      title: "Question Exchanged",
      description: "The questions have been successfully swapped.",
      status: "success",
      duration: 3000,
    });
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    onOpen();
  };

  const handleSaveEdit = async (updatedQuestion) => {
    try {
      // Update question in backend
      await apiService.patch(`/api/quiz/${quizId}/questions/${updatedQuestion.question_number}/`, updatedQuestion);
      
      // Update local state
      setCurrentQuestions(currentQuestions.map(q => 
        q.question_number === updatedQuestion.question_number ? updatedQuestion : q
      ));
      
      toast({
        title: "Question Updated",
        description: "The question has been successfully updated.",
        status: "success",
        duration: 3000,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the question. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDelete = async (questionNumber) => {
    try {
      // Delete question in backend
      await apiService.delete(`/api/quiz/${quizId}/questions/${questionNumber}/`);
      
      // Update local state
      setCurrentQuestions(currentQuestions.filter(q => q.question_number !== questionNumber));
      
      toast({
        title: "Question Deleted",
        description: "The question has been successfully deleted.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the question. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleReplace = async (questionNumber) => {
    try {
      // Call the replace endpoint
      await apiService.quizApi.questions.replace(quizId, questionNumber);
      
      // Refresh the questions list after replacement
      const response = await apiService.quizApi.getById(quizId);
      const updatedQuestions = response.data.current_questions || [];
      setCurrentQuestions(updatedQuestions);
      
      toast({
        title: "Question Replaced",
        description: "The question has been successfully replaced.",
        status: "success",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to replace the question. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  };

  const renderQuestion = (question, index, isExchangeable = false) => (
    <Card key={question.question_number} variant="outline" mb={4} 
          opacity={question.exchanged ? 0.7 : 1}
          bg={selectedQuestion?.question_number === question.question_number ? "blue.50" : "white"}>
      <CardHeader bg={isExchangeable ? "gray.50" : "blue.50"} py={3}>
        <Flex justify="space-between" align="center">
          <Heading size="sm">
            Question {question.question_number}
            {question.exchanged && (
              <Badge ml={2} colorScheme="purple">Exchanged</Badge>
            )}
          </Heading>
          <HStack>
            {!isExchangeable && (
              <>
                <Tooltip label="Edit Question">
                  <IconButton
                    icon={<FaEdit />}
                    size="sm"
                    onClick={() => handleEdit(question)}
                  />
                </Tooltip>
                <Tooltip label="Exchange Question">
                  <IconButton
                    icon={<FaExchangeAlt />}
                    size="sm"
                    onClick={() => {
                      setSelectedQuestion(question);
                      setExchangeMode(true);
                    }}
                    isDisabled={question.exchanged}
                  />
                </Tooltip>
                <Tooltip label="Replace Question">
                  <IconButton
                    icon={<FaRedo />}
                    size="sm"
                    colorScheme="teal"
                    onClick={() => handleReplace(question.question_number)}
                  />
                </Tooltip>
                <Tooltip label="Delete Question">
                  <IconButton
                    icon={<FaTrash />}
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(question.question_number)}
                  />
                </Tooltip>
              </>
            )}
            {isExchangeable && exchangeMode && !question.exchanged && (
              <Tooltip label="Select for Exchange">
                <IconButton
                  icon={<FaCheck />}
                  size="sm"
                  colorScheme="green"
                  onClick={() => handleExchange(
                    currentQuestions.findIndex(q => q.question_number === selectedQuestion.question_number),
                    question
                  )}
                />
              </Tooltip>
            )}
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody>
        <Text fontWeight="bold" mb={2}>{question.question}</Text>
        
        {question.type === 'mcq' && (
          <VStack align="stretch" mt={3} spacing={2}>
            {Object.entries(question.options).map(([key, value]) => (
              <HStack key={key} p={2} bg={key === question.correct_answer ? 'green.50' : 'white'} borderRadius="md">
                <Text fontWeight={key === question.correct_answer ? 'bold' : 'normal'}>
                  {key}. {value}
                </Text>
                {key === question.correct_answer && (
                  <Badge colorScheme="green" ml="auto">Correct</Badge>
                )}
              </HStack>
            ))}
          </VStack>
        )}
        
        {question.type !== 'mcq' && (
          <Box mt={2} p={3} bg="green.50" borderRadius="md">
            <Text fontWeight="bold">Correct Answer: {question.correct_answer}</Text>
          </Box>
        )}
        
        {question.explanation && (
          <Box mt={3} p={3} bg="gray.50" borderRadius="md">
            <Text fontWeight="bold">Explanation:</Text>
            <Text>{question.explanation}</Text>
          </Box>
        )}
      </CardBody>
    </Card>
  );

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Quiz Questions Manager</Heading>
        {exchangeMode && (
          <Button
            leftIcon={<FaTimes />}
            colorScheme="red"
            variant="outline"
            onClick={() => {
              setExchangeMode(false);
              setSelectedQuestion(null);
            }}
          >
            Cancel Exchange
          </Button>
        )}
      </Flex>

      <Flex gap={6}>
        {/* Current Questions */}
        <Box flex={1}>
          <Heading size="sm" mb={4}>Current Questions</Heading>
          <VStack align="stretch" spacing={4}>
            {currentQuestions.map((question, index) => renderQuestion(question, index))}
          </VStack>
        </Box>

        {/* Exchange Questions */}
        <Box flex={1}>
          <Heading size="sm" mb={4}>Additional Questions</Heading>
          <VStack align="stretch" spacing={4}>
            {exchangeableQuestions.map((question, index) => 
              renderQuestion(question, index, true)
            )}
          </VStack>
        </Box>
      </Flex>

      {/* Edit Question Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Question</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {editingQuestion && (
              <QuestionEditor
                question={editingQuestion}
                onSave={handleSaveEdit}
                onCancel={onClose}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default QuizQuestionManager; 