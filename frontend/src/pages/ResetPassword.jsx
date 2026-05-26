import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null=checking, true, false
  const navigate = useNavigate();

  // ── If this is a first-login reset (no token in URL), handle differently ──
  const isFirstLogin = !token;

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(true); // first-login flow — no external token needed
      return;
    }
    const verify = async () => {
      try {
        await api.get(`/auth/verify-reset-token?token=${token}`);
        setTokenValid(true);
      } catch {
        setTokenValid(false);
      }
    };
    verify();
  }, [token]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      if (isFirstLogin) {
        // First-login: authenticated endpoint
        await api.post('/auth/reset-password', { new_password: password });
        navigate('/dashboard');
      } else {
        // Forgot-password: token-based endpoint
        await api.post(`/auth/reset-password-by-token?token=${token}`, { new_password: password });
        setDone(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Token checking state ──
  if (!isFirstLogin && tokenValid === null) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  // ── Invalid token ──
  if (!isFirstLogin && tokenValid === false) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <XCircle size={32} color="#ef4444" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Link Expired</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            This password reset link is invalid or has expired (links are valid for 30 minutes).
          </p>
          <Link to="/forgot-password">
            <button className="btn">Request a new link</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={32} color="#10b981" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Password Updated!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <button className="btn" onClick={() => navigate('/login')}>Go to Login</button>
        </div>
      </div>
    );
  }

  // ── Reset form ──
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Lock size={28} color="var(--primary-color)" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isFirstLogin ? 'Set Your Password' : 'Create New Password'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isFirstLogin ? 'Please set a new password for your account' : 'Enter a strong new password below'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleReset}>
          <div className="form-group">
            <label>NEW PASSWORD</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>CONFIRM PASSWORD</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your password"
            />
          </div>

          {/* Password strength hint */}
          {password && (
            <div style={{ fontSize: '0.75rem', color: password.length >= 8 ? '#10b981' : '#f59e0b', marginBottom: '1rem' }}>
              {password.length >= 8 ? '✓ Password length OK' : `⚠ ${8 - password.length} more characters needed`}
            </div>
          )}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Updating…' : 'Set New Password'}
          </button>
        </form>

        {!isFirstLogin && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/login" style={{ color: 'var(--primary-color)', fontSize: '0.9rem', textDecoration: 'none' }}>
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
