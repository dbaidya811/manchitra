import React from 'react';

const LoginPage = ({ setCurrentView }) => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Welcome Back!</h2>
          <p>Login to continue pandal hopping</p>
        </div>
        <div className="auth-input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" className="auth-input" />
        </div>
        <div className="auth-input-group">
          <label>Password</label>
          <input type="password" placeholder="Enter your password" className="auth-input" />
        </div>
        <div className="auth-links">
          <span className="auth-link" onClick={() => setCurrentView('forgot-password')}>Forgot Password?</span>
        </div>
        <button className="auth-btn" onClick={() => setCurrentView('dashboard')}>Login</button>
        
        <div className="auth-link-center">
          <span style={{ color: '#666' }}>Don't have an account? </span>
          <span className="auth-link" onClick={() => setCurrentView('signup')}>Sign Up</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;