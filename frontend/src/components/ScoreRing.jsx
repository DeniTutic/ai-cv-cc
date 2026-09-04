import { useEffect, useRef, useState } from 'react';
import styles from './ScoreRing.module.css';

const THRESHOLD_GOOD = 75;
const THRESHOLD_OK = 55;

export function scoreTone(score) {
  if (score >= THRESHOLD_GOOD) return 'go';
  if (score >= THRESHOLD_OK) return 'caution';
  return 'stop';
}

export function scoreLabel(score) {
  if (score >= THRESHOLD_GOOD) return 'Excellent';
  if (score >= THRESHOLD_OK) return 'Good';
  return 'Needs work';
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Animated radial gauge. The arc sweeps from 0 to `score` on mount and the
 * number counts up alongside it, so the ring reads as a single motion.
 */
export default function ScoreRing({ score = 0, label, size = 140, stroke = 10, animate = true }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const [displayed, setDisplayed] = useState(animate ? 0 : safeScore);
  const frameRef = useRef();

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - displayed / 100);
  const tone = scoreTone(safeScore);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setDisplayed(safeScore);
      return undefined;
    }

    const duration = 900;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast start, gentle settle
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(safeScore * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [safeScore, animate]);

  return (
    <div className={styles.wrap} style={{ width: size }}>
      <div className={styles.ringBox} style={{ width: size, height: size }}>
        <svg width={size} height={size} className={styles.svg} aria-hidden="true">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--ink-200)" strokeWidth={stroke}
          />
          <circle
            className={styles.progress}
            data-tone={tone}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.centre}>
          <span className={styles.number} data-tone={tone}>{displayed}</span>
          <span className={styles.outOf}>/100</span>
        </div>
      </div>
      {label && <p className={styles.label}>{label}</p>}
      <span className={styles.badge} data-tone={tone}>{scoreLabel(safeScore)}</span>
      <span className="sr-only">{label}: {safeScore} out of 100, {scoreLabel(safeScore)}</span>
    </div>
  );
}
