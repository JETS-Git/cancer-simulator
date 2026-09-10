// ─────────────────────────────────────────────────────────────────────────────
// Cancer Survivor Conversation Simulator — Stage 4 PUBLIC scenario data
//
// Johnson Educational & Teaching Services · ABN 15 440 542 589
// Destination: server/scenarios.stage4.js
//
// ⚠ THIS FILE IS SAFE FOR THE PUBLIC REPOSITORY.
//   No true diagnosis, no likelihood ratios, no harm weights. Those live in
//   the private module — see stage4-answers.private.js.
//
// SEQUENCING: s4a MUST be completed before s4b is offered. s4a teaches that the
// modal hypothesis is not always the action target. s4b breaks the rule a
// student would otherwise generalise from it. Randomising the order, or
// offering s4b alone, teaches the wrong lesson.
// ─────────────────────────────────────────────────────────────────────────────

const GUARDRAIL = `
- Never break character. Never refer to yourself as an AI or to this as a simulation.
- Do not invent specific drug names, doses, test values, or clinical guidelines beyond those given above.
- Do NOT speculate about your own diagnosis, name any of the possibilities under consideration, or comment on what the student should do.
- If asked something not covered above, answer vaguely and in character rather than inventing detail.`;

const TOKEN_BUDGET = 100;

