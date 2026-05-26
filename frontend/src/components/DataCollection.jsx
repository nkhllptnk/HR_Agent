import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';

const DataCollection = ({ onNext }) => {
  const [formData, setFormData] = useState({ name: '', address: '', emergency: '' });

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Data Collection</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please provide your details for HR compliance.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="As per ID" />
        </div>
        <div className="form-group">
          <label>Emergency Contact</label>
          <input type="text" className="form-control" value={formData.emergency} onChange={e => setFormData({...formData, emergency: e.target.value})} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label>Residential Address</label>
          <input type="text" className="form-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" />
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Upload ID Document</label>
        <div style={{ border: '2px dashed var(--border)', borderRadius: '0.5rem', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
          <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Drag & drop your file here</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG up to 10MB</p>
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" style={{ width: 'auto' }} onClick={onNext} disabled={!formData.name || !formData.address || !formData.emergency}>
          Submit Details ➔
        </button>
      </div>
    </div>
  );
};

export default DataCollection;
