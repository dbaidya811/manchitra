import React, { useState, useEffect } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import './App.css';
import './LoginPopup.css';
import Dashboard from './Dashboard';

const MainApp = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('manchitra_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If not logged in, trigger popup slightly after splash screen
      setTimeout(() => setShowLoginPopup(true), 3000);
    }
  }, []);

  // Watch real-time location globally to trigger auto-visited logic anywhere in the app
  useEffect(() => {
    let watchId;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            heading: pos.coords.heading
          });
        },
        (error) => console.error("Geolocation watch error:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Automatically transition from landing to dashboard after a delay
  useEffect(() => {
    if (currentView === 'landing') {
      const timer = setTimeout(() => {
        setCurrentView('dashboard');
      }, 2500); // 2.5 seconds splash screen delay
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  if (currentView !== 'dashboard') {
    return (
      <div className="landing-container">
        <div className="landing-content">
          <div className="landing-logo">
            <img src={`${process.env.PUBLIC_URL}/appicon.png`} alt="Manchitra Logo" className="logo-icon-large" />
          </div>
        </div>
        <div className="landing-bottom-text">
          <h1 className="landing-title">manchitra</h1>
          <p className="landing-subtitle">Your Ultimate Pandal Hopping Partner</p>
          <div className="global-spinner" style={{ marginTop: '20px', width: '28px', height: '28px', borderWidth: '3px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard user={user} globalUserLocation={userLocation} />

      {/* Bottom Popup for Google Login */}
      {showLoginPopup && !user && (
        <div className="login-popup-overlay">
          <div className="login-popup-content">
            <h3>Welcome to Manchitra</h3>
            <p>Please log in to save pandals and post reviews.</p>
            <div className="google-btn-container">
              {/* This is now a simple link to our backend */}
              <a href="http://localhost:5000/api/auth/login/google" className="google-login-button">
                <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam) {
      try {
        const userData = JSON.parse(userParam);
        localStorage.setItem('manchitra_user', JSON.stringify(userData));
      } catch (e) {
        console.error('Failed to parse user data from URL', e);
      }
    }
    // Redirect to home page after processing, which will reload and get user from localStorage
    navigate('/', { replace: true });
  }, [searchParams, navigate]);

  return <div className="global-spinner-container"><div className="global-spinner"></div></div>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
};

export default App;
