import { useState } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// TokenAllocator
//
// ⚠ ZERO IS PERMITTED AND MUST NEVER BE DISCOURAGED.
//   No warning, no confirmation dialogue, no amber styling, no "are you sure".
//   If the interface nudges students away from zero, Cromwell violations stop
//   appearing in the data and the exercise loses the finding it exists to
//   surface. This is an interface requirement, not a preference.
//
//   A zero looks like a validation gap. Adding a confirmation would feel like
//   an improvement and would quietly kill the finding. That is why this note
//   sits next to the code rather than only in a specification document.
//
// The allocator also never auto-distributes or auto-normalises. Every token is
// placed by the student, because the distribution IS the measurement.
// ═════════════════════════════════════════════════════════════════════════════

export default function TokenAllocator({ hypotheses, budget, framing, prompt, busy, onSubmit }) {
  const [values, setValues] = useState(
    () => Object.fromEntries(hypotheses.map(h => [h.key, 0]))
  );

  const used = Object.values(values).reduce((s, v) => s + v, 0);
  const remaining = budget - used;
  const balanced = remaining === 0;

  const set = (key, raw) => {
    const n = Math.max(0, Math.min(budget, Math.floor(Number(raw) || 0)));
    setValues(v => ({ ...v, [key]: n }));
  };

  const step = (key, by) => set(key, values[key] + by);

  return (
    <section className="allocator">
      <p className="allocator__framing">{framing}</p>
      {prompt && <p className="allocator__prompt">{prompt}</p>}

      <ul className="allocator__list">
        {hypotheses.map(h => (
          <li key={h.key} className="allocator__row">
            <label htmlFor={`alloc-${h.key}`}>{h.label}</label>
            <div className="allocator__controls">
              <button type="button" onClick={() => step(h.key, -1)} aria-label={`Fewer for ${h.label}`}>−</button>
              <input
                id={`alloc-${h.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={budget}
                value={values[h.key]}
                onChange={e => set(h.key, e.target.value)}
              />
              <button type="button" onClick={() => step(h.key, 1)} aria-label={`More for ${h.label}`}>+</button>
            </div>
          </li>
        ))}
      </ul>

      {/* Neutral counter. States the arithmetic fact and nothing else. */}
      <p className="allocator__remaining" aria-live="polite">
        {balanced
          ? `All ${budget} placed.`
          : remaining > 0
            ? `${remaining} left to place.`
            : `${Math.abs(remaining)} over.`}
      </p>

      <button onClick={() => onSubmit(values)} disabled={busy || !balanced}>
        Continue
      </button>
    </section>
  );
}
