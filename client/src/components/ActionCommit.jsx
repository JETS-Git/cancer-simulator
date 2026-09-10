import { useState } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// ActionCommit — lock 2. Allocation and action post together in ONE request.
// Structurally inseparable, which is the point.
// ═════════════════════════════════════════════════════════════════════════════

export default function ActionCommit({
  hypotheses, budget, framing, allocationPrompt, actionPrompt, busy, onCommit,
}) {
  const [values, setValues] = useState(
    () => Object.fromEntries(hypotheses.map(h => [h.key, 0]))
  );
  const [now, setNow] = useState('');
  const [who, setWho] = useState('');
  const [why, setWhy] = useState('');
  const [confirming, setConfirming] = useState(false);

  const used = Object.values(values).reduce((s, v) => s + v, 0);
  const balanced = used === budget;
  const complete = balanced && now.trim() && who.trim() && why.trim();

  const set = (key, raw) => {
    const n = Math.max(0, Math.min(budget, Math.floor(Number(raw) || 0)));
    setValues(v => ({ ...v, [key]: n }));
  };

  const submit = () => {
    const action =
      `What I do now: ${now.trim()}\n` +
      `Who I escalate to: ${who.trim()}\n` +
      `Why: ${why.trim()}`;
    onCommit(values, action);
  };

  return (
    <section className="commit">
      <p className="allocator__framing">{framing}</p>
      {allocationPrompt && <p>{allocationPrompt}</p>}

      <ul className="allocator__list">
        {hypotheses.map(h => (
          <li key={h.key} className="allocator__row">
            <label htmlFor={`commit-${h.key}`}>{h.label}</label>
            <input
              id={`commit-${h.key}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={budget}
              value={values[h.key]}
              onChange={e => set(h.key, e.target.value)}
            />
          </li>
        ))}
      </ul>
      <p className="allocator__remaining" aria-live="polite">
        {balanced ? `All ${budget} placed.` : `${budget - used} left to place.`}
      </p>

      <pre className="commit__prompt">{actionPrompt}</pre>

      <label htmlFor="commit-now">What do you do in the next 30 minutes?</label>
      <textarea id="commit-now" rows={3} value={now} onChange={e => setNow(e.target.value)} />

      <label htmlFor="commit-who">Who do you escalate to, and how urgently?</label>
      <textarea id="commit-who" rows={2} value={who} onChange={e => setWho(e.target.value)} />

      <label htmlFor="commit-why">In one sentence: why?</label>
      <textarea id="commit-why" rows={2} value={why} onChange={e => setWhy(e.target.value)} />

      {!confirming ? (
        <button onClick={() => setConfirming(true)} disabled={busy || !complete}>
          Commit
        </button>
      ) : (
        <div className="commit__confirm" role="alertdialog">
          <p>
            This locks your allocation and your action. You cannot change either,
            and the analysis is only produced after it is locked.
          </p>
          <button onClick={submit} disabled={busy}>Lock it in</button>
          <button onClick={() => setConfirming(false)} disabled={busy}>Go back</button>
        </div>
      )}
    </section>
  );
}
