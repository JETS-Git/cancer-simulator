// Single source of truth for the scenario metadata the CLIENT needs: cards in
// the selector, and labels in the chat and feedback views. Answer-revealing
// fields (targetErrors, competingExplanations, timeCriticalFinding,
// distractor, testCharacteristics, hypotheses, likelihood ratios) live only
// on the server — none of that belongs here. Titles and descriptions are
// copied verbatim from the server-side scenario data, which is already
// written to be safe to show a student before they start.
//
// `kind: 'stage4'` routes a scenario to Stage4Session instead of the
// ChatInterface / FeedbackDisplay pair used by stages 1–3.

export const SCENARIOS = [
  // ── Stage 1 — Logical reasoning ──────────────────────────────────────────
  {
    id: 's1_conjunction',
    stage: 1,
    personaType: 'patient',
    personaLabel: 'Margaret',
    title: 'Stage 1A — The detailed story',
    description:
      'Margaret, 61. Endometrial cancer, two years post-treatment. Attending follow-up with three weeks of back pain and a firm view about what it means.',
  },
  {
    id: 's1_absence',
    stage: 1,
    personaType: 'peer',
    personaLabel: 'Tom',
    title: 'Stage 1B — The study group',
    description:
      'Tom, second-year nursing student. Preparing a tutorial presentation on survivorship follow-up and wants a second opinion on his argument.',
  },

  // ── Stage 2 — Clinical reasoning ─────────────────────────────────────────
  {
    id: 'breast_cancer',
    stage: 2,
    personaType: 'patient',
    personaLabel: 'Sarah',
    title: 'Breast cancer — 8 months post-chemotherapy',
    description:
      'Sarah, 42. Completed adjuvant chemo 8 months ago; now on hormone therapy. Presenting with persistent fatigue.',
  },
  {
    id: 'colorectal',
    stage: 2,
    personaType: 'patient',
    personaLabel: 'David',
    title: 'Colorectal cancer — 6 months post-surgery',
    description:
      'David, 58. Anterior resection 6 months ago; adjuvant chemo completed 3 months ago. Hoping to return to work as a PE teacher.',
  },
  {
    id: 'lymphoma',
    stage: 2,
    personaType: 'patient',
    personaLabel: 'Aisha',
    title: 'Lymphoma — 1 year post-treatment',
    description:
      "Aisha, 29. Hodgkin's lymphoma; completed treatment 12 months ago, in remission. Next PET scan due in 3 weeks.",
  },
  {
    id: 's2_prostate',
    stage: 2,
    personaType: 'patient',
    personaLabel: 'Ray',
    title: 'Stage 2A — Prostate cancer, 18 months post-treatment',
    description:
      'Ray, 67. Prostate cancer; radical prostatectomy and adjuvant radiotherapy, now on hormone therapy. Attending follow-up with back pain.',
  },
  {
    id: 's2_ovarian',
    stage: 2,
    personaType: 'patient',
    personaLabel: 'Danielle',
    title: 'Stage 2B — Ovarian cancer, 4 months post-chemotherapy',
    description:
      'Danielle, 47. Ovarian cancer; surgery and completed chemotherapy four months ago. Attending follow-up feeling short of breath.',
  },

  // ── Stage 3 — Bayesian reasoning ─────────────────────────────────────────
  {
    id: 's3_cea',
    stage: 3,
    personaType: 'patient',
    personaLabel: 'Colin',
    title: 'Stage 3A — A raised CEA',
    description:
      'Colin, 63. Colorectal cancer, 20 months post-resection. Attending an unscheduled appointment after a surveillance blood test came back abnormal.',
  },
  {
    id: 's3_ca125',
    stage: 3,
    personaType: 'patient',
    personaLabel: 'Nadia',
    title: 'Stage 3B — A raised CA-125',
    description:
      'Nadia, 38. Ovarian cancer, 14 months post-treatment. Premenopausal, with a longstanding history of endometriosis. Attending after a surveillance result came back raised.',
  },

  // ── Stage 4 — Confidence allocation under deterioration ──────────────────
  {
    id: 's4a_breathless',
    stage: 4,
    kind: 'stage4',
    personaLabel: 'Warren',
    title: 'Stage 4A — Increasing breathlessness on the ward',
    description:
      'Warren, 64. Inpatient, day 12 after his third cycle of chemotherapy. You are the evening-shift nurse. He has become progressively more breathless over the past 24 hours.',
  },
  {
    id: 's4b_fever',
    stage: 4,
    kind: 'stage4',
    personaLabel: 'Yvonne',
    prerequisite: 's4a_breathless',
    title: 'Stage 4B — Fever and rigors on admission',
    description:
      'Yvonne, 58. Day 8 after her second cycle of chemotherapy. Arrived on the ward this evening from home with a fever. You are the admitting nurse.',
  },
];

export const SCENARIOS_BY_ID = Object.fromEntries(SCENARIOS.map(s => [s.id, s]));

export const STAGE_LABELS = {
  1: 'Stage 1 — Logical reasoning',
  2: 'Stage 2 — Clinical reasoning',
  3: 'Stage 3 — Bayesian reasoning',
  4: 'Stage 4 — Confidence allocation under deterioration',
};

export function scenarioLabel(id) {
  const s = SCENARIOS_BY_ID[id];
  if (!s) return id;
  const who = s.personaType === 'peer' ? 'Peer' : 'Patient';
  return `${s.personaLabel} — ${s.title.replace(/^Stage \d[A-Z] — /, '')} (${who})`;
}
