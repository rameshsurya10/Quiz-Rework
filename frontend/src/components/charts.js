import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

// Performance Gauge Card component for displaying scores with a gauge visualization
export const PerformanceGaugeCard = ({ averageScore = 0, secondaryText, height = 250 }) => {
  const theme = useTheme();
  const score = parseFloat(averageScore) || 0;
  
  // Chart options and styling
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    }
  };

  // Data for the gauge chart
  const data = {
    labels: ['Score', 'Remaining'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [
          score < 30 ? theme.palette.error.main :
            score < 70 ? theme.palette.warning.main :
              theme.palette.success.main,
          alpha(theme.palette.grey[300], 0.2)
        ],
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };

  // Calculate color based on score
  const getScoreColor = () => {
    if (score < 30) return theme.palette.error.main;
    if (score < 70) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Box sx={{ position: 'relative', height: height, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Doughnut data={data} options={options} />
      <Box sx={{ 
        position: 'absolute', 
        top: '55%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <Box sx={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold',
          color: getScoreColor(),
        }}>
          {score}%
        </Box>
        <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: -1 }}>
          {secondaryText}
        </Box>
      </Box>
    </Box>
  );
};

// Donut chart for quiz answer breakdown
export const QuizAnswerDonutChart = ({ rightAnswers = 0, wrongAnswers = 0, unansweredQuestions = 0 }) => {
  const theme = useTheme();
  
  // Ensure values are numbers
  const right = parseFloat(rightAnswers) || 0;
  const wrong = parseFloat(wrongAnswers) || 0;
  const unanswered = parseFloat(unansweredQuestions) || 0;
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          boxWidth: 12
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return ` ${context.label}: ${context.raw}%`;
          }
        }
      }
    },
    cutout: '65%',
  };

  // Chart data
  const data = {
    labels: ['Correct', 'Wrong', 'Unanswered'],
    datasets: [
      {
        data: [right, wrong, unanswered],
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.error.main,
          theme.palette.warning.main
        ],
        borderWidth: 0,
        hoverOffset: 15
      }
    ]
  };

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </Box>
  );
};

// Bar chart for quiz metrics comparison
export const QuizMetricsBarChart = ({ averageScore = 0, highestScore = 0, lowestScore = 0 }) => {
  const theme = useTheme();
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return ` ${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        },
        grid: {
          color: alpha(theme.palette.text.primary, 0.05)
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    barThickness: 40,
    maxBarThickness: 60
  };

  // Chart data
  const data = {
    labels: ['Average', 'Highest', 'Lowest'],
    datasets: [
      {
        label: 'Score',
        data: [
          parseFloat(averageScore) || 0,
          parseFloat(highestScore) || 0,
          parseFloat(lowestScore) || 0
        ],
        backgroundColor: [
          theme.palette.info.main,
          theme.palette.success.main,
          theme.palette.error.main
        ],
        borderRadius: 4
      }
    ]
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Bar data={data} options={options} />
    </Box>
  );
};

// Line chart for trend data
export const TrendLineChart = ({ labels, data, label, color }) => {
  const theme = useTheme();
  
  // Chart options
  const options = {
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

  // Chart data
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: color || theme.palette.primary.main,
        backgroundColor: alpha(color || theme.palette.primary.main, 0.1),
        tension: 0.4,
        fill: true,
      }
    ]
  };

  return (
    <Box sx={{ height: '100%' }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

// Generate sample trend data (helper function)
export const generateTrendData = (count, min, max) => {
  return Array.from({ length: count }, () => 
    Math.floor(Math.random() * (max - min + 1)) + min
  );
};

// Helper function to get chart data for trends
export const getChartData = (type, trendData, theme) => {
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;
  const successColor = theme.palette.success.main;
  
  switch(type) {
    case 'scores':
      return {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Average Score (%)',
            data: trendData.scores,
            borderColor: primaryColor,
            backgroundColor: alpha(primaryColor, 0.1),
            tension: 0.4,
            fill: true,
            pointBackgroundColor: primaryColor,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: primaryColor,
          }
        ]
      };
    case 'participants':
      return {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Participants',
            data: trendData.participants,
            backgroundColor: [
              alpha(secondaryColor, 0.7),
              alpha(primaryColor, 0.7),
              alpha(successColor, 0.7),
              alpha(theme.palette.error.main, 0.7),
              alpha(theme.palette.warning.main, 0.7),
              alpha(theme.palette.info.main, 0.7),
              alpha(theme.palette.success.main, 0.7),
            ],
            borderWidth: 0,
          }
        ]
      };
    case 'duration':
      return {
        labels: trendData.labels,
        datasets: [
          {
            label: 'Average Duration (mins)',
            data: trendData.duration,
            borderColor: successColor,
            backgroundColor: alpha(successColor, 0.1),
            tension: 0.3,
            fill: true,
            borderDash: [5, 5],
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ]
      };
    default:
      return { labels: [], datasets: [] };
  }
};
