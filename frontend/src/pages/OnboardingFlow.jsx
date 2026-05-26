import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import OnboardingModule from '../components/OnboardingModule';
import DataCollection from '../components/DataCollection';
import CompletionScreen from '../components/CompletionScreen';
import api from '../api';

const OnboardingFlow = () => {
  const [contents, setContents] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contentRes, progressRes] = await Promise.all([
        api.get('/content/'),
        api.get('/content/my-progress'),
      ]);

      const allContents = contentRes.data;
      const doneIds = new Set(progressRes.data.map(p => p.content_id));

      setContents(allContents);
      setCompletedIds(doneIds);

      // Resume from the first non-completed content module
      let resumeStep = 1;
      for (let i = 0; i < allContents.length; i++) {
        if (doneIds.has(allContents[i].id)) {
          resumeStep = i + 2; // advance past this one
        } else {
          break; // stop at first incomplete
        }
      }
      // Cap to data-collection step if all content done
      const maxStep = allContents.length + 2;
      setCurrentStep(Math.min(resumeStep, maxStep));
    } catch (err) {
      console.error('Failed to load onboarding data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const totalSteps = contents.length + 2;
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  // Build steps list
  const dynamicSteps = [
    ...contents.map((c, i) => ({ id: i + 1, label: c.title })),
    { id: contents.length + 1, label: 'Data Collection' },
    { id: contents.length + 2, label: 'Completion' },
  ];
  const totalSteps = dynamicSteps.length;

  const renderStepContent = () => {
    if (currentStep <= contents.length) {
      const content = contents[currentStep - 1];
      return (
        <OnboardingModule
          key={content.id}
          content={content}
          alreadyCompleted={completedIds.has(content.id)}
          onNext={handleNext}
        />
      );
    } else if (currentStep === contents.length + 1) {
      return <DataCollection onNext={handleNext} />;
    } else {
      return <CompletionScreen onDashboard={() => navigate('/dashboard')} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={48} color="var(--primary-color)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading your onboarding programme…</p>
      </div>
    );
  }

  const completionPct = Math.round(((currentStep - 1) / totalSteps) * 100);

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <div className="sidebar" style={{ width: '300px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Your Progress</h2>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {dynamicSteps.map((step) => {
            const isActive = step.id === currentStep;
            const isCompleted =
              step.id < currentStep ||
              (step.id <= contents.length && completedIds.has(contents[step.id - 1]?.id));

            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: isCompleted ? 'var(--success)' : isActive ? 'var(--primary-color)' : 'transparent',
                  border: `2px solid ${isCompleted ? 'var(--success)' : isActive ? 'var(--primary-color)' : 'var(--border)'}`,
                  color: isCompleted || isActive ? 'white' : 'var(--text-muted)',
                  fontSize: '0.85rem', fontWeight: 'bold',
                }}>
                  {isCompleted ? <Check size={16} /> : step.id}
                </div>
                <div>
                  <p style={{ fontWeight: isActive ? '600' : '500', color: isActive || isCompleted ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {step.label}
                  </p>
                  {isActive && <p style={{ fontSize: '0.75rem', color: 'var(--primary-color)', marginTop: '0.2rem' }}>In Progress…</p>}
                  {isCompleted && step.id <= contents.length && <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '0.2rem' }}>✓ Completed</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Overall Completion</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{completionPct}%</span>
            <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
              {completedIds.size}/{contents.length} modules
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${completionPct}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--primary-color), var(--success))',
              borderRadius: '4px', transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Horizontal stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {dynamicSteps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted =
              step.id < currentStep ||
              (step.id <= contents.length && completedIds.has(contents[step.id - 1]?.id));

            return (
              <React.Fragment key={step.id}>
                <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} style={{ whiteSpace: 'nowrap' }}>
                  <div className="step-circle">
                    {isCompleted ? <Check size={16} /> : step.id}
                  </div>
                  <span className="step-label">{step.label}</span>
                </div>
                {index < totalSteps - 1 && (
                  <div style={{
                    flex: 1, height: '2px', minWidth: '30px',
                    background: isCompleted ? 'var(--success)' : 'var(--border)',
                    margin: '0 4px', marginBottom: '1.2rem',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderStepContent()}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default OnboardingFlow;
