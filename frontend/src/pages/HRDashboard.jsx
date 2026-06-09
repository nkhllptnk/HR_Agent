import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, CheckSquare, Settings, LogOut,
  BarChart3, UserPlus, Clock, AlertCircle, PieChart, FileText, Eye, Activity
} from 'lucide-react';
import api from '../api';

const HRDashboard = () => {
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '', personal_email: '', role: 'full_time', department: '', doj: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const [userRes, empRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/employees/with-progress'),
      ]);
      setUser(userRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees', newEmployee);
      setShowAddModal(false);
      setNewEmployee({ name: '', personal_email: '', role: 'full_time', department: '', doj: '' });
      fetchData();
    } catch (err) {
      alert('Failed to add employee: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handlePreview = async () => {
    try {
      const res = await api.get('/auth/preview-token');
      localStorage.setItem('hr_token', localStorage.getItem('token'));
      localStorage.setItem('token', res.data.preview_token);
      localStorage.setItem('is_preview', 'true');
      navigate('/onboarding');
    } catch (err) {
      alert('Failed to load preview: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading || !user) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  );

  // Computed stats
  const totalEmployees = employees.length;
  const completed = employees.filter(e => e.completion_pct === 100).length;
  const inProgress = employees.filter(e => e.completion_pct > 0 && e.completion_pct < 100).length;
  const notStarted = employees.filter(e => e.completion_pct === 0).length;
  const avgCompletion = totalEmployees > 0
    ? Math.round(employees.reduce((s, e) => s + e.completion_pct, 0) / totalEmployees)
    : 0;

  return (
    <div className="dashboard-layout">
      {/* ── Add Employee Modal ── */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="auth-card" style={{ maxWidth: '600px' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Add New Employee</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" required value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" className="form-control" required value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} placeholder="Engineering" />
                </div>
                <div className="form-group">
                  <label>Personal Email</label>
                  <input type="email" className="form-control" required value={newEmployee.personal_email} onChange={e => setNewEmployee({...newEmployee, personal_email: e.target.value})} placeholder="john@gmail.com" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={newEmployee.role} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})}>
                    <option value="full_time">Full Time</option>
                    <option value="intern">Intern</option>
                    <option value="consultant">Consultant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Joining</label>
                  <input type="date" className="form-control" required value={newEmployee.doj} onChange={e => setNewEmployee({...newEmployee, doj: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn">Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <div className="sidebar" style={{ width: '260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🚀</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>HR Portal</h2>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>ONBOARDING SYSTEM</p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1.1rem' }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="nav-item active"><LayoutDashboard size={20} /> HR Dashboard</button>
          <button className="nav-item" onClick={() => navigate('/employees')}><Users size={20} /> Employees</button>
          <button className="nav-item" onClick={() => navigate('/manage-content')}><Settings size={20} /> Manage Content</button>
          <button className="nav-item" onClick={() => navigate('/activity-logs')}>
  <Activity size={20} /> Activity Logs
</button>
        </nav>

        <button onClick={handleLogout} className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }}>
          <LogOut size={20} /> Sign Out
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="main-content">
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <BarChart3 size={24} color="var(--primary-color)" />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>HR Dashboard</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Live onboarding progress across all employees</p>
          <button
            className="btn"
            style={{ width: 'auto', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
            onClick={handlePreview}
          >
            <Eye size={18} /> Preview Employee Portal
          </button>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <StatCard icon={<Users color="#a855f7" />} label="TOTAL EMPLOYEES" value={totalEmployees} />
          <StatCard icon={<CheckSquare color="#22c55e" />} label="COMPLETED" value={completed} />
          <StatCard icon={<Clock color="#3b82f6" />} label="IN PROGRESS" value={inProgress} />
          <StatCard icon={<AlertCircle color="#ef4444" />} label="NOT STARTED" value={notStarted} />
          <StatCard icon={<PieChart color="#eab308" />} label="AVG COMPLETION" value={`${avgCompletion}%`} />
        </div>

        {/* Employee Table */}
        <div className="card" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={20} color="var(--text-muted)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>All Employees ({totalEmployees})</h2>
            </div>
            <button className="btn" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowAddModal(true)}>
              <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Add Employee
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>DEPARTMENT</th>
                  <th>DOJ</th>
                  <th>MODULES</th>
                  <th>PROGRESS</th>
                  <th>STATUS</th>
                  <th>CONTROLS</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? employees.map((emp) => {
                  const statusLabel = emp.completion_pct === 100 ? 'Completed' : emp.completion_pct > 0 ? 'In Progress' : 'Not Started';
                  const statusColor = emp.completion_pct === 100 ? '#22c55e' : emp.completion_pct > 0 ? '#3b82f6' : '#f59e0b';
                  const statusBg = emp.completion_pct === 100 ? 'rgba(34,197,94,0.1)' : emp.completion_pct > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)';

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                      </td>
                      <td>{emp.department || 'N/A'}</td>
                      <td>{emp.doj || 'N/A'}</td>
                      <td style={{ fontWeight: '600' }}>
                        {emp.modules_completed} / {emp.total_modules}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                            <div style={{ width: `${emp.completion_pct}%`, height: '100%', background: statusColor, borderRadius: '3px', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: statusColor, minWidth: '34px' }}>{emp.completion_pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: '600', background: statusBg, color: statusColor, border: `1px solid ${statusColor}30` }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Move ${emp.name} to next module?`)) return;
                              try {
                                await api.post(`/employees/${emp.id}/control?action=next`);
                                fetchData();
                              } catch (err) {
                                alert('Failed: ' + (err.response?.data?.detail || err.message));
                              }
                            }}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '0.4rem', cursor: 'pointer' }}
                          >
                            Next →
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Move ${emp.name} to previous module?`)) return;
                              try {
                                await api.post(`/employees/${emp.id}/control?action=prev`);
                                fetchData();
                              } catch (err) {
                                alert('Failed: ' + (err.response?.data?.detail || err.message));
                              }
                            }}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '0.4rem', cursor: 'pointer' }}
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Reset ALL onboarding for ${emp.name}? This cannot be undone.`)) return;
                              try {
                                await api.post(`/employees/${emp.id}/control?action=reset_all`);
                                fetchData();
                              } catch (err) {
                                alert('Failed: ' + (err.response?.data?.detail || err.message));
                              }
                            }}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.4rem', cursor: 'pointer' }}
                          >
                            Reset All
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No employees yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-item {
          display: flex; align-items: center; gap: 0.75rem; width: 100%;
          padding: 0.85rem 1rem; background: transparent; border: none;
          color: var(--text-muted); font-weight: 500; font-size: 0.95rem;
          border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
        .nav-item.active { background: var(--surface-card); color: var(--primary-color); border: 1px solid var(--border); }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th { padding: 1rem 1.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); border-bottom: 1px solid var(--border); }
        .data-table td { padding: 1rem 1.5rem; font-size: 0.9rem; border-bottom: 1px solid var(--border); }
      `}} />
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: '1' }}>{value}</p>
      <p style={{ fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '0.05em', marginTop: '0.25rem' }}>{label}</p>
    </div>
  </div>
);

export default HRDashboard;
