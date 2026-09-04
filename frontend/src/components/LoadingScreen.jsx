import styles from './LoadingScreen.module.css';

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.ring} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
