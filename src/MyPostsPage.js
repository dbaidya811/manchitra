import React, { useState } from 'react';
import './App.css';

const MyPostsPage = ({ posts, setActiveTab, handleDeletePost }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (id) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <div className="my-posts-page">
      <div className="my-posts-header">
        <button className="back-btn" onClick={() => setActiveTab('profile')} aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2>My Posts</h2>
      </div>

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <p>You haven't posted anything yet.</p>
            <span style={{ fontSize: '13px', color: '#999' }}>Use the + button to add a pandal.</span>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-header" style={{ position: 'relative' }}>
                <div className="post-avatar">A</div>
                <div className="post-meta">
                  <h4>{post.pandalName}</h4>
                  <span>{post.time}</span>
                </div>
                <button className="post-options-btn" onClick={() => toggleDropdown(post.id)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
                
                {openDropdown === post.id && (
                  <div className="post-dropdown">
                    <button className="dropdown-item" onClick={() => { alert('Edit feature is coming soon!'); setOpenDropdown(null); }}>Edit Post</button>
                    <button className="dropdown-item delete" onClick={() => { handleDeletePost(post.id); setOpenDropdown(null); }}>Delete</button>
                  </div>
                )}
              </div>
              <p className="post-content-text">{post.content}</p>
              <div className={`post-image-box ${post.imageClass}`}></div>
              <div className="post-actions">
                <button className="action-btn">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                  <span>{post.likes}</span>
                </button>
                <button className="action-btn">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  <span>{post.comments}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPostsPage;