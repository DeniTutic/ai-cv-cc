import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AnalysisResult from './pages/AnalysisResult';
import CVHistory from './pages/CVHistory';
import CVDetail from './pages/CVDetail';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const { isLoading } = useAuth0();

  if (isLoading) return <LoadingScreen message="Loading..." />;

  return (
    <BrowserRouter>
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px' },
          success: { duration: 4000 },
          error: { duration: 6000 }
        }}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/result/:id" element={
          <ProtectedRoute><AnalysisResult /></ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute><CVHistory /></ProtectedRoute>
        } />
        <Route path="/cv/:id" element={
          <ProtectedRoute><CVDetail /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
