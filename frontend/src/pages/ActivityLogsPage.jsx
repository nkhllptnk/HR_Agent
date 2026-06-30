import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut, Activity, Search } from 'lucide-react';
import api from '../api';

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(logs);
    } else {
      setFiltered(logs.filter(l =>
        l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.details?.toLowerCase().includes(search.toLowerCase())
      ));
    }
  }, [search, logs]);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/logs/');
      setLogs(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action === 'LOGIN') return '#3b82f6';
    if (action === 'MODULE_COMPLETED') return '#22c55e';
    if (action === 'ACKNOWLEDGED') return '#a855f7';
    if (action?.includes('RESET')) return '#ef4444';
    return '#f59e0b';
  };

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString();
  };
  const downloadCSV = async (url, filename) => {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  } catch (err) {
    alert('Download failed: ' + (err.response?.data?.detail || err.message));
  }
};

  return (
    <div className="dashboard-layout">
      <div className="sidebar" style={{ width: '260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🚀</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>HR Portal</h2>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>ONBOARDING SYSTEM</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="nav-item" onClick={() => navigate('/hr-dashboard')}>
            <LayoutDashboard size={20} /> HR Dashboard
          </button>
          <button className="nav-item" onClick={() => navigate('/employees')}>
            <Users size={20} /> Employees
          </button>
          <button className="nav-item" onClick={() => navigate('/manage-content')}>
            <Settings size={20} /> Manage Content
          </button>
          <button className="nav-item active">
            <Activity size={20} /> Activity Logs
          </button>
        </nav>

        <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
          className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }}>
          <LogOut size={20} /> Sign Out
        </button>
      </div>

      <div className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity size={24} color="var(--primary-color)" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Activity Logs</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track all user actions across the portal</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 1rem' }}>
    <Search size={16} color="var(--text-muted)" />
    <input
      type="text"
      placeholder="Search by name, action..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.9rem', width: '220px' }}
    />
  </div>
  <button
    className="btn"
    style={{ width: 'auto' }}
    onClick={() => downloadCSV('/logs/csv', 'activity_logs.csv')}
  >
    Download CSV
  </button>
</div>
        </header>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading logs...</p>
        ) : (
          <div className="card" style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.72rem', textTransform: 'uppercase' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '600' }}>{log.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_email}</div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '1rem',
                        fontSize: '0.75rem', fontWeight: '600',
                        background: `${getActionColor(log.action)}20`,
                        color: getActionColor(log.action),
                        border: `1px solid ${getActionColor(log.action)}40`
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{log.details || '-'}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(log.timestamp)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No logs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .nav-item {
          display: flex; align-items: center; gap: 0.75rem; width: 100%;
          padding: 0.85rem 1rem; background: transparent; border: none;
          color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
          border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
        .nav-item.active { background: var(--surface-card); color: var(--primary-color); border: 1px solid var(--border); }
      `}</style>
    </div>
  );
};

export default ActivityLogsPage;