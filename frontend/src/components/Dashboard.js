import React, { useState, useEffect } from 'react';
import { 
  Alert, Grid, FormControl, InputLabel, MenuItem, Select, Snackbar, 
  Skeleton, useTheme, Button, Typography, Paper, Box, 
  Card, CardContent, Divider, alpha, Tabs, Tab, useMediaQuery,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from "@mui/material";
// Don't import Router hooks directly to avoid context errors
import FullLayout from "./FullLayout";
import StudentIcon from '@mui/icons-material/SchoolOutlined';
import TeacherIcon from '@mui/icons-material/PsychologyAltOutlined';
import QuizIcon from '@mui/icons-material/QuizOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StyleIcon from '@mui/icons-material/Style';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import apiService from "../api";
import { 
  PerformanceGaugeCard,
  QuizAnswerDonutChart,
  QuizMetricsBarChart,
  generateTrendData,
  getChartData
} from "./charts";
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

// Dashboard component
const Dashboard = () => {
    const [search, setSearch] = useState({ quiz_id: 'all' });
    const [extra, setExtra] = useState([]);
    const [data, setData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isAdvancedView, setIsAdvancedView] = useState(false);
    const [showTrendDetails, setShowTrendDetails] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [detailedView, setDetailedView] = useState({ score: false, answer: false });
    const [exportLoading, setExportLoading] = useState(false);
    const [scoreInsightType, setScoreInsightType] = useState('peak'); // 'peak', 'average', 'trend'
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { read } = apiService.useCRUD();

    // Format time from seconds to m:ss format
    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) {
            return '0s';
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
    };
    
    // Don't use Router hooks directly to avoid context errors

    // Sample trend data
    const [trendData] = useState({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        scores: generateTrendData(7, 60, 95),
        participants: generateTrendData(7, 50, 200),
        duration: generateTrendData(7, 300, 900) // in seconds
    });

    // Chart options for better readability with improved animation
    const chartOptions = {
        responsive: true,
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
        },
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: alpha(theme.palette.text.primary, 0.1),
                },
                ticks: {
                    color: theme.palette.text.secondary,
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: theme.palette.text.secondary,
                }
            }
        }
    };

    const showMessage = (message, severity = 'error') => {
        setSnackbar({
          open: true,
          message: message,
          severity: severity,
        });
    };
    
    // Function to export dashboard data as CSV
    const exportDashboardReport = async () => {
        try {
            setExportLoading(true);
            showMessage('Preparing your download...', 'info');
            
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
            
            // Create CSV data from dashboard information
            const csvRows = [];
            
            // Add headers
            csvRows.push(['Dashboard Report', `Generated on ${new Date().toLocaleDateString()}`]);
            csvRows.push([""]);
            
            // Add summary data
            csvRows.push(['Summary Statistics']);
            csvRows.push(['Total Teachers', data.total_teachers || "0"]);
            csvRows.push(['Total Students', data.total_students || "0"]);
            csvRows.push(['Total Quizzes', data.total_quizes || "0"]);
            csvRows.push(['Active Participants', data.total_participants || "0"]);
            csvRows.push([""]);
            
            // Add performance metrics
            csvRows.push(['Performance Metrics']);
            csvRows.push(['Average Score', `${data.average_score || 0}%`]);
            csvRows.push(['Correct Answers', `${data.right_answers || 0}%`]);
            csvRows.push(['Wrong Answers', `${data.wrong_answers || 0}%`]);
            csvRows.push(['Unanswered', `${data.unanswered_questions || 0}%`]);
            csvRows.push(['Average Duration', formatTime(data.average_duration || 0)]);
            
            // Add trend data if available
            if (trendData && trendData.labels && trendData.scores) {
                csvRows.push([""]);
                csvRows.push(['Trend Data']);
                trendData.labels.forEach((month, index) => {
                    csvRows.push([month, `${trendData.scores[index]}%`]);
                });
            }
            
            // Convert to CSV format
            const csvContent = csvRows.map(row => row.join(',')).join('\n');
            
            // Create a Blob and download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `quiz_dashboard_report_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showMessage('Report downloaded successfully!', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            showMessage('Failed to export report.', 'error');
        } finally {
            setExportLoading(false);
        }
    };

    const refresh = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching dashboard data...');
            
            const dashboardData = await apiService.useCRUD().read(
                'api/dashboard',  // Add 'api/' prefix here
                1,                // page
                10,               // pageSize
                {},               // No filters needed
                (error) => {
                    console.error('Dashboard endpoint error:', error);
                    showMessage('Failed to load dashboard data.', 'error');
                }
            );
            
            console.log('Dashboard data received:', dashboardData);
            
            if (dashboardData) {
                setData(dashboardData);
                showMessage('Dashboard data loaded successfully.', 'success');
            } else {
                showMessage('No dashboard data available yet.', 'info');
            }
        } catch (error) {
            console.error('Error in refresh:', error);
            showMessage('An error occurred while loading dashboard data.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Add a small delay to ensure token is properly loaded
        setTimeout(() => {
            refresh();
        }, 300);
        
        // Refresh dashboard when window gets focus (to keep data current if token was refreshed)
        const handleFocus = () => {
            console.log('Window focused, refreshing dashboard data');
            refresh();
        };
        
        window.addEventListener('focus', handleFocus);
        
        // Cleanup
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [search]); // Include search in dependency array to refetch when filter changes

    const handleSearchChange = (event) => {
        const { name, value } = event.target;
        setSearch(prevSearch => ({
            ...prevSearch,
            [name]: value
        }));
    };

    // formatTime function is now defined above with better edge case handling

    const str = (x) => x ?? 0;

    // Render trend card with tabs
    const renderTrendCard = (title, icon, value, change, isPositive) => (
        <Card sx={{ 
            height: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.5)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 25px 0 rgba(0,0,0,0.1)'
            }
        }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" color="textSecondary">{title}</Typography>
                    <Box sx={{
                        p: 1,
                        borderRadius: '50%',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {icon}
                    </Box>
                </Box>
                <Box display="flex" alignItems="flex-end" mb={0.5}>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                        {value}
                    </Typography>
                    <Box display="flex" alignItems="center" ml={1} mb={0.5}>
                        {isPositive ? (
                            <TrendingUpIcon color="success" fontSize="small" />
                        ) : (
                            <TrendingUpIcon color="error" style={{ transform: 'rotate(180deg)' }} fontSize="small" />
                        )}
                        <Typography 
                            variant="caption" 
                            color={isPositive ? 'success.main' : 'error.main'}
                            sx={{ ml: 0.5, fontWeight: 'medium' }}
                        >
                            {change}%
                        </Typography>
                    </Box>
                </Box>
                <Typography variant="caption" color="textSecondary">vs. last month</Typography>
            </CardContent>
        </Card>
    );

    // Render skeleton loading state
    const renderSkeletons = () => (
        <Paper
            elevation={3}
            sx={{
                position: 'relative',
                p: 4,
                borderRadius: 3,
                backgroundColor: "#fbfcfc",
                mb: 4
            }}
        >
            {/* Top row of 4 info cards */}
            <Grid container spacing={3} sx={{ mt: 0 }}>
                {[...Array(4)].map((_, index) => (
                    <Grid item xs={12} sm={6} md={3} key={`skeleton-top-${index}`}>
                        <Skeleton variant="rectangular" height={118} sx={{ borderRadius: 2 }} />
                    </Grid>
                ))}
            </Grid>

            {/* Filter dropdown skeleton */}
            <Grid container spacing={3.5} mt={3} justifyContent="flex-end">
                <Grid item xs={12} sm={3}>
                    <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                </Grid>
            </Grid>

            {/* Performance overview */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                </Grid>
            </Grid>

            {/* Chart sections */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
                </Grid>
            </Grid>
        </Paper>
    );

    const renderTrendDataTable = () => (
        <>
            <Grid container spacing={2} sx={{ mt: 2, mb: 2 }}>
                {/* Performance Summary Card */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', p: 2, background: alpha(theme.palette.primary.main, 0.05) }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            7-Day Performance Trend
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Avg. Monthly Score</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {Math.round(trendData.scores.reduce((a, b) => a + b, 0) / trendData.scores.length)}%
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">Total Participants</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {trendData.participants.reduce((a, b) => a + b, 0).toLocaleString()}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Avg. Duration</Typography>
                            <Typography variant="body2" fontWeight="bold">
                                {formatTime(Math.round(trendData.duration.reduce((a, b) => a + b, 0) / trendData.duration.length))}
                            </Typography>
                        </Box>
                    </Card>
                </Grid>
                
                {/* Quick Actions */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%', p: 2, background: alpha(theme.palette.info.main, 0.05) }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Quick Actions
                        </Typography>
                        <Grid container spacing={1}>
                            <Grid item xs={6} sm={3}>
                                <Button fullWidth size="small" variant="outlined" startIcon={<AssessmentIcon />}>
                                    Export Report
                                </Button>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Button fullWidth size="small" variant="outlined" startIcon={<TrendingUpIcon />}>
                                    View Trends
                                </Button>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Button fullWidth size="small" variant="outlined" startIcon={<StyleIcon />}>
                                    Analyze Topics
                                </Button>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Button fullWidth size="small" variant="outlined" startIcon={<BarChartIcon />}>
                                    Compare Results
                                </Button>
                            </Grid>
                        </Grid>
                    </Card>
                </Grid>
            </Grid>

            {/* Data Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, mt: 2, mb: 2, background: alpha(theme.palette.background.default, 0.8) }}>
                <Table size="small" aria-label="performance trend data table" sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableCell sx={{ fontWeight: 'bold', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, width: '20%', p: 1.5 }}>Month</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, width: '20%', p: 1.5 }}>Score (%)</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, width: '25%', p: 1.5 }}>Participants</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`, width: '35%', p: 1.5 }}>Avg. Duration</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {trendData.labels.map((label, index) => (
                            <TableRow key={label} hover sx={{ 
                                '&:last-child td, &:last-child th': { border: 0 },
                                '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.background.default, 0.4) },
                                transition: 'background-color 0.2s'
                            }}>
                                <TableCell component="th" scope="row" sx={{ py: 1.5, fontWeight: 500 }}>{label}</TableCell>
                                <TableCell align="center" sx={{ py: 1.5, color: trendData.scores[index] > 80 ? theme.palette.success.main : 
                                    (trendData.scores[index] < 65 ? theme.palette.error.main : theme.palette.warning.main),
                                     fontWeight: 'bold' }}>
                                    {`${trendData.scores[index]}%`}
                                </TableCell>
                                <TableCell align="center" sx={{ py: 1.5 }}>{trendData.participants[index].toLocaleString()}</TableCell>
                                <TableCell align="center" sx={{ py: 1.5 }}>{formatTime(trendData.duration[index])}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );

    // Handle opening detailed views
    const handleOpenDetailedView = (type) => {
        setDetailedView(prev => ({
            ...prev,
            [type]: true
        }));
    };

    // Handle closing detailed views
    const handleCloseDetailedView = (type) => {
        setDetailedView(prev => ({
            ...prev,
            [type]: false
        }));
    };

    // Render detailed score distribution dialog
    const renderScoreDistributionDialog = () => (
        <Dialog
            open={detailedView.score}
            onClose={() => handleCloseDetailedView('score')}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                Score Distribution Analysis
            </DialogTitle>
            <DialogContent>
                <Box sx={{ height: 300, mb: 3, mt: 2 }}>
                    <QuizMetricsBarChart 
                        averageScore={data.average_score}
                        highestScore={data.greatest_score}
                        lowestScore={data.least_score}
                    />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Highest Score</Typography>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                {data.greatest_score || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                Achieved by {data.highest_score_student || 'Advanced Student'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Quiz: {data.highest_score_quiz || 'Mathematics Quiz 3'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Average Score</Typography>
                            <Typography variant="h4" color="primary.main" fontWeight="bold">
                                {data.average_score || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                Based on {data.participants || 0} participants
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {data.average_score > 70 ? 'Good overall performance' : 'Needs improvement'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Lowest Score</Typography>
                            <Typography variant="h4" color="error.main" fontWeight="bold">
                                {data.least_score || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                Quiz: {data.lowest_score_quiz || 'Physics Quiz 1'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {data.least_score < 40 ? 'Significant attention required' : 'Review recommended'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Performance Distribution</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.dark, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="success.dark">
                                    {data.excellent_percentage || '18'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Excellent<br/>(90-100%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="success.main">
                                    {data.good_percentage || '42'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Good<br/>(70-89%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="warning.main">
                                    {data.average_percentage || '25'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Average<br/>(50-69%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="error.main">
                                    {data.poor_percentage || '15'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Poor<br/>(0-49%)</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleCloseDetailedView('score')} variant="contained" color="primary">
                    Close
                </Button>
                <Button 
                    startIcon={<BarChartIcon />}
                    onClick={() => {
                        handleCloseDetailedView('score');
                        exportDashboardReport();
                    }}
                >
                    Export Data
                </Button>
            </DialogActions>
        </Dialog>
    );

    // Render detailed answer breakdown dialog
    const renderAnswerBreakdownDialog = () => (
        <Dialog
            open={detailedView.answer}
            onClose={() => handleCloseDetailedView('answer')}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                Answer Breakdown Analysis
            </DialogTitle>
            <DialogContent>
                <Box sx={{ height: 300, mb: 3, mt: 2 }}>
                    <QuizAnswerDonutChart 
                        rightAnswers={data.right_answers}
                        wrongAnswers={data.wrong_answers}
                        unansweredQuestions={data.unanswered_questions}
                    />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Correct Answers</Typography>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                {data.right_answers || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions answered correctly
                            </Typography>
                            {data.right_answers > 70 ? (
                                <Typography variant="body2" color="success.main">
                                    Good understanding of material
                                </Typography>
                            ) : (
                                <Typography variant="body2" color="warning.main">
                                    Review of material recommended
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Incorrect Answers</Typography>
                            <Typography variant="h4" color="error.main" fontWeight="bold">
                                {data.wrong_answers || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions answered incorrectly
                            </Typography>
                            {data.wrong_answers < 20 ? (
                                <Typography variant="body2" color="success.main">
                                    Low error rate
                                </Typography>
                            ) : (
                                <Typography variant="body2" color="error.main">
                                    High error rate - identify problem areas
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Skipped Questions</Typography>
                            <Typography variant="h4" color="warning.main" fontWeight="bold">
                                {data.unanswered_questions || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions left unanswered
                            </Typography>
                            {data.unanswered_questions < 10 ? (
                                <Typography variant="body2" color="success.main">
                                    Good attempt rate
                                </Typography>
                            ) : (
                                <Typography variant="body2" color="warning.main">
                                    Time management issues possible
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Topic Performance</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>Strengths</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.strongest_topic || 'Mathematics'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.success.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                width: `${data.strongest_topic_percentage || 82}%`,
                                                bgcolor: theme.palette.success.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="body2">{data.strongest_topic_percentage || 82}%</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.second_strongest_topic || 'History'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.success.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                width: `${data.second_strongest_topic_percentage || 76}%`,
                                                bgcolor: theme.palette.success.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="body2">{data.second_strongest_topic_percentage || 76}%</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>Improvement Areas</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.weakest_topic || 'Physics'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.error.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                width: `${data.weakest_topic_percentage || 45}%`,
                                                bgcolor: theme.palette.error.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="body2">{data.weakest_topic_percentage || 45}%</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.second_weakest_topic || 'Chemistry'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.error.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                width: `${data.second_weakest_topic_percentage || 52}%`,
                                                bgcolor: theme.palette.error.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                    <Typography variant="body2">{data.second_weakest_topic_percentage || 52}%</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => handleCloseDetailedView('answer')} variant="contained" color="primary">
                    Close
                </Button>
                <Button 
                    startIcon={<BarChartIcon />}
                    onClick={() => {
                        handleCloseDetailedView('answer');
                        exportDashboardReport();
                    }}
                >
                    Export Data
                </Button>
            </DialogActions>
        </Dialog>
    );

    // Render tab panel for trend charts
    // Render tab panel with enhanced details in advanced view
    const renderTabPanel = (index) => {
        const height = isMobile ? '250px' : '300px';
        
        return (
            <Box sx={{ p: 2, height: '100%' }}>
                {activeTab === 0 && (
                    <Box>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={8}>
                                <Box sx={{ height }}>
                                    <Line data={getChartData('scores', trendData, theme)} options={{...chartOptions, animation: { duration: 1000, easing: 'easeOutQuart' }}} />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.default, 0.6), borderRadius: 2, height: '100%' }}>
                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Score Insights</Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Box textAlign="center" p={1} bgcolor={alpha(theme.palette.primary.main, 0.1)} borderRadius={1}>
                                                <Typography variant="h4" fontWeight="bold" color="primary.main">{Math.max(...trendData.scores)}%</Typography>
                                                <Typography variant="caption" color="textSecondary">Peak Score</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box textAlign="center" p={1} bgcolor={alpha(theme.palette.primary.main, 0.1)} borderRadius={1}>
                                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                                    {(trendData.scores.reduce((a, b) => a + b, 0) / trendData.scores.length).toFixed(1)}%
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">Average Score</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Box textAlign="center" p={1} bgcolor={alpha(theme.palette.primary.main, 0.1)} borderRadius={1} mt={1}>
                                                <Typography variant="h5" fontWeight="bold" 
                                                    color={trendData.scores[trendData.scores.length - 1] > trendData.scores[0] ? 
                                                        theme.palette.success.main : theme.palette.error.main}>
                                                    {trendData.scores[trendData.scores.length - 1] > trendData.scores[0] ? 'Improving' : 'Declining'}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">Performance Trend</Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                        </Grid>
                        {renderTrendDataTable()}
                    </Box>
                )}
                {activeTab === 1 && (
                    <Box sx={{ height }}>
                        <Bar data={getChartData('participants', trendData, theme)} options={{animation: { duration: 800, easing: 'easeInOutQuad' },
                            ...chartOptions,
                            plugins: {
                                ...chartOptions.plugins,
                                legend: { display: false }
                            }
                        }} />
                        {isAdvancedView && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Participation Insights</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Typography variant="body2">
                                        <b>Max: </b>{Math.max(...trendData.participants)} users
                                    </Typography>
                                    <Typography variant="body2">
                                        <b>Average: </b>{Math.round(trendData.participants.reduce((a, b) => a + b, 0) / trendData.participants.length)} users
                                    </Typography>
                                    <Typography variant="body2">
                                        <b>Growth: </b>
                                        {((trendData.participants[trendData.participants.length - 1] - trendData.participants[0]) / trendData.participants[0] * 100).toFixed(1)}%
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
                {activeTab === 2 && (
                    <Box sx={{ height }}>
                        <Line data={getChartData('duration', trendData, theme)} options={{...chartOptions, animation: { duration: 1200, easing: 'easeOutCubic' }}} />
                        {isAdvancedView && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Time Insights</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Typography variant="body2">
                                        <b>Longest: </b>{formatTime(Math.max(...trendData.duration))}
                                    </Typography>
                                    <Typography variant="body2">
                                        <b>Average: </b>{formatTime(Math.round(trendData.duration.reduce((a, b) => a + b, 0) / trendData.duration.length))}
                                    </Typography>
                                    <Typography variant="body2">
                                        <b>Shortest: </b>{formatTime(Math.min(...trendData.duration))}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );
    };
    
    if (isLoading) {
        return <FullLayout>{renderSkeletons()}</FullLayout>;
    }
    
    return (
        <FullLayout hideToolbar>
            <Box sx={{ 
                background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(135deg, #121212 0%, #1E1E1E 100%)' 
                    : 'linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%)',
                minHeight: '100vh',
                padding: 2, // 16px spacing on all sides
                overflow: 'auto',
                '& .MuiContainer-root': {
                    padding: 2, // 16px spacing
                    margin: 0,
                    maxWidth: '100% !important',
                    width: '100%'
                }
            }}>
                <Box maxWidth="1600px" mx="auto">
                    {/* Header with Title and Actions */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                        <Box>
                            <Typography variant="h4" component="h1" sx={{ 
                                fontWeight: 'bold',
                                background: theme.palette.mode === 'dark'
                                    ? 'linear-gradient(90deg, #64B5F6, #42A5F5)'
                                    : 'linear-gradient(90deg, #1E88E5, #0D47A1)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                            }}>
                                Dashboard Overview
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" justifyContent="flex-end" sx={{ mb: 1 }}>
                            <Button 
                                onClick={() => {
                                    const newIsAdvancedView = !isAdvancedView;
                                    setIsAdvancedView(newIsAdvancedView);
                                    if (!newIsAdvancedView) {
                                        setShowTrendDetails(false);
                                    }
                                }}
                                variant={isAdvancedView ? "outlined" : "contained"}
                                color="primary"
                                startIcon={<StyleIcon />}
                                size={isMobile ? "small" : "medium"}
                                sx={{
                                    borderRadius: '12px',
                                    textTransform: 'none',
                                    px: { xs: 2, sm: 3 },
                                    fontWeight: 600,
                                    letterSpacing: 0.5,
                                    boxShadow: isAdvancedView ? 'none' : theme.shadows[3],
                                    whiteSpace: 'nowrap',
                                    minWidth: 'auto',
                                    '& .MuiButton-startIcon': {
                                        mr: { xs: 0.5, sm: 1 }
                                    }
                                }}
                            >
                                {isMobile ? (isAdvancedView ? 'Simple' : 'Advanced') : (isAdvancedView ? 'Simple View' : 'Advanced View')}
                            </Button>
                        </Box>
                    </Box>

                    {/* Stats Overview Cards */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            {renderTrendCard(
                                'Total Teachers', 
                                <TeacherIcon color="primary" />, 
                                data.total_teachers || '0',
                                '12.5',
                                true
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            {renderTrendCard(
                                'Total Students', 
                                <StudentIcon color="secondary" />, 
                                data.total_students || '0',
                                '8.3',
                                true
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            {renderTrendCard(
                                'Total quiz', 
                                <QuizIcon color="success" />, 
                                data.total_quizes || '0',
                                '5.7',
                                true
                            )}
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            {renderTrendCard(
                                'Active Participants', 
                                <PersonIcon color="info" />, 
                                data.total_participants || '0',
                                '15.2',
                                true
                            )}
                        </Grid>
                    </Grid>

                    {/* Main Content Area */}
                    <Grid container spacing={3}>
                        {/* Left Side - Main Content */}
                        <Grid item xs={12} lg={showTrendDetails ? 8 : 12}>
                            {/* Performance Overview */}
                            <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 3 }}>
                                <CardContent sx={{ padding: '16px' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                                            Performance Overview
                                        </Typography>
                                        {isAdvancedView && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                                sx={{ borderRadius: 2, textTransform: 'none' }}
                                                onClick={exportDashboardReport}
                                                disabled={exportLoading}
                                                startIcon={exportLoading ? 
                                                    <CircularProgress size={16} color="primary" /> : 
                                                    <BarChartIcon fontSize="small" />}
                                            >
                                                {exportLoading ? 'Exporting...' : 'Export Report'}
                                            </Button>
                                        )}
                                    </Box>
                                    <Grid container spacing={3} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <PerformanceGaugeCard 
                                                title="Performance Score"
                                                averageScore={data.average_score || 0}
                                                secondaryText={`Based on ${str(data.participants) || 0} participants`}
                                                height={250}
                                                animationSpeed={1200}
                                            />
                                            {isAdvancedView && (
                                                <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                                        Score Comparison
                                                    </Typography>
                                                    <Box display="flex" justifyContent="space-between" mt={1}>
                                                        <Box>
                                                            <Typography variant="caption" color="textSecondary">vs. Last Month</Typography>
                                                            <Typography variant="body2" sx={{ color: theme.palette.success.main, fontWeight: 'medium' }}>
                                                                +{(data.average_score ? data.average_score * 0.12 : 4.2).toFixed(1)}%
                                                            </Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="caption" color="textSecondary">vs. Benchmark</Typography>
                                                            <Typography variant="body2" sx={{ color: (data.average_score && data.average_score > 65) ? theme.palette.success.main : theme.palette.error.main, fontWeight: 'medium' }}>
                                                                {(data.average_score && data.average_score > 65) ? '+' : ''}
                                                                {(data.average_score ? (data.average_score - 65).toFixed(1) : -5.0)}%
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Grid>
                                        <Grid item xs={12} md={8}>
                                            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                                                    Performance Metrics
                                                </Typography>
                                                <Box sx={{ flexGrow: 1, mt: 2 }}>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="success.main" fontWeight="bold">
                                                                    {str(data.right_answers || 0)}%
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">Correct</Typography>
                                                                {isAdvancedView && data.right_answers && (
                                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: data.right_answers > 70 ? theme.palette.success.main : theme.palette.warning.main }}>
                                                                        {data.right_answers > 70 ? 'Above Average' : 'Below Average'}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="error.main" fontWeight="bold">
                                                                    {str(data.wrong_answers || 0)}%
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">Wrong</Typography>
                                                                {isAdvancedView && data.wrong_answers !== undefined && (
                                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary }}>
                                                                        {data.wrong_answers < 20 ? 'Good Performance' : 'Needs Improvement'}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="warning.main" fontWeight="bold">
                                                                    {str(data.unanswered_questions || 0)}%
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">Unanswered</Typography>
                                                                {isAdvancedView && data.unanswered_questions !== undefined && (
                                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary }}>
                                                                        {data.unanswered_questions < 10 ? 'Good Attempt Rate' : 'Time Management Issue'}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="info.main" fontWeight="bold">
                                                                    {formatTime(data.average_duration || 0)}
                                                                </Typography>
                                                                <Typography variant="body2" color="textSecondary">Avg. Time</Typography>
                                                                {isAdvancedView && data.average_duration && (
                                                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: theme.palette.text.secondary }}>
                                                                        {data.average_duration < 600 ? 'Fast Completion' : 'Thorough Analysis'}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                    {isAdvancedView && (
                                                        <Box sx={{ mt: 3 }}>
                                                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                                                Key Insights
                                                            </Typography>
                                                            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                                                                        <Typography variant="body2">
                                                                            <b>Completion Rate: </b>
                                                                            {(100 - (data.unanswered_questions || 0)).toFixed(1)}%
                                                                            <span style={{ color: data.unanswered_questions && data.unanswered_questions < 10 ? theme.palette.success.main : theme.palette.warning.main }}>
                                                                                {' '}({data.unanswered_questions && data.unanswered_questions < 10 ? 'Good' : 'Needs Improvement'})
                                                                            </span>
                                                                        </Typography>
                                                                    </Box>
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                                                                        <Typography variant="body2">
                                                                            <b>Accuracy Rate: </b>
                                                                            {(data.right_answers && data.wrong_answers) ? 
                                                                                ((data.right_answers / (data.right_answers + data.wrong_answers)) * 100).toFixed(1) : 
                                                                                '0.0'}%
                                                                            <span style={{ 
                                                                                color: (data.right_answers && data.wrong_answers && 
                                                                                    (data.right_answers / (data.right_answers + data.wrong_answers)) > 0.75) ? 
                                                                                    theme.palette.success.main : theme.palette.warning.main 
                                                                            }}>
                                                                                {' '}({(data.right_answers && data.wrong_answers && 
                                                                                    (data.right_answers / (data.right_answers + data.wrong_answers)) > 0.75) ? 
                                                                                    'Excellent' : 'Needs Practice'})
                                                                            </span>
                                                                        </Typography>
                                                                    </Box>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Additional Stats */}
                            <Grid container spacing={3}>
                                {isAdvancedView && <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                        <CardContent sx={{ padding: '16px' }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                                    Score Distribution
                                                </Typography>
                                                {isAdvancedView && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        sx={{ borderRadius: 2, textTransform: 'none' }}
                                                        onClick={() => handleOpenDetailedView('score')}
                                                        startIcon={<AssessmentIcon fontSize="small" />}
                                                    >
                                                        Details
                                                    </Button>
                                                )}
                                            </Box>
                                            <Box sx={{ height: isAdvancedView ? 200 : 250, mt: 2 }}>
                                                <QuizMetricsBarChart 
                                                    averageScore={data.average_score}
                                                    highestScore={data.greatest_score}
                                                    lowestScore={data.least_score}
                                                    options={{ animation: { duration: 1200, easing: 'easeInOutQuint' } }}
                                                />
                                            </Box>
                                            {isAdvancedView && (
                                                <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>Score Distribution Details</Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Average</Typography>
                                                            <Typography variant="h6" fontWeight="bold">{data.average_score}%</Typography>
                                                        </Grid>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Highest</Typography>
                                                            <Typography variant="h6" fontWeight="bold" color="success.main">{data.greatest_score}%</Typography>
                                                        </Grid>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Lowest</Typography>
                                                            <Typography variant="h6" fontWeight="bold" color="error.main">{data.least_score}%</Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>}
                                {isAdvancedView && <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                        <CardContent sx={{ padding: '16px' }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                                    Answer Breakdown
                                                </Typography>
                                                {isAdvancedView && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="primary"
                                                        sx={{ borderRadius: 2, textTransform: 'none' }}
                                                        onClick={() => handleOpenDetailedView('answer')}
                                                        startIcon={<AssessmentIcon fontSize="small" />}
                                                    >
                                                        Details
                                                    </Button>
                                                )}
                                            </Box>
                                            <Box sx={{ height: isAdvancedView ? 200 : 250, mt: 2 }}>
                                                <QuizAnswerDonutChart 
                                                    rightAnswers={data.right_answers}
                                                    wrongAnswers={data.wrong_answers}
                                                    unansweredQuestions={data.unanswered_questions}
                                                    options={{ animation: { duration: 1500, animateRotate: true, animateScale: true } }}
                                                />
                                            </Box>
                                            {isAdvancedView && (
                                                <Box sx={{ mt: 3 }}>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} sm={6}>
                                                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="caption" color="textSecondary" display="block">Most Correct Topic</Typography>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {data.strongest_topic || 'Mathematics'}
                                                                </Typography>
                                                                <Typography variant="caption" color="success.main">
                                                                    {data.strongest_topic_percentage || 82}% correct rate
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="caption" color="textSecondary" display="block">Most Incorrect Topic</Typography>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {data.weakest_topic || 'Physics'}
                                                                </Typography>
                                                                <Typography variant="caption" color="error.main">
                                                                    {data.weakest_topic_percentage || 45}% correct rate
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>}
                            </Grid>
                        </Grid>

                        {/* Right Side - Trends Panel (Conditional) */}
                        {showTrendDetails && (
                            <Grid item xs={12} lg={4}>
                                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Typography variant="subtitle1" fontWeight="500" color="text.primary">
                                                    Performance
                                                </Typography>
                                                {isAdvancedView && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                                                        <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 16 }} />
                                                        <Typography variant="body2" color="text.secondary">
                                                            Score Insights: 
                                                            <Box component="span" 
                                                                sx={{ 
                                                                    cursor: 'pointer', 
                                                                    textDecoration: scoreInsightType === 'peak' ? 'underline' : 'none',
                                                                    fontWeight: scoreInsightType === 'peak' ? 'bold' : 'normal',
                                                                    mx: 0.5
                                                                }}
                                                                onClick={() => setScoreInsightType('peak')}
                                                            >
                                                                Peak
                                                            </Box> | 
                                                            <Box component="span" 
                                                                sx={{ 
                                                                    cursor: 'pointer', 
                                                                    textDecoration: scoreInsightType === 'average' ? 'underline' : 'none',
                                                                    fontWeight: scoreInsightType === 'average' ? 'bold' : 'normal',
                                                                    mx: 0.5
                                                                }}
                                                                onClick={() => setScoreInsightType('average')}
                                                            >
                                                                Average
                                                            </Box> | 
                                                            <Box component="span" 
                                                                sx={{ 
                                                                    cursor: 'pointer', 
                                                                    textDecoration: scoreInsightType === 'trend' ? 'underline' : 'none',
                                                                    fontWeight: scoreInsightType === 'trend' ? 'bold' : 'normal',
                                                                    mx: 0.5
                                                                }}
                                                                onClick={() => setScoreInsightType('trend')}
                                                            >
                                                                Trend
                                                            </Box>
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Tabs 
                                                value={activeTab} 
                                                onChange={(e, newValue) => setActiveTab(newValue)}
                                                aria-label="trend tabs"
                                                sx={{
                                                    '& .MuiTabs-indicator': {
                                                        display: 'none',
                                                    },
                                                }}
                                            >
                                                <Tab 
                                                    icon={<TimelineIcon />} 
                                                    aria-label="scores"
                                                    sx={{
                                                        minWidth: 'auto',
                                                        p: 1,
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                                            color: theme.palette.primary.main,
                                                        },
                                                    }}
                                                />
                                                <Tab 
                                                    icon={<BarChartIcon />} 
                                                    aria-label="participants"
                                                    sx={{
                                                        minWidth: 'auto',
                                                        p: 1,
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            bgcolor: alpha(theme.palette.secondary.main, 0.1),
                                                            color: theme.palette.secondary.main,
                                                        },
                                                    }}
                                                />
                                                <Tab 
                                                    icon={<ShowChartIcon />} 
                                                    aria-label="duration"
                                                    sx={{
                                                        minWidth: 'auto',
                                                        p: 1,
                                                        borderRadius: 2,
                                                        '&.Mui-selected': {
                                                            bgcolor: alpha(theme.palette.success.main, 0.1),
                                                            color: theme.palette.success.main,
                                                        },
                                                    }}
                                                />
                                            </Tabs>
                                        </Box>
                                        <Divider sx={{ mb: 2 }} />
                                        {renderTabPanel(activeTab)}
                                        <Box mt={2}>
                                            <Button 
                                                fullWidth 
                                                variant="outlined" 
                                                color="primary"
                                                onClick={() => setShowTrendDetails(false)}
                                                sx={{ mt: 1, borderRadius: 2 }}
                                            >
                                                Hide Trends
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Box>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    sx={{ mt: 6 }}
                >
                    <Alert 
                        onClose={() => setSnackbar({ ...snackbar, open: false })} 
                        severity={snackbar.severity} 
                        variant="filled"
                        sx={{
                            boxShadow: 3,
                            borderRadius: 2,
                            width: '100%',
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
                {/* Render detailed dialogs */}
                {renderScoreDistributionDialog()}
                {renderAnswerBreakdownDialog()}
            </Box>
        </FullLayout>
    );
};

export default Dashboard;
