import React, { useState, useEffect } from 'react';
import './App.css';
import MapPage from './MapPage';
import SavedPage from './SavedPage';
import ProfilePage from './ProfilePage';
import NotificationPage from './NotificationPage';
import MyPostsPage from './MyPostsPage';
import SeeAllPage from './SeeAllPage';
import PostPage from './PostPage';
import { io } from 'socket.io-client';

const Dashboard = ({ user, globalUserLocation }) => {
  // Debugging: Check which component is undefined
  console.log("Checking Components:", { MapPage, SavedPage, ProfilePage, NotificationPage, MyPostsPage, SeeAllPage, PostPage });

  // State to manage all posts
  const [myPosts, setMyPosts] = useState([]);
  const userPosts = myPosts.filter(post => user && post.userEmail === user.email);
  const postsCount = userPosts.length;

  const [activeTab, setActiveTab] = useState('home');
  const [savedPandals, setSavedPandals] = useState(() => {
    const saved = localStorage.getItem('manchitra_saved');
    return saved ? JSON.parse(saved) : {};
  });
  const [visitedPandals, setVisitedPandals] = useState(() => {
    const visited = localStorage.getItem('manchitra_visited');
    return visited ? JSON.parse(visited) : {};
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('manchitra_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [targetPandal, setTargetPandal] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('manchitra_settings');
    return saved ? JSON.parse(saved) : { voiceEnabled: true, voiceGender: 'female', useExternalMap: false };
  });
  const [weatherChecked, setWeatherChecked] = useState(false);

  // Fetch data from backend directly (No .env used)
  useEffect(() => {
    fetch('http://localhost:5000/api/posts')
      .then(res => res.json())
      .then(data => {
        // Map backend 'description' to frontend 'content'
        const formattedPosts = data.map(p => ({ ...p, content: p.description }));
        setMyPosts(formattedPosts);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching posts:", err);
        setIsLoading(false);
      });
  }, []);

  // Data for home page pandals mapped from backend posts
  const allPandals = React.useMemo(() => myPosts.map(post => ({
    id: post.id,
    name: post.pandalName,
    area: post.area,
    description: post.description,
    location: post.location,
    parsedCoords: post.location && post.location.includes(',') ? post.location.split(',').map(c => parseFloat(c.trim())) : null,
    imageUrl: post.imageUrl,
    postedBy: post.userName ? post.userName.charAt(0).toUpperCase() : 'U',
    userPicture: post.userPicture,
    distance: "Nearby",
    isNearby: true, // Show all in Nearby for now
    isTrending: post.likes > 0,
    isTopRated: post.comments > 0
  })), [myPosts]);

  useEffect(() => {
    localStorage.setItem('manchitra_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('manchitra_saved', JSON.stringify(savedPandals));
  }, [savedPandals]);

  useEffect(() => {
    localStorage.setItem('manchitra_visited', JSON.stringify(visitedPandals));
  }, [visitedPandals]);

  useEffect(() => {
    localStorage.setItem('manchitra_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Establish Socket.io connection for real-time notifications
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('receive-notification', (newNotif) => {
      setNotifications(prev => {
        // Prevent duplicate notifications in case the sender receives it locally and via socket
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    });

    return () => socket.disconnect();
  }, []);

  // Free Weather Notification (Heat/Rain Alert) using Open-Meteo API
  useEffect(() => {
    if (globalUserLocation && !weatherChecked) {
      setWeatherChecked(true); // Ensure we only check once per session to avoid spamming
      
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${globalUserLocation.lat}&longitude=${globalUserLocation.lng}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current_weather) {
            const temp = data.current_weather.temperature;
            const code = data.current_weather.weathercode;
            let alertTitle = '';
            let alertMsg = '';

            // WMO Weather codes for rain/drizzle/thunderstorms
            const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
            
            if (temp >= 35) {
              alertTitle = '🌡️ High Temperature Alert';
              alertMsg = `It's very hot outside (${temp}°C). Please carry water and sunglasses while pandal hopping!`;
            } else if (rainCodes.includes(code)) {
              alertTitle = '🌧️ Rain Alert';
              alertMsg = 'Rain or bad weather is expected. Please carry an umbrella to stay safe!';
            }

            if (alertTitle) {
              setNotifications(prev => {
                // Prevent duplicate weather alerts in the list
                if (prev.some(n => n.title === alertTitle)) return prev;
                return [{ id: 'weather-' + Date.now(), type: 'alert', title: alertTitle, message: alertMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false }, ...prev];
              });
            }
          }
        })
        .catch(err => console.error("Weather fetch error:", err));
    }
  }, [globalUserLocation, weatherChecked]);

  // Auto-mark as visited if within 50 meters
  useEffect(() => {
    if (globalUserLocation && allPandals.length > 0) {
      let newlyVisited = false;
      const updatedVisited = { ...visitedPandals };

      const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
        // FAST PATH: Bounding Box Optimization
        // 0.0006 degrees is ~65 meters. If the difference is larger, it's impossible to be <= 50m.
        // This skips the expensive trigonometric math for 99% of locations!
        if (Math.abs(lat1 - lat2) > 0.0006 || Math.abs(lon1 - lon2) > 0.0006) {
          return Infinity;
        }

        const R = 6371e3;
        const p1 = lat1 * Math.PI / 180;
        const p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180;
        const dl = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      allPandals.forEach(pandal => {
        if (!updatedVisited[pandal.id] && pandal.parsedCoords) {
          const [lat, lng] = pandal.parsedCoords;
          if (!isNaN(lat) && !isNaN(lng)) {
            const distance = getDistanceMeters(globalUserLocation.lat, globalUserLocation.lng, lat, lng);
            if (distance <= 50) {
              updatedVisited[pandal.id] = true;
              newlyVisited = true;
              
              // Inform backend about the real-world visit to track crowd
              fetch(`http://localhost:5000/api/posts/${pandal.id}/visit`, { method: 'POST' })
                .catch(err => console.error("Error logging visit:", err));
            }
          }
        }
      });

      if (newlyVisited) {
        setVisitedPandals(updatedVisited);
        setToastMessage(`Pandal visited! Your visited count has increased.`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    }
  }, [globalUserLocation, allPandals, visitedPandals]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const filteredPandals = allPandals.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (p.area && p.area.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const savedCount = Object.values(savedPandals).filter(Boolean).length;

  const toggleVisited = (id) => {
    setVisitedPandals(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const visitedCount = Object.values(visitedPandals).filter(Boolean).length;

  const handleDeletePost = (id) => {
    setPostToDelete(id);
  };

  const confirmDeletePost = () => {
    if (!postToDelete) return;
    setIsDeleting(true);

    fetch(`http://localhost:5000/api/posts/${postToDelete}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        setMyPosts(myPosts.filter(post => post.id !== postToDelete));
        setPostToDelete(null);
        setToastMessage('Post deleted successfully!');
        setTimeout(() => setToastMessage(''), 3000);
      })
      .catch(err => {
        console.error("Error deleting post:", err);
        setPostToDelete(null);
      })
      .finally(() => setIsDeleting(false));
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setActiveTab('post');
  };

  const handleGuideMe = (pandal) => {
    if (!pandal.location) {
      alert("Location coordinates are missing for this pandal.");
      return;
    }
    const coords = pandal.location.split(',').map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      // Check if user prefers external Google Maps
      if (settings && settings.useExternalMap) {
        const [destLat, destLon] = coords;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}&travelmode=driving`;
        window.open(url, '_blank');
      } else {
        setTargetPandal({ coords, name: pandal.name });
        setActiveTab('map');
      }
    } else {
      alert("Invalid location coordinates for this pandal.");
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // Start micro loading
    const formData = new FormData(e.target);

    const isEdit = !!editingPost;
    const url = isEdit ? `http://localhost:5000/api/posts/${editingPost.id}` : 'http://localhost:5000/api/posts';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        body: formData
      });
      if (response.ok) {
        const savedPost = await response.json();
        savedPost.content = savedPost.description; 
        
        if (isEdit) {
          // Detect changes for notification
          let changes = [];
          if (editingPost.pandalName !== savedPost.pandalName) changes.push('Name');
          if (editingPost.description !== savedPost.description) changes.push('Description');
          if (editingPost.area !== savedPost.area) changes.push('Area');
          if (editingPost.location !== savedPost.location) changes.push('Location');
          
          if (changes.length > 0) {
            const newNotif = { 
              id: Date.now(), 
              type: 'update', 
              title: `${savedPost.pandalName || 'Pandal'} Updated`, 
              message: `Information was updated. Changes: ${changes.join(', ')}.`, 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              read: false 
            };
            setNotifications(prev => [newNotif, ...prev]);
          }

          setMyPosts(myPosts.map(p => p.id === savedPost.id ? savedPost : p));
          setToastMessage('Post updated successfully!');
        } else {
          const newNotif = { 
            id: Date.now(), 
            type: 'info', 
            title: `New Pandal Added`, 
            message: `${savedPost.pandalName || 'A new pandal'} was added to ${savedPost.area || 'the map'}.`, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
            read: false 
          };
          setNotifications(prev => [newNotif, ...prev]);

          setMyPosts([savedPost, ...myPosts]);
          setToastMessage('Post submitted successfully!');
        }
        
        setActiveTab('home');
        setEditingPost(null);
        setTimeout(() => setToastMessage(''), 3000); // 3 সেকেন্ড পর মেসেজটি চলে যাবে
      } else {
        const errData = await response.json();
        console.error("Backend error:", errData);
        alert("Failed to submit post: " + (errData.error || "Unknown Error"));
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      alert("Network error: Make sure the backend server is running.");
    } finally {
      setIsSubmitting(false); // Stop micro loading
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      {activeTab !== 'map' && (
        <header className="app-header">
          <div className="logo-container">
            <h1 className="logo-text">manchitra</h1>
          </div>
          <button 
            className="icon-btn" 
            aria-label="Notifications" 
            onClick={() => setActiveTab('notifications')}
            style={{ position: 'relative' }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {notifications.some(n => !n.read) && (
              <span style={{ position: 'absolute', top: '0px', right: '0px', width: '10px', height: '10px', backgroundColor: '#c8102e', borderRadius: '50%', border: '2px solid #fff' }}></span>
            )}
          </button>
        </header>
      )}

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

        {/* Empty State for Search or No Data */}
        {Object.keys(categoriesData).length === 0 && (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <p style={{ color: '#666', fontSize: '15px', fontWeight: '500' }}>{searchQuery ? `No pandals found for "${searchQuery}"` : "No pandals available at the moment."}</p>
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
                    {visitedPandals[pandal.id] && (
                      <span className="visited-badge" style={{ position: 'absolute', top: '15px', right: '60px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#34A853', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 2 }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Visited
                      </span>
                    )}
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
                    <button className="navigate-btn" onClick={() => handleGuideMe(pandal)}>
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
        {activeTab === 'map' && <MapPage settings={settings} targetPandal={targetPandal} clearTarget={() => setTargetPandal(null)} allPandals={allPandals} globalUserLocation={globalUserLocation} />}
        {activeTab === 'saved' && <SavedPage savedPandals={savedPandals} allPandals={allPandals} toggleSave={toggleSave} handleGuideMe={handleGuideMe} />}
        {activeTab === 'profile' && <ProfilePage setActiveTab={setActiveTab} user={user} savedCount={savedCount} postsCount={postsCount} visitedCount={visitedCount} settings={settings} handleSettingChange={handleSettingChange} />}
        {activeTab === 'notifications' && <NotificationPage notifications={notifications} setNotifications={setNotifications} />}
        {activeTab === 'my-posts' && <MyPostsPage user={user} posts={userPosts} setActiveTab={setActiveTab} handleDeletePost={handleDeletePost} handleEditPost={handleEditPost} />}
        {activeTab === 'see-all' && selectedCategory && (
          <SeeAllPage 
            category={selectedCategory} 
            pandals={categoriesData[selectedCategory]} 
            setActiveTab={setActiveTab} 
            savedPandals={savedPandals} 
            toggleSave={toggleSave} 
            visitedPandals={visitedPandals}
            toggleVisited={toggleVisited}
            handleGuideMe={handleGuideMe}
          />
        )}
        {activeTab === 'post' && <PostPage user={user} setActiveTab={(tab) => { setActiveTab(tab); setEditingPost(null); }} handlePostSubmit={handlePostSubmit} isSubmitting={isSubmitting} editingPost={editingPost} />}
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
          <div className="nav-fab" aria-label="Add or Create" onClick={() => { setEditingPost(null); setActiveTab('post'); }}>
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

    {/* Toast Notification */}
    {toastMessage && (
      <div className="toast-notification">
        {toastMessage}
      </div>
    )}

    {/* Delete Confirmation Modal */}
    {postToDelete && (
      <div className="modal-overlay" onClick={() => setPostToDelete(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 20px', maxWidth: '320px' }}>
          <div style={{ marginBottom: '15px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(200, 16, 46, 0.1)" stroke="#c8102e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Delete Post</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#888' }}>Are you sure you want to delete this post? This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => setPostToDelete(null)} style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'inherit', fontSize: '14px', fontWeight: '600', cursor: 'pointer', flex: 1, transition: 'background 0.2s' }}>
              Cancel
            </button>
            <button onClick={confirmDeletePost} disabled={isDeleting} style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: '#c8102e', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', flex: 1, boxShadow: '0 4px 15px rgba(200,16,46,0.2)', opacity: isDeleting ? 0.8 : 1 }}>
              {isDeleting ? <span className="spinner-micro"></span> : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default Dashboard;