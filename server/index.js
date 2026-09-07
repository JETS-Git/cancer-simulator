// dotenv never overrides env vars that already exist in the shell. If the shell
// exports an EMPTY key, that empty value would win over the real one in .env, so
// drop empties before loading .env.
for (const k of ['ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY']) {
  if (!process.env[k]) delete process.env[k];
}
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const scenarios = require('./scenarios');

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER CONFIG
//
// LLM_PROVIDER selects which backend to use (set in .env). Default: "groq".
//   • "groq"      → free cloud, OpenAI-compatible  (needs GROQ_API_KEY)
//   • "anthropic" → Claude API                     (needs ANTHROPIC_API_KEY)
//   • "openai"    → any OpenAI-compatible endpoint  (Ollama, OpenRouter, etc.)
//
// To change the model, edit the MODELS map below. Find current Groq models at
// https://console.groq.com/docs/models — update the string if one is retired.
// ─────────────────────────────────────────────────────────────────────────────
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'groq').toLowerCase();

const MODELS = {
  // Groq deprecated & shut down llama-3.3-70b-versatile on 2026-08-16;
  // openai/gpt-oss-120b is Groq's recommended replacement. See
  // https://console.groq.com/docs/deprecations
  groq: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  openai: process.env.OPENAI_MODEL || 'llama3.2:3b', // e.g. Ollama model name
};

// OpenAI-compatible base URLs per provider.
const OPENAI_BASE_URLS = {
  groq: 'https://api.groq.com/openai/v1',
  openai: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1', // Ollama default
};

// ── Unified generation helper ────────────────────────────────────────────────
// Returns the assistant's text. Throws on error (handled by routes).
async function generate({ system, messages, maxTokens, temperature }) {
  if (LLM_PROVIDER === 'anthropic') {
    return generateAnthropic({ system, messages, maxTokens, temperature });
  }
  // groq + openai are both OpenAI-compatible
  return generateOpenAICompatible({ system, messages, maxTokens, temperature });
}

let anthropicClient = null;
async function generateAnthropic({ system, messages, maxTokens, temperature }) {
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  const response = await anthropicClient.messages.create({
    model: MODELS.anthropic,
    max_tokens: maxTokens,
    temperature,
    system,
    messages,
  });
  return response.content[0].text;
}

async function generateOpenAICompatible({ system, messages, maxTokens, temperature }) {
  const baseURL = OPENAI_BASE_URLS[LLM_PROVIDER] || OPENAI_BASE_URLS.openai;
  const apiKey =
    process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'not-needed';

  // OpenAI format puts the system prompt as the first message.
  const fullMessages = [{ role: 'system', content: system }, ...messages];

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODELS[LLM_PROVIDER] || MODELS.openai,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      msg = JSON.parse(text).error?.message || text;
    } catch {
      /* keep raw text */
    }
    throw new Error(`${res.status} ${msg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Which key (if any) this provider needs, for the startup check.
function requiredKeyName() {
  if (LLM_PROVIDER === 'anthropic') return 'ANTHROPIC_API_KEY';
  if (LLM_PROVIDER === 'groq') return 'GROQ_API_KEY';
  return null; // local OpenAI-compatible (Ollama) needs none
}

// ─────────────────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Health check for the hosting platform ────────────────────────────────────
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// ── Patient mode: forward student messages to the patient roleplay ───────────
app.post('/api/chat', async (req, res) => {
  const { scenarioId, messages } = req.body;

  if (!scenarioId || !scenarios[scenarioId]) {
    return res.status(400).json({ error: 'Invalid or missing scenarioId.' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }

  const scenario = scenarios[scenarioId];

  try {
    const content = await generate({
      system: scenario.patientSystemPrompt,
      messages,
      maxTokens: 500,
      temperature: 0.8, // a little warmth/variation for natural roleplay
    });
    res.json({ content });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ error: `API error: ${err.message}` });
  }
});

// ── Educator mode: review the full transcript and return structured feedback ─
app.post('/api/feedback', async (req, res) => {
  const { scenarioId, transcript } = req.body;

  if (!scenarioId || !scenarios[scenarioId]) {
    return res.status(400).json({ error: 'Invalid or missing scenarioId.' });
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return res.status(400).json({ error: 'transcript must be a non-empty array.' });
  }

  const scenario = scenarios[scenarioId];

  const feedbackSystemPrompt = `You are an expert nurse educator reviewing a pre-registration nursing student's practice conversation.
Scenario: ${scenario.title}
${scenario.description}

The student played the role of the nurse (labelled "Nurse" in the transcript). Evaluate ONLY the nurse's messages.

Return structured feedback in Markdown using exactly this format:

## Feedback Report

### Rubric Assessment

Score each domain **Emerging**, **Developing**, or **Proficient** and write 2–3 sentences with direct quotes from the student's messages where possible.

**1. Rapport & therapeutic communication**
...

**2. Active listening & empathy**
...

**3. Person-centred approach** (did the student elicit the patient's own priorities?)
...

**4. Clear, appropriate information-giving**
...

**5. Holistic assessment** (physical AND psychosocial dimensions)
...

**6. Survivorship-specific awareness** (fear of recurrence, late effects, supportive-care needs)
...

**7. Safety-netting / recognising and escalating red flags**
...

---

### 3 Specific Strengths

1. ...
2. ...
3. ...

### 3 Specific Actions for Next Time

1. ...
2. ...
3. ...

Be encouraging but honest. This is formative feedback to help the student grow.
Do not invent specific drug names, doses, or clinical guidelines.`;

  const transcriptText = transcript
    .map(m => `${m.role === 'user' ? 'Nurse' : 'Patient'}: ${m.content}`)
    .join('\n\n');

  try {
    const content = await generate({
      system: feedbackSystemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the full conversation transcript:\n\n${transcriptText}\n\nPlease provide structured feedback.`,
        },
      ],
      maxTokens: 2000,
      temperature: 0.4, // more consistent for assessment
    });
    res.json({ content });
  } catch (err) {
    console.error('[/api/feedback]', err.message);
    res.status(500).json({ error: `API error: ${err.message}` });
  }
});

// ── Serve the built React app (production / single-service deploy) ───────────
// In local dev the Vite server serves the frontend on :5173 and proxies /api
// here, so client/dist won't exist and this block is skipped. After `npm run
// build`, Express serves the static bundle and the SPA fallback.
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: send index.html for any non-API, non-asset route.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Cancer Simulator API running on http://localhost:${PORT}`);
  console.log(`Provider: ${LLM_PROVIDER}  |  Model: ${MODELS[LLM_PROVIDER] || MODELS.openai}`);
  const keyName = requiredKeyName();
  if (keyName && !process.env[keyName]) {
    console.warn(`WARNING: ${keyName} is not set. Add it to .env (see .env.example).`);
  }
});
