import React, { useState } from 'react';
import './App.css';
import MapPage from './MapPage';
import SavedPage from './SavedPage';
import ProfilePage from './ProfilePage';
import NotificationPage from './NotificationPage';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedPandals, setSavedPandals] = useState({});

  const toggleSave = (id) => {
    setSavedPandals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-container">
          <h1 className="logo-text">manchitra</h1>
        </div>
        <button 
          className="icon-btn" 
          aria-label="Notifications" 
          onClick={() => setActiveTab('notifications')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'home' && (
          <>
        {/* Hero / Greeting */}
        <section className="hero-section">
          <h2 className="greeting-text">
            <span>Shubho Sharadiya!</span> 
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff7b00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
            </svg>
          </h2>
          <p className="greeting-subtext">Your ultimate guide to pandal hopping. Find, explore, and navigate easily.</p>
        </section>

        {/* Search */}
        <div className="search-container">
          <input type="text" placeholder="Search pandals or locations..." className="search-input" />
          <button className="search-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        {/* Quick Filters */}
        <div className="filters-container">
          <button className="filter-pill active">Nearby</button>
          <button className="filter-pill">Top Rated</button>
          <button className="filter-pill">South Kolkata</button>
          <button className="filter-pill">North Kolkata</button>
          <button className="filter-pill">Food Stalls</button>
        </div>

        {/* Pandal List */}
        <section className="pandal-list-section">
          <div className="section-header">
            <h3 className="section-title">Trending Pandals</h3>
            <span className="see-all">See All</span>
          </div>
          
          <div className="pandal-list-horizontal">
          <div className="pandal-card">
            <div className="pandal-image bg-1">
              <button className="save-btn" aria-label="Save Pandal" onClick={() => toggleSave('pandal1')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill={savedPandals['pandal1'] ? "#c8102e" : "none"} stroke={savedPandals['pandal1'] ? "#c8102e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
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

          <div className="pandal-card">
            <div className="pandal-image bg-2">
              <button className="save-btn" aria-label="Save Pandal" onClick={() => toggleSave('pandal2')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill={savedPandals['pandal2'] ? "#c8102e" : "none"} stroke={savedPandals['pandal2'] ? "#c8102e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>
              <span className="distance-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                2.8 km
              </span>
            </div>
            <div className="pandal-info">
              <h4>Deshapriya Park</h4>
              <p>Known for the tallest Durga idol history.</p>
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
        </section>
          </>
        )}
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'saved' && <SavedPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'notifications' && <NotificationPage />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </span>
          <span>Home</span>
        </div>
        <div className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
          </span>
          <span>Map</span>
        </div>
        
        {/* Center Floating Plus Button */}
        <div className="nav-fab-wrapper">
          <div className="nav-fab" aria-label="Add or Create" onClick={() => setIsModalOpen(true)}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
        </div>

        <div className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </span>
          <span>Saved</span>
        </div>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </span>
          <span>Profile</span>
        </div>
      </nav>

      {/* Add / Create Modal Popup */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="modal-body">
              <button className="modal-action-btn"><span className="modal-action-icon">📸</span> Add Pandal Photo</button>
              <button className="modal-action-btn"><span className="modal-action-icon">📍</span> Check-in Here</button>
              <button className="modal-action-btn"><span className="modal-action-icon">⭐</span> Write a Review</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;