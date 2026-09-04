import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CVHistory from './pages/CVHistory';
import AnalysisResult from './pages/AnalysisResult';

export default function App() {
  const { isLoading } = useAuth0();

  if (isLoading) return <LoadingScreen message="Loading…" />;

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar />

      <main id="main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><CVHistory /></ProtectedRoute>} />
            <Route path="/result/:id" element={<ProtectedRoute><AnalysisResult /></ProtectedRoute>} />
            {/* Legacy alias -- /cv/:id and /result/:id used to be duplicate pages. */}
            <Route path="/cv/:id" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontSize: '14px', borderRadius: '10px', background: '#14142B', color: '#fff' }
        }}
      />
    </>
  );
}
