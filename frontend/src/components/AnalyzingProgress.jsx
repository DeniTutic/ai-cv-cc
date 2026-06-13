import { useState, useEffect } from 'react';
import styles from './AnalyzingProgress.module.css';

const CHECKPOINTS = [
  'Reading your CV',
  'Extracting key information',
  'Checking structure & formatting',
  'Finding errors & weak points',
  'Generating recommendations'
];

export default function AnalyzingProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  useEffect(() => {
    const durations = [1800, 2200, 2000, 2400, 2800];
    let step = 0;
    const timers = [];

    function advance() {
      if (step >= CHECKPOINTS.length) return;
      const delay = durations[step];
      const t = setTimeout(() => {
        setCompletedSteps(prev => [...prev, step]);
        step++;
        if (step < CHECKPOINTS.length) {
          setCurrentStep(step);
          advance();
        }
      }, delay);
      timers.push(t);
    }
    advance();

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.spinnerRing} aria-hidden="true" />
      <h2 className={styles.title}>Analyzing your CV</h2>
      <p className={styles.sub}>Our AI is reviewing every detail. This takes about 30 seconds.</p>

      <div className={styles.checkpoints} role="list" aria-live="polite">
        {CHECKPOINTS.map((label, i) => {
          const isDone = completedSteps.includes(i);
          const isActive = currentStep === i && !isDone;

          return (
            <div
              key={label}
              role="listitem"
              className={`${styles.checkpoint} ${isDone ? styles.done : ''} ${isActive ? styles.active : ''}`}
            >
              <div className={styles.icon}>
                {isDone ? '✓' : isActive ? <span className={styles.dot} /> : null}
              </div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
