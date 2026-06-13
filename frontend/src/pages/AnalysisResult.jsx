import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { createApiClient, cvApi } from '../services/api';
import ScoreCard from '../components/ScoreCard';
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
    const client = createApiClient(getAccessTokenSilently);
    cvApi.getOne(client, id)
      .then(r => setAnalysis(r.data.analysis))
      .catch(() => setError('Could not load this analysis.'))
      .finally(() => setLoading(false));
  }, [id, getAccessTokenSilently]);

  if (loading) return <LoadingScreen message="Loading analysis..." />;
  if (error) return (
    <div className={styles.errorWrap}>
      <p>{error}</p>
      <button onClick={() => navigate('/dashboard')} className={styles.btn}>Back to dashboard</button>
    </div>
  );
  if (!analysis) return null;

  const a = analysis;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.fileName}>{a.originalFileName}</div>
          <div className={styles.date}>{new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Scores */}
      <div className={styles.scoreRow}>
        <ScoreCard score={a.overallScore} label="Overall score" />
        <ScoreCard score={a.atsScore} label="ATS compatibility" />
      </div>

      {/* Strengths */}
      <Section icon="👍" title="Strengths">
        <TagList items={a.strengths} variant="strength" />
      </Section>

      {/* Weaknesses */}
      <Section icon="⚠️" title="Weaknesses">
        <TagList items={a.weaknesses} variant="weakness" />
      </Section>

      {/* Missing skills */}
      <Section icon="🎯" title="Missing skills">
        <TagList items={a.missingSkills} variant="skill" />
      </Section>

      {/* Grammar issues */}
      {a.grammarIssues?.length > 0 && (
        <Section icon="✍️" title="Grammar & wording issues">
          {a.grammarIssues.map((g, i) => (
            <div key={i} className={styles.issueItem}>
              <div className={styles.issueProblem}>⚠ {g.issue}</div>
              <div className={styles.issueSuggestion}>→ {g.suggestion}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Recommended improvements */}
      <Section icon="📋" title="Recommended improvements">
        {a.recommendedImprovements.map((r, i) => (
          <div key={i} className={styles.improvItem}>
            <div className={styles.improvSection}>{r.section}</div>
            <div className={styles.improvProblem}>{r.problem}</div>
            <div className={styles.improvRec}>{r.recommendation}</div>
          </div>
        ))}
      </Section>

      {/* Improved summary */}
      <Section icon="👤" title="Improved professional summary">
        <div className={styles.summaryBox}>{a.improvedSummary}</div>
      </Section>

      {/* Improved bullet points */}
      {a.improvedBulletPoints?.length > 0 && (
        <Section icon="🔄" title="Improved bullet points">
          {a.improvedBulletPoints.map((b, i) => (
            <div key={i} className={styles.bulletPair}>
              <div className={styles.bulletLabel}>Original</div>
              <div className={styles.bulletBefore}>{b.original}</div>
              <div className={styles.bulletLabel}>Improved</div>
              <div className={styles.bulletAfter}>{b.improved}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Final recommendation */}
      <Section icon="🏁" title="Final recommendation">
        <div className={styles.finalBox}>{a.finalRecommendation}</div>
      </Section>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
          Analyze another CV
        </button>
        <button className={styles.btnOutline} onClick={() => navigate('/history')}>
          View history
        </button>
        <button className={styles.btnOutline} onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}><span>{icon}</span>{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items, variant }) {
  const cls = {
    strength: styles.tagStrength,
    weakness: styles.tagWeakness,
    skill:    styles.tagSkill
  }[variant];
  return (
    <div className={styles.tagList}>
      {items.map((item, i) => (
        <span key={i} className={`${styles.tag} ${cls}`}>{item}</span>
      ))}
    </div>
  );
}
