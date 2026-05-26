import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
      setSent(true); // always show success (backend doesn't reveal if email exists)
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '420px' }}>

        {sent ? (
          /* ── Success State ── */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            }}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Check your inbox!</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              We've sent a password reset link to
            </p>
            <p style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '2rem' }}>{email}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              The link expires in <strong>30 minutes</strong>. Check your spam folder if you don't see it.
            </p>
            <button
              className="btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)' }}
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Send again
            </button>
            <div style={{ marginTop: '1.5rem' }}>
              <Link to="/login" style={{ color: 'var(--primary-color)', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <Mail size={28} color="var(--primary-color)" />
              </div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Reset Password</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  autoFocus
                />
              </div>

              <button type="submit" className="btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login" style={{ color: 'var(--primary-color)', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
