import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  useTheme,
  Paper,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Stack,
  IconButton
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import apiService from '../../services/api';
import StudentAnswerReport from './StudentAnswerReport';


// Helper function to format duration (assuming format "HH:MM:SS" or seconds)
const formatDuration = (duration) => {
  if (!duration) return 'N/A';
  // Example: if duration is in seconds
  if (typeof duration === 'number') {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  }
  // Example: if duration is a string like "00:05:30"
  if (typeof duration === 'string') {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
    return duration;
  }
  return 'N/A';
};


const QuizDetailsContent = ({ quizData, onBack }) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('percentage');
  const [order, setOrder] = useState('desc');
  
  const [reportData, setReportData] = useState(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const handleViewReport = async (attempt) => {
    if (!attempt) return;
    setSelectedAttempt(attempt);
    setIsReportLoading(true);
    try {
      const response = await apiService.get(`/api/students/admin_teacher_view_report/${quizData.id}/?student_id=${attempt.studentId}`);
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch student report:', error);
      setReportData(null); 
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleCloseReport = () => {
    setSelectedAttempt(null);
    setReportData(null);
  };

  const processedAttempts = useMemo(() => {
    if (!quizData || !quizData.rawData) {
      return [];
    }

    return quizData.rawData.map((attempt, index) => {
      return {
        id: attempt.id || index,
        studentId: attempt.student_id,
        registerNo: attempt.register_number || 'N/A',
        name: attempt.student_name || 'Unknown Student',
        email: attempt.student_mail || 'N/A', 
        status: 'Attempted',
        correctAnswers: attempt.correct_answer_count ?? 0,
        wrongAnswers: attempt.wrong_answer_count ?? 0,
        totalQuestions: attempt.total_questions ?? 0,
        percentage: attempt.percentage || 0,
        result: attempt.result || 'N/A',
        timeTaken: formatDuration(attempt.attempt_duration),
      };
    });
  }, [quizData]);

  const sortedAndPaginatedAttempts = useMemo(() => {
    const sorted = processedAttempts.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (bValue < aValue) {
        return order === 'asc' ? 1 : -1;
      }
      if (bValue > aValue) {
        return order === 'asc' ? -1 : 1;
      }
      return 0;
    });

    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedAttempts, order, orderBy, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!quizData) {
    return null;
  }

  const columns = [
    { id: 'registerNo', label: 'Register No', minWidth: 100 },
    { id: 'name', label: 'Name (Student)', minWidth: 170 },
    { id: 'email', label: 'Email', minWidth: 170 },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'correctAnswers', label: 'Correct Ans Count', align: 'right', minWidth: 100 },
    { id: 'wrongAnswers', label: 'Wrong Ans Count', align: 'right', minWidth: 100 },
    { id: 'totalQuestions', label: 'Total Quiz Questions', align: 'right', minWidth: 100 },
    { id: 'percentage', label: 'Score (%)', align: 'right', minWidth: 100 },
    { id: 'result', label: 'Result', minWidth: 100 },
    { id: 'timeTaken', label: 'Total Time', minWidth: 100 },
    { id: 'actions', label: 'Actions', minWidth: 80, align: 'center' },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', p: 0 }}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 48, height: 48 }}>
              <QuizIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" component="h1" fontWeight={700}>
                {quizData.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detailed Attempts Report
              </Typography>
            </Box>
          </Stack>
          <Button variant="outlined" onClick={onBack}>
            Close
          </Button>
        </Stack>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="quiz attempts table">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      align={column.align}
                      style={{ minWidth: column.minWidth }}
                      sortDirection={orderBy === column.id ? order : false}
                    >
                      <TableSortLabel
                        active={orderBy === column.id}
                        direction={orderBy === column.id ? order : 'asc'}
                        onClick={() => column.id !== 'actions' && handleRequestSort(column.id)}
                        hideSortIcon={column.id === 'actions'}
                      >
                        {column.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedAndPaginatedAttempts.map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      if (column.id === 'actions') {
                        return (
                          <TableCell key={column.id} align={column.align}>
                            <IconButton onClick={() => handleViewReport(row)} color="primary">
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.id === 'result' ? (
                            <Chip
                              label={value}
                              color={value.toLowerCase() === 'pass' ? 'success' : 'error'}
                              size="small"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          ) : (
                            value
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 100]}
            component="div"
            count={processedAttempts.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>
      
      <StudentAnswerReport
        open={!!selectedAttempt}
        onClose={handleCloseReport}
        reportData={reportData}
        isLoading={isReportLoading}
      />
    </Box>
  );
};

export default QuizDetailsContent; 