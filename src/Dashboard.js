import React, { useState, useEffect } from 'react';
import './App.css';
import MapPage from './MapPage';
import SavedPage from './SavedPage';
import ProfilePage from './ProfilePage';
import NotificationPage from './NotificationPage';
import MyPostsPage from './MyPostsPage';
import SeeAllPage from './SeeAllPage';
import PostPage from './PostPage';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [savedPandals, setSavedPandals] = useState({});
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate initial data loading for skeleton effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = (e) => {
    if (e.target.scrollTop > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Dummy data for home page pandals categorized by area
  const dummyPandals = [
    {
      id: 'pandal1',
      name: 'Ballygunge Cultural Association',
      area: 'South Kolkata',
      description: 'Famous for traditional idol and lighting.',
      distance: '1.2 km',
      imageClass: 'bg-1',
      isNearby: true,
      isTopRated: true,
      postedBy: 'A'
    },
    {
      id: 'pandal2',
      name: 'Deshapriya Park',
      area: 'South Kolkata',
      description: 'Known for the tallest Durga idol history.',
      distance: '2.8 km',
      imageClass: 'bg-2',
      isTrending: true,
      postedBy: 'S'
    },
    {
      id: 'pandal3',
      name: 'Bagbazar Sarbojonin',
      area: 'North Kolkata',
      description: 'A century-old traditional puja.',
      distance: '5.4 km',
      imageClass: 'bg-1',
      isTopRated: true,
      postedBy: 'R'
    },
    {
      id: 'pandal4',
      name: 'Kumartuli Park',
      area: 'North Kolkata',
      description: 'Renowned for theme and architecture.',
      distance: '6.1 km',
      imageClass: 'bg-2',
      isTrending: true,
      postedBy: 'M'
    },
    {
      id: 'pandal5',
      name: 'Sreebhumi Sporting',
      area: 'Salt Lake & New Town',
      description: 'Spectacular themes and grand lighting.',
      distance: '8.2 km',
      imageClass: 'bg-1',
      isTrending: true,
      isTopRated: true,
      postedBy: 'P'
    }
  ];

  const filteredPandals = dummyPandals.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoriesData = {
    'Nearby': filteredPandals.filter(p => p.isNearby),
    'Trending': filteredPandals.filter(p => p.isTrending),
    'Top Rated': filteredPandals.filter(p => p.isTopRated)
  };

  filteredPandals.forEach(pandal => {
    if (!categoriesData[pandal.area]) categoriesData[pandal.area] = [];
    categoriesData[pandal.area].push(pandal);
  });

  Object.keys(categoriesData).forEach(key => {
    if (categoriesData[key].length === 0) delete categoriesData[key];
  });

  const filterOptions = ['All', ...Object.keys(categoriesData)];

  const toggleSave = (id) => {
    setSavedPandals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // State to manage user's posts
  const [myPosts, setMyPosts] = useState([]);

  const handleDeletePost = (id) => {
    setMyPosts(myPosts.filter(post => post.id !== id));
  };

  const handlePostSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Start micro loading
    const formData = new FormData(e.target);
    
    // Simulate network request for 1 second
    setTimeout(() => {
      const newPost = {
        id: Date.now(),
        pandalName: formData.get('pandalName'),
        area: formData.get('area'),
        time: "Just now",
        content: formData.get('description'),
        likes: 0,
        comments: 0,
        imageClass: "bg-1"
      };
      
      setMyPosts([newPost, ...myPosts]);
      setIsSubmitting(false); // Stop micro loading
      setActiveTab('my-posts');
    }, 1000);
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
      <main className="main-content" onScroll={handleScroll}>
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
          <input 
            type="text" 
            placeholder="Search pandals or locations..." 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>

        {/* Quick Filters */}
        <div className="filters-container">
          {filterOptions.map(option => (
            <button 
              key={option} 
              className={`filter-pill ${activeFilter === option ? 'active' : ''}`} 
              onClick={() => setActiveFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Empty State for Search */}
        {Object.keys(categoriesData).length === 0 && (
          <div className="empty-state" style={{ marginTop: '30px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p>No pandals found for "{searchQuery}"</p>
          </div>
        )}

        {/* Pandal Lists by Category / Area */}
        {isLoading ? (
          /* Skeleton Loading UI */
          <section className="pandal-list-section" style={{ marginBottom: '25px' }}>
            <div className="section-header">
              <div className="skeleton skeleton-text" style={{ width: '120px', height: '24px' }}></div>
              <div className="skeleton skeleton-text" style={{ width: '50px', height: '16px' }}></div>
            </div>
            <div className="pandal-list-horizontal">
              {[1, 2].map(i => (
                <div key={i} className="pandal-card skeleton-card">
                  <div className="skeleton skeleton-image" style={{ height: '180px' }}></div>
                  <div className="pandal-info">
                    <div className="skeleton skeleton-text" style={{ width: '80%', height: '20px', marginBottom: '8px' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px', marginBottom: '15px' }}></div>
                    <div className="skeleton skeleton-button" style={{ width: '100%', height: '44px', borderRadius: '16px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* Actual Data */
          Object.entries(categoriesData)
        .filter(([category]) => activeFilter === 'All' || activeFilter === category)
        .map(([category, pandals]) => (
          <section key={category} className="pandal-list-section" style={{ marginBottom: '25px' }}>
            <div className="section-header">
              <h3 className="section-title">{category}</h3>
              <span className="see-all" onClick={() => {
                setSelectedCategory(category);
                setActiveTab('see-all');
              }}>
                See All
              </span>
            </div>
            
            <div className="pandal-list-horizontal">
              {pandals.map(pandal => (
                <div key={pandal.id} className="pandal-card">
                  <div className={`pandal-image ${pandal.imageClass}`}>
                    <div className="card-user-dp" title="Posted by User">{pandal.postedBy || 'U'}</div>
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
              ))}
            </div>
          </section>
        ))
        )}
          </>
        )}
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'saved' && <SavedPage />}
        {activeTab === 'profile' && <ProfilePage setActiveTab={setActiveTab} />}
        {activeTab === 'notifications' && <NotificationPage />}
        {activeTab === 'my-posts' && <MyPostsPage posts={myPosts} setActiveTab={setActiveTab} handleDeletePost={handleDeletePost} />}
        {activeTab === 'see-all' && selectedCategory && (
          <SeeAllPage 
            category={selectedCategory} 
            pandals={categoriesData[selectedCategory]} 
            setActiveTab={setActiveTab} 
            savedPandals={savedPandals} 
            toggleSave={toggleSave} 
          />
        )}
        {activeTab === 'post' && <PostPage setActiveTab={setActiveTab} handlePostSubmit={handlePostSubmit} isSubmitting={isSubmitting} />}
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button className="scroll-to-top-btn" onClick={scrollToTop} aria-label="Scroll to Top">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}

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
          <div className="nav-fab" aria-label="Add or Create" onClick={() => setActiveTab('post')}>
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
    </div>
  );
};

export default Dashboard;