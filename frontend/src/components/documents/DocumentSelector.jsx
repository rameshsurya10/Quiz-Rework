import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardBody, Stack, Heading, Text, Button, Flex,
  SimpleGrid, Image, Badge, useToast, Spinner
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import quizService from '../../services/quizService';

const DocumentSelector = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const docs = await quizService.getDocuments();
        setDocuments(docs || []);
      } catch (error) {
        toast({
          title: 'Error fetching documents',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [toast]);

  const handleSelectDocument = (document) => {
    setSelectedId(document.id);
    if (onDocumentSelect) {
      onDocumentSelect(document);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading documents...</Text>
      </Box>
    );
  }

  if (!documents.length) {
    return (
      <Box textAlign="center" p={8} borderWidth="1px" borderRadius="lg">
        <Heading size="md" mb={4}>No documents available</Heading>
        <Text mb={6}>Upload a document first to create a quiz.</Text>
        <Button colorScheme="blue" onClick={() => navigate('/documents/upload')}>
          Upload Document
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Select a Document</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {documents.map(doc => (
          <Card 
            key={doc.id}
            variant={selectedId === doc.id ? 'filled' : 'outline'}
            borderColor={selectedId === doc.id ? 'blue.500' : undefined}
            cursor="pointer"
            _hover={{ shadow: 'md' }}
            onClick={() => handleSelectDocument(doc)}
          >
            <CardBody>
              <Flex direction="column" height="100%">
                <Box mb={4} position="relative" height="120px" bg="gray.100" borderRadius="md">
                  {doc.thumbnail ? (
                    <Image 
                      src={doc.thumbnail} 
                      alt={doc.title} 
                      objectFit="cover" 
                      width="100%" 
                      height="100%" 
                      borderRadius="md"
                    />
                  ) : (
                    <Flex 
                      height="100%" 
                      alignItems="center" 
                      justifyContent="center" 
                      bg="gray.100"
                      borderRadius="md"
                    >
                      <Text fontSize="5xl" color="gray.400">PDF</Text>
                    </Flex>
                  )}
                  <Badge 
                    position="absolute" 
                    top="2" 
                    right="2" 
                    colorScheme="blue"
                  >
                    {doc.page_count} pages
                  </Badge>
                </Box>

                <Stack spacing={2}>
                  <Heading size="sm" noOfLines={1}>
                    {doc.title || 'Untitled Document'}
                  </Heading>
                  <Text fontSize="sm" color="gray.500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </Text>
                  <Text fontSize="sm">
                    {doc.file_size_display || 'Unknown size'}
                  </Text>
                </Stack>

                {selectedId === doc.id && (
                  <Button 
                    mt={3} 
                    size="sm" 
                    colorScheme="blue" 
                    variant="solid"
                  >
                    Selected
                  </Button>
                )}
              </Flex>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default DocumentSelector;
