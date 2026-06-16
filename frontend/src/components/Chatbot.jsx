import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import api from '../api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m your onboarding assistant. Ask me anything about company policies or your onboarding process.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post('/chat/', { message: userMsg });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I\'m unavailable right now. Please contact HR directly.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--primary-color)', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          zIndex: 1000, transition: 'transform 0.2s',
        }}
      >
        {isOpen ? <X size={24} color="white" /> : <MessageCircle size={24} color="white" />}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '2rem',
          width: '360px', height: '500px', background: 'var(--surface-card)',
          border: '1px solid var(--border)', borderRadius: '1rem',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 1000,
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(99,102,241,0.1)', borderRadius: '1rem 1rem 0 0'
          }}>
            <Bot size={22} color="var(--primary-color)" />
            <div>
              <p style={{ fontWeight: '600', fontSize: '0.95rem' }}>HR Assistant</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Powered by Llama3</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex', gap: '0.5rem',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="var(--primary-color)" />}
                </div>
                <div style={{
                  maxWidth: '75%', padding: '0.6rem 0.9rem',
                  borderRadius: msg.role === 'user' ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem',
                  background: msg.role === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.06)',
                  fontSize: '0.85rem', lineHeight: '1.5',
                  color: msg.role === 'user' ? 'white' : 'var(--text-main)'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={14} color="var(--primary-color)" />
                </div>
                <div style={{ padding: '0.6rem 0.9rem', borderRadius: '0.25rem 1rem 1rem 1rem', background: 'rgba(255,255,255,0.06)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '0.75rem', borderTop: '1px solid var(--border)',
            display: 'flex', gap: '0.5rem', alignItems: 'center'
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about policies, onboarding..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)', borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem', color: 'var(--text-main)',
                fontSize: '0.85rem', outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: '36px', height: '36px', borderRadius: '0.5rem',
                background: 'var(--primary-color)', border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: input.trim() && !loading ? 1 : 0.5
              }}
            >
              <Send size={16} color="white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;