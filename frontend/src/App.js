import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import theme from './theme';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TeacherSection from './components/teachers/TeacherSection';
import StudentSection from './components/students/StudentSection';
import QuizSection from './components/quizzes/QuizSection';
import ResultsSection from './components/results/ResultsSection';
import ProfilePage from './components/profile/ProfilePage';
import SettingsPage from './components/settings/SettingsPage';
import DepartmentSection from './departments/DepartmentSection';
import FullLayout from './components/FullLayout';
import { SnackbarProvider } from './contexts/SnackbarContext';
import apiService from './api';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const authenticated = apiService.isAuthenticated();
  
  if (!authenticated) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  // Authenticated, render the child component
  return children;
};

function App() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate checking auth status or loading necessary resources
    const checkAuthAndLoadResources = async () => {
      try {
        // Add any initial data loading here if needed
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
      } catch (error) {
        console.error("Error during app initialization:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndLoadResources();
  }, []);
  
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: theme.palette.background.default
        }}>
          <CircularProgress size={60} thickness={4} />
          <Box sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
            Loading application...
          </Box>
        </Box>
      </ThemeProvider>
    );
  }
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/teachers" element={
            <ProtectedRoute>
              <FullLayout>
                <TeacherSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/teachers/add" element={
            <ProtectedRoute>
              <FullLayout>
                <TeacherSection initialOpenDialog={true} />
              </FullLayout>
            </ProtectedRoute>
          } />
          
          {/* Student Routes */}
          <Route path="/students" element={
            <ProtectedRoute>
              <FullLayout>
                <StudentSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/students/add" element={
            <ProtectedRoute>
              <FullLayout>
                <StudentSection initialOpenDialog={true} />
              </FullLayout>
            </ProtectedRoute>
          } />

          {/* Quiz Management Route */}
          <Route path="/quizzes" element={
            <ProtectedRoute>
              <QuizSection />
            </ProtectedRoute>
          } />

          {/* Results Route */}
          <Route path="/results" element={
            <ProtectedRoute>
              <ResultsSection />
            </ProtectedRoute>
          } />

          {/* Profile Page Route - Handles both profile and user management */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }>
            <Route path="users" element={
              <ProtectedRoute>
                <ProfilePage initialTab={1} />
              </ProtectedRoute>
            } />
          </Route>

          {/* Settings Page Route */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />

          {/* Department Management Route */}
          <Route path="/departments" element={
            <ProtectedRoute>
              <FullLayout>
                <DepartmentSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          
          {/* Redirect root to dashboard if authenticated, otherwise to login */}
          <Route path="/" element={
            apiService.isAuthenticated() ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } />
          
          {/* Catch all - redirect to dashboard if authenticated, otherwise to login */}
          <Route path="*" element={
            apiService.isAuthenticated() ? 
              <Navigate to="/dashboard" replace /> : 
              <Navigate to="/login" replace />
          } />
        </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
