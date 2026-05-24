import React from 'react';

const NotificationPage = () => {
  return (
    <div>
      <div className="section-header" style={{ marginTop: '10px' }}>
        <h3 className="section-title">Notifications</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Notification Item 1 */}
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '4px solid #ff7b00', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#333' }}>🔔 New Pandal Nearby!</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>A new theme pandal has been updated near your current location.</p>
          <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', display: 'block' }}>2 mins ago</span>
        </div>

        {/* Notification Item 2 */}
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '4px solid #c8102e', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#333' }}>🚨 High Crowd Alert</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Deshapriya Park is experiencing heavy crowd. Plan your visit accordingly.</p>
          <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', display: 'block' }}>1 hour ago</span>
        </div>

        {/* Notification Item 3 */}
        <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '4px solid #ff7b00', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#333' }}>✨ Sandhi Puja Timing</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Don't miss the Sandhi Puja rituals starting at 8:30 PM tonight.</p>
          <span style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', display: 'block' }}>3 hours ago</span>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;