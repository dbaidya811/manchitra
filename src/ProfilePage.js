import React, { useState, useEffect } from 'react';
import './App.css';

const ProfilePage = ({ setActiveTab }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.body.classList.contains('dark-mode'));
  }, []);

  const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    setIsDarkMode(document.body.classList.contains('dark-mode'));
  };

  return (
    <div className="profile-page">
      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar">
          <span>A</span>
        </div>
        <div className="profile-user-info">
          <h3>Aritra Das</h3>
          <p>aritra.das@example.com</p>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="profile-stats">
        <div className="stat-box">
          <h4>12</h4>
          <p>Visited</p>
        </div>
        <div className="stat-box">
          <h4>5</h4>
          <p>Reviews</p>
        </div>
        <div className="stat-box">
          <h4>3</h4>
          <p>Saved</p>
        </div>
      </div>

      {/* Settings Menu List */}
      <div className="profile-menu-list">
        
        {/* Auto Intelligent Option */}
        <div className="profile-menu-item auto-ai" onClick={() => alert('Auto Intelligent AI is getting ready!')}>
          <div className="menu-icon ai-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
            </svg>
          </div>
          <span className="ai-text">
            Auto Intelligent AI
          </span>
          <div className="menu-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <div className="profile-menu-item" onClick={toggleDarkMode}>
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </div>
          <span>Dark Mode</span>
          <div className={`toggle-switch ${isDarkMode ? 'active' : ''}`}>
            <div className={`switch-ball ${isDarkMode ? 'on' : ''}`}></div>
          </div>
        </div>

        {/* My Posts Option */}
        <div className="profile-menu-item" onClick={() => setActiveTab('my-posts')}>
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span>My Posts</span>
          <div className="menu-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        {/* Logout Option */}
        <div className="profile-menu-item logout">
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
