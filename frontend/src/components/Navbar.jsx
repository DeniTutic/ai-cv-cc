import { useAuth0 } from '@auth0/auth0-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to={isAuthenticated ? '/dashboard' : '/'} className={styles.brand}>
          CVlens<span className={styles.dot} aria-hidden="true">.</span>
        </Link>

        {isAuthenticated ? (
          <div className={styles.right}>
            <Link to="/dashboard" className={styles.link} data-active={isActive('/dashboard')}>
              Upload
            </Link>
            <Link to="/history" className={styles.link} data-active={isActive('/history')}>
              My CVs
            </Link>

            <span className={styles.user}>
              {user?.picture && (
                <img src={user.picture} alt="" className={styles.avatar} referrerPolicy="no-referrer" />
              )}
              <span className={styles.userName}>{user?.given_name || user?.name}</span>
            </span>

            <button
              className={styles.signOut}
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className={styles.right}>
            <button className={styles.link} onClick={() => loginWithRedirect({ appState: { returnTo: '/dashboard' } })}>
              Log in
            </button>
            <button
              className={styles.cta}
              onClick={() =>
                loginWithRedirect({
                  appState: { returnTo: '/dashboard' },
                  authorizationParams: { screen_hint: 'signup' }
                })
              }
            >
              Sign up free
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
