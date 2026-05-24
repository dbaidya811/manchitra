import React from 'react';

const SavedPage = () => {
  return (
    <div>
      <div className="section-header" style={{ marginTop: '10px' }}>
        <h3 className="section-title">Saved Pandals</h3>
      </div>
      
      {/* Single Saved Card Example */}
      <div className="pandal-card">
        <div className="pandal-image bg-1">
          <span className="distance-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            1.2 km
          </span>
        </div>
        <div className="pandal-info">
          <h4>Ballygunge Cultural Association</h4>
          <p>Famous for traditional idol and lighting.</p>
          <button className="navigate-btn">
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
    </div>
  );
};

export default SavedPage;