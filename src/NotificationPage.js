import React from 'react';
import './App.css';

const NotificationPage = ({ notifications = [], setNotifications }) => {
  const markAllAsRead = () => {
    if (setNotifications) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const markAsRead = (id) => {
    if (setNotifications) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  return (
    <div className="notification-page">
      <div className="notification-header">
        <h2>Notifications</h2>
        {notifications.some(n => !n.read) && <button className="mark-read-btn" onClick={markAllAsRead}>Mark all as read</button>}
      </div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <p style={{ color: '#666', fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>No notifications yet.</p>
            <span style={{ fontSize: '13px', color: '#999' }}>You're all caught up!</span>
          </div>
        ) : (
          notifications.map(notif => (
          <div key={notif.id} className={`notification-card ${notif.type} ${notif.read ? 'read' : 'unread'}`} onClick={() => markAsRead(notif.id)}>
            <div className={`notification-icon ${notif.type}`}>
              {notif.type === 'alert' && (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              )}
              {notif.type === 'info' && (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              )}
              {notif.type === 'update' && (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                </svg>
              )}
            </div>
            <div className="notification-content">
              <div className="notification-title-row">
                <h4>{notif.title}</h4>
                {!notif.read && <span className="unread-dot"></span>}
              </div>
              <p>{notif.message}</p>
              <span className="notification-time">{notif.time}</span>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
