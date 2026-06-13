import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <LoadingScreen message="Authenticating..." />;

  if (!isAuthenticated) {
    loginWithRedirect({ appState: { returnTo: window.location.pathname } });
    return <LoadingScreen message="Redirecting to login..." />;
  }

  return children;
}
