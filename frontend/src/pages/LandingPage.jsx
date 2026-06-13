import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

const FEATURES = [
  { icon: '📊', title: 'CV Score & ATS Rating', desc: 'Understand exactly how recruiters and automated systems will evaluate your resume.' },
  { icon: '🎯', title: 'Skills Gap Analysis', desc: 'Discover which skills are missing from your CV based on your target role and industry.' },
  { icon: '✍️', title: 'Bullet Point Rewrites', desc: 'Get AI-rewritten bullet points that are results-oriented and metrics-driven.' },
  { icon: '✅', title: 'Grammar & Tone Check', desc: 'Catch weak phrasing, informal language, and grammar errors that cost you interviews.' },
  { icon: '📝', title: 'Improved Summary', desc: 'Receive a professionally rewritten professional summary tailored to your experience.' },
  { icon: '🗺️', title: 'Clear Action Plan', desc: 'Get a prioritized list of exactly what to fix, in what order, to maximise your score.' }
];

const STEPS = [
  { n: '01', title: 'Upload your CV', desc: 'PDF, DOCX, or TXT — any format works.' },
  { n: '02', title: 'AI analysis', desc: 'GPT-4 reviews it like a senior recruiter.' },
  { n: '03', title: 'Detailed report', desc: 'Scores, issues, rewrites, action plan.' },
  { n: '04', title: 'Re-upload anytime', desc: 'Track your improvement over time.' }
];

export default function LandingPage() {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) navigate('/dashboard');
    else loginWithRedirect({ appState: { returnTo: '/dashboard' } });
  };

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: { screen_hint: 'signup' },
      appState: { returnTo: '/dashboard' }
    });
  };

  return (
    <main className={styles.main}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.eyebrow}>✦ AI-powered career coaching</div>
        <h1 className={styles.heroTitle}>
          Get your CV <em>hired</em>,<br />not filtered
        </h1>
        <p className={styles.heroSub}>
          Upload your resume and receive a professional AI report on structure,
          ATS compatibility, grammar, missing skills, and exactly how to improve it.
        </p>
        <div className={styles.heroBtns}>
          <button className={styles.btnPrimary} onClick={handleGetStarted}>
            Analyze my CV free →
          </button>
          <button className={styles.btnSecondary} onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}>
            See how it works
          </button>
        </div>
        <p className={styles.heroNote}>No credit card required · Results in under 60 seconds</p>
      </section>

      {/* Feature grid */}
      <section className={styles.featuresSection}>
        <div className={styles.sectionLabel}>What you get</div>
        <h2 className={styles.sectionTitle}>Everything a recruiter looks for</h2>
        <div className={styles.featGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featCard}>
              <div className={styles.featIcon}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection} id="how">
        <div className={styles.sectionLabel}>How it works</div>
        <h2 className={styles.sectionTitle}>From upload to improvement in minutes</h2>
        <div className={styles.stepsGrid}>
          {STEPS.map(s => (
            <div key={s.n} className={styles.stepCard}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2>Ready to land more interviews?</h2>
        <p>Join thousands of professionals who improved their CV with AI feedback.</p>
        <div className={styles.ctaBtns}>
          <button className={styles.btnPrimary} onClick={handleGetStarted}>Get started free</button>
          <button className={styles.btnSecondary} onClick={handleSignUp}>Create account</button>
        </div>
      </section>
    </main>
  );
}
