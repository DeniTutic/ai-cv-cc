import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import AnalysisResult from './AnalysisResult';

// CVDetail simply re-uses the AnalysisResult page via the same :id param
export default function CVDetail() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 0' }}>
        <button
          onClick={() => navigate('/history')}
          style={{
            background: 'none', border: '1px solid #ddd', color: '#666',
            padding: '7px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14,
            cursor: 'pointer', marginBottom: 8
          }}
        >
          ← Back to history
        </button>
      </div>
      <AnalysisResult />
    </div>
  );
}
