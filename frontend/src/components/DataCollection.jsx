import React, { useState } from 'react';
import { CheckCircle, FileText } from 'lucide-react';
import api from '../api';

const AcknowledgementForm = ({ onNext }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/data/acknowledge');
      setSubmitted(true);
      setTimeout(() => onNext(), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <CheckCircle size={64} color="#10b981" />
        <h2 style={{ fontSize: '1.5rem' }}>Acknowledgement Submitted!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Thank you. Your onboarding is now complete.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <FileText size={28} color="var(--primary-color)" />
        <h2 style={{ fontSize: '1.5rem' }}>Document Acknowledgement</h2>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Please read the following statement carefully and confirm your acknowledgement.
      </p>

      {/* Acknowledgement Statement Box */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem',
        lineHeight: '1.8',
        fontSize: '0.95rem'
      }}>
        <p style={{ marginBottom: '1rem' }}>Before beginning your induction programme, please confirm that you have completed the following on <strong>Keka</strong>:</p>
        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>Uploaded your Aadhaar Card / Government ID proof</li>
          <li>Uploaded your PAN Card</li>
          <li>Uploaded your Bank Account details / Cancelled cheque</li>
          <li>Uploaded your Educational certificates</li>
          <li>Filled and submitted all required compliance forms on Keka</li>
        </ul>
      </div>

      {/* Checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        cursor: 'pointer',
        marginBottom: '2rem',
        padding: '1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${acknowledged ? '#10b981' : 'var(--border)'}`,
        background: acknowledged ? 'rgba(16,185,129,0.05)' : 'transparent',
        transition: 'all 0.2s'
      }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
          style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          I confirm that I have uploaded all required documents on Keka and they are ready for HR verification.
        </span>
      </label>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn"
          style={{ width: 'auto' }}
          onClick={handleSubmit}
          disabled={!acknowledged || loading}
        >
          {loading ? 'Submitting...' : 'I Acknowledge & Proceed ➔'}
        </button>
      </div>
    </div>
  );
};

export default AcknowledgementForm;
