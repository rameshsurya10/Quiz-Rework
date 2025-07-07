import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  FileDownload as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Description as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { studentApi, departmentApi } from '../../services/api';

const UploadArea = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: isDragOver ? theme.palette.action.hover : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  }
}));

const steps = ['Upload File', 'Review Data', 'Import Results'];

const BulkUploadDialog = ({ open, onClose, onSuccess, departments = [] }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [uploadType, setUploadType] = useState('excel');
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setActiveStep(0);
    setUploadedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadResults(null);
    setSelectedDepartment('');
    setUploadType('excel');
    setShowErrorDetails(false);
    onClose();
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file) => {
    const validExcelTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const validCsvTypes = ['text/csv', 'application/csv'];
    const fileName = file.name.toLowerCase();

    if (uploadType === 'excel' && (!validExcelTypes.includes(file.type) && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls'))) {
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (uploadType === 'csv' && (!validCsvTypes.includes(file.type) && !fileName.endsWith('.csv'))) {
      alert('Please select a valid CSV file (.csv)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setActiveStep(1);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      let response;
      let progressInterval;

      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      if (uploadType === 'excel') {
        response = await studentApi.bulkUpload(formData);
      } else {
        if (!selectedDepartment) {
          throw new Error('Please select a department for CSV upload');
        }
        response = await departmentApi.bulkUploadStudents(selectedDepartment, formData);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Handle different response formats
      const results = response.data.data || response.data;
      setUploadResults(results);
      setActiveStep(2);

      if (onSuccess) {
        onSuccess(results);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResults({
        status: 'error',
        message: error.response?.data?.message || error.message || 'Upload failed',
        errors: error.response?.data?.errors || [error.message],
        success_count: 0,
        error_count: 1,
        total_rows: 1
      });
      setActiveStep(2);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      let templateUrl;
      let fileName;
      
      if (uploadType === 'excel') {
        templateUrl = '/template/student_template.xlsx';
        fileName = 'student_upload_template.xlsx';
      } else {
        templateUrl = '/template/student_template.csv';
        fileName = 'student_upload_template.csv';
      }

      // Fetch the template file from the public folder
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template. Please check if template files exist.');
    }
  };

  const renderFileUploadStep = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Choose Upload Format
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel>Upload Type</InputLabel>
            <Select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
              label="Upload Type"
            >
              <MenuItem value="excel">Excel Format (.xlsx, .xls)</MenuItem>
              <MenuItem value="csv">CSV Format (.csv)</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {uploadType === 'csv' && (
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Select Department</InputLabel>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                label="Select Department"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.department_id} value={dept.department_id}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Required Format
              </Typography>
              {uploadType === 'excel' ? (
                <>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Excel file with columns: <strong>register_number, class_name, section, name, email, mobile_number, department_name, department_code</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Include department name and code for auto-creation<br/>
                    • Register number, class, and section are now required fields<br/>
                    • System will auto-create departments if they don't exist
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    CSV file with columns: <strong>register_number, class_name, section, name, email, mobile_number, department_name, department_code</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    • Include department name and code for matching<br/>
                    • Register number, class, and section are now required fields<br/>
                    • Must select a target department for CSV uploads
                  </Typography>
                </>
              )}
              <Button
                startIcon={<DownloadIcon />}
                onClick={downloadTemplate}
                size="small"
                variant="contained"
                color="primary"
                sx={{ mt: 1 }}
              >
                Download Template
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <UploadArea
            isDragOver={isDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept={uploadType === 'excel' ? '.xlsx,.xls' : '.csv'}
              onChange={handleFileInputChange}
            />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drop your file here or click to browse
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: {uploadType === 'excel' ? 'Excel (.xlsx, .xls)' : 'CSV (.csv)'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Maximum file size: 10MB
            </Typography>
          </UploadArea>
        </Grid>
      </Grid>
    </Box>
  );

  const renderReviewStep = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review File Details
      </Typography>
      
      {uploadedFile && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <FileIcon color="primary" />
            <Box flexGrow={1}>
              <Typography variant="subtitle1">
                {uploadedFile.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {uploadType.toUpperCase()} Format
              </Typography>
              {uploadType === 'csv' && selectedDepartment && (
                <Typography variant="body2" color="text.secondary">
                  Department: {departments.find(d => d.department_id === selectedDepartment)?.name}
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Please review the file details above. Click "Import Students" to proceed with the upload.
          {uploadType === 'excel' && (
            <><br />The system will automatically create departments if they don't exist.</>
          )}
        </Typography>
      </Alert>

      {isUploading && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading and processing... {Math.round(uploadProgress)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}
    </Box>
  );

  const renderResultsStep = () => (
    <Box>
      {uploadResults && (
        <>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            {uploadResults.status === 'error' || uploadResults.error_count > 0 ? (
              <WarningIcon color="warning" />
            ) : (
              <CheckIcon color="success" />
            )}
            <Typography variant="h6">
              Import {uploadResults.status === 'error' && uploadResults.success_count === 0 ? 'Failed' : 'Completed'}
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {uploadResults.success_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Successful
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {uploadResults.error_count || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {uploadResults.total_rows || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Rows
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {uploadResults.message && (
            <Alert 
              severity={uploadResults.status === 'error' ? 'error' : 'success'} 
              sx={{ mb: 2 }}
            >
              {uploadResults.message}
            </Alert>
          )}

          {uploadResults.errors && uploadResults.errors.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" color="error">
                    Error Details ({uploadResults.errors.length})
                  </Typography>
                  <IconButton 
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    size="small"
                  >
                    {showErrorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Collapse in={showErrorDetails}>
                  <Box mt={2} maxHeight={200} overflow="auto">
                    <List dense>
                      {uploadResults.errors.map((error, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={error}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderFileUploadStep();
      case 1:
        return renderReviewStep();
      case 2:
        return renderResultsStep();
      default:
        return 'Unknown step';
    }
  };

  const canProceedToReview = uploadedFile && (uploadType === 'excel' || selectedDepartment);
  const canStartImport = uploadedFile && !isUploading && (uploadType === 'excel' || selectedDepartment);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Bulk Upload Students</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={isUploading}>
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </Button>
        
        {activeStep === 0 && canProceedToReview && (
          <Button variant="contained" onClick={() => setActiveStep(1)}>
            Next
          </Button>
        )}
        
        {activeStep === 1 && (
          <>
            <Button onClick={() => setActiveStep(0)} disabled={isUploading}>
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={handleUpload}
              disabled={!canStartImport}
            >
              Import Students
            </Button>
          </>
        )}
        
        {activeStep === 2 && uploadResults?.success_count > 0 && (
          <Button variant="contained" onClick={handleClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog; 