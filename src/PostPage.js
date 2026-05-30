import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

const markerIcon = new L.DivIcon({
  className: 'custom-red-marker',
  html: `<svg viewBox="0 0 24 24" width="36" height="36" fill="#c8102e" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

// Helper function to determine Kolkata areas based on coordinates
const getAreaFromCoordinates = (lat, lng) => {
  // Exact Boundaries based on user provided coordinates
  if (lat >= 22.54 && lat <= 22.56 && lng >= 88.35 && lng <= 88.37) return "Central Kolkata";
  if (lat >= 22.58 && lat <= 22.65 && lng >= 88.35 && lng <= 88.39) return "North Kolkata";
  if (lat >= 22.46 && lat <= 22.53 && lng >= 88.31 && lng <= 88.38) return "South Kolkata";
  if (lat >= 22.50 && lat <= 22.55 && lng >= 88.39 && lng <= 88.42) return "East Kolkata";
  if (lat >= 22.57 && lat <= 22.59 && lng >= 88.41 && lng <= 88.43) return "Salt Lake & New Town"; // Salt Lake
  if (lat >= 22.56 && lat <= 22.61 && lng >= 88.45 && lng <= 88.50) return "Salt Lake & New Town"; // New Town
  if (lat >= 22.57 && lat <= 22.60 && lng >= 88.29 && lng <= 88.34) return "Howrah";

  // Fallback heuristics for locations falling slightly outside the exact strict boxes
  if (lng < 88.345) return "Howrah";
  if (lng >= 88.405) return "Salt Lake & New Town";
  if (lng >= 88.380 && lng < 88.405 && lat >= 22.50 && lat <= 22.56) return "East Kolkata";
  if (lat >= 22.57) return "North Kolkata";
  if (lat >= 22.54 && lat < 22.57) return "Central Kolkata";
  if (lat <= 22.53) return "South Kolkata";

  return "Other";
};

const LocationPicker = ({ position, setPosition, setLocationName, setArea }) => {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition([lat, lng]);
      setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setArea(getAreaFromCoordinates(lat, lng)); // Auto-select area
    },
  });
  return position ? <Marker position={position} icon={markerIcon} /> : null;
};

const PostPage = ({ user, setActiveTab, handlePostSubmit, isSubmitting, editingPost }) => {
  const [position, setPosition] = useState([22.5726, 88.3639]); // Default Kolkata
  const [locationName, setLocationName] = useState('');
  const [area, setArea] = useState(''); // State to control selected area
  const [imagePreview, setImagePreview] = useState(null); // State for image preview
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  React.useEffect(() => {
    if (editingPost) {
      if (editingPost.location) {
        const parts = editingPost.location.split(',');
        if (parts.length === 2) {
          setPosition([parseFloat(parts[0].trim()), parseFloat(parts[1].trim())]);
          setLocationName(editingPost.location);
        }
      }
      if (editingPost.area) setArea(editingPost.area);
      if (editingPost.imageUrl) setImagePreview(`http://localhost:5000${editingPost.imageUrl}`);
    } else {
      setPosition([22.5726, 88.3639]);
      setLocationName('');
      setArea('');
      setImagePreview(null);
    }
  }, [editingPost]);

  const handleAutoLocation = () => {
    if ("geolocation" in navigator) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const loc = [lat, lng];
          setPosition(loc);
          setLocationName(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setArea(getAreaFromCoordinates(lat, lng)); // Auto-select area
          setIsFetchingLocation(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setIsFetchingLocation(false);
          if (err.code === 1) { // PERMISSION_DENIED
            setToastMessage("Location permission denied.");
          } else {
            setToastMessage("Failed to fetch location.");
          }
          setTimeout(() => setToastMessage(''), 3000);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setToastMessage("Geolocation is not supported by your browser.");
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleLocationInputChange = (e) => {
    // Remove any letters or invalid characters. Only allow numbers, dots, commas, minus signs, and spaces
    const val = e.target.value.replace(/[^0-9.,\s-]/g, '');
    setLocationName(val);
    
    const parts = val.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setPosition([lat, lng]);
        setArea(getAreaFromCoordinates(lat, lng));
      }
    }
  };

  const MapUpdater = ({ center }) => {
    const map = useMap();
    React.useEffect(() => {
      if (center) {
        map.flyTo(center, 15, { animate: true });
      }
    }, [center, map]);
    return null;
  };

  return (
    <div className="my-posts-page">
      <div className="my-posts-header">
        <button className="back-btn" onClick={() => setActiveTab('home')} aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2>{editingPost ? 'Edit Pandal' : 'Post a Pandal'}</h2>
      </div>

      <div className="post-card">
        {/* User DP and Name Header */}
        <div className="modal-user-row" style={{ marginBottom: '15px' }}>
          <div className="modal-avatar">
            {user?.picture && user.picture.startsWith('http') ? (
              <img src={user.picture} alt={user?.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            ) : (
              user?.name ? user.name.charAt(0).toUpperCase() : 'G'
            )}
          </div>
          <span className="modal-user-name">{user?.name || 'Guest User'}</span>
        </div>
        
        <form className="post-form" onSubmit={handlePostSubmit}>
          {/* Hidden inputs to send user data to backend */}
          <input type="hidden" name="userEmail" value={user?.email || 'guest@manchitra.com'} />
          <input type="hidden" name="userName" value={user?.name || 'Guest User'} />
          <input type="hidden" name="userPicture" value={user?.picture || ''} />
          <input type="hidden" name="existingImageUrl" value={editingPost?.imageUrl || ''} />

          <input type="text" name="pandalName" className="post-input" placeholder="Pandal Name" defaultValue={editingPost ? (editingPost.pandalName || editingPost.name) : ''} required />
          
          <select name="area" className="post-input" required value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="" disabled>Select Area</option>
            <option value="North Kolkata">North Kolkata</option>
            <option value="South Kolkata">South Kolkata</option>
            <option value="Central Kolkata">Central Kolkata</option>
            <option value="East Kolkata">East Kolkata</option>
            <option value="Salt Lake & New Town">Salt Lake & New Town</option>
            <option value="Howrah">Howrah</option>
            <option value="Other">Other</option>
          </select>

          <textarea name="description" className="post-textarea" placeholder="Description..." rows="3" defaultValue={editingPost?.description || ''} required></textarea>
          
          <div className="location-input-group">
            <input 
              type="text" 
              name="location"
              className="post-input" 
              placeholder="e.g. 22.5726, 88.3639 (Lat, Lng)" 
              value={locationName}
              onChange={handleLocationInputChange}
              pattern="^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$"
              title="Please enter valid coordinates in 'latitude, longitude' format"
              required 
            />
            <button type="button" className="auto-loc-btn" title="Use Automatic Location" onClick={handleAutoLocation} disabled={isFetchingLocation}>
              {isFetchingLocation ? (
                <span className="spinner-micro" style={{ borderColor: 'rgba(0, 120, 255, 0.3)', borderTopColor: '#0078ff' }}></span>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
              )}
            </button>
          </div>
          
          <div className="map-preview" style={{ height: '160px', padding: 0, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
            <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <MapUpdater center={position} />
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker position={position} setPosition={setPosition} setLocationName={setLocationName} setArea={setArea} />
            </MapContainer>
          </div>
          
          <div className="image-upload-box" onClick={() => document.getElementById('imageUpload').click()} style={{ overflow: 'hidden', padding: 0 }}>
            <input type="file" id="imageUpload" name="image" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImagePreview(URL.createObjectURL(e.target.files[0]));
              }
            }} />
            {imagePreview ? (
              <img src={imagePreview} alt="Upload Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span>Tap to upload image</span>
              </>
            )}
          </div>
          
          <button type="submit" className="post-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="spinner-micro"></span>
            ) : (
              editingPost ? "Update Post" : "Submit Post"
            )}
          </button>
        </form>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification" style={{ backgroundColor: '#c8102e' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default PostPage;