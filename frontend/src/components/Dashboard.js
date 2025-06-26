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
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import apiService from "../services/api";
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
            csvRows.push(['Total Teachers', data.totalTeachers || "0"]);
            csvRows.push(['Total Students', data.totalStudents || "0"]);
            csvRows.push(['Total Quizzes', data.totalQuizzes || "0"]);
            csvRows.push(['Active Participants', data.activeParticipants || "0"]);
            csvRows.push([""]);
            
            // Add performance metrics
            csvRows.push(['Performance Metrics']);
            csvRows.push(['Average Score', `${data.averagePerformance || 0}%`]);
            csvRows.push(['Correct Answers', `${data.correctAnswers || 0}%`]);
            csvRows.push(['Wrong Answers', `${data.wrongAnswers || 0}%`]);
            csvRows.push(['Unanswered', `${data.unansweredQuestions || 0}%`]);
            csvRows.push(['Average Duration', formatTime(data.totalQuestions || 0)]);
            
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
            console.log('Fetching admin dashboard data...');
            
            // Corrected API call to match backend URL pattern
            const response = await apiService.get('/api/dashboard/');
            const dashboardData = response.data;
            
            console.log('Dashboard data received:', dashboardData);

            if (dashboardData) {
                // Map backend data to frontend state structure
                const mappedData = {
                    // Basic counts
                    totalTeachers: dashboardData.teachers || 0,
                    totalStudents: dashboardData.students || 0,
                    totalQuizzes: dashboardData.quizzes || 0,
                    totalDepartments: dashboardData.departments || 0,
                    activeParticipants: dashboardData.total_students_attempted || 0,
                    
                    // Performance metrics - calculate percentages
                    totalAttempts: dashboardData.total_quiz_attempts || 0,
                    totalQuestions: dashboardData.questions || 0,
                    
                    // Calculate percentages for answer distribution
                    correctAnswers: (() => {
                        const total = dashboardData.overall_correct_answers + dashboardData.overall_wrong_answers + dashboardData.overall_unanswered;
                        return total > 0 ? Math.round((dashboardData.overall_correct_answers / total) * 100) : 0;
                    })(),
                    wrongAnswers: (() => {
                        const total = dashboardData.overall_correct_answers + dashboardData.overall_wrong_answers + dashboardData.overall_unanswered;
                        return total > 0 ? Math.round((dashboardData.overall_wrong_answers / total) * 100) : 0;
                    })(),
                    unansweredQuestions: (() => {
                        const total = dashboardData.overall_correct_answers + dashboardData.overall_wrong_answers + dashboardData.overall_unanswered;
                        return total > 0 ? Math.round((dashboardData.overall_unanswered / total) * 100) : 0;
                    })(),
                    
                    averagePerformance: Math.round(dashboardData.overall_quiz_average_percentage || 0),
                    
                    // Score insights - extract percentage values from score objects
                    highScore: dashboardData.high_score ? Math.round(dashboardData.high_score.percentage) : 0,
                    lowScore: dashboardData.low_score ? Math.round(dashboardData.low_score.percentage) : 0,
                    
                    // Performance distribution - convert counts to percentages
                    performanceDistribution: (() => {
                        const dist = dashboardData.performance_distribution || { excellent: 0, good: 0, average: 0, poor: 0 };
                        const totalAttempts = dist.excellent + dist.good + dist.average + dist.poor;
                        if (totalAttempts === 0) return { excellent: 0, good: 0, average: 0, poor: 0 };
                        
                        return {
                            excellent: Math.round((dist.excellent / totalAttempts) * 100),
                            good: Math.round((dist.good / totalAttempts) * 100),
                            average: Math.round((dist.average / totalAttempts) * 100),
                            poor: Math.round((dist.poor / totalAttempts) * 100)
                        };
                    })(),
                    
                    // Department performance
                    departmentPerformance: dashboardData.department_wise_performance || {},
                    
                    // Additional calculated metrics
                    participationRate: dashboardData.students > 0 
                        ? ((dashboardData.total_students_attempted / dashboardData.students) * 100).toFixed(1)
                        : 0
                };
                
                console.log('Mapped dashboard data:', mappedData);
                setData(mappedData);
                showMessage('Dashboard data loaded successfully.', 'success');
            } else {
                showMessage('No dashboard data available yet.', 'info');
            }
        } catch (error) {
            console.error('Error in refresh:', error);
            const errorMessage = error.response?.data?.detail || 'An error occurred while loading dashboard data.';
            showMessage(errorMessage, 'error');
            setData({});
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
    }, []); // Removed search from dependency array to prevent re-fetch on filter change

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
                        averageScore={data.averagePerformance}
                        highestScore={data.highScore}
                        lowestScore={data.lowScore}
                    />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Highest Score</Typography>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                {data.highScore || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                Achieved by {data.highest_score_student || 'Advanced Student'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                                                        Quiz: {data.highest_score_quiz || 'N/A'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Average Score</Typography>
                            <Typography variant="h4" color="primary.main" fontWeight="bold">
                                {data.averagePerformance || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                Based on {data.activeParticipants || 0} participants
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {data.averagePerformance > 70 ? 'Good overall performance' : 'Needs improvement'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Lowest Score</Typography>
                            <Typography variant="h4" color="error.main" fontWeight="bold">
                                {data.lowScore || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                                                        Quiz: {data.lowest_score_quiz || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {data.lowScore < 40 ? 'Significant attention required' : 'Review recommended'}
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
                                    {data.performanceDistribution.excellent || '18'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Excellent<br/>(90-100%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="success.main">
                                    {data.performanceDistribution.good || '42'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Good<br/>(70-89%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="warning.main">
                                    {data.performanceDistribution.average || '25'}%
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Average<br/>(50-69%)</Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="medium" color="error.main">
                                    {data.performanceDistribution.poor || '15'}%
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
                        rightAnswers={data.correctAnswers}
                        wrongAnswers={data.wrongAnswers}
                        unansweredQuestions={data.unansweredQuestions}
                    />
                </Box>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>Correct Answers</Typography>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                {data.correctAnswers || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions answered correctly
                            </Typography>
                            {data.correctAnswers > 70 ? (
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
                                {data.wrongAnswers || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions answered incorrectly
                            </Typography>
                            {data.wrongAnswers < 20 ? (
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
                                {data.unansweredQuestions || 0}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                                Questions left unanswered
                            </Typography>
                            {data.unansweredQuestions < 10 ? (
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
                                                                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.strongest_topic || 'No data'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.success.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                                                                    width: `${data.strongest_topic_percentage || 0}%`,
                                                bgcolor: theme.palette.success.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                                                                    <Typography variant="body2">{data.strongest_topic_percentage || 0}%</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.second_strongest_topic || 'No data'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.success.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                                                                    width: `${data.second_strongest_topic_percentage || 0}%`,
                                                bgcolor: theme.palette.success.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                                                                    <Typography variant="body2">{data.second_strongest_topic_percentage || 0}%</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.background.paper, 0.5), borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>Improvement Areas</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.weakest_topic || 'No data'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.error.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                                                                    width: `${data.weakest_topic_percentage || 0}%`,
                                                bgcolor: theme.palette.error.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                                                                    <Typography variant="body2">{data.weakest_topic_percentage || 0}%</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                                                    <Typography variant="body2" sx={{ minWidth: 120 }}>{data.second_weakest_topic || 'No data'}</Typography>
                                    <Box sx={{ flexGrow: 1, mx: 1 }}>
                                        <Box sx={{ height: 8, bgcolor: alpha(theme.palette.error.main, 0.2), borderRadius: 1, position: 'relative' }}>
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                left: 0, 
                                                top: 0, 
                                                height: '100%', 
                                                                                                    width: `${data.second_weakest_topic_percentage || 0}%`,
                                                bgcolor: theme.palette.error.main,
                                                borderRadius: 1 
                                            }} />
                                        </Box>
                                    </Box>
                                                                                    <Typography variant="body2">{data.second_weakest_topic_percentage || 0}%</Typography>
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
                minHeight: '100vh',
                padding: { xs: 1, sm: 2, md: 3 },
                overflow: 'auto'
            }}>
                <Box maxWidth="1600px" mx="auto">
                    {/* Header with Title and Actions */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={{ xs: 2, sm: 3, md: 4 }} sx={{ 
                        background: theme.custom?.glassmorphism 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : theme.palette.background.paper,
                        backdropFilter: theme.custom?.glassmorphism ? 'blur(20px)' : 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                        p: { xs: 2, sm: 2.5, md: 3 },
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: theme.custom?.highContrast 
                            ? `2px 2px 0px ${theme.palette.text.primary}`
                            : theme.shadows[2],
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 2, sm: 0 },
                        '&::before': theme.custom?.glassmorphism ? {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                            pointerEvents: 'none',
                        } : {},
                    }}>
                        <Box sx={{ position: 'relative', zIndex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                            <Typography variant="h4" component="h1" sx={{ 
                                fontWeight: 700,
                                background: theme.custom?.highContrast 
                                    ? 'none'
                                    : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
                                backgroundClip: theme.custom?.highContrast ? 'none' : 'text',
                                WebkitBackgroundClip: theme.custom?.highContrast ? 'none' : 'text',
                                WebkitTextFillColor: theme.custom?.highContrast ? theme.palette.text.primary : 'transparent',
                                color: theme.custom?.highContrast ? theme.palette.text.primary : 'inherit',
                                mb: 0.5,
                                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
                            }}>
                                Dashboard Overview
                            </Typography>
                            <Typography variant="body2" sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: { xs: '0.8rem', sm: '0.9rem' }
                            }}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </Typography>
                        </Box>
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Button 
                                onClick={() => {
                                    const newIsAdvancedView = !isAdvancedView;
                                    setIsAdvancedView(newIsAdvancedView);
                                    if (!newIsAdvancedView) {
                                        setShowTrendDetails(false);
                                    }
                                }}
                                variant={isAdvancedView ? "outlined" : "contained"}
                                startIcon={<StyleIcon />}
                                size={isMobile ? "small" : "medium"}
                                sx={{
                                    borderRadius: theme.shape.borderRadius,
                                    textTransform: 'none',
                                    px: { xs: 2, sm: 3 },
                                    py: { xs: 1, sm: 1.5 },
                                    fontWeight: 600,
                                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                                    background: isAdvancedView 
                                        ? 'transparent' 
                                        : theme.custom?.glassmorphism
                                            ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                                            : theme.palette.primary.main,
                                    border: isAdvancedView ? `1px solid ${theme.palette.primary.main}` : 'none',
                                    color: isAdvancedView ? theme.palette.primary.main : theme.palette.primary.contrastText,
                                    backdropFilter: theme.custom?.glassmorphism ? 'blur(10px)' : 'none',
                                    boxShadow: theme.custom?.highContrast 
                                        ? 'none'
                                        : isAdvancedView 
                                            ? 'none' 
                                            : `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    whiteSpace: 'nowrap',
                                    minWidth: 'auto',
                                    width: { xs: '100%', sm: 'auto' },
                                    '&:hover': {
                                        background: isAdvancedView 
                                            ? alpha(theme.palette.primary.main, 0.1)
                                            : theme.custom?.glassmorphism
                                                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`
                                                : theme.palette.primary.dark,
                                        transform: theme.custom?.highContrast ? 'none' : 'translateY(-2px)',
                                        boxShadow: theme.custom?.highContrast 
                                            ? 'none'
                                            : isAdvancedView 
                                                ? 'none' 
                                                : `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    },
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
                    <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
                        {[
                            { title: 'Total Teachers', icon: TeacherIcon, value: data.totalTeachers || '0', change: '+12.5%', color: theme.palette.primary.main },
                            { title: 'Total Students', icon: StudentIcon, value: data.totalStudents || '0', change: '+8.3%', color: theme.palette.secondary.main },
                            { title: 'Total Quiz', icon: QuizIcon, value: data.totalQuizzes || '0', change: '+5.7%', color: theme.palette.accent?.main || theme.palette.error.main },
                            { title: 'Active Participants', icon: PersonIcon, value: data.activeParticipants || '0', change: '+15.2%', color: theme.palette.primary.main }
                        ].map((stat, index) => (
                            <Grid item xs={6} sm={6} md={3} key={stat.title}>
                                <Card sx={{
                                    background: theme.custom?.glassmorphism 
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : theme.palette.background.paper,
                                    backdropFilter: theme.custom?.glassmorphism ? 'blur(20px)' : 'none',
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: theme.custom?.appearance === 'royal' ? '16px' : theme.custom?.appearance === 'classic' ? '8px' : '12px',
                                    height: '140px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s ease',
                                    boxShadow: theme.custom?.highContrast 
                                        ? `1px 1px 0px ${theme.palette.text.primary}`
                                        : theme.shadows[1],
                                    '&:hover': {
                                        transform: theme.custom?.highContrast ? 'none' : 'translateY(-4px)',
                                        background: theme.custom?.glassmorphism 
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : alpha(theme.palette.background.paper, 0.9),
                                        boxShadow: theme.custom?.highContrast 
                                            ? `2px 2px 0px ${theme.palette.text.primary}`
                                            : `0 8px 24px ${alpha(stat.color, 0.2)}`
                                    },
                                    '&::before': theme.custom?.glassmorphism && !theme.custom?.highContrast ? {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: `linear-gradient(135deg, ${alpha(stat.color, 0.08)} 0%, transparent 50%)`,
                                        pointerEvents: 'none',
                                    } : {},
                                }}>
                                    <CardContent sx={{ 
                                        p: { xs: 2, sm: 3 },
                                        height: '100%', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        justifyContent: 'space-between',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                            <Typography variant="subtitle2" sx={{ 
                                                color: theme.palette.text.secondary,
                                                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                                                fontWeight: 500,
                                                lineHeight: 1.2
                                            }}>
                                                {stat.title}
                                            </Typography>
                                            <stat.icon sx={{ color: stat.color, fontSize: { xs: '20px', sm: '24px' } }} />
                                        </Box>
                                        <Typography variant="h3" sx={{ 
                                            color: theme.palette.text.primary,
                                            fontWeight: 700,
                                            fontSize: { xs: '1.5rem', sm: '2rem' },
                                            textAlign: 'center',
                                            my: 1
                                        }}>
                                            {stat.value}
                                        </Typography>
                                        <Typography variant="caption" sx={{ 
                                            color: theme.palette.success?.main || theme.palette.primary.main,
                                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                            textAlign: 'center',
                                            fontWeight: 500
                                        }}>
                                            {stat.change} from last month
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Main Content Area */}
                    <Grid container spacing={3}>
                        {/* Left Side - Main Content */}
                        <Grid item xs={12} lg={showTrendDetails ? 8 : 12}>
                            {/* Performance Overview */}
                            <Card sx={{
                                background: theme.custom?.glassmorphism 
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : theme.palette.background.paper,
                                backdropFilter: theme.custom?.glassmorphism ? 'blur(20px)' : 'none',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: theme.custom?.appearance === 'royal' ? '16px' : theme.custom?.appearance === 'classic' ? '8px' : '12px',
                                mb: 4,
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: theme.custom?.highContrast 
                                    ? `1px 1px 0px ${theme.palette.text.primary}`
                                    : theme.shadows[1],
                                '&::before': theme.custom?.glassmorphism && !theme.custom?.highContrast ? {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.03)} 100%)`,
                                    pointerEvents: 'none',
                                } : {},
                            }}>
                                <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
                                    <Typography variant="h5" sx={{ 
                                        mb: 3, 
                                        fontWeight: 600,
                                        color: theme.palette.text.primary,
                                        fontSize: { xs: '1.3rem', sm: '1.5rem' },
                                        fontFamily: theme.custom?.appearance === 'royal' ? '"Playfair Display", serif' : 'inherit',
                                    }}>
                                        Performance Overview
                                    </Typography>
                                    
                                    {/* Main Performance Score - Speedometer Chart */}
                                    <Box sx={{ 
                                        textAlign: 'center',
                                        mb: 4,
                                        py: 2
                                    }}>
                                        <PerformanceGaugeCard 
                                            averageScore={data.averagePerformance || 0}
                                            secondaryText={`Based on ${data.activeParticipants || 0} participants`}
                                            height={180}
                                        />
                                    </Box>

                                    <Typography variant="h6" sx={{ 
                                        mb: 3, 
                                        textAlign: 'center',
                                        color: theme.palette.text.primary,
                                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                        fontWeight: 600
                                    }}>
                                        Performance Metrics
                                    </Typography>

                                    {/* Performance Stats Grid */}
                                    <Grid container spacing={2} justifyContent="center">
                                        {[
                                            { label: 'Correct', value: data.correctAnswers || '0%', color: theme.palette.success?.main || '#4caf50' },
                                            { label: 'Wrong', value: data.wrongAnswers || '0%', color: theme.palette.error.main },
                                            { label: 'Unanswered', value: data.unansweredQuestions || '0%', color: theme.palette.warning?.main || '#ff9800' },
                                            { label: 'Avg. Time', value: formatTime(data.totalQuestions || 0), color: theme.palette.info?.main || '#2196f3' }
                                        ].map((metric, index) => (
                                            <Grid item xs={6} sm={3} key={index}>
                                                <Card variant="outlined" sx={{
                                                    background: theme.custom?.highContrast 
                                                        ? 'transparent'
                                                        : alpha(metric.color, 0.08),
                                                    borderColor: theme.custom?.highContrast 
                                                        ? metric.color
                                                        : alpha(metric.color, 0.2),
                                                    borderWidth: theme.custom?.highContrast ? 2 : 1,
                                                    borderRadius: theme.custom?.appearance === 'royal' ? '12px' : theme.custom?.appearance === 'classic' ? '6px' : '8px',
                                                    textAlign: 'center',
                                                    transition: 'all 0.3s ease',
                                                    height: '100px',
                                                    '&:hover': {
                                                        transform: theme.custom?.highContrast ? 'none' : 'translateY(-2px)',
                                                        boxShadow: theme.custom?.highContrast 
                                                            ? 'none'
                                                            : `0 8px 20px ${alpha(metric.color, 0.2)}`
                                                    }
                                                }}>
                                                    <CardContent sx={{ 
                                                        p: 2,
                                                        height: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}>
                                                        <Typography variant="h4" sx={{ 
                                                            color: metric.color,
                                                            fontWeight: 700,
                                                            mb: 1,
                                                            fontSize: { xs: '1.3rem', sm: '1.5rem' }
                                                        }}>
                                                            {metric.value}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ 
                                                            color: theme.palette.text.secondary,
                                                            fontWeight: 500,
                                                            fontSize: { xs: '0.7rem', sm: '0.8rem' }
                                                        }}>
                                                            {metric.label}
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
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
                                                    averageScore={data.averagePerformance}
                                                    highestScore={data.highScore}
                                                    lowestScore={data.lowScore}
                                                    options={{ animation: { duration: 1200, easing: 'easeInOutQuint' } }}
                                                />
                                            </Box>
                                            {isAdvancedView && (
                                                <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.background.default, 0.5), borderRadius: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>Score Distribution Details</Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Average</Typography>
                                                            <Typography variant="h6" fontWeight="bold">{data.averagePerformance}%</Typography>
                                                        </Grid>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Highest</Typography>
                                                            <Typography variant="h6" fontWeight="bold" color="success.main">{data.highScore}%</Typography>
                                                        </Grid>
                                                        <Grid item xs={4} textAlign="center">
                                                            <Typography variant="caption" color="textSecondary">Lowest</Typography>
                                                            <Typography variant="h6" fontWeight="bold" color="error.main">{data.lowScore}%</Typography>
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
                                                    rightAnswers={data.correctAnswers}
                                                    wrongAnswers={data.wrongAnswers}
                                                    unansweredQuestions={data.unansweredQuestions}
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
                                                                    {data.strongest_topic || 'No data available'}
                                                                </Typography>
                                                                <Typography variant="caption" color="success.main">
                                                                    {data.strongest_topic_percentage || 0}% correct rate
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="caption" color="textSecondary" display="block">Most Incorrect Topic</Typography>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {data.weakest_topic || 'No data available'}
                                                                </Typography>
                                                                <Typography variant="caption" color="error.main">
                                                                    {data.weakest_topic_percentage || 0}% correct rate
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
