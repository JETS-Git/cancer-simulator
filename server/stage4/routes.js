// ─────────────────────────────────────────────────────────────────────────────
// Cancer Survivor Conversation Simulator — Stage 4 routes
//
// Johnson Educational & Teaching Services · ABN 15 440 542 589
// Destination: server/stage4/routes.js
//
// Mounts at /api/stage4. Nothing here touches /api/chat or /api/feedback —
// their request and response shapes are unchanged.
//
// ── THE TWO LOCKS ────────────────────────────────────────────────────────────
// 1. The four hypotheses do not leave the server until the free-text
//    differential has been submitted.
// 2. The analysis does not leave the server until the bound-3 allocation AND
//    the committed action have arrived together in one request.
//
// Both are enforced by the session state machine below, not by the client.
// Showing the analysis before the commitment destroys the exercise, and a
// self-directed deployment has no facilitator to prevent it.
//
// Nothing from the private answer key is ever serialised into a response
// before /commit. Search this file for `answerKey` and check every use.
// ────────────────────────────────────────────────────────────────────

'use strict';

const crypto = require('crypto');
const express = require('express');
const engine = require('./engine');
const { stage4Prompt } = require('../feedback-prompts');

// ── Private answer key: fail fast ────────────────────────────────────────────
// A stage 4 scenario served without an answer key looks plausible and measures
// nothing. Nobody would notice until a cohort had been through it.
let answerKeys;
try {
  answerKeys = require(process.env.STAGE4_ANSWERS_PATH || './answers.private');
} catch (err) {
  console.error(
    'FATAL: stage 4 answer key not found. Set STAGE4_ANSWERS_PATH or place ' +
    'answers.private.js in server/stage4/. Refusing to start.\n  ' + err.message
  );
  process.exit(1);
}

const SECRET = process.env.STAGE4_SESSION_SECRET;
if (!SECRET) {
  console.error('FATAL: STAGE4_SESSION_SECRET is not set. Refusing to start.');
  process.exit(1);
}

// Re-commit guard. Holds session ids only, never state. Degrades on restart,
// which is acceptable — stateless tokens are replayable by design. If anything
// summative is ever attached to stage 4, replace this with real session storage.
const committed = new Set();

// ── Session tokens ───────────────────────────────────────────────────────────
// The token carries ONLY the student's own answers. The answer key never
// enters it. Signing is for tamper-evidence, not secrecy: a student editing
// their bound-1 prior to make their updating look coherent is the failure
// this closes.

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Malformed session token.');
  }
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');

  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Session token failed verification.');
  }
  return JSON.parse(Buffer.from(body, 'base64url').toString());
}

// ── Router ───────────────────────────────────────────────────────────────────

/**
 * @param {object} deps
 * @param {object} deps.scenarios  stage 4 public scenario map
 * @param {function} deps.generate the unified LLM helper from index.js,
 *                                 injected so this module stays testable and
 *                                 free of circular imports
 */
