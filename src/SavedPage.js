import React from 'react';
import './App.css';

const SavedPage = ({ savedPandals = {}, allPandals = [], toggleSave, handleGuideMe }) => {
  // Filter only the pandals that are saved
  const savedList = allPandals.filter(p => savedPandals[p.id]);

  return (
    <div className="saved-page">
      <div className="saved-header">
        <h2>Saved Pandals</h2>
        <p>Your shortlisted locations for hopping</p>
      </div>
      
      <div className="saved-list">
        {savedList.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <p style={{ color: '#666', fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No saved pandals yet.</p>
            <span style={{ fontSize: '13px', color: '#999' }}>Tap the bookmark icon to save your favorites.</span>
          </div>
        ) : (
          savedList.map(pandal => (
          <div key={pandal.id} className="saved-card">
            <div className="saved-image bg-1" style={pandal.imageUrl ? { backgroundImage: `url(http://localhost:5000${pandal.imageUrl})` } : {}}>
              <button className="remove-save-btn" aria-label="Remove Saved" onClick={() => toggleSave && toggleSave(pandal.id)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#c8102e" stroke="#c8102e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <span className="saved-distance">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {pandal.distance}
              </span>
            </div>
            <div className="saved-info">
              <h4>{pandal.name}</h4>
              <p>{pandal.description}</p>
              <button className="route-btn" onClick={() => handleGuideMe && handleGuideMe(pandal)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
                Get Directions
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SavedPage;
