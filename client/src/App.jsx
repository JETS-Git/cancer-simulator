import React, { useState } from 'react';
import ScenarioSelector from './components/ScenarioSelector.jsx';
import ChatInterface from './components/ChatInterface.jsx';
import FeedbackDisplay from './components/FeedbackDisplay.jsx';
import Stage4Session from './components/Stage4Session.jsx';
import Notices from './components/Notices.jsx';
import { SCENARIOS_BY_ID } from './scenarioCatalogue.js';

// View states: 'select' | 'chat' | 'feedback' | 'stage4' | 'notices'

export default function App() {
  const [view, setView] = useState('select');
  const [scenarioId, setScenarioId] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [showAbout, setShowAbout] = useState(false);

  // Signed stage-4 completion tokens, keyed by the scenario that was
  // completed. Issued by /api/stage4/commit and forwarded, opaque, to
  // /api/stage4/session when starting a scenario that names a prerequisite.
  // The server verifies the signature itself — this map only drives which
  // cards the selector shows as unlocked; it grants nothing on its own.
  const [stage4Tokens, setStage4Tokens] = useState({});

  function handleStart(id) {
    setScenarioId(id);
    setTranscript([]);
    const scenario = SCENARIOS_BY_ID[id];
    setView(scenario?.kind === 'stage4' ? 'stage4' : 'chat');
  }

  function handleRequestFeedback(messages) {
    setTranscript(messages);
    setView('feedback');
  }

  function handleStage4Complete(completedScenarioId, completionToken) {
    setStage4Tokens(prev => ({ ...prev, [completedScenarioId]: completionToken }));
  }

  function handleRestart() {
    setScenarioId(null);
    setTranscript([]);
    setView('select');
  }

  const currentScenario = scenarioId ? SCENARIOS_BY_ID[scenarioId] : null;

  return (
    <div className="app-shell">
      {/* Safety disclaimer — subtle but always visible */}
      <div className="safety-banner" role="note">
        Educational simulation. Fictional patient. For communication practice
        only — not clinical advice or diagnosis.
      </div>

      <header className="app-header">
        <div className="header-icon" aria-hidden="true">🩺</div>
        <div className="header-titles">
          <h1>Clinical Reasoning Simulator</h1>
          <div className="subtitle">
            Multi-stage clinical reasoning practice for pre-registration nursing students
          </div>
        </div>
        <button
          className="about-link"
          onClick={() => setShowAbout(true)}
        >
          About this prototype
        </button>
      </header>

      <main className="app-content">
        {view === 'select' && (
          <>
            <p className="landing-attribution">
              Prototype by Phillip Johnson — feedback welcome.
            </p>
            <ScenarioSelector onStart={handleStart} completionTokens={stage4Tokens} />
          </>
        )}

        {view === 'chat' && (
          <>
            <ChatInterface
              key={scenarioId}
              scenarioId={scenarioId}
              onRequestFeedback={handleRequestFeedback}
            />
            <button className="btn-new-session" onClick={handleRestart}>
              ← Choose a different scenario
            </button>
          </>
        )}

        {view === 'feedback' && (
          <FeedbackDisplay
            scenarioId={scenarioId}
            transcript={transcript}
            onRestart={handleRestart}
          />
        )}

        {view === 'stage4' && (
          <Stage4Session
            key={scenarioId}
            scenarioId={scenarioId}
            completionToken={currentScenario?.prerequisite ? stage4Tokens[currentScenario.prerequisite] : undefined}
            onComplete={handleStage4Complete}
            onExit={handleRestart}
          />
        )}

        {view === 'notices' && (
          <>
            <Notices />
            <button className="btn-new-session" onClick={handleRestart}>
              ← Back to scenarios
            </button>
          </>
        )}
      </main>

      {/* About modal */}
      {showAbout && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="About this prototype"
          onClick={() => setShowAbout(false)}
        >
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About this prototype</h2>
              <button
                className="modal-close"
                onClick={() => setShowAbout(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p>
              This is an early educational prototype exploring whether AI-supported
              conversation practice can help pre-registration nurses build
              clinical reasoning and supportive-care communication skills across a
              staged curriculum. Patients are fictional. The open research question
              — whether a tool like this is safe, valid, and useful for learning —
              would be the focus of formal evaluation. Built by Phillip Johnson
              (RN, Nurse Educator).
            </p>
            <button
              className="about-link"
              style={{ marginTop: 12 }}
              onClick={() => { setShowAbout(false); setView('notices'); }}
            >
              View notices, attribution &amp; support information →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
