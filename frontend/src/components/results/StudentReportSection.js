import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  useTheme,
  Avatar,
  Button,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import FullLayout from '../FullLayout';
import { studentApi } from '../../services/api';

// --- Demo Data ---
const demoQuizReportData = {
  profile: {
    name: 'Deepika4',
    avatar: `https://i.pravatar.cc/150?u=deepika4`,
    dob: '10-05-2002',
    phone: '+91 1234567890',
    email: 'deepika4@example.com',
    joiningDate: '01-Jan-2022',
    lastActive: '2 hours ago',
  },
  quizPerformance: {
    quizTaken: 15,
    totalquiz: 20,
    averageScore: 88,
    passRate: 93, // percentage
    recentquiz: [
      { id: 1, title: 'React Fundamentals', date: '10 June 2024', score: 95, status: 'Passed' },
      { id: 2, title: 'Advanced JavaScript', date: '05 June 2024', score: 82, status: 'Passed' },
      { id: 3, title: 'Python for Data Science', date: '28 May 2024', score: 76, status: 'Passed' },
    ],
  },
  analytics: {
    scoreOverTime: {
      trend: [
        { name: 'Jan', score: 75 },
        { name: 'Feb', score: 78 },
        { name: 'Mar', score: 85 },
        { name: 'Apr', score: 82 },
        { name: 'May', score: 90 },
        { name: 'Jun', score: 95 },
      ],
    },
    scoresBySubject: {
      data: [
        { subject: 'React', score: 92 },
        { subject: 'JavaScript', score: 85 },
        { subject: 'Python', score: 80 },
        { subject: 'CSS', score: 88 },
        { subject: 'HTML', score: 95 },
      ],
    },
  },
};
// --- End Demo Data ---

const StudentReportSection = () => {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [analyticsTab, setAnalyticsTab] = useState(0);

  useEffect(() => {
    setLoadingStudents(true);
    studentApi.getAll()
      .then(response => {
        const studentData = response.data.results || response.data || [];
        const formattedStudents = studentData.map(student => ({
          id: student.student_id,
          name: student.name || `Student ${student.student_id}`
        }));
        setStudents(formattedStudents);
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        setError('Failed to load students. Using demo data for now.');
        setStudents([{ id: 'demo1', name: 'Deepika4 (Demo)' }]);
      })
      .finally(() => setLoadingStudents(false));
  }, []);

  const handleStudentChange = (event) => {
    const studentId = event.target.value;
    setSelectedStudent(studentId);
    if (studentId) {
      setReportData(demoQuizReportData);
      setError('');
    } else {
      setReportData(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setAnalyticsTab(newValue);
  };

  return (
    <FullLayout>
      <Box sx={{ p: 3, backgroundColor: '#F4F6F8' }}>
        <Typography variant="h4" gutterBottom>
          Individual Student Reports
        </Typography>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControl fullWidth sx={{ mb: 3, maxWidth: '400px', backgroundColor: 'white' }}>
          <InputLabel>Select Student</InputLabel>
          <Select
            value={selectedStudent}
            label="Select Student"
            onChange={handleStudentChange}
            disabled={loadingStudents}
          >
            {loadingStudents ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
              </MenuItem>
            ) : (
              students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {!reportData && selectedStudent && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!reportData && !selectedStudent && (
          <Typography variant="body1" color="text.secondary">
            Please select a student to view their report.
          </Typography>
        )}

        {reportData && (
          <Box sx={{ bgcolor: '#E8EAF6', p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ color: '#1A237E' }}>{reportData.profile.name}</Typography>
              <Button variant="contained" sx={{ bgcolor: '#1A237E', '&:hover': { bgcolor: '#0D47A1' } }}>Download Report</Button>
            </Box>

            <Grid container spacing={3}>
              {/* Profile Card */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Avatar src={reportData.profile.avatar} sx={{ width: 100, height: 100, margin: 'auto' }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Email: <strong style={{color: 'black'}}>{reportData.profile.email}</strong></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Joining Date: <strong style={{color: 'black'}}>{reportData.profile.joiningDate}</strong></Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Last Active: <strong style={{color: 'black'}}>{reportData.profile.lastActive}</strong></Typography>
                  </Box>
                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    <Button variant="outlined" fullWidth>View Profile</Button>
                  </Box>
                </Paper>
              </Grid>

              {/* Quiz Performance Card */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6">Quiz Performance</Typography>
                  <Box sx={{ position: 'relative', display: 'inline-flex', my: 3, left: '50%', transform: 'translateX(-50%)' }}>
                    <CircularProgress variant="determinate" value={100} size={120} thickness={4} sx={{ color: 'grey.300' }} />
                    <CircularProgress variant="determinate" value={reportData.quizPerformance.averageScore} size={120} thickness={4} sx={{ position: 'absolute', left: 0, color: 'primary.main' }} />
                    <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h4" component="div" color="text.primary">{`${reportData.quizPerformance.averageScore}%`}</Typography>
                    </Box>
                  </Box>
                  <Typography align="center" variant="h6">Average Score</Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                      <Box textAlign="center">
                          <Typography variant="h6">{`${reportData.quizPerformance.quizTaken}/${reportData.quizPerformance.totalquiz}`}</Typography>
                          <Typography variant="caption">quiz Taken</Typography>
                      </Box>
                      <Box textAlign="center">
                          <Typography variant="h6">{`${reportData.quizPerformance.passRate}%`}</Typography>
                          <Typography variant="caption">Pass Rate</Typography>
                      </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Recent quiz Card */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6">Recent quiz</Typography>
                  {reportData.quizPerformance.recentquiz.map((quiz, index) => (
                    <Paper key={index} variant="outlined" sx={{ p: 1.5, mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{quiz.title}</Typography>
                        <Typography variant="body1" sx={{ color: quiz.status === 'Passed' ? 'success.main' : 'error.main' }}>{quiz.status}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">{quiz.date}</Typography>
                        <Typography variant="body2" color="text.secondary">Score: {quiz.score}%</Typography>
                      </Box>
                    </Paper>
                  ))}
                  <Button size="small" sx={{ mt: 2 }}>View All quiz</Button>
                </Paper>
              </Grid>

              {/* Analytics Card */}
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6">Analytics</Typography>
                  <Tabs value={analyticsTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Score Over Time" />
                    <Tab label="Scores By Subject" />
                  </Tabs>
                  <Box sx={{ pt: 2, height: 300 }}>
                    {analyticsTab === 0 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.analytics.scoreOverTime.trend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[60, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="score" stroke={theme.palette.primary.main} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    {analyticsTab === 1 && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportData.analytics.scoresBySubject.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="subject" />
                          <YAxis domain={[60, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="score" fill={theme.palette.secondary.main} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </FullLayout>
  );
};

export default StudentReportSection;
