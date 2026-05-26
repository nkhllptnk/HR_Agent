import React from 'react';
import { CheckCircle } from 'lucide-react';

const CompletionScreen = ({ onDashboard }) => {
  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <CheckCircle size={80} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--success)' }}>Onboarding Completed Successfully!</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', marginBottom: '2.5rem', lineHeight: 1.6 }}>
        Thank you for completing the induction, assessments, and submitting your details. HR will review your documents shortly. Welcome aboard! 🎉
      </p>
      
      <button className="btn" style={{ width: 'auto', minWidth: '200px' }} onClick={onDashboard}>
        Return to Dashboard
      </button>
    </div>
  );
};

export default CompletionScreen;
