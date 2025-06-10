import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullLayout from '../FullLayout';
import {
  Container, Box, Typography, Button, Grid, useTheme, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, TableSortLabel, IconButton, Dialog, DialogTitle, 
  DialogContent
} from '@mui/material';
import { PageHeader, InfoCard, EmptyState } from '../common'; // Assuming common.js exists
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'; // Average Score
import RateReviewIcon from '@mui/icons-material/RateReview'; // Completion Rate
import PeopleIcon from '@mui/icons-material/People'; // Total Participants
import QuizIcon from '@mui/icons-material/Quiz'; // Quizzes Completed
import AssessmentIcon from '@mui/icons-material/Assessment'; // For table empty state
import VisibilityIcon from '@mui/icons-material/Visibility'; // View details icon
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'; // Report icon
import CloseIcon from '@mui/icons-material/Close';
import { motion } from 'framer-motion';
import { visuallyHidden } from '@mui/utils';
import { alpha } from '@mui/material/styles';
import ResultReportSection from './ResultReportSection';

const ResultsSection = () => {
  const navigate = useNavigate();
  
  const theme = useTheme();
  const [summaryStats, setSummaryStats] = useState(null);
  const [quizResults, setQuizResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('quizTitle');

  useEffect(() => {
    // Simulate fetching summary stats
    setTimeout(() => {
      setSummaryStats([
        {
          title: 'Average Score',
          value: '82%',
          icon: <EmojiEventsIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.success.main,
          trend: 'up',
          trendValue: '5',
        },
        {
          title: 'Completion Rate',
          value: '91%',
          icon: <RateReviewIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.info.main,
          trend: 'up',
          trendValue: '2',
        },
        {
          title: 'Total Participants',
          value: '1,250',
          icon: <PeopleIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.secondary.main,
          trend: 'stable',
          trendValue: '0',
        },
        {
          title: 'Quizzes Taken',
          value: '320',
          icon: <QuizIcon sx={{ fontSize: '2rem' }} />,
          color: theme.palette.warning.main,
          trend: 'down',
          trendValue: '3',
        },
      ]);
      setIsLoading(false);
    }, 1000);

    // Simulate fetching table data
    setTimeout(() => {
      setQuizResults([
        { id: 'q1', quizTitle: 'Introduction to React', attempts: 150, averageScore: 85, passRate: 92, lastAttemptDate: '2024-05-28' },
        { id: 'q2', quizTitle: 'Advanced JavaScript', attempts: 95, averageScore: 78, passRate: 85, lastAttemptDate: '2024-05-25' },
        { id: 'q3', quizTitle: 'Python for Data Science', attempts: 120, averageScore: 88, passRate: 95, lastAttemptDate: '2024-05-29' },
        { id: 'q4', quizTitle: 'SQL Fundamentals', attempts: 200, averageScore: 75, passRate: 80, lastAttemptDate: '2024-05-22' },
        { id: 'q5', quizTitle: 'DevOps Basics', attempts: 70, averageScore: 82, passRate: 90, lastAttemptDate: '2024-05-27' },
        { id: 'q6', quizTitle: 'Cybersecurity Essentials', attempts: 50, averageScore: 90, passRate: 96, lastAttemptDate: '2024-05-26' },
      ]);
      setIsLoadingTable(false);
    }, 1500);
  }, [theme]);

  // Table sorting and pagination functions
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  function descendingComparator(a, b, orderByProperty) {
    if (b[orderByProperty] < a[orderByProperty]) return -1;
    if (b[orderByProperty] > a[orderByProperty]) return 1;
    return 0;
  }

  function getComparator(currentOrder, orderByProperty) {
    return currentOrder === 'desc'
      ? (a, b) => descendingComparator(a, b, orderByProperty)
      : (a, b) => -descendingComparator(a, b, orderByProperty);
  }

  const sortedRows = React.useMemo(() => {
    return [...quizResults].sort(getComparator(order, orderBy));
  }, [quizResults, order, orderBy]);

  const visibleRows = React.useMemo(() => {
    return sortedRows.slice(
      page * rowsPerPage, 
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedRows, page, rowsPerPage]);

  const tableHeadCells = [
    { id: 'quizTitle', numeric: false, disablePadding: false, label: 'Quiz Title' },
    { id: 'attempts', numeric: true, disablePadding: false, label: 'Attempts' },
    { id: 'averageScore', numeric: true, disablePadding: false, label: 'Avg. Score (%)' },
    { id: 'passRate', numeric: true, disablePadding: false, label: 'Pass Rate (%)' },
    { id: 'lastAttemptDate', numeric: false, disablePadding: false, label: 'Last Attempt' },
    { id: 'actions', numeric: true, disablePadding: false, label: 'Actions', sortDisabled: true },
  ];

  const handleViewResult = (quizId) => {
    // Navigate to the detailed result view
    navigate(`/quiz-results/${quizId}`);
  };

  const handleViewReport = (quizId) => {
    setSelectedQuizId(quizId);
    setOpenReportDialog(true);
  };

  const handleCloseReportDialog = () => {
    setOpenReportDialog(false);
  };

  return (
    <FullLayout>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title="Quiz Results & Analytics"
          subtitle="Review performance metrics and detailed results for all quizzes."
          // Actions like filter buttons can be added here later
          // actions={[
          //   <Button key="filter-results" variant="outlined" startIcon={<FilterListIcon />}>
          //     Filter
          //   </Button>,
          // ]}
        />

        {isLoading && !summaryStats ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading stats...</Typography>
          </Box>
        ) : summaryStats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {summaryStats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{ height: '100%' }}
                >
                  <InfoCard 
                    title={stat.title} 
                    value={stat.value} 
                    icon={stat.icon} 
                    color={stat.color}
                    trend={stat.trend}
                    trendValue={stat.trendValue}
                  />
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {isLoadingTable ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Typography>Loading detailed results...</Typography>
          </Box>
        ) : quizResults.length === 0 ? (
          <EmptyState
            icon={<AssessmentIcon sx={{ fontSize: 60 }} />}
            title="No quiz results yet"
            message="Start creating and assigning quizzes to see results here."
            action={
              <Button variant="contained" color="primary">
                Create a Quiz
              </Button>
            }
          />
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              mb: 2,
              overflow: 'hidden',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 750 }} aria-labelledby="resultsTable">
                <TableHead>
                  <TableRow>
                    {tableHeadCells.map((headCell) => (
                      <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        {headCell.sortDisabled ? headCell.label : (
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={(event) => handleRequestSort(event, headCell.id)}
                          >
                            {headCell.label}
                            {orderBy === headCell.id ? (
                              <Box component="span" sx={visuallyHidden}>
                                {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                              </Box>
                            ) : null}
                          </TableSortLabel>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row, index) => {
                    return (
                      <TableRow hover tabIndex={-1} key={row.id}>
                        <TableCell component="th" scope="row">{row.quizTitle}</TableCell>
                        <TableCell align="right">{row.attempts}</TableCell>
                        <TableCell align="right">{row.averageScore}%</TableCell>
                        <TableCell align="right">{row.passRate}%</TableCell>
                        <TableCell>{row.lastAttemptDate}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleViewResult(row.id)}
                            size="small"
                            aria-label="view"
                            sx={{ mr: 1 }}
                            title="View Details"
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleViewReport(row.id)}
                            size="small"
                            aria-label="report"
                            title="View Report"
                          >
                            <AssessmentOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={quizResults.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        )}
      </Container>
      
      {/* Report Dialog */}
      <Dialog
        open={openReportDialog}
        onClose={handleCloseReportDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24,
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Quiz Result Report</Typography>
          <IconButton
            aria-label="close"
            onClick={handleCloseReportDialog}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <ResultReportSection quizId={selectedQuizId} />
        </DialogContent>
      </Dialog>
    </FullLayout>
  );
};

export default ResultsSection;
