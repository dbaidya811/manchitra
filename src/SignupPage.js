import React from 'react';

const SignupPage = ({ setCurrentView }) => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join the ultimate pandal hopping community</p>
        </div>
        <div className="auth-input-group">
          <label>Full Name</label>
          <input type="text" placeholder="Enter your full name" className="auth-input" />
        </div>
        <div className="auth-input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" className="auth-input" />
        </div>
        <div className="auth-input-group">
          <label>Password</label>
          <input type="password" placeholder="Create a password" className="auth-input" />
        </div>
        <button className="auth-btn" onClick={() => setCurrentView('dashboard')}>Sign Up</button>
        <div className="auth-link-center">
          <span style={{ color: '#666' }}>Already have an account? </span>
          <span className="auth-link" onClick={() => setCurrentView('login')}>Login</span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;