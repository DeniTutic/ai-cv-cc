import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { createApiClient, cvApi } from '../services/api';
import ScoreRing from '../components/ScoreRing';
import ActionPlan from '../components/ActionPlan';
import LoadingScreen from '../components/LoadingScreen';
import styles from './AnalysisResult.module.css';

export default function AnalysisResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const client = createApiClient(getAccessTokenSilently);

    cvApi.getOne(client, id)
      .then((r) => { if (!cancelled) setAnalysis(r.data.analysis); })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? 'This analysis could not be found.'
            : 'Could not load this analysis.'
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, getAccessTokenSilently]);

  if (loading) return <LoadingScreen message="Loading your report…" />;

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <p className={styles.errorText}>{error}</p>
        <button onClick={() => navigate('/dashboard')} className={styles.btnPrimary}>
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  const a = analysis;
  // Every list is guarded: one incomplete record used to crash the page.
  const strengths = a.strengths ?? [];
  const weaknesses = a.weaknesses ?? [];
  const missingSkills = a.missingSkills ?? [];
  const grammarIssues = a.grammarIssues ?? [];
  const improvements = a.recommendedImprovements ?? [];
  const bullets = a.improvedBulletPoints ?? [];
  const actionItems = a.actionItems ?? [];

  const created = a.createdAt
    ? new Date(a.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/history')}>
          ← All CVs
        </button>
        <h1 className={styles.fileName}>{a.originalFileName}</h1>
        <p className={styles.date}>Analysed {created}</p>
      </header>

      <div className={styles.scoreRow}>
        <ScoreRing score={a.overallScore} label="Overall score" />
        <ScoreRing score={a.atsScore} label="ATS compatibility" />
      </div>

      <div className={styles.finalBox}>
        <span className={styles.finalLabel}>Where to start</span>
        <p>{a.finalRecommendation}</p>
      </div>

      <ActionPlan items={actionItems} />

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className={styles.splitGrid}>
          {strengths.length > 0 && (
            <Section title="Strengths" tone="go">
              <ul className={styles.bulletList}>
                {strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Section>
          )}
          {weaknesses.length > 0 && (
            <Section title="Weaknesses" tone="stop">
              <ul className={styles.bulletList}>
                {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </Section>
          )}
        </div>
      )}

      {missingSkills.length > 0 && (
        <Section title="Skills worth adding" tone="info">
          <div className={styles.tagList}>
            {missingSkills.map((s, i) => <span key={i} className={styles.tag}>{s}</span>)}
          </div>
        </Section>
      )}

      {grammarIssues.length > 0 && (
        <Section title="Grammar & wording" tone="caution">
          {grammarIssues.map((g, i) => (
            <div key={i} className={styles.issueItem}>
              <p className={styles.issueProblem}>{g.issue}</p>
              <p className={styles.issueSuggestion}>{g.suggestion}</p>
            </div>
          ))}
        </Section>
      )}

      {improvements.length > 0 && (
        <Section title="Section-by-section notes">
          {improvements.map((r, i) => (
            <div key={i} className={styles.improvItem}>
              <span className={styles.improvSection}>{r.section}</span>
              <p className={styles.improvProblem}>{r.problem}</p>
              <p className={styles.improvRec}>{r.recommendation}</p>
            </div>
          ))}
        </Section>
      )}

      {a.improvedSummary && (
        <Section title="A stronger professional summary">
          <div className={styles.summaryBox}>{a.improvedSummary}</div>
        </Section>
      )}

      {bullets.length > 0 && (
        <Section title="Rewritten bullet points">
          {bullets.map((b, i) => (
            <div key={i} className={styles.bulletPair}>
              <div className={styles.bulletCol}>
                <span className={styles.bulletLabel} data-tone="stop">Before</span>
                <p className={styles.bulletBefore}>{b.original}</p>
              </div>
              <div className={styles.bulletCol}>
                <span className={styles.bulletLabel} data-tone="go">After</span>
                <p className={styles.bulletAfter}>{b.improved}</p>
              </div>
            </div>
          ))}
        </Section>
      )}

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
          Analyse another CV
        </button>
        <button className={styles.btnOutline} onClick={() => navigate('/history')}>
          View all CVs
        </button>
      </div>
    </div>
  );
}

function Section({ title, tone, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle} data-tone={tone}>{title}</h2>
      {children}
    </section>
  );
}
