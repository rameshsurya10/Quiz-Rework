import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Skeleton,
  useTheme,
  Stack,
  Badge,
  Paper,
  Divider,
  Container
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Quiz as QuizIcon,
  Timeline as TimelineIcon,
  School as SchoolIcon,
  Download as DownloadIcon,
  Insights as InsightsIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  TrendingFlat as TrendingFlatIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { alpha, styled } from '@mui/material/styles';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Modern Styled Components

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  minHeight: 40,
  fontWeight: 600,
  fontSize: '0.875rem',
  padding: theme.spacing(1, 2),
  minWidth: 100,
  color: theme.palette.text.secondary,
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 700
  }
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  background: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  height: '100%'
}));

// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quiz-tabpanel-${index}`}
      aria-labelledby={`quiz-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Memoized chart components for better performance
const MemoizedBarChart = memo(({ data, theme }) => {
  // Filter out ranges with zero counts
  const filteredData = data.filter(item => item.count > 0);
  
  return (
    <Box sx={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={filteredData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid vertical={false} stroke={theme.palette.divider} strokeDasharray="3 3" />
          <XAxis 
            dataKey="range" 
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
          />
          <RechartsTooltip
            cursor={false}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px',
              padding: '8px'
            }}
            formatter={(value) => [`${value} students`, 'Count']}
            labelFormatter={(label) => `Score Range: ${label}%`}
          />
          <Bar 
            dataKey="count" 
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
            fill={theme.palette.primary.main}
          >
            {filteredData.map((entry, index) => {
              const maxCount = Math.max(...filteredData.map(d => d.count));
              const opacity = Math.max(0.4, entry.count / maxCount);
              return (
                <Cell 
                  key={`cell-${index}`}
                  fill={alpha(theme.palette.primary.main, opacity)}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
});

const MemoizedPieChart = memo(({ data, theme }) => {
  // Filter out entries with zero values
  const filteredData = data.filter(item => item.value > 0);
  
  return (
    <Box sx={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px',
              padding: '8px'
            }}
            formatter={(value, name) => [`${value} students`, name]}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span style={{ color: theme.palette.text.primary, fontSize: '12px' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
});

const MemoizedActivityChart = memo(({ data, theme }) => (
  <Box sx={{ width: '100%', height: 250 }}>
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.palette.divider} strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <RechartsTooltip
          cursor={{ stroke: theme.palette.secondary.main, strokeWidth: 1, strokeDasharray: "4 4" }}
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '4px',
            padding: '8px'
          }}
          formatter={(value) => [`${value} attempts`, 'Activity']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="attempts"
          stroke={theme.palette.secondary.main}
          strokeWidth={2}
          fill="url(#activityGradient)"
          dot={{
            r: 3,
            fill: theme.palette.background.paper,
            stroke: theme.palette.secondary.main,
            strokeWidth: 2
          }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </Box>
));

const QuizDetailsContent = ({ quizData, quizId, onNavigateToQuiz }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [studentData, setStudentData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoize chart data calculations
  const chartData = useMemo(() => {
    if (!reportData) return null;
    return {
      scoreDistribution: reportData.score_distribution,
      gradeDistribution: reportData.grade_distribution,
      activityData: reportData.activity_over_time
    };
  }, [reportData]);

  useEffect(() => {
    const fetchDetailedData = async () => {
      try {
        setLoading(true);
        
        const attemptsResponse = await axios.get(`${API_BASE_URL}/api/students/quiz_attempts/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        const allAttempts = attemptsResponse.data;
        const quizAttempts = allAttempts.filter(attempt => attempt.quiz_id === quizId);
        
        if (quizAttempts.length > 0) {
          const totalAttempts = quizAttempts.length;
          const averageScore = quizAttempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0) / totalAttempts;
          const passedAttempts = quizAttempts.filter(attempt => attempt.result === 'pass').length;
          const passRate = (passedAttempts / totalAttempts) * 100;
          
          const scoreDistribution = {};
          for (let i = 0; i < 100; i += 10) {
            const range = `${i}-${i + 9}`;
            scoreDistribution[range] = quizAttempts.filter(attempt => 
              attempt.percentage >= i && attempt.percentage < i + 10
            ).length;
          }
          
          const scoreDistributionChart = Object.entries(scoreDistribution).map(([range, count]) => ({
            range,
            count,
            fill: count > 0 ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3)
          }));

          // Activity over time data - group attempts by date
          const activityByDate = {};
          quizAttempts.forEach(attempt => {
            const date = new Date(attempt.attempted_at).toLocaleDateString();
            activityByDate[date] = (activityByDate[date] || 0) + 1;
          });
          
          const activityData = Object.entries(activityByDate)
            .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
            .map(([date, attempts]) => ({
              date,
              attempts
            }));

          // Grade distribution for radial chart
          const gradeDistribution = [
            { name: 'A (90-100%)', value: quizAttempts.filter(a => a.percentage >= 90).length, fill: '#4CAF50' },
            { name: 'B (80-89%)', value: quizAttempts.filter(a => a.percentage >= 80 && a.percentage < 90).length, fill: '#8BC34A' },
            { name: 'C (70-79%)', value: quizAttempts.filter(a => a.percentage >= 70 && a.percentage < 80).length, fill: '#FFC107' },
            { name: 'D (60-69%)', value: quizAttempts.filter(a => a.percentage >= 60 && a.percentage < 70).length, fill: '#FF9800' },
            { name: 'F (<60%)', value: quizAttempts.filter(a => a.percentage < 60).length, fill: '#F44336' }
          ];
          
          setReportData({
            total_attempts: totalAttempts,
            average_score: averageScore,
            pass_rate: passRate,
            score_distribution: scoreDistributionChart,
            activity_over_time: activityData,
            grade_distribution: gradeDistribution,
            highest_score: Math.max(...quizAttempts.map(a => a.percentage || 0)),
            lowest_score: Math.min(...quizAttempts.map(a => a.percentage || 0))
          });
          
          const studentMap = new Map();
          quizAttempts.forEach(attempt => {
            const studentName = attempt.student_name || 'Unknown Student';
            if (!studentMap.has(studentName)) {
              studentMap.set(studentName, {
                id: studentName,
                name: studentName,
                attempts: 0,
                best_score: 0,
                passed: false,
                last_attempt: attempt.attempted_at,
                improvement: 0
              });
            }
            
            const student = studentMap.get(studentName);
            const firstScore = student.attempts === 0 ? attempt.percentage : student.best_score;
            student.attempts++;
            student.best_score = Math.max(student.best_score, attempt.percentage || 0);
            student.passed = attempt.result === 'pass';
            student.improvement = student.attempts > 1 ? student.best_score - firstScore : 0;
            
            if (new Date(attempt.attempted_at) > new Date(student.last_attempt)) {
              student.last_attempt = attempt.attempted_at;
            }
          });
          
          setStudentData(Array.from(studentMap.values()).sort((a, b) => b.best_score - a.best_score));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching detailed data:', error);
        setLoading(false);
      }
    };
    
    if (quizId) {
      fetchDetailedData();
    }
  }, [quizId, theme.palette.primary.main, theme.palette.divider]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Render optimized charts with memoization
  const renderCharts = useMemo(() => {
    if (!chartData) return null;
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Typography variant="h6" gutterBottom>
              Score Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {chartData.scoreDistribution?.filter(item => item.count > 0).length || 0} active ranges
            </Typography>
            <MemoizedBarChart data={chartData.scoreDistribution} theme={theme} />
          </ChartContainer>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartContainer>
            <Typography variant="h6" gutterBottom>
              Grade Distribution
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              {chartData.gradeDistribution?.filter(item => item.value > 0).length || 0} grade levels
            </Typography>
            <MemoizedPieChart data={chartData.gradeDistribution} theme={theme} />
          </ChartContainer>
                </Grid>
        <Grid item xs={12}>
          <ChartContainer>
            <Typography variant="h6" gutterBottom>
              Quiz Activity Trend
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Number of attempts over time
            </Typography>
            <MemoizedActivityChart data={chartData.activityData} theme={theme} />
          </ChartContainer>
        </Grid>
        </Grid>
      );
  }, [chartData, theme]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Grid container spacing={3}>
          {[1, 2].map((item) => (
            <Grid item xs={12} sm={6} key={item}>
              <Skeleton 
                variant="rectangular" 
                height={120} 
                sx={{ borderRadius: 2 }}
                animation="wave"
              />
            </Grid>
          ))}
        </Grid>
        <Skeleton 
          variant="rectangular" 
          height={300} 
          sx={{ mt: 3, borderRadius: 2 }}
          animation="wave"
        />
      </Container>
    );
  }

  // Render nothing if no data
  if (!reportData || !chartData) {
    return null;
  }

  const COLORS = [theme.palette.success.main, theme.palette.error.main];

  return (
    <Box sx={{ 
      background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
      minHeight: '100vh',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
        zIndex: 0
      }
    }}>
      <Box sx={{ position: 'relative', zIndex: 1 }}>

        {/* Enhanced Tabs */}
        <Box sx={{ 
          borderBottom: `2px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(20px)',
          px: { xs: 2, md: 4 }
        }}>
          <Container maxWidth="xl">
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': {
                  display: 'none'
                },
                '& .MuiTabs-flexContainer': {
                  gap: 2
                }
              }}
            >
              <StyledTab 
                label="Overview" 
                icon={<InsightsIcon />}
                iconPosition="start"
              />
              <StyledTab 
                label="Analytics" 
                icon={<AnalyticsIcon />}
                iconPosition="start"
              />
              <StyledTab 
                label="Performance" 
                icon={<SchoolIcon />}
                iconPosition="start"
              />
              <StyledTab 
                label="Actions" 
                icon={<TimelineIcon />}
                iconPosition="start"
              />
            </Tabs>
          </Container>
        </Box>

        {/* Enhanced Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <Container maxWidth="xl">
            <Grid container spacing={4}>
              {/* Performance Overview */}
              <Grid item xs={12} lg={8}>
                <ChartContainer>
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, mb: 1 }}>
                    Performance Trends
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Track student performance over time and identify improvement patterns
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData?.performance_over_time || []}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.2)} />
                        <XAxis 
                          dataKey="attempt" 
                          tick={{ fill: theme.palette.text.secondary }}
                          axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
                        />
                        <YAxis 
                          tick={{ fill: theme.palette.text.secondary }}
                          axisLine={{ stroke: alpha(theme.palette.divider, 0.3) }}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: 'none',
                            borderRadius: theme.spacing(2),
                            boxShadow: theme.shadows[8]
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke={theme.palette.primary.main}
                          strokeWidth={3}
                          fill="url(#colorScore)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </ChartContainer>
              </Grid>

              {/* Pass/Fail Distribution */}
              <Grid item xs={12} lg={4}>
                <ChartContainer>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                    Pass/Fail Ratio
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Overall success distribution
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Passed', value: quizData.passRate || 0 },
                            { name: 'Failed', value: 100 - (quizData.passRate || 0) }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={60}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </ChartContainer>
              </Grid>

              {/* Quiz Information */}
              <Grid item xs={12}>
                <ChartContainer>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                    Quiz Details
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: theme.palette.primary.main, mb: 1 }}>
                          {quizData.quizTitle}
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                          Quiz Title
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3 }}>
                        <Chip 
                          label={quizData.lastAttemptDate}
                          variant="outlined"
                          color="info"
                          icon={<ScheduleIcon />}
                          sx={{ fontSize: '1rem', py: 3, px: 2 }}
                        />
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                          Last Attempt
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 3 }}>
                        <Chip 
                          label={`${quizData.passRate || 0}%`}
                          color={quizData.passRate > 70 ? 'success' : quizData.passRate > 40 ? 'warning' : 'error'}
                          sx={{ fontSize: '1.2rem', py: 3, px: 3, fontWeight: 800 }}
                        />
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                          Success Rate
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </ChartContainer>
              </Grid>
            </Grid>
          </Container>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Container maxWidth="xl">
            {renderCharts}
          </Container>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Container maxWidth="xl">
            <ChartContainer>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, mb: 1 }}>
                Student Performance Leaderboard
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Top performing students with detailed metrics and improvement tracking
              </Typography>
              
              <Grid container spacing={3}>
                {studentData.slice(0, 12).map((student, index) => (
                  <Grid item xs={12} sm={6} md={4} key={student.id}>
                    <Box 
                      sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                        border: `2px solid ${alpha(student.passed ? theme.palette.success.main : theme.palette.error.main, 0.2)}`,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: `0 20px 40px ${alpha(student.passed ? theme.palette.success.main : theme.palette.error.main, 0.15)}`,
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '4px',
                          background: student.passed ? theme.palette.success.main : theme.palette.error.main,
                        }
                      }}
                    >
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Badge
                            badgeContent={index + 1}
                            color="primary"
                            sx={{
                              '& .MuiBadge-badge': {
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                minWidth: 28,
                                height: 28
                              }
                            }}
                          >
                            <Avatar 
                              sx={{ 
                                bgcolor: student.passed ? theme.palette.success.main : theme.palette.error.main,
                                width: 60,
                                height: 60,
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                border: `3px solid ${alpha(student.passed ? theme.palette.success.main : theme.palette.error.main, 0.3)}`
                              }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                          
                          <Chip
                            label={student.passed ? 'PASSED' : 'FAILED'}
                            color={student.passed ? 'success' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                          />
                        </Box>
                        
                        <Box>
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            {student.name}
                          </Typography>
                          
                          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Chip
                              label={`${student.best_score}%`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                            <Chip
                              label={`${student.attempts} attempts`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Stack>
                          
                          <LinearProgress
                            variant="determinate"
                            value={student.best_score}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              backgroundColor: alpha(theme.palette.divider, 0.2),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: student.passed 
                                  ? `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                                  : `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.light})`
                              }
                            }}
                          />
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Best Score: {student.best_score}%
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </ChartContainer>
          </Container>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Container maxWidth="lg">
            <ChartContainer>
              <Stack spacing={6} alignItems="center">
                <Box textAlign="center">
                  <Typography variant="h3" gutterBottom sx={{ fontWeight: 900, mb: 2 }}>
                    Quiz Management Center
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, lineHeight: 1.6 }}>
                    Take comprehensive action on this quiz with advanced management tools, detailed analytics export, and performance insights.
                  </Typography>
                </Box>
                
                <Grid container spacing={4} sx={{ maxWidth: 800 }}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<QuizIcon />}
                      onClick={onNavigateToQuiz}
                      fullWidth
                      sx={{ 
                        py: 3,
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 15px 35px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Manage Quiz Settings
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      size="large"
                      startIcon={<DownloadIcon />}
                      fullWidth
                      sx={{ 
                        py: 3,
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        borderWidth: 2,
                        '&:hover': {
                          borderWidth: 2,
                          transform: 'translateY(-4px)',
                          boxShadow: `0 15px 35px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Export Analytics Report
                    </Button>
                  </Grid>
                </Grid>

                <Divider sx={{ width: '100%', my: 4 }} />

                <Box textAlign="center">
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                    Quick Stats Summary
                  </Typography>
                  <Grid container spacing={4} sx={{ maxWidth: 600 }}>
                    <Grid item xs={4}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>
                        {quizData.attempts || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Attempts
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.success.main }}>
                        {quizData.averageScore || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Score
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: theme.palette.info.main }}>
                        {quizData.passRate || 0}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pass Rate
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </ChartContainer>
          </Container>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default QuizDetailsContent; 