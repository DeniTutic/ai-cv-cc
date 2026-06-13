import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import { createApiClient, cvApi } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import styles from './CVHistory.module.css';

function scoreLabel(s) {
  if (s >= 75) return { label: 'Excellent', cls: 'good' };
  if (s >= 55) return { label: 'Good', cls: 'ok' };
  return { label: 'Needs improvement', cls: 'bad' };
}

export default function CVHistory() {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = createApiClient(getAccessTokenSilently);
    cvApi.getHistory(client)
      .then(r => setHistory(r.data.analyses))
      .catch(() => toast.error('Failed to load history.'))
      .finally(() => setLoading(false));
  }, [getAccessTokenSilently]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;
    const client = createApiClient(getAccessTokenSilently);
    try {
      await cvApi.deleteOne(client, id);
      setHistory(prev => prev.filter(a => a._id !== id));
      toast.success('Analysis deleted.');
    } catch {
      toast.error('Failed to delete.');
    }
  }

  if (loading) return <LoadingScreen message="Loading history..." />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>CV History</h1>
        <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
          + Analyze new CV
        </button>
      </div>

      {history.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📂</div>
          <h3>No analyses yet</h3>
          <p>Upload your first CV to see results here</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
            Upload CV
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {history.map(a => {
            const sl = scoreLabel(a.overallScore);
            return (
              <div
                key={a._id}
                className={styles.item}
                onClick={() => navigate(`/cv/${a._id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/cv/${a._id}`)}
              >
                <div className={styles.fileIcon}>📄</div>
                <div className={styles.info}>
                  <div className={styles.fileName}>{a.originalFileName}</div>
                  <div className={styles.meta}>
                    {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}ATS: {a.atsScore}
                    {' · '}
                    <span className={`${styles.badge} ${styles[sl.cls]}`}>{sl.label}</span>
                  </div>
                </div>
                <div className={`${styles.score} ${styles[`score-${sl.cls}`]}`}>{a.overallScore}</div>
                <button
                  className={styles.deleteBtn}
                  onClick={e => handleDelete(a._id, e)}
                  aria-label="Delete analysis"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
