import React, { useState, useEffect } from 'react';
import { CheckCircle, Trophy, Star, Clock } from 'lucide-react';
import api from '../api';

const CompletionScreen = ({ onDashboard }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/employees/my-report');
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating === 'Excellent') return '#22c55e';
    if (rating === 'Good') return '#3b82f6';
    if (rating === 'Needs Improvement') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
      <CheckCircle size={72} color="var(--success)" style={{ marginBottom: '1rem' }} />
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--success)' }}>
        Onboarding Completed!
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Welcome aboard! Here's your induction summary 🎉
      </p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading your report...</p>
      ) : report ? (
        <div style={{ width: '100%', maxWidth: '700px' }}>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <Trophy size={24} color={getRatingColor(report.summary.rating)} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: getRatingColor(report.summary.rating) }}>
                {report.summary.overall_score_pct}%
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Score</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <Star size={24} color={getRatingColor(report.summary.rating)} style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '1.5rem', fontWeight: '800', color: getRatingColor(report.summary.rating) }}>
                {report.summary.rating}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rating</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
              <Clock size={24} color="#6366f1" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>
                {report.summary.completed_modules}/{report.summary.total_modules}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Modules Done</p>
            </div>
          </div>

          {/* Module Table */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Module</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Quiz</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Attempts</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {report.modules.map((mod, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {mod.is_intro && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '0.3rem' }}>
                            INTRO
                          </span>
                        )}
                        {mod.module_title}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {mod.total_questions > 0 ? `${mod.score}/${mod.total_questions}` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      {mod.completed ? (
                        <span style={{ color: mod.attempt_count > 1 ? '#f59e0b' : '#22c55e' }}>
                          {mod.attempt_count} {mod.attempt_count > 1 ? '(-25%)' : '✓'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: '700', color: mod.module_score_pct >= 75 ? '#22c55e' : '#ef4444' }}>
                      {mod.completed ? `${mod.module_score_pct}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <button className="btn" style={{ width: 'auto', minWidth: '200px' }} onClick={onDashboard}>
        Return to Dashboard
      </button>
    </div>
  );
};

export default CompletionScreen;
