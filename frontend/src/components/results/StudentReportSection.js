import React, { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Paper, CircularProgress, Alert } from '@mui/material';
import FullLayout from '../FullLayout'; // Adjust path as necessary
import { studentApi, reportApi } from '../../services/api';

const StudentReportSection = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');

  // Mock student data removed, using API calls now.

  // Mock report data removed, using API calls now.

  useEffect(() => {
    setLoadingStudents(true);
    setError('');
    studentApi.getAll()
      .then(response => {
        const formattedStudents = response.data.map(student => ({
          id: student.id,
          name: student.full_name || 
                (student.user ? `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim() || student.user.username : 
                `Student ${student.id}`)
        }));
        setStudents(formattedStudents);
      })
      .catch(err => {
        console.error("Failed to load students:", err);
        setError('Failed to load students. Please check console for details.');
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, []);

  const handleStudentChange = (event) => {
    const studentId = event.target.value;
    setSelectedStudent(studentId);
    setReportData(null);
    setError('');

    if (studentId) {
      setLoadingReport(true);
      reportApi.getStudentReport(studentId)
        .then(response => {
          setReportData(response.data);
        })
        .catch(err => {
          console.error(`Failed to load report for student ${studentId}:`, err);
          setError('Failed to load report. The report might not exist or there was a server error. Check console.');
          setReportData(null); // Ensure report data is cleared on error
        })
        .finally(() => {
          setLoadingReport(false);
        });
    }
  };

  return (
    <FullLayout title="Student Reports">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Individual Student Reports
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="student-select-label">Select Student</InputLabel>
          <Select
            labelId="student-select-label"
            id="student-select"
            value={selectedStudent}
            label="Select Student"
            onChange={handleStudentChange}
            disabled={loadingStudents}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {loadingStudents ? (
              <MenuItem disabled>
                <CircularProgress size={20} sx={{mr: 1}} /> Loading students...
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

        {loadingReport && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {reportData && !loadingReport && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Report for: {reportData.studentName}
            </Typography>
            <Typography variant="body1">Quizzes Taken: {reportData.quizzesTaken}</Typography>
            <Typography variant="body1">Average Score: {reportData.averageScore}%</Typography>
            <Typography variant="body1">Recent Activity: {reportData.recentActivity}</Typography>
            {/* Add more detailed report information here */}
          </Paper>
        )}

        {!selectedStudent && !loadingReport && (
            <Typography variant="body1" color="text.secondary">
                Please select a student to view their report.
            </Typography>
        )}
      </Box>
    </FullLayout>
  );
};

export default StudentReportSection;
