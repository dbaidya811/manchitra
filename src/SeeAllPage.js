import React from 'react';
import './App.css';

const SeeAllPage = ({ category, pandals, setActiveTab, savedPandals, toggleSave, visitedPandals, toggleVisited, handleGuideMe }) => {
  return (
    <div className="see-all-page">
      <div className="see-all-header">
        <button className="back-btn" onClick={() => setActiveTab('home')} aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2>{category}</h2>
      </div>

      <div className="see-all-list">
        {pandals.map(pandal => (
          <div key={pandal.id} className="pandal-card see-all-card">
            <div className="pandal-image bg-1" style={pandal.imageUrl ? { backgroundImage: `url(http://localhost:5000${pandal.imageUrl})` } : {}}>
              <div className="card-user-dp" title="Posted by User">
                {pandal.userPicture && pandal.userPicture.startsWith('http') ? (
                  <img src={pandal.userPicture} alt="User DP" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                ) : (
                  pandal.postedBy || 'U'
                )}
              </div>
              <button className="save-btn" aria-label="Save Pandal" onClick={() => toggleSave(pandal.id)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill={savedPandals[pandal.id] ? "#c8102e" : "none"} stroke={savedPandals[pandal.id] ? "#c8102e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <span className="distance-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {pandal.distance}
              </span>
            </div>
            <div className="pandal-info">
              <h4>{pandal.name}</h4>
              <p>{pandal.description}</p>
              <button className="navigate-btn" onClick={() => handleGuideMe && handleGuideMe(pandal)}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                  </svg>
                  Guide Me to Pandal
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeeAllPage;