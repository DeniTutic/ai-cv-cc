import styles from './ScoreCard.module.css';

function getScoreClass(score) {
  if (score >= 75) return styles.high;
  if (score >= 55) return styles.mid;
  return styles.low;
}

function getScoreLabel(score) {
  if (score >= 75) return 'Excellent';
  if (score >= 55) return 'Good';
  return 'Needs improvement';
}

function getBadgeClass(score) {
  if (score >= 75) return styles.badgeGood;
  if (score >= 55) return styles.badgeOk;
  return styles.badgeBad;
}

export default function ScoreCard({ score, label }) {
  return (
    <div className={styles.card}>
      <div className={`${styles.score} ${getScoreClass(score)}`}>{score}</div>
      <p className={styles.label}>{label}</p>
      <span className={`${styles.badge} ${getBadgeClass(score)}`}>{getScoreLabel(score)}</span>
    </div>
  );
}
