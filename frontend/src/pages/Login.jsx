import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      // Fetch user profile to check if first login
      const userRes = await api.get('/auth/me');
      const user = userRes.data;
      
      if (user.is_first_login) {
        navigate('/reset-password');
      } else if (user.role === 'admin' || user.role === 'hr') {
        navigate('/hr-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left Column */}
      <div className="auth-left">
        <div>
          <span style={{ fontSize: '2.5rem' }}>🚀</span>
        </div>
        <h1 className="brand-title">HR Onboarding</h1>
        <div className="brand-subtitle">PORTAL</div>

        <div className="feature-list">
          <div className="feature-item">
            <span>📋</span> Structured onboarding workflow
          </div>
          <div className="feature-item">
            <span>📚</span> Learning content & assessments
          </div>
          <div className="feature-item">
            <span>📁</span> Document management
          </div>
          <div className="feature-item">
            <span>📊</span> Real-time progress tracking
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="auth-right">
        <div className="auth-card">
          <h1>Welcome to Accops!👋</h1>
          <p className="subtitle">Sign in to your onboarding portal</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>EMAIL ADDRESS</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label>PASSWORD</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              <span>➔</span> {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="support-text">
            Having trouble? Contact HR at <a href="mailto:hr@accops.com">hr@accops.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
