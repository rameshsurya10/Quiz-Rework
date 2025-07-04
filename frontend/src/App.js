import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { CustomThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TeacherSection from './components/teachers/TeacherSection';
import StudentSection from './components/students/StudentSection';
import TeacherStudentSection from './components/students/TeacherStudentSection';
import QuizSection from './components/quiz/QuizSection';
import TeacherQuizSection from './components/quiz/TeacherQuizSection';
import ResultsSection from './components/results/ResultsSection';
import ProfilePage from './components/profile/ProfilePage';
import SettingsPage from './components/settings/SettingsPage';
import TeacherSettingsPage from './components/settings/TeacherSettingsPage';
import DepartmentSection from './components/departments/DepartmentSection';
import StudentReportSection from './components/results/StudentReportSection'; // Added for student reports
import FullLayout from './components/FullLayout';
import { SnackbarProvider } from './contexts/SnackbarContext';
import apiService from './api';
import PageLoader from './common/PageLoader';

// New authentication components
import TeacherDashboard, { TeacherLayout } from './components/dashboards/TeacherDashboard';
import StudentDashboard from './components/dashboards/StudentDashboard';
import SimpleStudentDashboard from './components/dashboards/SimpleStudentDashboard';
// Add OTP Verification component import
import OTPVerification from './components/auth/OTPVerification';
// Student-specific components
import StudentLogin from './components/auth/StudentLogin';
import StudentQuizView from './components/quiz/StudentQuizView';
import QuizTestComponent from './components/quiz/QuizTestComponent';
import DirectQuizAccess from './components/quiz/DirectQuizAccess';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const authenticated = apiService.isAuthenticated();
  const userRole = localStorage.getItem('userRole');
  const hasToken = !!localStorage.getItem('token');
  
  // Add debugging logs
  console.log('ProtectedRoute check:', {
    authenticated,
    userRole,
    hasToken,
    path: window.location.pathname
  });
  
  if (!authenticated) {
    console.log('Not authenticated, redirecting to login');
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  // Authenticated, render the child component
  console.log('Authenticated, rendering protected content');
  return children;
};

function App() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Simulate checking auth status or loading necessary resources
    const checkAuthAndLoadResources = async () => {
      try {
        // Add any initial data loading here if needed
        await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay for faster loading
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
      <CustomThemeProvider>
        <PageLoader 
          loading={loading}
          message="Initializing Quiz Application..."
          showProgress={true}
        />
      </CustomThemeProvider>
    );
  }
  
  return (
    <CustomThemeProvider>
      <SnackbarProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes - New Authentication System */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Login route */}
          <Route path="/login" element={<Login />} />
          
          {/* Student Login route */}
          <Route path="/student-login" element={<StudentLogin />} />
          
          {/* CRITICAL: Add the missing OTP verification route */}
          <Route path="/verify-otp/:role" element={<OTPVerification />} />
          <Route path="/auth/otp/:role" element={<OTPVerification />} />
          
          {/* Role-specific dashboards */}
          <Route path="/teacher-dashboard" element={
            <ProtectedRoute>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student-dashboard" element={
            <ProtectedRoute>
              <SimpleStudentDashboard />
            </ProtectedRoute>
          } />
          
          {/* Student Quiz Taking */}
          <Route path="/quiz/take/:quizId" element={
            <ProtectedRoute>
              <StudentQuizView />
            </ProtectedRoute>
          } />
          
          {/* Direct Quiz Access Routes */}
          <Route path="/quiz/:quizId/join" element={<DirectQuizAccess />} />
          <Route path="/quiz/:quizId/join/" element={<DirectQuizAccess />} />
          <Route path="/quiz/:quizId" element={<DirectQuizAccess />} />
          
          {/* Test Component - Remove in production */}
          <Route path="/test-quiz-api" element={<QuizTestComponent />} />

          {/* Teacher-specific routes with TeacherLayout */}
          <Route path="/teacher/quiz" element={
            <ProtectedRoute>
              <TeacherLayout>
                <TeacherQuizSection />
              </TeacherLayout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/students" element={
            <ProtectedRoute>
              <TeacherLayout>
                <TeacherStudentSection />
              </TeacherLayout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/departments" element={
            <ProtectedRoute>
              <TeacherLayout>
                <DepartmentSection />
              </TeacherLayout>
            </ProtectedRoute>
          } />
          <Route path="/teacher/settings" element={
            <ProtectedRoute>
              <TeacherLayout>
                <TeacherSettingsPage />
              </TeacherLayout>
            </ProtectedRoute>
          } />
          
          {/* Protected routes - Admin Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          {/* Admin Routes */}
          <Route path="/admin/teachers" element={
            <ProtectedRoute>
              <FullLayout>
                <TeacherSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/teachers/add" element={
            <ProtectedRoute>
              <FullLayout>
                <TeacherSection initialOpenDialog={true} />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/students" element={
            <ProtectedRoute>
              <FullLayout>
                <StudentSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/students/add" element={
            <ProtectedRoute>
              <FullLayout>
                <StudentSection initialOpenDialog={true} />
              </FullLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/quiz" element={
            <ProtectedRoute>
              <QuizSection />
            </ProtectedRoute>
          } />
          <Route path="/admin/results" element={
            <ProtectedRoute>
              <ResultsSection />
            </ProtectedRoute>
          } />
          <Route path="/admin/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute>
              <FullLayout>
                <DepartmentSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          
          {/* Legacy routes for backward compatibility */}
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
          <Route path="/quiz" element={
            <ProtectedRoute>
              <QuizSection />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <ResultsSection />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/departments" element={
            <ProtectedRoute>
              <FullLayout>
                <DepartmentSection />
              </FullLayout>
            </ProtectedRoute>
          } />
          
          {/* Catch all - redirect based on authentication and role */}
          <Route path="*" element={
            (() => {
              const authenticated = apiService.isAuthenticated();
              console.log('Catch-all route triggered:', { 
                path: window.location.pathname, 
                authenticated 
              });
              
              if (!authenticated) {
                console.log('Not authenticated, redirecting to login');
                return <Navigate to="/login" replace />;
              }
              
              // User is authenticated, redirect based on role
              const userRole = localStorage.getItem('userRole');
              const apiRole = apiService.getUserRole();
              const effectiveRole = userRole || apiRole;
              
              console.log('Authenticated user routing:', { 
                userRole, 
                apiRole, 
                effectiveRole,
                path: window.location.pathname
              });
              
              if (effectiveRole === 'teacher') {
                console.log('Redirecting teacher to teacher dashboard');
                return <Navigate to="/teacher-dashboard" replace />;
              } else if (effectiveRole === 'student') {
                console.log('Redirecting student to student dashboard');
                return <Navigate to="/student-dashboard" replace />;
              } else if (effectiveRole === 'admin') {
                console.log('Redirecting admin to admin dashboard');
                return <Navigate to="/admin/dashboard" replace />;
              } else {
                console.log('Unknown role, defaulting to main dashboard');
                return <Navigate to="/dashboard" replace />;
              }
            })()
          } />
        </Routes>
        </BrowserRouter>
      </SnackbarProvider>
    </CustomThemeProvider>
  );
}

export default App;
