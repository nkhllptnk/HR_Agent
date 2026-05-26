import './App.css'

function App() {
  return (
    <div className="app-container">
      {/* Left Side Branding */}
      <div className="hero-section">
        <div className="brand-wrapper">
          <div className="logo-icon">🚀</div>
          <h1>HR Onboarding</h1>
          <div className="subtitle">PORTAL</div>
        </div>

        <div className="features-list">
          <div className="feature-item delay-1">
            <span className="feature-icon">📄</span>
            <span className="feature-text">Structured onboarding workflow</span>
          </div>
          <div className="feature-item delay-2">
            <span className="feature-icon">📚</span>
            <span className="feature-text">Learning content & assessments</span>
          </div>
          <div className="feature-item delay-3">
            <span className="feature-icon">📁</span>
            <span className="feature-text">Document management</span>
          </div>
          <div className="feature-item delay-4">
            <span className="feature-icon">📊</span>
            <span className="feature-text">Real-time progress tracking</span>
          </div>
        </div>
      </div>

      {/* Right Side Login Form */}
      <div className="login-section">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back <span className="wave-emoji">👋</span></h2>
            <p>Sign in to your onboarding portal</p>
          </div>

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label htmlFor="email">EMAIL ADDRESS</label>
              <input 
                type="email" 
                id="email" 
                placeholder="your@email.com" 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">PASSWORD</label>
              <input 
                type="password" 
                id="password" 
                placeholder="Enter your password" 
                required 
              />
            </div>

            <a href="#" className="forgot-password">Forgot password?</a>

            <button type="submit" className="btn-primary">
              Sign In <span className="btn-icon">→</span>
            </button>
          </form>

          <div className="login-footer">
            Having trouble? Contact HR at <a href="mailto:hr@accops.com">hr@accops.com</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
