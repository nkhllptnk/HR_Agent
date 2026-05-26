import React, { useState } from 'react';
import { PlayCircle } from 'lucide-react';

const InductionContent = ({ onNext }) => {
  const [viewed, setViewed] = useState(false);

  // Simulate watching a video
  const handleWatch = () => {
    setViewed(true);
  };

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Company Security Policy</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please review the security policy before proceeding. This is mandatory.</p>
      
      <div style={{ flex: 1, background: '#000', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', border: '1px solid var(--border)', minHeight: '300px' }} onClick={handleWatch}>
        {!viewed ? (
          <div style={{ textAlign: 'center' }}>
            <PlayCircle size={64} color="var(--primary-color)" style={{ marginBottom: '1rem', opacity: 0.8, margin: '0 auto' }} />
            <p>Click to Play Induction Video</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--success)' }}>
            <p>Video Completed</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" style={{ width: 'auto' }} disabled={!viewed} onClick={onNext}>
          Next Step ➔
        </button>
      </div>
    </div>
  );
};

export default InductionContent;
