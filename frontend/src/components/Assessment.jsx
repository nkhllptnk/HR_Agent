import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const Assessment = ({ onNext }) => {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = () => {
    setSubmitted(true);
    setAttempts(prev => prev + 1);
    if (selected === 1) { // Assuming option 1 is correct
      setPassed(true);
    } else {
      setPassed(false);
    }
  };

  const handleRetry = () => {
    setSubmitted(false);
    setSelected(null);
  };

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem' }}>Policy Assessment</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '1rem' }}>
          Attempt: {attempts}/2
        </span>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: '500' }}>
          Q1. What is the primary protocol for reporting a security incident?
        </p>
        
        <div className="radio-group">
          {['Report immediately to IT Helpdesk', 'Wait until the end of the day', 'Try to fix it yourself', 'Post it on Slack'].map((opt, idx) => (
            <label key={idx} className={`radio-option ${selected === idx ? 'selected' : ''}`} style={submitted ? { pointerEvents: 'none', opacity: 0.7 } : {}}>
              <input 
                type="radio" 
                name="answer" 
                checked={selected === idx}
                onChange={() => setSelected(idx)}
              />
              {opt}
            </label>
          ))}
        </div>
      </div>

      {submitted && (
        <div className={`alert ${passed ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto' }}>
          {passed ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{passed ? "Pass ✅ You have successfully answered the assessment." : "Retry ❌ Incorrect answer. Please review the policy and try again."}</span>
        </div>
      )}

      <div style={{ marginTop: submitted ? '1rem' : 'auto', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        {!submitted ? (
          <button className="btn" style={{ width: 'auto' }} disabled={selected === null} onClick={handleSubmit}>
            Submit Answer
          </button>
        ) : (
          passed ? (
            <button className="btn" style={{ width: 'auto' }} onClick={onNext}>
              Next Step ➔
            </button>
          ) : (
            <button className="btn" style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }} onClick={handleRetry} disabled={attempts >= 2}>
              {attempts >= 2 ? 'Max attempts reached' : 'Retry Question'}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default Assessment;
