import { Component } from 'react';

/**
 * Keeps one malformed analysis record from blanking the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '72px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 8, color: 'var(--brand)' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--ink-500)', marginBottom: 24 }}>
          This page could not be displayed. Reloading usually fixes it.
        </p>
        <button
          onClick={() => window.location.assign('/dashboard')}
          style={{
            background: 'var(--accent)', color: '#fff', fontSize: '0.875rem',
            fontWeight: 500, padding: '12px 24px', borderRadius: 'var(--radius-md)'
          }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }
}
