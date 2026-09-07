# Cancer Survivor Conversation Simulator

An educational prototype to help pre-registration nursing students practise
supportive-care conversations with fictional cancer survivors.

> **This is a teaching tool, not a clinical decision aid.**

---

## Quick start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- An [Anthropic API key](https://console.anthropic.com/)

### 2. Clone / download the project

```
cancer-simulator/
├── server/      ← Express API (proxies to the LLM provider)
├── client/      ← React / Vite frontend
└── .env         ← you create this (see step 3)
```

### 3. Choose a provider and set your key

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

`LLM_PROVIDER` is the default used by both routes. To run each route on a
different provider, set `CHAT_PROVIDER` and/or `FEEDBACK_PROVIDER` — each
falls back to `LLM_PROVIDER` when unset. For example, to run the patient
roleplay (`/api/chat`) against a local Ollama instance while keeping feedback
generation (`/api/feedback`) on Groq:

```
LLM_PROVIDER=groq
CHAT_PROVIDER=openai
# FEEDBACK_PROVIDER left unset → falls back to LLM_PROVIDER (groq)
```

Leaving `CHAT_PROVIDER` and `FEEDBACK_PROVIDER` unset is the default and
behaves exactly as before — both routes use `LLM_PROVIDER`.

Edit `.env` accordingly (see the comments in `.env.example`).

### 4. Install dependencies

```bash
# From the project root
npm install
npm run install:all
```

### 5. Run the app

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

A `/healthz` endpoint returns `200 OK` with a small JSON status payload
(current chat/feedback providers and models, and which API keys are present —
never the key values themselves) for the platform's health check, and
`render.yaml` is a ready-made Blueprint.

### Step-by-step

1. **Put the code on GitHub.** From the project root:
   ```bash
   git init
   git add .
   git commit -m "Cancer Survivor Conversation Simulator"
   git branch -M main
   # create an empty repo on github.com first, then:
   git remote add origin https://github.com/<your-username>/cancer-simulator.git
   git push -u origin main
   ```
   > `.env` is git-ignored, so your API key is **not** pushed. Good.

2. **Create a free Render account** at https://render.com (sign in with GitHub).

3. **New service from the Blueprint.** In Render: **New → Blueprint**, pick your
   repo. Render reads `render.yaml` and proposes a free web service with:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Health Check Path: `/healthz`

   *(Or do it manually: **New → Web Service**, select the repo, and enter those
   three values yourself.)*

4. **Set the API key as a secret.** When prompted (or under **Environment**), add:
   - `GROQ_API_KEY` = your Groq key (from https://console.groq.com/keys)
   - `LLM_PROVIDER` = `groq` (already set by the Blueprint)

   > To use Anthropic instead, set `LLM_PROVIDER=anthropic` and
   > `ANTHROPIC_API_KEY` (requires a funded Anthropic account).

5. **Deploy.** Render builds and starts the service. When it's live you'll get a
   URL like `https://cancer-survivor-simulator.onrender.com`.

### Confirm it works

```bash
# Replace with your real Render URL
curl -i https://YOUR-APP.onrender.com/healthz
# expect: HTTP/1.1 200 OK   and a JSON body like:
# {"status":"OK","chatProvider":"groq","feedbackProvider":"groq",
#  "chatModel":"llama-3.3-70b-versatile","feedbackModel":"llama-3.3-70b-versatile",
#  "keyPresent":{"GROQ_API_KEY":true,"ANTHROPIC_API_KEY":false,"OPENAI_API_KEY":false}}
```

Manual test checklist in a browser:
- [ ] The page loads with the grey disclaimer banner at the top.
- [ ] "About this prototype" opens the modal; the landing shows the attribution line.
- [ ] Pick a scenario → type a message → the patient replies in character.
- [ ] "End conversation & get feedback" returns a structured rubric report.
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

| Mode | What happens |
|---|---|
| **Patient mode** (default) | The model role-plays one of three fictional cancer survivors. The student types as the nurse. The patient reveals deeper concerns only in response to good, empathetic questioning. |
| **Educator mode** | Triggered by "End conversation & get feedback". The model reviews the full transcript against a structured rubric and returns formative feedback with quotes and specific suggestions. |

### Scenarios

| Scenario | Patient | Key themes |
|---|---|---|
| Breast cancer, 8 months post-chemo | Sarah, 42 | Fatigue, fear of recurrence, lymphoedema anxiety, relationship strain |
| Colorectal cancer, 6 months post-surgery | David, 58 | Bowel changes, body image, return-to-work stress, low mood red flag |
| Lymphoma, 1 year post-treatment | Aisha, 29 | Scanxiety, identity/low mood, relationship withdrawal, new lump red flag |

### Feedback rubric

Each domain is scored **Emerging / Developing / Proficient**:

1. Rapport & therapeutic communication
2. Active listening & empathy
3. Person-centred approach
4. Clear, appropriate information-giving
5. Holistic assessment (physical + psychosocial)
6. Survivorship-specific awareness
7. Safety-netting / recognising red flags

Plus: 3 strengths and 3 actions for next time.

---

## Project structure

```
server/
  index.js        ← Express routes (/api/chat, /api/feedback)
  scenarios.js    ← Patient briefs and system prompts

client/
  src/
    App.jsx                         ← Top-level state + routing, About modal
    components/
      ScenarioSelector.jsx          ← Pick a scenario
      ChatInterface.jsx             ← Live chat UI
      FeedbackDisplay.jsx           ← Educator feedback panel
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
