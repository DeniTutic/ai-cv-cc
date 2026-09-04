import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

/**
 * Auth0Provider needs to be inside the router so onRedirectCallback can use
 * navigate() -- otherwise deep links are lost on the way through login.
 */
function Auth0ProviderWithNavigate({ children }) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState) => {
    // Honour the returnTo that ProtectedRoute and the landing page already
    // pass. Nothing used to read it, so every login landed on /dashboard.
    navigate(appState?.returnTo || '/dashboard', { replace: true });
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: 'openid profile email'
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}

function ConfigError() {
  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Auth0 is not configured</h1>
      <p style={{ color: '#555', marginBottom: 12 }}>
        Copy <code>frontend/.env.example</code> to <code>frontend/.env</code> and fill in
        <code> VITE_AUTH0_DOMAIN</code>, <code>VITE_AUTH0_CLIENT_ID</code> and
        <code> VITE_AUTH0_AUDIENCE</code>, then restart the dev server.
      </p>
      <p style={{ color: '#555' }}>See <strong>SETUP.md</strong>, section 3.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {domain && clientId ? (
      <BrowserRouter>
        <Auth0ProviderWithNavigate>
          <App />
        </Auth0ProviderWithNavigate>
      </BrowserRouter>
    ) : (
      <ConfigError />
    )}
  </React.StrictMode>
);
