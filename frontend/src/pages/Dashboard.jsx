import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight, BookOpen, LogOut } from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);   // { completed, total, pct }
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get('/auth/me');
        setUser(userRes.data);

        // Fetch real progress
        const [progRes, contentRes] = await Promise.all([
          api.get('/content/my-progress'),
          api.get('/content/'),
        ]);
        const completedCount = progRes.data.filter(p => p.completed).length;
        const totalCount = contentRes.data.length;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        setProgress({ completed: completedCount, total: totalCount, pct });
      } catch (err) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user || !progress) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );

  const isComplete = progress.pct === 100;
  const statusLabel = isComplete ? 'Completed' : progress.pct > 0 ? 'In Progress' : 'Not Started';
  const statusColor = isComplete ? 'var(--success)' : progress.pct > 0 ? '#f59e0b' : 'var(--text-muted)';

  return (
    <div className="dashboard-layout">
      {/* ── Sidebar ── */}
      <div className="sidebar">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          HR Portal
        </h2>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>LOGGED IN AS</p>
          <p style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '0.25rem' }}>{user.name}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--primary-color)', textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</p>
        </div>
        <button className="btn" onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome to Accops!, {user.name.split(' ')[0]}! 👋</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Here is the status of your onboarding journey.</p>

        {/* Onboarding Status Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Onboarding Status</h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {isComplete
                  ? <><CheckCircle color="var(--success)" size={18} /><span style={{ color: 'var(--success)', fontWeight: '600' }}>Completed</span></>
                  : <><Clock color={statusColor} size={18} /><span style={{ color: statusColor, fontWeight: '600' }}>{statusLabel}</span></>
                }
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{
                  width: `${progress.pct}%`, height: '100%',
                  background: isComplete
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : 'linear-gradient(90deg, var(--primary-color), #a855f7)',
                  borderRadius: '5px', transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-main)' }}>{progress.pct}%</strong> completed
                &nbsp;·&nbsp;
                <strong style={{ color: 'var(--text-main)' }}>{progress.completed}</strong> of{' '}
                <strong style={{ color: 'var(--text-main)' }}>{progress.total}</strong> modules done
              </p>
            </div>

            {!isComplete && (
              <button className="btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/onboarding')}>
                {progress.pct > 0 ? 'Continue Onboarding' : 'Start Onboarding'}
                <ArrowRight size={18} />
              </button>
            )}
            {isComplete && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: '600' }}>
                <CheckCircle size={20} /> All modules complete!
              </div>
            )}
          </div>
        </div>

        {/* Module Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <BookOpen size={28} color="var(--primary-color)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>{progress.total}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Modules</p>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <CheckCircle size={28} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>{progress.completed}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</p>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <Clock size={28} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>{progress.total - progress.completed}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
