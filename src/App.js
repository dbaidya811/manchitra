import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './Dashboard';

const App = () => {
  const [currentView, setCurrentView] = useState('landing');

  // Automatically transition from landing to dashboard after a delay
  useEffect(() => {
    if (currentView === 'landing') {
      const timer = setTimeout(() => {
        setCurrentView('dashboard');
      }, 2500); // 2.5 seconds splash screen delay
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  // Render based on current view
  if (currentView === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-logo">
          <img src="https://cdn-icons-png.flaticon.com/512/1001/1001022.png" alt="Manchitra Logo" className="logo-icon-large" />
        </div>
      </div>
      <div className="landing-bottom-text">
        <h1 className="landing-title">manchitra</h1>
        <p className="landing-subtitle">Your Ultimate Pandal Hopping Partner</p>
      </div>
    </div>
  );
};

export default App;
