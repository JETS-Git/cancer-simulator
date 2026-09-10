# Clinical Reasoning Simulator

An educational prototype to help pre-registration nursing students practise
clinical reasoning through a staged curriculum, from logical reasoning
through Bayesian interpretation of a surveillance result to confidence
allocation during a deteriorating patient.

> **This is a teaching tool, not a clinical decision aid.**

## Stages

| Stage | Focus | Scenarios |
|---|---|---|
| 1 — Logical reasoning | Reasoning errors (conjunction fallacy, absence of evidence) in a low-clinical-load setting | Margaret (patient), Tom (peer) |
| 2 — Clinical reasoning | Competing explanations, one time-critical finding, one distractor | Sarah, David, Aisha, Ray, Danielle |
| 3 — Bayesian reasoning | Interpreting a positive surveillance result against its real predictive value | Colin (CEA), Nadia (CA-125) |
| 4 — Confidence allocation under deterioration | Allocating belief across four hypotheses as a ward patient deteriorates, then committing to an action scored against expected harm, not likelihood | Warren (4A), Yvonne (4B, unlocks after 4A) |

Stages 1–3 use the existing patient-chat + educator-feedback flow. Stage 4 is
a separate, structured exercise (`/api/stage4/*`) with a deterministic
scoring engine — see [Project structure](#project-structure) below.

---

## Quick start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A free [Groq API key](https://console.groq.com/keys) (the default provider — see step 4 for alternatives)

### 2. Clone / download the project

```
clinical-reasoning-simulator/
├── server/      ← Express API (proxies to the LLM provider)
├── client/      ← React / Vite frontend
└── .env         ← you create this (see step 3)
```

### 3. Stage 4's private answer key (not in this repository)

`server/stage4/answers.private.js` contains the true diagnoses, likelihood
ratios and harm weights for the stage 4 scenarios. It is gitignored on
purpose — if it reached git history the exercise would be permanently
defeated for anyone who can read the repo. The server refuses to start
without it (`FATAL`, exits 1).

For local development, obtain the file separately from whoever maintains the
answer key and place it at `server/stage4/answers.private.js`, or point
`STAGE4_ANSWERS_PATH` in `.env` at wherever you've put it. In production it is
supplied as a Render Secret File — see [Deploy to a stable public URL](#deploy-to-a-stable-public-url-render).

You also need `STAGE4_SESSION_SECRET` in `.env` — generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 4. Choose a provider and set your key

Copy the example env file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

The app is **provider-agnostic** — pick one via `LLM_PROVIDER` in `.env`:

| Provider | Cost | Key needed | How |
|---|---|---|---|
| **Groq** (default) | Free tier | Free key | Get one at https://console.groq.com/keys, set `GROQ_API_KEY`. |
| **Ollama** (local) | Free, offline | None | Install https://ollama.com, run `ollama pull llama3.2:3b`, set `LLM_PROVIDER=openai`. |
| **Anthropic** | Paid | Paid key | Set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. |

Edit `.env` accordingly (see the comments in `.env.example`).

### 5. Install dependencies

```bash
# From the project root
npm install
npm run install:all
```

### 6. Run the app

```bash
npm run dev
```

This starts both servers concurrently:
- **API server** → http://localhost:3001
- **React dev server** → http://localhost:5173

Open **http://localhost:5173** in your browser.

---

## Sharing a temporary public link (for review)

To let someone review the app from their own browser without installing
anything, you can expose your local instance through a Cloudflare quick tunnel.

### One-time setup

Install `cloudflared` (free, no account needed for quick tunnels):

```powershell
winget install --id Cloudflare.cloudflared -e
```

The `tunnel` script points at the default install path
`C:\Program Files (x86)\cloudflared\cloudflared.exe` (written as the 8.3 short
path `C:\PROGRA~2\cloudflared\cloudflared.exe` so the spaces don't break the
npm/cmd invocation). If you installed it elsewhere or are on macOS/Linux,
update the `tunnel` script in the root `package.json`, e.g.:

```jsonc
"tunnel": "cloudflared tunnel --url http://localhost:5173"
```

### Share

```bash
npm run share
```

This runs the API server, the React app, **and** the tunnel together. Look for
the `[tunnel]` output — it prints a public URL like:

```
https://<random-words>.trycloudflare.com
```

Send that link to your reviewer. Notes:
- **The link only works while `npm run share` keeps running** (your machine must
  stay on and online).
- **The URL is random and changes on every launch** — account-less Cloudflare
  tunnels can't reserve a fixed name. Copy the fresh link each time.
- Your API key stays **server-side** — the reviewer never sees it, but their
  usage counts against your provider's rate limits.
- This is a temporary tunnel with no uptime guarantee; fine for a demo, not for
  production. For a stable URL, use a [named Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
  (needs a free account + your own domain) or deploy to a host.

To stop sharing:

```powershell
taskkill /F /IM node.exe
taskkill /F /IM cloudflared.exe
```

---

## Deploy to a stable public URL (Render)

This app is structured as a **single web service**: `npm run build` builds the
React frontend into `client/dist`, and the Express server serves that bundle
*and* the API from one Node process. That means one service to deploy — no split
frontend/backend hosting.

Key scripts (root `package.json`):

| Script | What it does |
|---|---|
| `npm run build` | Installs client + server deps and builds the React bundle |
| `npm start` | Runs the Express server on `process.env.PORT` (serves API + frontend) |

A `/healthz` endpoint returns `200 OK` for the platform's health check, and
`render.yaml` is a ready-made Blueprint.

### Step-by-step

1. **Put the code on GitHub.** From the project root:
   ```bash
   git init
   git add .
   git status   # confirm answers.private.js and .env are NOT listed
   git commit -m "Clinical Reasoning Simulator"
   git branch -M main
   # create an empty PRIVATE repo on github.com first, then:
   git remote add origin https://github.com/<your-username>/clinical-reasoning-simulator.git
   git push -u origin main
   ```
   > `.env` and `server/stage4/answers.private.js` are git-ignored, so neither
   > your API key nor the stage 4 answer key is pushed. The repository must be
   > **private** — `server/scenarios.stages1-3.js` and `server/scenarios.js`
   > contain every stage 1–3 time-critical finding, distractor and target
   > error, and a public repo hands a student the answers before they start.

2. **Create a free Render account** at https://render.com (sign in with GitHub).

3. **New service from the Blueprint.** In Render: **New → Blueprint**, pick your
   repo. Render reads `render.yaml` and proposes a free web service with:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/healthz`

   *(Or do it manually: **New → Web Service**, select the repo, and enter those
   three values yourself.)*

   > If Render's GitHub App is scoped to selected repositories rather than
   > all of them, it loses access when a repo goes private. Re-grant access
   > to this repo (GitHub → Settings → Applications → Render → Configure)
   > before the first deploy from a private repo.

4. **Set the required secrets.** Under **Environment**:
   - `GROQ_API_KEY` = your Groq key (from https://console.groq.com/keys)
   - `LLM_PROVIDER` = `groq` (already set by the Blueprint)
   - `STAGE4_SESSION_SECRET` = generate with
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

   > To use Anthropic instead, set `LLM_PROVIDER=anthropic` and
   > `ANTHROPIC_API_KEY` (requires a funded Anthropic account).

5. **Upload the stage 4 answer key as a Secret File.** Under **Environment →
   Secret Files**: filename `answers.private.js`, contents = the whole of your
   local `server/stage4/answers.private.js`. Render mounts it at
   `/etc/secrets/answers.private.js`, which `STAGE4_ANSWERS_PATH` in
   `render.yaml` already points at. Without this the deploy will start and then
   immediately exit with a `FATAL` log line — that is the fail-fast check
   working as intended, not a bug; Render keeps the previous version serving
   while a deploy is failing.

6. **Deploy.** Render builds and starts the service. When it's live you'll get a
   URL like `https://clinical-reasoning-simulator.onrender.com`.

### Confirm it works

```bash
# Replace with your real Render URL
curl -i https://YOUR-APP.onrender.com/healthz
# expect: HTTP/1.1 200 OK   and body: OK
```

Manual test checklist in a browser:
- [ ] The page loads with the grey disclaimer banner at the top.
- [ ] "About this prototype" opens the modal, and its link opens the notices
      page with the licence attribution and support numbers.
- [ ] Pick a stage 1–3 scenario → type a message → the patient (or peer)
      replies in character.
- [ ] "End conversation & get feedback" returns a structured rubric report.
- [ ] Stage 4A (Warren) is startable immediately; stage 4B (Yvonne) shows as
      locked until 4A is committed.
- [ ] Complete stage 4A through to commit → 4B unlocks.
- [ ] (Optional) Temporarily set a bad `GROQ_API_KEY` → you get the friendly
      "service is temporarily unavailable" message, not a raw error.

> **Free-tier note:** Render's free web services sleep after ~15 minutes idle,
> so the first request after a pause can take ~30–60s to wake. Fine for a review;
> mention it to your supervisor if the first load is slow.

---

## Changing the model

Models are defined in the `MODELS` map near the top of `server/index.js`, or
overridden per-provider in `.env` (`GROQ_MODEL`, `ANTHROPIC_MODEL`, `OPENAI_MODEL`):

```js
const MODELS = {
  groq: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  openai: process.env.OPENAI_MODEL || 'llama3.2:3b',
};
```

If a Groq model is retired, pick a current one from
https://console.groq.com/docs/models.

---

## How it works

### Stages 1–3

| Mode | What happens |
|---|---|
| **Patient / peer mode** (default) | The model plays one of the fictional patients or peers. The student types as the nurse (or, in stage 1B, as a fellow student). The other party reveals deeper concerns or errors only in response to good, open questioning — it never signposts what the student should have caught. |
| **Educator mode** | Triggered by "End conversation & get feedback". `server/feedback-prompts.js` selects a system prompt keyed by the scenario's `stage` field, so each stage is assessed against its own rubric rather than one generic one. The model reviews the full transcript and returns formative feedback with quotes and specific suggestions. |

Each stage's rubric is different because the skill being assessed is
different — see `server/feedback-prompts.js` for the exact rubric text per
stage. Stage 3's feedback names base-rate neglect in its own section above
the rubric, deliberately, so it can't be averaged away against unrelated
domains.

### Stage 4

A structured five-endpoint flow under `/api/stage4/*`
(`server/stage4/routes.js`), built around two locks: the four hypotheses do
not reach the client until the student's free-text differential has been
submitted, and the full analysis is not computed until the final allocation
and the committed action arrive together in one request. All scoring —
Bayesian updating in log-odds space, a multi-category Brier score, KL
divergence for coherence, and an expected-harm ranking — is pure,
deterministic arithmetic in `server/stage4/engine.js`; the language model
never computes a number, only interprets ones it's given.

Progression from 4A to 4B is gated by a server-signed HMAC completion token
returned from `/commit`, verified (not trusted) by `/session` — the client
never gets to assert what it has completed.

### Scenarios

| Scenario | Character | Key themes |
|---|---|---|
| 1A — The detailed story | Margaret, 61 (patient) | Conjunction fallacy, confirmation bias |
| 1B — The study group | Tom (peer) | Absence-of-evidence error, confirmation bias |
| Breast cancer, 8 months post-chemo | Sarah, 42 | Fatigue, fear of recurrence, lymphoedema anxiety, relationship strain |
| Colorectal cancer, 6 months post-surgery | David, 58 | Bowel changes, body image, return-to-work stress, low mood red flag |
| Lymphoma, 1 year post-treatment | Aisha, 29 | Scanxiety, identity/low mood, relationship withdrawal, new lump red flag |
| 2A — Prostate cancer, 18 months post-treatment | Ray, 67 | Competing explanations for back pain; a time-critical spinal finding under a convincing distractor |
| 2B — Ovarian cancer, 4 months post-chemo | Danielle, 47 | Suspected pulmonary embolism under a constipation distractor |
| 3A — A raised CEA | Colin, 63 | Base-rate neglect interpreting a positive surveillance result |
| 3B — A raised CA-125 | Nadia, 38 | Base-rate neglect plus a genuine alternative explanation already in the history |
| 4A — Increasing breathlessness | Warren, 64 | The most probable explanation is not the one that will kill him tonight |
| 4B — Fever and rigors | Yvonne, 58 | The counter-example: this time probability and expected harm agree |

### Feedback rubric (stages 1–3)

Each domain is scored **Emerging / Developing / Proficient**, with a rubric
specific to that stage's skill (see `server/feedback-prompts.js`), plus 3
strengths and 3 actions for next time. Stage 4 has no rubric — its debrief
interprets the deterministic figures from `engine.js` instead (see
`stage4Prompt` in the same file).

---

## Project structure

```
server/
  index.js                  ← Express routes (/api/chat, /api/feedback), provider config, boot checks
  scenarios.js              ← Stage 2 patient briefs (existing 3) + merges scenarios.stages1-3.js
  scenarios.stages1-3.js    ← Stage 1–3 scenarios. CONTAINS ANSWERS (target errors, distractors,
                               time-critical findings, test characteristics) — repo must be private
  scenarios.stage4.js       ← Stage 4 PUBLIC scenario data (hypotheses, bounds, briefs) — no answers
  feedback-prompts.js       ← One system-prompt builder per stage, selected by scenario.stage
  stage4/
    routes.js               ← /api/stage4/* — the two-lock session state machine; signs and verifies
                               session + completion tokens; fails fast without STAGE4_SESSION_SECRET
    engine.js                ← Pure deterministic scoring: log-odds updating, Brier score, KL
                               divergence, Cromwell's-rule check, expected-harm ranking
    answers.private.js       ← GITIGNORED. True diagnoses, likelihood ratios, harm weights.
                               Not in this repository — see step 3 above

client/
  src/
    App.jsx                          ← Top-level state + routing, About modal, stage-4 completion tokens
    scenarioCatalogue.js             ← Client-side scenario metadata (titles/descriptions only — no answers)
    components/
      ScenarioSelector.jsx           ← Scenarios grouped by stage; locks 4B until 4A's token is present
      ChatInterface.jsx              ← Live chat UI (stages 1–3)
      FeedbackDisplay.jsx            ← Educator feedback panel (stages 1–3)
      Stage4Session.jsx              ← Orchestrator; the only component that calls /api/stage4/*
      DifferentialEntry.jsx          ← Free-text differential, before the hypotheses exist client-side
      BoundBrief.jsx                 ← Renders a handover/result as a monospace document
      TokenAllocator.jsx             ← Confidence allocation; zero is permitted and never discouraged
      ActionCommit.jsx               ← Final allocation + committed action, posted together
      Stage4Debrief.jsx              ← Trajectory table, scores, and the narrative debrief
      Notices.jsx                    ← Licence attribution + support contacts, fetched from
                                        /THIRD-PARTY-NOTICES.txt at runtime

scripts/
  generate-notices.js       ← Builds THIRD-PARTY-NOTICES.txt from the real installed dependency
                               tree — run via `npm run notices`, never hand-written
```

---

## Recording a demo

A ~60-second screen recording is a useful fallback to send if the live link is
ever unavailable (e.g. the free service is asleep). Record the deployed URL (or
`http://localhost:3001` after `npm run build && npm start`).

### Windows

- **Xbox Game Bar (built in):** press `Win + G`, then the record button (or
  `Win + Alt + R` to start/stop). Saves an MP4 to `Videos\Captures`.
- **OBS Studio** (free, https://obsproject.com): add a *Display Capture* or
  *Window Capture* source → **Start Recording**.
- **ffmpeg** (whole primary screen, 60s, with system audio off):
  ```powershell
  ffmpeg -f gdigrab -framerate 30 -t 60 -i desktop -c:v libx264 -pix_fmt yuv420p demo.mp4
  ```

### macOS

- **QuickTime Player:** File → *New Screen Recording* → record → stop → trim →
  export.
- **Built-in shortcut:** `Cmd + Shift + 5` → *Record Selected Portion* /
  *Record Entire Screen*.
- **ffmpeg** (screen index 1, 60s):
  ```bash
  ffmpeg -f avfoundation -framerate 30 -t 60 -i "1:none" -c:v libx264 -pix_fmt yuv420p demo.mp4
  # list devices first with: ffmpeg -f avfoundation -list_devices true -i ""
  ```

### Linux

- **OBS Studio** as above, or **ffmpeg** (X11, 1080p region, 60s):
  ```bash
  ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -t 60 -i :0.0 -c:v libx264 -pix_fmt yuv420p demo.mp4
  ```

Tip: keep it tight — pick one scenario, ask 2–3 good questions, then click
**End conversation & get feedback** to show the educator report.
