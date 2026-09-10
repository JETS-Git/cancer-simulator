import React from 'react';
import { SCENARIOS, STAGE_LABELS } from '../scenarioCatalogue.js';

// `completionTokens` is a { [scenarioId]: token } map of signed stage-4
// completion tokens the app has collected (see App.jsx). A scenario with a
// `prerequisite` is locked in this UI until its prerequisite's token is
// present — but this is a convenience only. The server enforces the real
// gate by verifying the token's signature; a locked-looking card here is not
// what makes s4b_fever safe to skip, and unlocking it here does nothing if
// the token isn't genuine.
export default function ScenarioSelector({ onStart, completionTokens = {} }) {
  const [selected, setSelected] = React.useState(null);

  const stages = [...new Set(SCENARIOS.map(s => s.stage))].sort((a, b) => a - b);

  return (
    <div className="scenario-selector">
      <h2>Choose a Scenario</h2>
      <p className="intro">
        Scenarios are grouped by stage. Within stage 4, complete 4A before 4B
        unlocks — the server checks this with a signed token, not anything
        this page tells it.
      </p>

      {stages.map(stage => (
        <div className="scenario-stage-group" key={stage}>
          <h3 className="scenario-stage-heading">{STAGE_LABELS[stage] || `Stage ${stage}`}</h3>
          <div className="scenario-cards">
            {SCENARIOS.filter(s => s.stage === stage).map(s => {
              const locked = s.prerequisite && !completionTokens[s.prerequisite];
              return (
                <button
                  key={s.id}
                  className={`scenario-card${selected === s.id ? ' selected' : ''}${locked ? ' locked' : ''}`}
                  onClick={() => !locked && setSelected(s.id)}
                  aria-pressed={selected === s.id}
                  aria-disabled={locked}
                  disabled={locked}
                  title={locked ? 'Complete the preceding scenario first.' : undefined}
                >
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  {locked && <p className="scenario-card__locked">Locked until the preceding scenario is completed</p>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="btn-start"
        disabled={!selected}
        onClick={() => onStart(selected)}
      >
        Begin
      </button>
    </div>
  );
}
