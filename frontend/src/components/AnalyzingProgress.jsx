import { useEffect, useRef, useState } from 'react';
import styles from './AnalyzingProgress.module.css';

const STAGES = [
  { id: 'read',    label: 'Reading your CV',            to: 55 },
  { id: 'parse',   label: 'Extracting sections',        to: 68 },
  { id: 'ats',     label: 'Checking ATS compatibility', to: 80 },
  { id: 'score',   label: 'Scoring against recruiters', to: 90 },
  { id: 'suggest', label: 'Writing recommendations',    to: 95 }
];

/** Upload bytes own 0-40%; the analysis stages ease 40 -> 95 and hold there. */
const UPLOAD_CEILING = 40;

function toneFor(pct) {
  if (pct >= 75) return 'go';
  if (pct >= 45) return 'caution';
  return 'stop';
}

/**
 * @param {number} uploadPercent 0-100, real bytes-sent progress from axios.
 * @param {boolean} done         true once the response has landed.
 */
export default function AnalyzingProgress({ uploadPercent = 0, done = false }) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const targetRef = useRef(0);
  const rafRef = useRef();
  const lastFrameRef = useRef(null);

  // Real upload progress drives the first 40%.
  useEffect(() => {
    const uploadContribution = (Math.min(100, uploadPercent) / 100) * UPLOAD_CEILING;
    targetRef.current = Math.max(targetRef.current, uploadContribution);
  }, [uploadPercent]);

  // Once bytes are sent we're waiting on the model, and there is no signal to
  // read. Walk the stages on a timer but cap at 95 -- never claim completion
  // the server hasn't confirmed.
  useEffect(() => {
    if (uploadPercent < 100 || done) return undefined;

    let cancelled = false;
    let i = 0;

    const advance = () => {
      if (cancelled || i >= STAGES.length) return;
      setStageIndex(i);
      targetRef.current = Math.max(targetRef.current, STAGES[i].to);
      i += 1;
      if (i < STAGES.length) {
        setTimeout(advance, 2600 + Math.random() * 900);
      }
    };

    const first = setTimeout(advance, 400);
    return () => { cancelled = true; clearTimeout(first); };
  }, [uploadPercent, done]);

  useEffect(() => {
    if (done) {
      targetRef.current = 100;
      setStageIndex(STAGES.length);
    }
  }, [done]);

  // Single rAF loop easing the displayed value toward the target, so the ring
  // never jumps between stages. The step is derived from elapsed time rather
  // than counted per frame, so the sweep runs at the same speed on a 60Hz and
  // a 120Hz display, and recovers correctly after a background tab throttles
  // requestAnimationFrame.
  useEffect(() => {
    const TIME_CONSTANT = 320; // ms to cover ~63% of the remaining distance

    const tick = (now) => {
      // Clamp so returning to a backgrounded tab eases in rather than snapping.
      const dt = Math.min(120, now - (lastFrameRef.current ?? now));
      lastFrameRef.current = now;

      setProgress((current) => {
        const target = targetRef.current;
        const delta = target - current;
        if (Math.abs(delta) < 0.15) return target;
        return current + delta * (1 - Math.exp(-dt / TIME_CONSTANT));
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const rounded = Math.round(progress);
  const tone = toneFor(rounded);

  const size = 180;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rounded / 100);

  return (
    <div className={styles.wrap}>
      <div
        className={styles.orbit}
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Analysing your CV"
      >
        {/* Counter-rotating decorative rings — the circulating motion. */}
        <span className={styles.ringOuter} aria-hidden="true" />
        <span className={styles.ringInner} aria-hidden="true" />
        <span className={styles.sweep} data-tone={tone} aria-hidden="true" />

        <svg width={size} height={size} className={styles.svg} aria-hidden="true">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--ink-200)" strokeWidth={stroke}
          />
          <circle
            className={styles.progressArc}
            data-tone={tone}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className={styles.centre}>
          <span className={styles.percent} data-tone={tone}>{rounded}</span>
          <span className={styles.percentSign}>%</span>
        </div>
      </div>

      <h2 className={styles.title}>Analysing your CV</h2>
      <p className={styles.sub}>
        {uploadPercent < 100 ? 'Uploading your document…' : 'This usually takes 15–40 seconds.'}
      </p>

      <ol className={styles.checkpoints}>
        {STAGES.map((stage, i) => {
          const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
          return (
            <li key={stage.id} className={styles.checkpoint} data-state={state}>
              <span className={styles.icon} data-state={state}>
                {state === 'done' ? '✓' : state === 'active' ? <span className={styles.dot} /> : ''}
              </span>
              <span className={styles.checkLabel}>{stage.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
