import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import OnboardingFlow from './pages/OnboardingFlow';
import HRDashboard from './pages/HRDashboard';
import ManageContent from './pages/ManageContent';
import EmployeesPage from './pages/EmployeesPage';
import ActivityLogsPage from './pages/ActivityLogsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/hr-dashboard" element={<HRDashboard />} />
        <Route path="/manage-content" element={<ManageContent />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/activity-logs" element={<ActivityLogsPage />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
