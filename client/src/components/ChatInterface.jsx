import React, { useState, useRef, useEffect } from 'react';
import { SCENARIOS_BY_ID, scenarioLabel } from '../scenarioCatalogue.js';

export default function ChatInterface({ scenarioId, onRequestFeedback }) {
  const isPeer = SCENARIOS_BY_ID[scenarioId]?.personaType === 'peer';
  const otherLabel = isPeer ? 'Peer' : 'Patient';
  const [messages, setMessages] = useState([]);   // { role: 'user'|'assistant', content: string }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 130) + 'px';
  }, [input]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const updated = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, messages: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown server error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (err) {
      console.error('Chat request failed:', err);
      setError(
        'The conversation service is temporarily unavailable. Please refresh and try again — if the problem continues, please let Phillip know.'
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="chat-wrapper">
      {/* Header bar */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>{isPeer ? 'Peer Conversation' : 'Patient Consultation'}</h2>
          <div className="scenario-label">{scenarioLabel(scenarioId)}</div>
        </div>
        <button
          className="btn-feedback"
          disabled={!hasMessages || loading}
          onClick={() => onRequestFeedback(messages)}
          title={hasMessages ? 'End the conversation and receive educator feedback' : 'Send at least one message first'}
        >
          End conversation &amp; get feedback
        </button>
      </div>

      {/* Message list */}
      <div className="message-list" ref={listRef} aria-live="polite" aria-label="Conversation">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role === 'user' ? 'nurse' : 'patient'}`}>
            <div className="message-label">{m.role === 'user' ? 'Nurse (you)' : otherLabel}</div>
            <div className="message-bubble">{m.content}</div>
          </div>
        ))}

        {loading && (
          <div className="message patient">
            <div className="message-label">{otherLabel}</div>
            <div className="typing-indicator" aria-label={`${otherLabel} is typing`}>
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="input-row">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Type your message as the nurse… (Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={1}
          aria-label="Nurse message input"
        />
        <button
          className="btn-send"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}
