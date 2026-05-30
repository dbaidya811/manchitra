import React from 'react';
import './App.css';

const MyPostsPage = ({ user, posts, setActiveTab, handleDeletePost, handleEditPost }) => {
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
            <div key={post.id} className="my-post-card">
              {post.imageUrl ? (
                <div className="my-post-image" style={{ backgroundImage: `url(http://localhost:5000${post.imageUrl})` }}></div>
              ) : (
                <div className="my-post-image bg-1"></div>
              )}
              <div className="my-post-content">
                <h4>{post.pandalName || 'Untitled Pandal'}</h4>
                <span className="post-time">{post.time}</span>
                <p>{post.content}</p>
                
                <div className="my-post-actions">
                  <button className="edit-btn" onClick={() => handleEditPost(post)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDeletePost(post.id)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyPostsPage;