# Third-Party Notices

**Cancer Survivor Conversation Simulator**
Johnson Educational & Teaching Services · ABN 15 440 542 589
Destination: repository root

---

## ⚠ This file is a scaffold. Generate the real one before distributing.

The copyright lines are deliberately not hand-written. Getting a copyright
holder or a year wrong is worse than not having the file, and the accurate
version can only be produced from your actual `node_modules` — the licence text
that must be reproduced is the text shipped in each package.

Express alone pulls in roughly fifty transitive packages. Enumerating them by
hand is both error-prone and unnecessary.

### Generate it

From the project root, with dependencies installed:

```bash
npx license-checker --production --out THIRD-PARTY-NOTICES.txt
```

Or, for a file that includes the full licence text rather than just the
identifiers:

```bash
npx oss-attribution-generator --outputDir ./attribution
```

Run it in `client/` as well as at the root if the two have separate
`package.json` files, and concatenate the output.

### Regenerate when dependencies change

Add it to the build, or it will drift silently:

```json
"scripts": {
  "notices": "npx license-checker --production --out THIRD-PARTY-NOTICES.txt"
}
```

`Notices.jsx` fetches this file at runtime rather than hard-coding it, so the
in-app page cannot fall out of step with the dependency tree.

---

## Who is actually owed a notice

Every package in the production dependency tree whose licence requires
attribution. In practice that is nearly all of them: MIT, ISC, BSD-2-Clause and
BSD-3-Clause all carry the same condition — the copyright notice and permission
text must travel with the software.

**Direct dependencies visible in the source:**

| Package | Role | Licence (verify at generation) |
|---|---|---|
| `express` | HTTP server and routing | MIT |
| `cors` | Cross-origin middleware | MIT |
| `dotenv` | Environment file loading | BSD-2-Clause |
| `@anthropic-ai/sdk` | Anthropic provider client | MIT |
| `react`, `react-dom` | Client framework | MIT |
| `vite`, `@vitejs/plugin-react` | Build tooling | MIT |
| `concurrently` | Runs API and client together in dev | MIT |

**Not owed a notice:**

- **Node.js built-ins** — `crypto`, `path`, `fs`. Part of the runtime, not
  bundled by you.
- **Dev-only dependencies** — anything not shipped. `--production` excludes them.
- **Groq, Anthropic and Ollama as services** — you call their APIs, you do not
  distribute their software. Their *terms of service* bind you; their copyright
  does not require this file.
- **Your own code** — scenarios, prompts, engine, routes and components are
  original JETS work.

---

## When this file is actually required

Hosting a web application is usually not "distribution" in the sense these
licences contemplate. The obligation is most likely to bite when JETS:

- hands a repository or a deployable package to a client institution
- delivers the software as part of a consultancy engagement
- publishes the repository, whether public or shared privately

If JETS only ever runs the hosted service and students use it through a browser,
the argument that no distribution has occurred is reasonable — but generating
the file costs one command and removes the question entirely.

---

## Separate from copyright: provider terms

The model providers are governed by contracts you accepted, not by licences on
their expression. Nothing in this file discharges them.

Read the commercial-use section of your provider's terms before the first paid
deployment, with attention to any clause on resale, sublicensing of model
access, or building a competing service. This is the licensing question most
likely to affect a JETS consultancy sale, and it is a different exercise from
the copyright review.

Not legal advice. Confirm with an Australian legal practitioner before any
institutional sale or tender.

---

## Educational content and frameworks

The teaching content in this application uses no licensed or copyrighted
framework material. Full register in the Design Analysis v0.2, §7.

Summarised: the reasoning spine is a concept in generic use; the debrief
structure derives from a US Government work released for unrestricted
distribution; ISBAR is an acronym with no proprietor; the mathematics is
unencumbered. All scenarios, personas, rubric descriptors and vignettes were
written from scratch. Epidemiological figures are cited as facts, which carry
no licence, and anything unsourced is labelled illustrative.

**Excluded by design:** the Levett-Jones Clinical Reasoning Cycle, the Lasater
Clinical Judgment Rubric, the Tanner model, the NCSBN measurement model, all
deterioration observation charts, and INACSL's simulation standards. None is
reproduced, adapted, or relied upon.

---

*Johnson Educational & Teaching Services · ABN 15 440 542 589 · Byford WA 6122*
*Non-accredited education support. Training use only.*
