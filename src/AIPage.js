import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const AIPage = ({ setActiveTab }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am Manchitra AI, your personal Pandal Hopping assistant. 🌟\n\nHow can I help you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef(null);

  const suggestions = [
    "Nearby Pandals",
    "Best Route for South Kolkata",
    "Less Crowded Pandals",
    "Top Rated Pandals"
  ];

  // Auto-scroll to bottom when a new message is added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e, text = query) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const newMsg = { sender: 'user', text: text };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setQuery('');
    setIsTyping(true);

    try {
      // Format messages for the backend (OpenAI format)
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.text,
        // Preserve the reasoning_details if the AI provided it in earlier turns
        ...(msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {})
      }));

      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'API Response Error');
      } else {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.content, reasoning_details: data.reasoning_details }]);
      }
    } catch (error) {
      console.error("AI API Error:", error);
      // Display the actual error message from the backend if available
      const displayMsg = error.message !== 'API Response Error' && error.message !== 'Failed to fetch' ? error.message : 'Sorry, I am having trouble connecting to the server. Please check if the backend is running and the API key is configured.';
      setMessages(prev => [...prev, { sender: 'ai', text: displayMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="ai-page" style={{ animation: 'fadeIn 0.4s ease', display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
      {/* Modern Header */}
      <div className="ai-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', padding: '0 5px' }}>
        <button className="back-btn" onClick={() => setActiveTab('profile')} aria-label="Go Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="ai-avatar-header">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#1a1a1a', fontWeight: '700' }}>Manchitra AI</h2>
            <span style={{ fontSize: '12px', color: '#0078ff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#0078ff', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.5s infinite' }}></span>
              Online
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-container glass-panel" ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '15px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
            
            {/* AI Avatar next to AI messages */}
            {msg.sender === 'ai' && (
              <div className="ai-avatar-small">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                </svg>
              </div>
            )}
            
            {/* Chat Bubble */}
            <div className={`chat-bubble ${msg.sender}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div className="ai-avatar-small">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div className="chat-bubble ai typing">
              <span className="typing-dot"></span>
              <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
              <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !isTyping && (
        <div className="ai-suggestions-container">
          {suggestions.map((sug, idx) => (
            <button key={idx} className="ai-suggestion-btn" onClick={() => handleSend(null, sug)}>
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form className="ai-input-form" onSubmit={(e) => handleSend(e)}>
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          placeholder="Message Manchitra AI..." 
          className="ai-input"
        />
        <button type="submit" className={`ai-send-btn ${query.trim() && !isTyping ? 'active' : ''}`} disabled={!query.trim() || isTyping}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: query.trim() ? 'translate(-1px, -1px)' : 'none' }}>
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default AIPage;