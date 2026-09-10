import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { scenarioLabel } from '../scenarioCatalogue.js';

export default function FeedbackDisplay({ scenarioId, transcript, onRestart }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchFeedback() {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenarioId, transcript }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unknown server error');
        if (!cancelled) setContent(data.content);
      } catch (err) {
        console.error('Feedback request failed:', err);
        if (!cancelled) {
          setError(
            'The feedback service is temporarily unavailable. Please go back and try again — if the problem continues, please let Phillip know.'
          );
        }
      }
    }

    fetchFeedback();
    return () => { cancelled = true; };
  }, [scenarioId, transcript]);

  return (
    <div className="feedback-wrapper">
      <div className="feedback-header">
        <div>
          <h2>Educator Feedback</h2>
          <p>{scenarioLabel(scenarioId)}</p>
        </div>
        <button className="btn-restart" onClick={onRestart}>
          Start new session
        </button>
      </div>

      <div className="feedback-body">
        {!content && !error && (
          <div className="feedback-loading" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            Generating your personalised feedback…
          </div>
        )}

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        {content && (
          <ReactMarkdown>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
