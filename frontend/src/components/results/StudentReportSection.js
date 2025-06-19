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
  // This component is intentionally left blank as requested.
  return null;
};

 

export default StudentReportSection;
