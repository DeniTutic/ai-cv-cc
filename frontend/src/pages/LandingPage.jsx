import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import GoogleButton from '../components/GoogleButton';
import styles from './LandingPage.module.css';

const PILLARS = [
  {
    tone: 'stop',
    symbol: '−',
    title: 'Remove',
    body: 'The lines quietly costing you interviews — filler, outdated roles, red flags a recruiter reads in six seconds.'
  },
  {
    tone: 'caution',
    symbol: '~',
    title: 'Modify',
    body: 'Weak bullet points rewritten with action verbs and measurable results, ready to paste straight in.'
  },
  {
    tone: 'go',
    symbol: '+',
    title: 'Add',
    body: 'The skills, keywords and sections your target roles expect — and that the ATS is scanning for.'
  }
];

const STEPS = [
  { n: '01', title: 'Upload', body: 'Drop in a PDF, DOCX or TXT. Nothing to install.' },
  { n: '02', title: 'Analyse', body: 'Scored against recruiter expectations and ATS parsing rules.' },
  { n: '03', title: 'Act', body: 'A prioritised list of changes, most critical first.' },
  { n: '04', title: 'Track', body: 'Re-upload after editing and watch the score move.' }
];

export default function LandingPage() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  function getStarted() {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      loginWithRedirect({
        appState: { returnTo: '/dashboard' },
        authorizationParams: { screen_hint: 'signup' }
      });
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>AI CV analysis</span>

        <h1 className={styles.title}>
          Know exactly what to
          <span className={styles.stop}> remove</span>,
          <span className={styles.caution}> change</span> and
          <span className={styles.go}> add</span>.
        </h1>

        <p className={styles.lede}>
          Upload your CV and get a specific, prioritised action plan — not vague advice.
          Every item tells you what to do, where, and why it matters.
        </p>

        <div className={styles.ctaRow}>
          <button className={styles.ctaPrimary} onClick={getStarted}>
            Analyse my CV — free
          </button>
          {!isAuthenticated && <GoogleButton />}
        </div>

        <p className={styles.microcopy}>No credit card. Results in under a minute.</p>
      </section>

      <section className={styles.pillars} aria-label="What you get">
        {PILLARS.map((p) => (
          <article key={p.title} className={styles.pillar} data-tone={p.tone}>
            <span className={styles.pillarSymbol} data-tone={p.tone} aria-hidden="true">
              {p.symbol}
            </span>
            <h2 className={styles.pillarTitle}>{p.title}</h2>
            <p className={styles.pillarBody}>{p.body}</p>
          </article>
        ))}
      </section>

      <section className={styles.steps} aria-labelledby="how-heading">
        <h2 id="how-heading" className={styles.sectionHeading}>How it works</h2>
        <ol className={styles.stepGrid}>
          {STEPS.map((s) => (
            <li key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalTitle}>Your CV gets six seconds. Make them count.</h2>
        <button className={styles.ctaLight} onClick={getStarted}>
          Get my action plan
        </button>
      </section>
    </div>
  );
}
