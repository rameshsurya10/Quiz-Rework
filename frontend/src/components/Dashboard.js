import React, { useState, useEffect } from 'react';
import { 
  Alert, Grid, FormControl, InputLabel, MenuItem, Select, Snackbar, 
  Skeleton, useTheme, Button, Typography, Paper, Box, 
  Card, CardContent, Divider, alpha, Tabs, Tab, useMediaQuery
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
    const [isAdvancedView, setIsAdvancedView] = useState(true);
    const [showTrendDetails, setShowTrendDetails] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { read } = apiService.useCRUD();
    
    // Don't use Router hooks directly to avoid context errors

    // Sample trend data
    const [trendData] = useState({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        scores: generateTrendData(7, 60, 95),
        participants: generateTrendData(7, 50, 200),
        duration: generateTrendData(7, 5, 30)
    });

    // Chart options for better readability
    const chartOptions = {
        responsive: true,
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
                    showMessage('Failed to load dashboard data', 'error');
                }
            );
            
            console.log('Dashboard data received:', dashboardData);
            
            if (dashboardData) {
                setData(dashboardData);
                showMessage('Dashboard data loaded successfully', 'success');
            } else {
                showMessage('No data available', 'info');
            }
        } catch (error) {
            console.error('Error in refresh:', error);
            showMessage('Error loading dashboard data', 'error');
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

    const formatTime = (seconds) => {
        if (!seconds) return '0s';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

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
                <Typography variant="caption" color="textSecondary">vs last month</Typography>
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
            <Grid container spacing={3.5}>
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
            <Grid container spacing={3.5} mt={3}>
                <Grid item xs={12}>
                    <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                </Grid>
            </Grid>

            {/* Chart sections */}
            <Grid container spacing={3.5} mt={3}>
                <Grid item xs={12} md={6}>
                    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <Skeleton variant="rectangular" height={350} sx={{ borderRadius: 2 }} />
                </Grid>
            </Grid>
        </Paper>
    );

    // Render tab panel for trend charts
    const renderTabPanel = (index) => {
        const height = isMobile ? '250px' : '300px';
        return (
            <Box sx={{ p: 2, height: '100%' }}>
                {activeTab === 0 && (
                    <Box sx={{ height }}>
                        <Line data={getChartData('scores', trendData, theme)} options={chartOptions} />
                    </Box>
                )}
                {activeTab === 1 && (
                    <Box sx={{ height }}>
                        <Bar data={getChartData('participants', trendData, theme)} options={{
                            ...chartOptions,
                            plugins: {
                                ...chartOptions.plugins,
                                legend: { display: false }
                            }
                        }} />
                    </Box>
                )}
                {activeTab === 2 && (
                    <Box sx={{ height }}>
                        <Line data={getChartData('duration', trendData, theme)} options={chartOptions} />
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
                        <Box display="flex" gap={{ xs: 1, sm: 2 }} flexWrap="wrap">
                            {isAdvancedView && (
                                <Button 
                                    onClick={() => setShowTrendDetails(!showTrendDetails)}
                                    variant={showTrendDetails ? "contained" : "outlined"}
                                    color="primary"
                                    startIcon={<ShowChartIcon />}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{
                                        borderRadius: '12px',
                                        textTransform: 'none',
                                        px: { xs: 2, sm: 3 },
                                        fontWeight: 600,
                                        letterSpacing: 0.5,
                                        whiteSpace: 'nowrap',
                                        minWidth: 'auto',
                                        '& .MuiButton-startIcon': {
                                            mr: { xs: 0.5, sm: 1 }
                                        }
                                    }}
                                >
                                    {isMobile ? (showTrendDetails ? 'Hide' : 'Trends') : (showTrendDetails ? 'Hide Trends' : 'Show Trends')}
                                </Button>
                            )}
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
                                'Total Quizzes', 
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
                                <CardContent>
                                    <Grid container spacing={3} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <PerformanceGaugeCard 
                                                title="Performance Score"
                                                averageScore={data.average_score || 0}
                                                secondaryText={`Based on ${str(data.participants) || 0} participants`}
                                                height={250}
                                            />
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
                                                                <Typography variant="body2" color="text.secondary">Correct</Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="error.main" fontWeight="bold">
                                                                    {str(data.wrong_answers || 0)}%
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">Wrong</Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="warning.main" fontWeight="bold">
                                                                    {str(data.unanswered_questions || 0)}%
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">Unanswered</Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={6} sm={3}>
                                                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                                                                <Typography variant="h4" color="info.main" fontWeight="bold">
                                                                    {formatTime(data.average_duration || 0)}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">Avg. Time</Typography>
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>

                            {/* Additional Stats */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                                                Score Distribution
                                            </Typography>
                                            <Box sx={{ height: 250, mt: 2 }}>
                                                <QuizMetricsBarChart 
                                                    averageScore={data.average_score}
                                                    highestScore={data.greatest_score}
                                                    lowestScore={data.least_score}
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'medium' }}>
                                                Answer Breakdown
                                            </Typography>
                                            <Box sx={{ height: 250, mt: 2 }}>
                                                <QuizAnswerDonutChart 
                                                    rightAnswers={data.right_answers}
                                                    wrongAnswers={data.wrong_answers}
                                                    unansweredQuestions={data.unanswered_questions}
                                                />
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>

                        {/* Right Side - Trends Panel (Conditional) */}
                        {showTrendDetails && (
                            <Grid item xs={12} lg={4}>
                                <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                                    <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                                Performance Trends
                                            </Typography>
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
            </Box>
        </FullLayout>
    );
};

export default Dashboard;
