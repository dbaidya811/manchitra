import React from 'react';

const MapPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '40px' }}>
      <div style={{ backgroundColor: '#f9f9f9', width: '100%', height: '350px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '2px dashed #ddd' }}>
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ff7b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
          <line x1="8" y1="2" x2="8" y2="18"></line>
          <line x1="16" y1="6" x2="16" y2="22"></line>
        </svg>
      </div>
      <h3 style={{ color: '#333' }}>Live Pandal Map</h3>
      <p style={{ color: '#777', textAlign: 'center', marginTop: '10px', padding: '0 20px' }}>
        Explore pandals around you. Route directions and live traffic will be available here!
      </p>
    </div>
  );
};

export default MapPage;