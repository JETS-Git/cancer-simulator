import { useState } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// DifferentialEntry — lock 1. Submitted before the hypotheses exist here.
// ═════════════════════════════════════════════════════════════════════════════

export default function DifferentialEntry({ prompt, busy, onSubmit }) {
  const [text, setText] = useState('');

  return (
    <section className="differential">
      <p>{prompt}</p>
      <textarea
        rows={6}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What could be going on here?"
        aria-label="Your differential"
      />
      <button onClick={() => onSubmit(text)} disabled={busy || !text.trim()}>
        Submit and continue
      </button>
      <p className="hint">You will not be able to change this once submitted.</p>
    </section>
  );
}
