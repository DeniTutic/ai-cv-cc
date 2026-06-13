import { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createApiClient, cvApi } from '../services/api';
import AnalyzingProgress from '../components/AnalyzingProgress';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const fileInputRef = useRef();
  const [stats, setStats] = useState({ total: 0, bestScore: null, latestScore: null });
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const client = createApiClient(getAccessTokenSilently);
    cvApi.getStats(client)
      .then(r => setStats(r.data))
      .catch(() => {});
  }, [getAccessTokenSilently]);

  async function handleFile(file) {
    if (!file) return;

    const allowed = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'text/plain'];
    const allowedExts = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowed.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 5MB.');
      return;
    }

    setAnalyzing(true);
    const client = createApiClient(getAccessTokenSilently);
    const formData = new FormData();
    formData.append('cv', file);

    try {
      const response = await cvApi.upload(client, formData);
      const id = response.data.analysis._id;
      toast.success('Analysis complete!');
      navigate(`/result/${id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Analysis failed. Please try again.';
      toast.error(msg);
      setAnalyzing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const firstName = user?.name?.split(' ')[0] || user?.nickname || 'there';

  if (analyzing) return <AnalyzingProgress />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Welcome back, {firstName} 👋</h1>
        <p>Upload a CV to get AI-powered improvement recommendations</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.total || 0}</div>
          <div className={styles.statLabel}>CVs analyzed</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.bestScore ?? '—'}</div>
          <div className={styles.statLabel}>Best score</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.latestScore ?? '—'}</div>
          <div className={styles.statLabel}>Latest score</div>
        </div>
      </div>

      {/* Upload zone */}
      <div className={styles.uploadCard}>
        <h2>Upload your CV</h2>
        <p>Our AI will analyze it and give you a detailed improvement report</p>

        <div
          className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload CV file"
          onKeyDown={e => e.key === 'Enter' && fileInputRef.current.click()}
        >
          <div className={styles.uploadIcon}>📄</div>
          <p className={styles.dropText}>Drop your CV here, or <span>browse</span></p>
          <div className={styles.pills}>
            <span className={styles.pill}>PDF</span>
            <span className={styles.pill}>DOCX</span>
            <span className={styles.pill}>TXT</span>
          </div>
          <p className={styles.dropHint}>Max 5MB · Results in under 60 seconds</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      </div>

      {stats.total > 0 && (
        <div className={styles.historyPrompt}>
          <p>You have {stats.total} previous analysis{stats.total > 1 ? 'es' : ''}.</p>
          <button className={styles.linkBtn} onClick={() => navigate('/history')}>
            View history →
          </button>
        </div>
      )}
    </div>
  );
}
