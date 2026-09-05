import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createApiClient, cvApi, apiErrorMessage } from '../services/api';
import AnalyzingProgress from '../components/AnalyzingProgress';
import styles from './Dashboard.module.css';

// Vercel rejects request bodies over 4.5 MB at the platform level, so we cap
// below that and reject here, where we can show a real message.
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_EXTS = ['.pdf', '.docx', '.txt'];

export default function Dashboard() {
  const { user, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [stats, setStats] = useState({ total: 0, bestScore: null, latestScore: null, previousScore: null });
  const [statsError, setStatsError] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onAuthFailure = useCallback(() => {
    loginWithRedirect({ appState: { returnTo: '/dashboard' } });
  }, [loginWithRedirect]);

  useEffect(() => {
    let cancelled = false;
    const client = createApiClient(getAccessTokenSilently, onAuthFailure);

    cvApi.getStats(client)
      .then((r) => { if (!cancelled) setStats(r.data); })
      // Surfaced rather than swallowed: a broken backend used to just show zeros.
      .catch(() => { if (!cancelled) setStatsError(true); });

    return () => { cancelled = true; };
  }, [getAccessTokenSilently, onAuthFailure]);

  async function handleFile(file) {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast.error('Unsupported file type. Upload a PDF, DOCX or TXT.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File is too large. Maximum size is 4 MB.');
      return;
    }

    setAnalyzing(true);
    setUploadPercent(0);
    setDone(false);

    const client = createApiClient(getAccessTokenSilently, onAuthFailure);
    const formData = new FormData();
    formData.append('cv', file);

    try {
      const response = await cvApi.upload(client, formData, (event) => {
        // Real bytes-sent progress, wired through to the ring.
        if (event.total) {
          setUploadPercent(Math.round((event.loaded / event.total) * 100));
        }
      });

      setDone(true);
      const id = response.data.analysis._id;
      // Let the ring finish its sweep to 100 before navigating.
      setTimeout(() => navigate(`/result/${id}`), 700);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Analysis failed. Please try again.'));
      setAnalyzing(false);
      setUploadPercent(0);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const firstName = user?.given_name || user?.name?.split(' ')[0] || 'there';

  if (analyzing) {
    return <AnalyzingProgress uploadPercent={uploadPercent} done={done} />;
  }

  const delta =
    stats.latestScore != null && stats.previousScore != null
      ? stats.latestScore - stats.previousScore
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Welcome back, {firstName}</h1>
        <p>Upload a CV and get a specific, prioritised list of what to change.</p>
      </header>

      {statsError && (
        <p className={styles.statsError}>Could not load your stats. The server may be unreachable.</p>
      )}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{stats.total || 0}</span>
          <span className={styles.statLabel}>CVs analysed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>{stats.bestScore ?? '—'}</span>
          <span className={styles.statLabel}>Best score</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statVal}>
            {stats.latestScore ?? '—'}
            {delta != null && delta !== 0 && (
              <span className={styles.delta} data-dir={delta > 0 ? 'up' : 'down'}>
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
              </span>
            )}
          </span>
          <span className={styles.statLabel}>Latest score</span>
        </div>
      </div>

      <section className={styles.uploadCard}>
        <h2 className={styles.uploadTitle}>Upload your CV</h2>
        <p className={styles.uploadSub}>PDF, DOCX or TXT — up to 4 MB.</p>

        <div
          className={styles.dropZone}
          data-dragging={dragging}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload your CV. Drop a file here or press Enter to browse."
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <span className={styles.uploadIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M12 4L7 9M12 4l5 5" />
              <path d="M3 15v3a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-3" />
            </svg>
          </span>
          <p className={styles.dropText}>
            Drop your CV here, or <span className={styles.browse}>browse</span>
          </p>
          <div className={styles.pills}>
            {['PDF', 'DOCX', 'TXT'].map((p) => (
              <span key={p} className={styles.pill}>{p}</span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </section>

      {stats.total > 0 && (
        <div className={styles.historyPrompt}>
          <p>{stats.total} previous {stats.total === 1 ? 'analysis' : 'analyses'}.</p>
          <button className={styles.linkBtn} onClick={() => navigate('/history')}>
            View all CVs →
          </button>
        </div>
      )}
    </div>
  );
}
