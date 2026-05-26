import React from 'react';
import './App.css';

const PostPage = ({ setActiveTab, handlePostSubmit, isSubmitting }) => {
  return (
    <div className="my-posts-page">
      <div className="my-posts-header">
        <button className="back-btn" onClick={() => setActiveTab('home')} aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2>Post a Pandal</h2>
      </div>

      <div className="post-card">
        {/* User DP and Name Header */}
        <div className="modal-user-row" style={{ marginBottom: '15px' }}>
          <div className="modal-avatar">A</div>
          <span className="modal-user-name">Aritra Das</span>
        </div>
        
        <form className="post-form" onSubmit={handlePostSubmit}>
          <input type="text" name="pandalName" className="post-input" placeholder="Pandal Name" required />
          
          <select name="area" className="post-input" required defaultValue="">
            <option value="" disabled>Select Area</option>
            <option value="North Kolkata">North Kolkata</option>
            <option value="South Kolkata">South Kolkata</option>
            <option value="Central Kolkata">Central Kolkata</option>
            <option value="East Kolkata">East Kolkata</option>
            <option value="Salt Lake & New Town">Salt Lake & New Town</option>
            <option value="Howrah">Howrah</option>
            <option value="Other">Other</option>
          </select>

          <textarea name="description" className="post-textarea" placeholder="Description..." rows="3" required></textarea>
          
          <div className="location-input-group">
            <input type="text" className="post-input" placeholder="Add Location" required />
            <button type="button" className="auto-loc-btn" title="Use Automatic Location">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
            </button>
          </div>
          
          <div className="map-preview">
            <span>Map Preview</span>
          </div>
          
          <div className="image-upload-box">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Tap to upload image</span>
          </div>
          
          <button type="submit" className="post-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="spinner-micro"></span>
            ) : (
              "Submit Post"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostPage;