// ─────────────────────────────────────────────────────────────────────────────
// Cancer Survivor Conversation Simulator — Stage 4 deterministic scoring engine
//
// Johnson Educational & Teaching Services · ABN 15 440 542 589
// Destination: server/stage4/engine.js
//
// PURE FUNCTIONS ONLY. No model call, no network, no randomness, no I/O.
// Deterministic in, deterministic out. Every figure the feedback model receives
// is produced here. The model performs no arithmetic of any kind.
//
// The comparison throughout is against the STUDENT'S OWN bound-1 allocation.
// There is no model answer anywhere in this file.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// Below this, the evidence barely moves a hypothesis and judging the student's
// movement against it would be measuring noise.
const NEGLIGIBLE_MOVEMENT = 0.2;

// Magnitude bands, as ratio of actual to normative absolute log-odds movement.
const BANDS = [
  { max: 0.5, label: 'marked under-updating' },
  { max: 0.8, label: 'under-updating' },
  { max: 1.25, label: 'aligned' },
  { max: Infinity, label: 'over-updating' },
];

// ── Distributions ────────────────────────────────────────────────────────────

/**
 * Convert a token allocation to a probability distribution.
 * Zero is permitted and is preserved as zero. It is never smoothed.
 */
function normalise(allocation, budget) {
  const keys = Object.keys(allocation);
  const total = keys.reduce((s, k) => s + allocation[k], 0);

  if (total !== budget) {
    throw new Error(`Allocation sums to ${total}, expected ${budget}.`);
  }
  if (keys.some(k => allocation[k] < 0 || !Number.isInteger(allocation[k]))) {
    throw new Error('Allocations must be non-negative integers.');
  }

  const out = {};
  for (const k of keys) out[k] = allocation[k] / budget;
  return out;
}

/**
 * Apply every evidence item released at or before `uptoBound` to the prior.
 * Likelihood ratios multiply the odds, so weights multiply directly and are
 * renormalised at the end.
 *
 * A hypothesis at zero stays at zero regardless of the ratios applied to it.
 * That is Cromwell's rule falling out of the arithmetic, not a special case.
 */
function applyEvidence(prior, evidence, uptoBound) {
  const weights = { ...prior };

  for (const item of evidence) {
    if (item.bound > uptoBound) continue;
    for (const key of Object.keys(weights)) {
      const lr = item.likelihoodRatios[key];
      if (lr === undefined) {
        throw new Error(`Evidence "${item.id}" has no likelihood ratio for ${key}.`);
      }
      weights[key] *= lr;
    }
  }

  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  if (total === 0) {
    throw new Error('All hypotheses reduced to zero. Prior was entirely zero.');
  }

  const out = {};
  for (const k of Object.keys(weights)) out[k] = weights[k] / total;
  return out;
}

// ── Log-odds ────────────────────────────────────────────────────────────────

function logOdds(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  return Math.log(p / (1 - p));
}

function toLogOdds(distribution) {
  const out = {};
  for (const k of Object.keys(distribution)) out[k] = logOdds(distribution[k]);
  return out;
}

// ── Movement: direction and magnitude, separated ─────────────────────────────

/**
 * For each hypothesis, compare where the student actually moved against where
 * their own prior plus the evidence says they should have.
 *
 * Direction and magnitude are reported separately because they are different
 * failures. Moving the wrong way means the evidence was misread. Moving too
 * little means it was read and not believed.
 */
function movementAnalysis(prior, actual, normative) {
  const out = {};

  for (const k of Object.keys(prior)) {
    const l0 = logOdds(prior[k]);
    const lActual = logOdds(actual[k]);
    const lNorm = logOdds(normative[k]);

    // Zeroed at bound 1: no movement is possible or meaningful.
    if (prior[k] === 0) {
      out[k] = {
        status: 'zeroed-at-prior',
        note: 'Given nothing at bound 1. No later evidence could recover it.',
      };
      continue;
    }

    const deltaNormative = lNorm - l0;

    if (Math.abs(deltaNormative) <= NEGLIGIBLE_MOVEMENT) {
      out[k] = {
        status: 'evidence-neutral',
        deltaNormative: round(deltaNormative),
        deltaActual: actual[k] === 0 ? -Infinity : round(lActual - l0),
        note: 'The evidence barely bears on this one. Movement is not judged.',
      };
      continue;
    }

    // Zeroed later: a real move, of infinite magnitude, in a definite direction.
    if (actual[k] === 0) {
      out[k] = {
        status: 'zeroed-later',
        deltaNormative: round(deltaNormative),
        deltaActual: -Infinity,
        directionError: deltaNormative > 0,
        note: 'Reduced to zero after bound 1. Unrecoverable from that point.',
      };
      continue;
    }

    const deltaActual = lActual - l0;
    const directionError = Math.sign(deltaActual) !== Math.sign(deltaNormative);
    const magnitudeRatio = Math.abs(deltaActual) / Math.abs(deltaNormative);

    out[k] = {
      status: 'analysed',
      deltaNormative: round(deltaNormative),
      deltaActual: round(deltaActual),
      normativeDirection: deltaNormative > 0 ? 'up' : 'down',
      actualDirection: deltaActual > 0 ? 'up' : deltaActual < 0 ? 'down' : 'none',
      directionError,
      magnitudeRatio: directionError ? null : round(magnitudeRatio),
      band: directionError ? null : bandFor(magnitudeRatio),
    };
  }

  return out;
}

