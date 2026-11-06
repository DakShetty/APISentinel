import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Targets } from './pages/Targets';
import { TargetForm } from './pages/TargetForm';
import { NewScan } from './pages/NewScan';
import { ScanProgress } from './pages/ScanProgress';
import { ScanResults } from './pages/ScanResults';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { ScanHistory } from './pages/ScanHistory';
import { ScanComparison } from './pages/ScanComparison';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#070a12] text-cyan-400 font-mono text-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
        Authenticating API Sentinel Session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="targets" element={<Targets />} />
            <Route path="targets/new" element={<TargetForm />} />
            <Route path="targets/:id/edit" element={<TargetForm />} />
            <Route path="scans/new" element={<NewScan />} />
            <Route path="scans/:id/progress" element={<ScanProgress />} />
            <Route path="scans/:id/results" element={<ScanResults />} />
            <Route path="vulnerabilities" element={<Vulnerabilities />} />
            <Route path="scans/history" element={<ScanHistory />} />
            <Route path="scans/compare" element={<ScanComparison />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
