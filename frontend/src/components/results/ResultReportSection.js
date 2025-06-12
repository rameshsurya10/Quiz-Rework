import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ShareIcon from '@mui/icons-material/Share';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import { quizService } from '../../services/quizService';

// TabPanel component for tab content
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quiz-report-tabpanel-${index}`}
      aria-labelledby={`quiz-report-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `quiz-report-tab-${index}`,
    'aria-controls': `quiz-report-tabpanel-${index}`,
  };
}

const ResultReportSection = ({ quizId }) => {
  const [reportData, setReportData] = useState(null);
  const [studentData, setStudentData] = useState([]);
  const [questionData, setQuestionData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        
        // Fetch summary data
        const summary = await quizService.getQuizReport(quizId);
        setReportData(summary);
        
        // Fetch student performance data
        const students = await quizService.getStudentPerformance(quizId);
        setStudentData(students);
        
        // Fetch question analysis data
        const questions = await quizService.getQuestionAnalysis(quizId);
        setQuestionData(questions);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (quizId) {
      fetchReportData();
    }
  }, [quizId]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleStudentChange = (event) => {
    setSelectedStudent(event.target.value);
  };
  
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const filteredStudents = studentData.filter(student => 
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const selectedStudentData = studentData.find(s => s.id === selectedStudent) || {};
  
  // Prepare data for charts
  const scoreDistributionData = reportData?.score_distribution 
    ? Object.entries(reportData.score_distribution).map(([range, count]) => ({
        range,
        count
      }))
    : [];
    
  const questionAccuracyData = questionData.map(q => ({
    name: q.question_text?.substring(0, 30) + (q.question_text?.length > 30 ? '...' : ''),
    accuracy: q.accuracy || 0
  }));

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box p={4}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  // Render no data state
  if (!reportData) {
    return (
      <Box p={4}>
        <Typography>No report data available for this quiz.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          aria-label="quiz report tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Summary" {...a11yProps(0)} />
          <Tab label="Student Performance" {...a11yProps(1)} />
          <Tab label="Question Analysis" {...a11yProps(2)} />
        </Tabs>
      </Box>
      
      <TabPanel value={activeTab} index={0}>
        {/* Summary Tab Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Quiz Overview</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Total Attempts</Typography>
                    <Typography variant="h5">{reportData.total_attempts || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Average Score</Typography>
                    <Typography variant="h5">{reportData.average_score?.toFixed(1) || 0}%</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Pass Rate</Typography>
                    <Typography variant="h5">{reportData.pass_rate?.toFixed(1) || 0}%</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">Passing Score</Typography>
                    <Typography variant="h5">{reportData.passing_score || 0}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Box mt={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Score Distribution</Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scoreDistributionData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill={theme.palette.primary.main} name="Number of Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance Summary</Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Passed', value: reportData.pass_rate || 0 },
                          { name: 'Failed', value: 100 - (reportData.pass_rate || 0) }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#4caf50" />
                        <Cell fill="#f44336" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={1}>
        {/* Student Performance Tab Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Students</Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow 
                            key={student.id}
                            hover
                            selected={selectedStudent === student.id}
                            onClick={() => handleStudentChange({ target: { value: student.id } })}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{student.name}</TableCell>
                            <TableCell align="right">
                              {student.best_score?.toFixed(1)}%
                              {student.passed ? (
                                <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                              ) : (
                                <CancelIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            {selectedStudent ? (
              <Card>
                <CardContent>
                  <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      {selectedStudentData.name}'s Performance
                    </Typography>
                    <Box>
                      <IconButton>
                        <DownloadIcon />
                      </IconButton>
                      <IconButton>
                        <PrintIcon />
                      </IconButton>
                      <IconButton>
                        <ShareIcon />
                      </IconButton>
                    </Box>
                  </Grid>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1">Email: {selectedStudentData.email}</Typography>
                      <Typography variant="subtitle1">Attempts: {selectedStudentData.attempts}</Typography>
                      <Typography variant="subtitle1">
                        Best Score: {selectedStudentData.best_score?.toFixed(1)}%
                        {selectedStudentData.passed ? (
                          <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />
                        ) : (
                          <CancelIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="subtitle1">
                        Last Attempt: {new Date(selectedStudentData.last_attempt).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[
                              { name: 'Attempt 1', score: 65 },
                              { name: 'Attempt 2', score: 75 },
                              { name: 'Attempt 3', score: selectedStudentData.best_score || 0 },
                            ]}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} name="Score (%)" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ) : (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                sx={{ height: '100%', minHeight: 300 }}
              >
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Select a student to view detailed performance
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </TabPanel>
      
      <TabPanel value={activeTab} index={2}>
        {/* Question Analysis Tab Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Question Accuracy</Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={questionAccuracyData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#8884d8" name="Accuracy (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Question Details</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Question</TableCell>
                        <TableCell align="right">Accuracy</TableCell>
                        <TableCell align="right">Attempts</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {questionData.map((question, index) => (
                        <TableRow key={question.question_id || index}>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                              {question.question_text}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" alignItems="center" justifyContent="flex-end">
                              <Box 
                                sx={{ 
                                  width: 50, 
                                  height: 8, 
                                  bgcolor: question.accuracy > 70 ? 'success.light' : 
                                           question.accuracy > 40 ? 'warning.light' : 'error.light',
                                  mr: 1,
                                  borderRadius: 1
                                }} 
                              />
                              {question.accuracy?.toFixed(1)}%
                            </Box>
                          </TableCell>
                          <TableCell align="right">{question.total_attempts}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
      
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          sx={{ mr: 1 }}
        >
          Export Report
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
        >
          Print Report
        </Button>
      </Box>
    </Box>
  );
};

export default ResultReportSection;