function bandFor(ratio) {
  return BANDS.find(b => ratio < b.max).label;
}

// ── Terminal accuracy ────────────────────────────────────────────────────────

/**
 * Multi-category Brier score. Range 0 to 2. Lower is better.
 * Reported alongside coherence, never alone — a student can score badly here
 * having reasoned impeccably.
 */
function brierScore(final, trueKey) {
  let sum = 0;
  for (const k of Object.keys(final)) {
    const outcome = k === trueKey ? 1 : 0;
    sum += (final[k] - outcome) ** 2;
  }
  return round(sum);
}

// ── Coherence ────────────────────────────────────────────────────────────────

/**
 * Kullback-Leibler divergence from the student's own Bayes-updated prior to
 * where they actually finished. Lower is better; zero is perfect coherence.
 *
 * Returns Infinity where the student holds zero and the evidence does not.
 * This is NOT patched with an epsilon. The infinity is the correct answer and
 * it is exactly what the Cromwell mechanic exists to surface.
 */
function coherence(normative, actual) {
  let sum = 0;
  for (const k of Object.keys(normative)) {
    const p = normative[k];
    if (p === 0) continue;          // limit of p·ln(p/q) as p → 0 is 0
    if (actual[k] === 0) return Infinity;
    sum += p * Math.log(p / actual[k]);
  }
  return round(sum);
}

// ── Cromwell ─────────────────────────────────────────────────────────────────

function cromwellCheck(allocations) {
  const violations = [];
  for (const bound of Object.keys(allocations)) {
    for (const key of Object.keys(allocations[bound])) {
      if (allocations[bound][key] === 0) {
        violations.push({ hypothesis: key, bound: Number(bound) });
      }
    }
  }
  return violations;
}

// ── Expected harm ────────────────────────────────────────────────────────────

/**
 * Probability weighted by consequence. The action committed at bound 3 is
 * scored against this ordering, not against likelihood.
 *
 * `divergesFromMode` is the flag the whole exercise turns on: true when the
 * most probable hypothesis is not the one carrying the most expected harm.
 */
function expectedHarm(final, harmWeights) {
  const rows = Object.keys(final).map(k => ({
    hypothesis: k,
    probability: round(final[k]),
    harmWeight: harmWeights[k],
    expectedHarm: round(final[k] * harmWeights[k]),
  }));

  const byHarm = [...rows].sort((a, b) => b.expectedHarm - a.expectedHarm);
  const byProbability = [...rows].sort((a, b) => b.probability - a.probability);

  return {
    ranked: byHarm,
    highestExpectedHarm: byHarm[0].hypothesis,
    mostProbable: byProbability[0].hypothesis,
    divergesFromMode: byHarm[0].hypothesis !== byProbability[0].hypothesis,
  };
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Everything the feedback model receives. Called once, on receipt of the
 * bound-3 allocation and the committed action together.
 */
function scoreSession({ scenario, answerKey, allocations, committedAction, differentialText }) {
  const budget = scenario.tokenBudget;

  const prior = normalise(allocations[1], budget);
  const student = {
    1: prior,
    2: normalise(allocations[2], budget),
    3: normalise(allocations[3], budget),
  };

  const normativePosteriors = {
    1: prior,
    2: applyEvidence(prior, answerKey.evidence, 2),
    3: applyEvidence(prior, answerKey.evidence, 3),
  };

  return {
    studentAllocations: allocations,
    studentPosteriors: student,
    normativePosteriors,
    movementAnalysis: {
      toBound2: movementAnalysis(prior, student[2], normativePosteriors[2]),
      toBound3: movementAnalysis(prior, student[3], normativePosteriors[3]),
    },
    brierScore: brierScore(student[3], answerKey.trueDiagnosis),
    coherence: coherence(normativePosteriors[3], student[3]),
    cromwellViolations: cromwellCheck(allocations),
    expectedHarm: expectedHarm(student[3], answerKey.harmWeights),
    committedAction,
    differentialText,
    trueDiagnosis: answerKey.trueDiagnosis,
  };
}

// ── Utility ──────────────────────────────────────────────────────────────────

function round(n) {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 10000) / 10000;
}

module.exports = {
  normalise,
  applyEvidence,
  logOdds,
  toLogOdds,
  movementAnalysis,
  brierScore,
  coherence,
  cromwellCheck,
  expectedHarm,
  scoreSession,
  NEGLIGIBLE_MOVEMENT,
  BANDS,
};
