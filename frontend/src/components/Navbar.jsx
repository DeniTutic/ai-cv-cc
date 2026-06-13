import { useAuth0 } from '@auth0/auth0-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();

  return (
    <nav className={styles.nav}>
      <Link to={isAuthenticated ? '/dashboard' : '/'} className={styles.logo}>
        <span className={styles.logoDot} aria-hidden="true" />
        CVlens
      </Link>

      <div className={styles.actions}>
        {isAuthenticated ? (
          <>
            <Link
              to="/history"
              className={`${styles.link} ${location.pathname === '/history' ? styles.active : ''}`}
            >
              History
            </Link>
            <Link
              to="/dashboard"
              className={`${styles.link} ${location.pathname === '/dashboard' ? styles.active : ''}`}
            >
              Dashboard
            </Link>
            <div className={styles.userChip}>
              {user?.picture && <img src={user.picture} alt="" className={styles.avatar} />}
              <span className={styles.userName}>{user?.name || user?.email}</span>
            </div>
            <button
              className={styles.btnOutline}
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button className={styles.btnGhost} onClick={() => loginWithRedirect()}>Log in</button>
            <button
              className={styles.btnPrimary}
              onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
            >
              Sign up free
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
