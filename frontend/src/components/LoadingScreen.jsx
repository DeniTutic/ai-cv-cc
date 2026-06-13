import styles from './LoadingScreen.module.css';

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.msg}>{message}</p>
    </div>
  );
}
