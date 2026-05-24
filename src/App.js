import React, { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const App = () => {
  const [currentView, setCurrentView] = useState('landing');

  // Render based on current view
  if (currentView === 'dashboard') {
    return <Dashboard />;
  }
  if (currentView === 'login') {
    return <LoginPage setCurrentView={setCurrentView} />;
  }
  if (currentView === 'signup') {
    return <SignupPage setCurrentView={setCurrentView} />;
  }
  if (currentView === 'forgot-password') {
    return <ForgotPasswordPage setCurrentView={setCurrentView} />;
  }

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-logo">
          <span className="logo-icon-large">M</span>
        </div>
        <h1 className="landing-title">manchitra</h1>
        <p className="landing-subtitle">Your Ultimate Pandal Hopping Partner</p>
        
        <button className="start-btn" onClick={() => setCurrentView('login')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Start Hopping 
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default App;
