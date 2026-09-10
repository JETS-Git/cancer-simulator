// ─────────────────────────────────────────────────────────────────────────────
// Cancer Survivor Conversation Simulator — Stage 4 client components
//
// Johnson Educational & Teaching Services · ABN 15 440 542 589
// Destination: client/src/components/
//
// No styling assumptions — className hooks only.
//
// ── INVARIANTS ───────────────────────────────────────────────────────────────
// 1. The client never holds the answer key. The session token is opaque to it.
// 2. Hypotheses do not exist client-side until /differential responds.
// 3. Bound-3 allocation and action post together, in one request, to /commit.
// 4. TokenAllocator never discourages a zero. See the note above it.
// 5. Prerequisite gating uses the server-signed completionToken returned by
//    /commit, never a client-asserted "completed" list. See routes.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import BoundBrief from './BoundBrief.jsx';
import DifferentialEntry from './DifferentialEntry.jsx';
import TokenAllocator from './TokenAllocator.jsx';
import ActionCommit from './ActionCommit.jsx';
import Stage4Debrief from './Stage4Debrief.jsx';

const api = async (path, body) => {
  const res = await fetch(`/api/stage4/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
};

// ═════════════════════════════════════════════════════════════════════════════
// Stage4Session — orchestrator. The ONLY component that talks to the API.
//
// `completionToken` is the signed token issued when the prerequisite scenario
// was committed (see App.jsx). It is opaque to this component; it is only
// forwarded to /session, which verifies it server-side. A scenario with no
// prerequisite works with completionToken left undefined.
// ═════════════════════════════════════════════════════════════════════════════

export default function Stage4Session({ scenarioId, completionToken, onExit, onComplete }) {
  const [phase, setPhase] = useState('idle');
  const [token, setToken] = useState(null);
  const [meta, setMeta] = useState(null);
  const [brief, setBrief] = useState(null);
  const [hypotheses, setHypotheses] = useState(null);
  const [bound, setBound] = useState(1);
  const [prompts, setPrompts] = useState({});
  const [results, setResults] = useState(null);
  const [debrief, setDebrief] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async fn => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    const d = await api('session', { scenarioId, completionToken });
    setToken(d.token);
    setMeta({ title: d.title, budget: d.tokenBudget, framing: d.tokenFraming });
    setBrief(d.bound1);
    setPrompts({ differential: d.differentialPrompt });
    setPhase('differential');
  });

  const submitDifferential = differential => run(async () => {
    const d = await api('differential', { token, differential });
    setToken(d.token);
    setHypotheses(d.hypotheses);              // first moment these exist client-side
    setPrompts(p => ({ ...p, allocation: d.allocationPrompt }));
    setPhase('allocate');
  });

  const submitAllocation = allocation => run(async () => {
    const d = await api('allocation', { token, bound, allocation });
    setToken(d.token);
    setBound(d.bound);
    setBrief(d.brief);
    setPrompts(p => ({ ...p, allocation: d.allocationPrompt, action: d.actionPrompt }));
    setPhase(d.requiresAction ? 'commit' : 'allocate');
  });

  const commit = (allocation, action) => run(async () => {
    const d = await api('commit', { token, allocation, action });
    setToken(d.token);
    setResults(d);
    setPhase('results');

    // Hand the signed completion token up so a scenario that depends on this
    // one can be unlocked. The client never fabricates this itself.
    if (d.completionToken) onComplete?.(scenarioId, d.completionToken);

    // Narrative generates in the background. Scores are already visible.
    try {
      const n = await api('debrief', { token: d.token });
      setDebrief(n.content);
    } catch {
      setDebrief(null);
    }
  });

  if (phase === 'idle') {
    return (
      <div className="stage4-intro">
        <p>This exercise takes about 40 minutes and cannot be paused.</p>
        <p>At the end you will commit to an action. That commitment is final.</p>
        <button onClick={start} disabled={busy}>Begin</button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="stage4">
      <h2>{meta?.title}</h2>
      {error && <p className="error" role="alert">{error}</p>}

      {phase === 'differential' && (
        <>
          <BoundBrief label="Handover" text={brief} />
          <DifferentialEntry prompt={prompts.differential} busy={busy} onSubmit={submitDifferential} />
        </>
      )}

      {phase === 'allocate' && (
        <>
          <BoundBrief label={bound === 1 ? 'Handover' : `Bound ${bound}`} text={brief} />
          <TokenAllocator
            key={bound}
            hypotheses={hypotheses}
            budget={meta.budget}
            framing={meta.framing}
            prompt={prompts.allocation}
            busy={busy}
            onSubmit={submitAllocation}
          />
        </>
      )}

      {phase === 'commit' && (
        <>
          <BoundBrief label="Result" text={brief} />
          <ActionCommit
            hypotheses={hypotheses}
            budget={meta.budget}
            framing={meta.framing}
            allocationPrompt={prompts.allocation}
            actionPrompt={prompts.action}
            busy={busy}
            onCommit={commit}
          />
        </>
      )}

      {phase === 'results' && (
        <Stage4Debrief results={results} narrative={debrief} onExit={onExit} />
      )}
    </div>
  );
}
