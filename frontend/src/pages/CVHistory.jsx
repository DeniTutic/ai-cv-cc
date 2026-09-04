import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import { createApiClient, cvApi, apiErrorMessage } from '../services/api';
import { scoreTone, scoreLabel } from '../components/ScoreRing';
import LoadingScreen from '../components/LoadingScreen';
import ConfirmDialog from '../components/ConfirmDialog';
import styles from './CVHistory.module.css';

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  oldest: { label: 'Oldest first', fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  best:   { label: 'Highest score', fn: (a, b) => b.overallScore - a.overallScore },
  worst:  { label: 'Lowest score', fn: (a, b) => a.overallScore - b.overallScore }
};

/** Small inline ring used per row. */
function MiniRing({ score }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);

  return (
    <div className={styles.miniRing} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.miniSvg} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ink-200)" strokeWidth={stroke} />
        <circle
          className={styles.miniArc}
          data-tone={tone}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className={styles.miniNum} data-tone={tone}>{score}</span>
    </div>
  );
}

export default function CVHistory() {
  const navigate = useNavigate();
  const { getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [pendingDelete, setPendingDelete] = useState(null);

  const onAuthFailure = useCallback(() => {
    loginWithRedirect({ appState: { returnTo: '/history' } });
  }, [loginWithRedirect]);

  useEffect(() => {
    let cancelled = false;
    const client = createApiClient(getAccessTokenSilently, onAuthFailure);

    cvApi.getHistory(client)
      .then((r) => { if (!cancelled) setHistory(r.data.analyses || []); })
      .catch((err) => { if (!cancelled) toast.error(apiErrorMessage(err, 'Could not load your CVs.')); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [getAccessTokenSilently, onAuthFailure]);

  const sorted = useMemo(() => [...history].sort(SORTS[sort].fn), [history, sort]);

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;

    const previous = history;
    setHistory((h) => h.filter((item) => item._id !== target._id));

    try {
      const client = createApiClient(getAccessTokenSilently, onAuthFailure);
      await cvApi.deleteOne(client, target._id);
      toast.success('Analysis deleted.');
    } catch (err) {
      setHistory(previous); // roll the optimistic removal back
      toast.error(apiErrorMessage(err, 'Could not delete that analysis.'));
    }
  }

  if (loading) return <LoadingScreen message="Loading your CVs…" />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Your CVs</h1>
          <p>{history.length} {history.length === 1 ? 'analysis' : 'analyses'}</p>
        </div>

        {history.length > 1 && (
          <label className={styles.sortWrap}>
            <span className="sr-only">Sort CVs</span>
            <select
              className={styles.sort}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {history.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyRing} aria-hidden="true" />
          <h2>No CVs yet</h2>
          <p>Upload your first CV and get a prioritised list of what to change.</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
            Analyse a CV
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {sorted.map((item, i) => {
            const previous = sorted[i + 1];
            const delta = sort === 'newest' && previous
              ? item.overallScore - previous.overallScore
              : null;

            return (
              <li key={item._id} className={styles.row}>
                <button
                  className={styles.rowMain}
                  onClick={() => navigate(`/result/${item._id}`)}
                >
                  <MiniRing score={item.overallScore} />

                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{item.originalFileName}</span>
                    <span className={styles.rowMeta}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                      {' · ATS '}{item.atsScore}
                      {delta != null && delta !== 0 && (
                        <span className={styles.delta} data-dir={delta > 0 ? 'up' : 'down'}>
                          {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs previous
                        </span>
                      )}
                    </span>
                  </span>

                  <span className={styles.badge} data-tone={scoreTone(item.overallScore)}>
                    {scoreLabel(item.overallScore)}
                  </span>
                </button>

                <button
                  className={styles.deleteBtn}
                  onClick={() => setPendingDelete(item)}
                  aria-label={`Delete analysis of ${item.originalFileName}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this analysis?"
        body={pendingDelete ? `"${pendingDelete.originalFileName}" and its report will be permanently removed.` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
