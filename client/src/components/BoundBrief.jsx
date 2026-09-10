// ═════════════════════════════════════════════════════════════════════════════
// BoundBrief — handovers and results are documents, not prose. Monospace.
// ═════════════════════════════════════════════════════════════════════════════

export default function BoundBrief({ label, text }) {
  return (
    <section className="bound-brief">
      <h3>{label}</h3>
      <pre className="bound-brief__body">{text}</pre>
    </section>
  );
}