const scenarios = {

  // ═══════════════════════════════════════════════════════════════════════════
  // 4A — THE CLASSIC. Modal hypothesis is NOT the action target.
  // ═══════════════════════════════════════════════════════════════════════════

  s4a_breathless: {
    id: 's4a_breathless',
    stage: 4,
    sequence: 1,
    difficulty: 'foundation',
    personaType: 'patient',
    title: 'Stage 4A — Increasing breathlessness on the ward',
    description:
      'Warren, 64. Inpatient, day 12 after his third cycle of chemotherapy. You are the evening-shift nurse. He has become progressively more breathless over the past 24 hours.',

    tokenBudget: TOKEN_BUDGET,
    tokenFraming:
      'If 100 patients arrived on your ward in exactly this state, in how many of them would it be each of these?',

    hypotheses: [
      { key: 'h1', label: 'Chemotherapy-induced anaemia' },
      { key: 'h2', label: 'Hospital-acquired chest infection' },
      { key: 'h3', label: 'Pulmonary embolism' },
      { key: 'h4', label: 'Fluid overload or anthracycline cardiotoxicity' },
    ],

    bounds: [
      {
        bound: 1,
        trigger: 'handover only',
        studentFacing: `EVENING HANDOVER — Bay 3, Bed 2

Warren, 64. Diffuse large B-cell lymphoma. Day 12 after cycle 3 of chemotherapy.
Admitted three days ago with poor oral intake and fatigue. For discharge planning
tomorrow if he improves.

Day shift reports he has become steadily more short of breath since this time
yesterday. Was walking to the bathroom unaided on admission; needed help this
afternoon. Looks pale. Observations at 1400 were described as "stable".

No documented cardiac or respiratory history. No anticoagulation.`,
        allocationPrompt:
          'Before you go to him: if 100 patients arrived on your ward in exactly this state, in how many would it be each of these? Distribute all 100 tokens.',
      },
      {
        bound: 2,
        trigger: 'focused assessment and observations',
        studentFacing: `YOUR FOCUSED ASSESSMENT — 1915

Observations
  Respiratory rate    28   (was 18 yesterday)
  SpO2                91%  on room air   (was 97% yesterday)
  Heart rate          118  regular
  Blood pressure      104/62
  Temperature         37.0
  Conscious state     alert, orientated, speaking in short sentences

Examination
  Chest clear on auscultation. No crackles, no wheeze, no dullness.
  Conjunctivae pale. Peripheries warm. Capillary refill 2 seconds.
  JVP not elevated. No peripheral oedema. No sacral oedema.
  Calves soft and equal. No swelling, no tenderness, no erythema.

Warren volunteers that since this morning he has a sharp catch in the right
side of his chest when he breathes in deeply. He has not mentioned it to anyone
because it is not there when he breathes normally.`,
        allocationPrompt:
          'Reallocate all 100 tokens. You may move as many or as few as you wish.',
      },
      {
        bound: 3,
        trigger: 'one investigation result',
        studentFacing: `RESULT — full blood count, taken 1930, reported 2005

  Haemoglobin        76 g/L     (92 g/L four days ago)
  White cell count   5.4 ×10⁹/L
  Neutrophils        3.1 ×10⁹/L
  Platelets          180 ×10⁹/L

No other investigation has returned.`,
        allocationPrompt:
          'Reallocate all 100 tokens for the last time.',
        requiresAction: true,
        actionPrompt: `Commit now, before you see anything further.

  1. What do you do in the next 30 minutes?
  2. Who do you escalate to, and how urgently?
  3. In one sentence: why?

This commitment is locked once submitted.`,
      },
    ],

    patientSystemPrompt: `You are Warren, a 64-year-old man in a nursing education roleplay simulation. You are a fictional patient — not a real person, not an AI assistant. You are an inpatient and the student is the nurse on the evening shift.

BACKGROUND
- Diffuse large B-cell lymphoma. Day 12 after your third cycle of chemotherapy.
- Admitted three days ago because you were not eating or drinking enough.
- Retired school groundsman. Wife Denise visits every afternoon and has just gone home.
- You expected to be going home tomorrow and you are frightened that you will not be.

SURFACE CONCERN (open with this)
"I can't seem to get my breath. It's been getting worse all day. I thought I was supposed to be going home."

HIDDEN CONCERNS — reveal these only when the nurse asks open, empathetic questions
1. You did not press the buzzer earlier because the staff seemed busy and you did not want to be a nuisance.
2. You are frightened that being breathless means the lymphoma has come back, and you have not said this to Denise.
3. You are exhausted in a way that frightens you more than the breathlessness does.

CUES — the nurse should elicit these
1. If asked about pain anywhere, or about your chest, describe a sharp catch on the right side when you take a deep breath. It started this morning. It is not there with normal breathing. You will volunteer this one readily if the nurse asks about your chest at all.
2. If asked when the breathlessness started or how it has changed: yesterday you walked to the bathroom yourself; this afternoon you needed a hand; just now, getting up the bed made you puff.
3. If asked about your legs, say they feel fine and look normal to you.
4. If asked about cough, phlegm, fever or shivering, say no to all of them.
5. If asked about swelling, ankles, or lying flat, say you have been sleeping on two pillows the same as always and your ankles look the same as ever.

COMMUNICATION STYLE
- Short sentences because you are breathless. You pause mid-sentence to breathe.
- Apologetic about taking up time.
- Understates everything by one notch. "A bit puffed." "Bit of a catch."
- Keep responses to 1–3 sentences.${GUARDRAIL}`,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4B — THE COUNTER-EXAMPLE. Modal hypothesis IS the action target.
  // Exists so students do not generalise "distrust the mode" from 4A.
  // ═══════════════════════════════════════════════════════════════════════════

  s4b_fever: {
    id: 's4b_fever',
    stage: 4,
    sequence: 2,
    difficulty: 'extension',
    prerequisite: 's4a_breathless',
    personaType: 'patient',
    title: 'Stage 4B — Fever and rigors on admission',
    description:
      'Yvonne, 58. Day 8 after her second cycle of chemotherapy. Arrived on the ward this evening from home with a fever. You are the admitting nurse.',

    tokenBudget: TOKEN_BUDGET,
    tokenFraming:
      'If 100 patients arrived on your ward in exactly this state, in how many of them would it be each of these?',

    hypotheses: [
      { key: 'h1', label: 'Neutropenic sepsis' },
      { key: 'h2', label: 'Viral upper respiratory infection' },
      { key: 'h3', label: 'Drug-related fever' },
      { key: 'h4', label: 'Pulmonary embolism' },
    ],

    bounds: [
      {
        bound: 1,
        trigger: 'handover only',
        studentFacing: `ADMISSION HANDOVER — 2040, direct from home

Yvonne, 58. Breast cancer. Day 8 after cycle 2 of chemotherapy.

Rang the treatment line at 1900 reporting she felt hot and shivery and "not
right". Advised to come in. Arrived by car with her son.

Reports a shaking episode at home that lasted several minutes. No cough she has
mentioned. No known contacts unwell. Not on anticoagulation.

No observations recorded yet. She is in the assessment bay.`,
        allocationPrompt:
          'Before you go to her: if 100 patients arrived on your ward in exactly this state, in how many would it be each of these? Distribute all 100 tokens.',
      },
      {
        bound: 2,
        trigger: 'focused assessment and observations',
        studentFacing: `YOUR FOCUSED ASSESSMENT — 2055

Observations
  Respiratory rate    22
  SpO2                96%  on room air
  Heart rate          116  regular
  Blood pressure      102/58
  Temperature         38.7
  Conscious state     alert, orientated, but says she feels "wrung out"

Examination
  Mouth sore. Visible mucosal ulceration on the inner cheek and tongue.
  Chest clear. No cough, no sputum, no coryza, no sore throat.
  No chest pain. No breathlessness at rest.
  Calves soft and equal. No swelling, no tenderness.
  Peripheral cannula site from last cycle removed, no erythema.

Medication review: no new medicines started in the past 72 hours.
No blood products given this cycle.`,
        allocationPrompt:
          'Reallocate all 100 tokens. You may move as many or as few as you wish.',
      },
      {
        bound: 3,
        trigger: 'one investigation result',
        studentFacing: `RESULT — full blood count, taken 2100, reported 2135

  Haemoglobin        105 g/L
  White cell count   0.8 ×10⁹/L
  Neutrophils        0.3 ×10⁹/L
  Platelets          140 ×10⁹/L

No other investigation has returned.`,
        allocationPrompt:
          'Reallocate all 100 tokens for the last time.',
        requiresAction: true,
        actionPrompt: `Commit now, before you see anything further.

  1. What do you do in the next 30 minutes?
  2. Who do you escalate to, and how urgently?
  3. In one sentence: why?

This commitment is locked once submitted.`,
      },
    ],

    patientSystemPrompt: `You are Yvonne, a 58-year-old woman in a nursing education roleplay simulation. You are a fictional patient — not a real person, not an AI assistant. You have just arrived on the ward and the student is the admitting nurse.

BACKGROUND
- Breast cancer. Day 8 after your second cycle of chemotherapy.
- At home this evening you felt hot, then shook uncontrollably for several minutes. You rang the treatment line and were told to come in.
- Your son Michael drove you and is in the corridor.
- Retired librarian. You are apologetic about coming in and half-convinced you are wasting everyone's time.

SURFACE CONCERN (open with this)
"I'm probably making a fuss. I felt hot, then I had this shaking fit — I couldn't stop it. My son made me ring."

HIDDEN CONCERNS — reveal these only when the nurse asks open, empathetic questions
1. You are frightened by the shaking because it was outside your control, and that frightened you more than feeling unwell.
2. You have been told about the treatment line but you did not really believe it applied to you.
3. You feel worse than you are letting on and you are working hard to seem composed.

CUES — the nurse should elicit these
1. If asked about your mouth, eating, drinking or swallowing, say your mouth has been sore for four days and it stings to eat anything. You have been living on ice blocks.
2. If asked about cough, phlegm, sore throat, runny nose or anyone at home being unwell, say no to all of them.
3. If asked about chest pain, breathlessness, or your legs, say no to all of them. You feel breathless only when you talk a lot.
4. If asked about new tablets or medicines in the last few days, say nothing has changed.
5. If asked when the shaking happened, say about two hours ago, and it lasted several minutes.

COMMUNICATION STYLE
- Polite, self-effacing, minimising. "I'm sure it's nothing." "I feel a fraud."
- Precise when asked precise questions. She is a librarian and answers accurately.
- Becomes quieter and less talkative as the assessment goes on, because she feels worse.
- Keep responses to 1–3 sentences.${GUARDRAIL}`,
  },

};

module.exports = { scenarios, TOKEN_BUDGET };
