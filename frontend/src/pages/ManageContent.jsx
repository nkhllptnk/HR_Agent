import React, { useState, useEffect } from 'react';
import { 
  Plus, Video, FileText, Trash2, Edit2, Save, X, Upload, 
  ChevronRight, ChevronDown, CheckCircle, BarChart3, Users, LayoutDashboard, Settings, LogOut,
  Lock, ArrowUp, ArrowDown, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';


const ManageContent = () => {
  const [contents, setContents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [newContent, setNewContent] = useState({
    title: '', description: '', content_type: 'video', file_url: '', order: 0
  });
  const [mcqs, setMcqs] = useState({}); // content_id -> list of mcqs
  const [showMcqModal, setShowMcqModal] = useState(null); // content_id
  const [newMcq, setNewMcq] = useState({
    question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A'
  });
  const navigate = useNavigate();
  

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const res = await api.get('/content/');
      setContents(res.data);
      // Fetch MCQs for each content
      res.data.forEach(c => fetchMcqs(c.id));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMcqs = async (contentId) => {
    try {
      const res = await api.get(`/content/${contentId}/mcqs`);
      setMcqs(prev => ({ ...prev, [contentId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    try {
      if (editingContent) {
        await api.put(`/content/${editingContent.id}`, newContent);
      } else {
        await api.post('/content/', newContent);
      }
      setShowAddModal(false);
      setEditingContent(null);
      setNewContent({ title: '', description: '', content_type: 'video', file_url: '', order: contents.length });
      fetchContents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await api.delete(`/content/${id}`);
      fetchContents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddMcq = async (e) => {
    e.preventDefault();
    try {
      await api.post('/content/mcqs', { ...newMcq, content_id: showMcqModal });
      setNewMcq({ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' });
      fetchMcqs(showMcqModal);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteMcq = async (contentId, mcqId) => {
    try {
      await api.delete(`/content/mcqs/${mcqId}`);
      fetchMcqs(contentId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  const handleReorder = async (contentId, direction) => {
    const nonIntro = contents.filter(c => !c.is_intro);
    const idx = nonIntro.findIndex(c => c.id === contentId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === nonIntro.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...nonIntro];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];

    const orderData = updated.map((c, i) => ({ id: c.id, order: i + 1 }));

    try {
      await api.put('/content/reorder', orderData);
      fetchContents();
    } catch (err) {
      alert('Reorder failed: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/content/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewContent({ ...newContent, file_url: res.data.url });
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar (Partial copy for consistency) */}
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

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="nav-item" onClick={() => navigate('/hr-dashboard')}>
            <LayoutDashboard size={20} /> HR Dashboard
          </button>
          <button className="nav-item">
            <Users size={20} /> Employees
          </button>
          <button className="nav-item active">
            <Settings size={20} /> Manage Content
          </button>
          <button className="nav-item" onClick={() => navigate('/activity-logs')}>
  <Activity size={20} /> Activity Logs
</button>
        </nav>

        <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }}>
          <LogOut size={20} /> Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <Settings size={24} color="var(--primary-color)" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Manage Onboarding Content</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload videos, PDFs, and create assessment MCQs</p>
          </div>
          <button className="btn" style={{ width: 'auto' }} onClick={() => { setEditingContent(null); setNewContent({ title: '', description: '', content_type: 'video', file_url: '', order: contents.length }); setShowAddModal(true); }}>
            <Plus size={20} style={{ marginRight: '0.5rem' }} /> Add Content
          </button>
        </header>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {contents.map((item, index) => (

            <div key={item.id} className="card" style={{ padding: '0' }}>
              <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    {item.content_type === 'video' ? <Video size={24} color="#6366f1" /> : <FileText size={24} color="#10b981" />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
  <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{item.is_intro ? '🔒 Introduction' : item.title}</h3>
  {!item.is_intro && (
    <button
      onClick={async () => {
        try {
          await api.put(`/content/${item.id}/toggle`);
          fetchContents();
        } catch (err) {
          alert('Toggle failed: ' + err.message);
        }
      }}
      style={{
        padding: '0.2rem 0.6rem',
        borderRadius: '1rem',
        fontSize: '0.72rem',
        fontWeight: '600',
        cursor: 'pointer',
        border: 'none',
        background: item.is_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: item.is_enabled ? '#22c55e' : '#ef4444',
        border: `1px solid ${item.is_enabled ? '#22c55e' : '#ef4444'}`,
      }}
    >
      {item.is_enabled ? 'Enabled' : 'Disabled'}
    </button>
  )}
</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.description || 'No description'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {item.is_intro ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '0.3rem 0.75rem', borderRadius: '1rem', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <Lock size={12} /> Locked — Always First
                    </span>
                  ) : (
                    <>
                      <button className="btn-icon" title="Move Up" onClick={() => handleReorder(item.id, 'up')}><ArrowUp size={16} /></button>
                      <button className="btn-icon" title="Move Down" onClick={() => handleReorder(item.id, 'down')}><ArrowDown size={16} /></button>
                    </>
                  )}
                  <button className="btn-icon" onClick={() => { setEditingContent(item); setNewContent(item); setShowAddModal(true); }}><Edit2 size={18} /></button>
                  {!item.is_intro && (
                    <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDeleteContent(item.id)}><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} color="var(--primary-color)" /> Assessment Questions ({mcqs[item.id]?.length || 0})
                  </h4>
                  <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }} onClick={() => setShowMcqModal(item.id)}>
                    Add Question
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {mcqs[item.id]?.map((m, idx) => (
                    <div key={m.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>{idx + 1}. {m.question}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: m.correct_answer === 'A' ? 'var(--primary-color)' : 'inherit' }}>A: {m.option_a}</span>
                          <span style={{ color: m.correct_answer === 'B' ? 'var(--primary-color)' : 'inherit' }}>B: {m.option_b}</span>
                          <span style={{ color: m.correct_answer === 'C' ? 'var(--primary-color)' : 'inherit' }}>C: {m.option_c}</span>
                          <span style={{ color: m.correct_answer === 'D' ? 'var(--primary-color)' : 'inherit' }}>D: {m.option_d}</span>
                        </div>
                      </div>
                      <button className="btn-icon" style={{ height: 'fit-content', color: '#ef4444' }} onClick={() => handleDeleteMcq(item.id, m.id)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="auth-card" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingContent ? 'Edit Content' : 'Add New Content'}</h2>
            <form onSubmit={handleAddContent}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" className="form-control" required value={newContent.title} onChange={e => setNewContent({...newContent, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows="2" value={newContent.description} onChange={e => setNewContent({...newContent, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={newContent.content_type} onChange={e => setNewContent({...newContent, content_type: e.target.value})}>
                  <option value="video">Video URL / Upload</option>
                  <option value="pdf">PDF Document</option>
                </select>
              </div>
              <div className="form-group">
                <label>File URL or Upload</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="form-control" value={newContent.file_url} onChange={e => setNewContent({...newContent, file_url: e.target.value})} placeholder="https://youtube.com/..." />
                  <label className="btn" style={{ width: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Upload size={18} />
                    <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn">Save Content</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add MCQ Modal */}
      {showMcqModal && (
        <div className="modal-overlay">
          <div className="auth-card" style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Add MCQ Question</h2>
            <form onSubmit={handleAddMcq}>
              <div className="form-group">
                <label>Question</label>
                <input type="text" className="form-control" required value={newMcq.question} onChange={e => setNewMcq({...newMcq, question: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Option A</label>
                  <input type="text" className="form-control" required value={newMcq.option_a} onChange={e => setNewMcq({...newMcq, option_a: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Option B</label>
                  <input type="text" className="form-control" required value={newMcq.option_b} onChange={e => setNewMcq({...newMcq, option_b: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Option C</label>
                  <input type="text" className="form-control" required value={newMcq.option_c} onChange={e => setNewMcq({...newMcq, option_c: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Option D</label>
                  <input type="text" className="form-control" required value={newMcq.option_d} onChange={e => setNewMcq({...newMcq, option_d: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Correct Answer</label>
                <select className="form-control" value={newMcq.correct_answer} onChange={e => setNewMcq({...newMcq, correct_answer: e.target.value})}>
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowMcqModal(null)}>Cancel</button>
                <button type="submit" className="btn">Add Question</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.85rem 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.95rem;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .nav-item.active {
          background: var(--surface-card);
          color: var(--primary-color);
          border: 1px solid var(--border);
        }
        .btn-icon {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text-muted);
          width: 36px;
          height: 36px;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-main);
        }
      `}} />
    </div>
  );
};

export default ManageContent;


