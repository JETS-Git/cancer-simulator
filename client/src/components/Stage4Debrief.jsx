// ═════════════════════════════════════════════════════════════════════════════
// Stage4Debrief
//
// Reviewed the same way regardless of outcome. A strong performance gets the
// same depth as a poor one — if good performances produce short debriefs,
// students read debrief length as a grade and it stops being a review.
// ═════════════════════════════════════════════════════════════════════════════

export default function Stage4Debrief({ results, narrative, onExit }) {
  const { studentPosteriors, normativePosteriors, expectedHarm, scores } = results;
  const keys = Object.keys(studentPosteriors[3]);
  const pct = n => `${(n * 100).toFixed(0)}%`;

  return (
    <section className="debrief">
      <h3>Where you finished</h3>

      <table className="debrief__trajectory">
        <thead>
          <tr>
            <th scope="col">Hypothesis</th>
            <th scope="col">Bound 1</th>
            <th scope="col">Bound 2</th>
            <th scope="col">Bound 3</th>
            <th scope="col">Where your own prior led</th>
          </tr>
        </thead>
        <tbody>
          {keys.map(k => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{pct(studentPosteriors[1][k])}</td>
              <td>{pct(studentPosteriors[2][k])}</td>
              <td>{pct(studentPosteriors[3][k])}</td>
              <td>{pct(normativePosteriors[3][k])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="debrief__truth">
        What was actually happening: <strong>{results.trueDiagnosis}</strong>
      </p>

      {expectedHarm.divergesFromMode && (
        <p className="debrief__divergence">
          The possibility carrying the most expected harm was not the one you
          thought most likely.
        </p>
      )}

      {scores.cromwellViolations.length > 0 && (
        <p className="debrief__cromwell">
          You gave nothing to at least one possibility. Once that happens, no
          later evidence can bring it back.
        </p>
      )}

      <p className="debrief__illustrative">{results.illustrativeNotice}</p>

      <h3>Debrief</h3>
      {narrative
        ? <div className="debrief__narrative">{narrative}</div>
        : <p className="debrief__pending">Writing your debrief…</p>}

      <button onClick={onExit}>Finish</button>
    </section>
  );
}
