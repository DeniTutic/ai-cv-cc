import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  // In an effect, not the render body. Calling loginWithRedirect during render
  // is a side effect that StrictMode double-invokes.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect({
        appState: { returnTo: location.pathname + location.search }
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, location]);

  if (isLoading) return <LoadingScreen message="Checking your session…" />;
  if (!isAuthenticated) return <LoadingScreen message="Redirecting to sign in…" />;

  return children;
}
