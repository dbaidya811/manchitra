import React, { useState, useEffect } from 'react';
import './App.css';

const ProfilePage = ({ setActiveTab, user, savedCount = 0, postsCount = 0, settings, handleSettingChange }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    setIsDarkMode(document.body.classList.contains('dark-mode'));
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    setIsDarkMode(isDark);
    localStorage.setItem('manchitra_theme', isDark ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('manchitra_user');
    window.location.reload();
  };

  const handleRefer = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Manchitra App',
        text: 'Check out Manchitra, your ultimate Pandal Hopping partner!',
        url: window.location.origin
      }).catch(err => console.error('Error sharing:', err));
    } else {
      alert('Share this link with your friends: ' + window.location.origin);
    }
  };

  return (
    <div className="profile-page">
      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar">
          {user?.picture ? (
            <img src={user.picture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          ) : (
            <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
          )}
        </div>
        <div className="profile-user-info">
          <h3>{user?.name || 'Guest User'}</h3>
          <p>{user?.email || 'Not logged in'}</p>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="profile-stats">
        <div className="stat-box">
          <h4>0</h4>
          <p>Visited</p>
        </div>
        <div className="stat-box">
          <h4>{postsCount}</h4>
          <p>Posts</p>
        </div>
        <div className="stat-box">
          <h4>{savedCount}</h4>
          <p>Saved</p>
        </div>
      </div>

      {/* Settings Menu List */}
      <div className="profile-menu-list">
        {/* Emergency Option */}
        <div className="profile-menu-item emergency" onClick={() => setShowEmergency(true)}>
          <div className="menu-icon" style={{ background: 'rgba(200, 16, 46, 0.1)', color: '#c8102e' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <span style={{ color: '#c8102e', fontWeight: '700' }}>Emergency Help</span>
          <div className="menu-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
        
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

      </div>

      {/* Map Settings Section */}
      <div className="profile-menu-list" style={{ marginTop: '20px' }}>
        <div className="profile-menu-item section-header">
            <span>Map Settings</span>
        </div>
        {/* Map Voice On/Off Toggle */}
        <div className="profile-menu-item">
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </div>
          <span>Map Voice</span>
          <div 
            className={`toggle-switch ${settings?.voiceEnabled ? 'active' : ''}`}
            onClick={() => handleSettingChange && handleSettingChange('voiceEnabled', !settings?.voiceEnabled)}
          >
            <div className={`switch-ball ${settings?.voiceEnabled ? 'on' : ''}`}></div>
          </div>
        </div>

        {/* Voice Gender Selection */}
        <div className="profile-menu-item">
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
            </svg>
          </div>
          <span>Voice Gender</span>
          <div className="segmented-control">
            <button 
              className={settings?.voiceGender === 'female' ? 'active' : ''}
              onClick={() => handleSettingChange && handleSettingChange('voiceGender', 'female')}
            >
              Female
            </button>
            <button 
              className={settings?.voiceGender === 'male' ? 'active' : ''}
              onClick={() => handleSettingChange && handleSettingChange('voiceGender', 'male')}
            >
              Male
            </button>
          </div>
        </div>

        {/* External Google Maps Toggle */}
        <div className="profile-menu-item">
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </div>
          <span>Use Google Maps</span>
          <div 
            className={`toggle-switch ${settings?.useExternalMap ? 'active' : ''}`}
            onClick={() => handleSettingChange && handleSettingChange('useExternalMap', !settings?.useExternalMap)}
          >
            <div className={`switch-ball ${settings?.useExternalMap ? 'on' : ''}`}></div>
          </div>
        </div>
      </div>

      {/* Account Actions Section */}
      <div className="profile-menu-list" style={{ marginTop: '20px' }}>
        {/* Refer Option */}
        <div className="profile-menu-item" onClick={handleRefer}>
          <div className="menu-icon" style={{ background: 'rgba(0, 120, 255, 0.1)', color: '#0078ff' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </div>
          <span>Refer a Friend</span>
          <div className="menu-arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>

        {/* Logout Option */}
        <div className="profile-menu-item logout" onClick={handleLogout}>
          <div className="menu-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>
          <span>Logout</span>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergency && (
        <div className="modal-overlay" onClick={() => setShowEmergency(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#c8102e' }}>Emergency Help</h3>
              <button className="modal-close-btn" onClick={() => setShowEmergency(false)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Kolkata Emergency Helplines</p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isDarkMode ? '#2a2a2a' : '#fafbfc', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: isDarkMode ? '#fff' : '#1a1a1a' }}>Police</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>100 / 112</p>
                </div>
                <a href="tel:100" style={{ background: 'rgba(200, 16, 46, 0.1)', color: '#c8102e', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Call</a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isDarkMode ? '#2a2a2a' : '#fafbfc', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: isDarkMode ? '#fff' : '#1a1a1a' }}>Fire Brigade</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>101</p>
                </div>
                <a href="tel:101" style={{ background: 'rgba(200, 16, 46, 0.1)', color: '#c8102e', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Call</a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isDarkMode ? '#2a2a2a' : '#fafbfc', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: isDarkMode ? '#fff' : '#1a1a1a' }}>Ambulance</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>102 / 108</p>
                </div>
                <a href="tel:102" style={{ background: 'rgba(200, 16, 46, 0.1)', color: '#c8102e', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Call</a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: isDarkMode ? '#2a2a2a' : '#fafbfc', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: isDarkMode ? '#fff' : '#1a1a1a' }}>Women Helpline</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>1091</p>
                </div>
                <a href="tel:1091" style={{ background: 'rgba(200, 16, 46, 0.1)', color: '#c8102e', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Call</a>
              </div>

              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((position) => {
                      const { latitude, longitude } = position.coords;
                      const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
                      if (navigator.share) {
                        navigator.share({
                          title: 'Emergency Location',
                          text: 'I am here, please help!',
                          url: mapsLink
                        });
                      } else {
                        alert(`Share this link: ${mapsLink}`);
                      }
                    }, () => {
                      alert('Could not get your location. Please check permissions.');
                    });
                  } else {
                    alert('Geolocation is not supported by this browser.');
                  }
                }}
                style={{ marginTop: '10px', padding: '14px', background: 'linear-gradient(135deg, #c8102e, #ff4c4c)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(200, 16, 46, 0.3)' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                Share Live Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