function createStage4Router({ scenarios, generate }) {
  const router = express.Router();

  const load = token => {
    const session = verify(token);
    const scenario = scenarios[session.scenarioId];
    if (!scenario) throw new Error('Unknown scenario in session.');
    const answerKey = answerKeys[session.scenarioId];
    if (!answerKey) throw new Error('No answer key for scenario.');
    return { session, scenario, answerKey };
  };

  const fail = (res, code, message) => res.status(code).json({ error: message });

  // ── Start ──────────────────────────────────────────────────────────────────
  // Returns the bound-1 brief and the token budget. NOT the hypotheses.
  //
  // Prerequisite gating is enforced with a server-signed completion token,
  // never a client-asserted list. `/commit` issues `completionToken` — an
  // HMAC-signed { scenarioId, completedAt } payload — only once a scenario
  // has actually been committed. Here we verify that token's signature and
  // check it names OUR prerequisite, rather than trusting anything the
  // client claims about what it has "completed". A forged or missing token
  // is indistinguishable from having skipped the prerequisite outright.
  router.post('/session', (req, res) => {
    const { scenarioId } = req.body;
    const scenario = scenarios[scenarioId];

    if (!scenario) return fail(res, 400, 'Invalid or missing scenarioId.');

    if (scenario.prerequisite) {
      try {
        const prior = verify(req.body.completionToken);
        if (prior.scenarioId !== scenario.prerequisite) {
          throw new Error('Completion token is for a different scenario.');
        }
      } catch (e) {
        return fail(res, 403, 'The preceding scenario must be completed first.');
      }
    }

    const session = {
      sid: crypto.randomUUID(),
      scenarioId,
      startedAt: Date.now(),
      state: 'awaiting-differential',
      allocations: {},
    };

    res.json({
      token: sign(session),
      title: scenario.title,
      tokenBudget: scenario.tokenBudget,
      tokenFraming: scenario.tokenFraming,
      bound1: scenario.bounds[0].studentFacing,
      differentialPrompt:
        'Before you see any list: what could be going on here? Write everything ' +
        'you would consider. There is no wrong answer and this is not scored ' +
        'against a key.',
    });
  });

  // ── LOCK 1 — hypotheses revealed only now ──────────────────────────────────
  router.post('/differential', (req, res) => {
    let ctx;
    try { ctx = load(req.body.token); } catch (e) { return fail(res, 400, e.message); }
    const { session, scenario } = ctx;

    if (session.state !== 'awaiting-differential') {
      return fail(res, 409, 'The differential has already been submitted.');
    }
    const text = (req.body.differential || '').trim();
    if (!text) return fail(res, 400, 'A differential is required before continuing.');

    session.differentialText = text;
    session.state = 'awaiting-allocation-1';

    res.json({
      token: sign(session),
      hypotheses: scenario.hypotheses,
      allocationPrompt: scenario.bounds[0].allocationPrompt,
    });
  });

  // ── Bounds 1 and 2 ─────────────────────────────────────────────────────────
  router.post('/allocation', (req, res) => {
    let ctx;
    try { ctx = load(req.body.token); } catch (e) { return fail(res, 400, e.message); }
    const { session, scenario } = ctx;

    const bound = Number(req.body.bound);
    if (![1, 2].includes(bound)) {
      return fail(res, 400, 'Bound 3 is submitted with the committed action, via /commit.');
    }
    if (session.state !== `awaiting-allocation-${bound}`) {
      return fail(res, 409, `Expected ${session.state}, received bound ${bound}.`);
    }

    try {
      engine.normalise(req.body.allocation, scenario.tokenBudget);
    } catch (e) {
      return fail(res, 400, e.message);
    }

    session.allocations[bound] = req.body.allocation;
    session.state = `awaiting-allocation-${bound + 1}`;

    const next = scenario.bounds[bound];   // bounds[1] is bound 2
    res.json({
      token: sign(session),
      bound: next.bound,
      brief: next.studentFacing,
      allocationPrompt: next.allocationPrompt,
      requiresAction: !!next.requiresAction,
      actionPrompt: next.actionPrompt || null,
    });
  });

  // ── LOCK 2 — allocation and action arrive together; analysis computed here ──
  router.post('/commit', (req, res) => {
    let ctx;
    try { ctx = load(req.body.token); } catch (e) { return fail(res, 400, e.message); }
    const { session, scenario, answerKey } = ctx;

    if (session.state !== 'awaiting-allocation-3') {
      return fail(res, 409, 'This session is not at bound 3.');
    }
    if (committed.has(session.sid)) {
      return fail(res, 409, 'This session has already been committed.');
    }

    const action = (req.body.action || '').trim();
    if (!action) {
      return fail(res, 400, 'The committed action is required. It submits with the allocation.');
    }

    try {
      engine.normalise(req.body.allocation, scenario.tokenBudget);
    } catch (e) {
      return fail(res, 400, e.message);
    }

    session.allocations[3] = req.body.allocation;
    session.committedAction = { text: action, at: Date.now() };
    session.state = 'committed';
    committed.add(session.sid);

    let computed;
    try {
      computed = engine.scoreSession({
        scenario,
        answerKey,
        allocations: session.allocations,
        committedAction: action,
        differentialText: session.differentialText,
      });
    } catch (err) {
      console.error('[/api/stage4/commit] scoring failed', err.message);
      return fail(res, 500, 'The exercise could not be scored. Your responses are not lost.');
    }

    session.computed = computed;

    // Everything below this line is safe to reveal. Nothing above it was.
    res.json({
      token: sign(session),
      // Signed proof that THIS scenario was committed, for any scenario that
      // names it as a prerequisite. See the comment above /session.
      completionToken: sign({ scenarioId: session.scenarioId, completedAt: Date.now() }),
      trueDiagnosis: answerKey.trueDiagnosisLabel,
      scores: {
        brierScore: computed.brierScore,
        coherence: computed.coherence,
        cromwellViolations: computed.cromwellViolations,
      },
      normativePosteriors: computed.normativePosteriors,
      studentPosteriors: computed.studentPosteriors,
      movementAnalysis: computed.movementAnalysis,
      expectedHarm: computed.expectedHarm,
      illustrativeNotice:
        'The likelihood ratios behind these figures are illustrative. They were ' +
        'chosen to make the reasoning work, not measured from a population. ' +
        'Do not carry them into practice.',
    });
  });

  // ── Narrative debrief ──────────────────────────────────────────────────────
  // Separated from /commit so the student sees their scores immediately and
  // reads the narrative while it generates.
  router.post('/debrief', async (req, res) => {
    let ctx;
    try { ctx = load(req.body.token); } catch (e) { return fail(res, 400, e.message); }
    const { session, scenario, answerKey } = ctx;

    if (session.state !== 'committed' || !session.computed) {
      return fail(res, 409, 'The action must be committed before the debrief.');
    }

    try {
      const content = await generate({
        system: stage4Prompt(scenario, session.computed, answerKey),
        messages: [{ role: 'user', content: 'Provide the debrief.' }],
        maxTokens: 3000,
        temperature: 0.1,   // explains supplied figures; must not embellish
      });
      res.json({ content });
    } catch (err) {
      console.error('[/api/stage4/debrief]', err.message);
      fail(res, 503, 'The debrief service is temporarily unavailable. Your scores are above.');
    }
  });

  return router;
}

module.exports = { createStage4Router, sign, verify };
