# CVlens — AI CV Analyzer

Upload a CV, get a prioritised action plan: exactly what to **add**, **remove** and
**modify**, each item colour-coded by how much it costs you.

Not a score and a shrug — every item names the section, quotes the line, explains
why it matters to a recruiter or an ATS, and gives you replacement text to paste in.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, React Router 6, CSS Modules |
| Backend | Node, Express 4, Mongoose 7 |
| Database | MongoDB (Atlas) |
| Auth | Auth0 (Universal Login + Google) |
| AI | Google Gemini via `@google/genai`, schema-enforced JSON |
| Parsing | `pdf-parse` (PDF), `mammoth` (DOCX) |

## Getting started

```bash
npm run install:all
```

Then follow **[SETUP.md](SETUP.md)** — it walks through MongoDB Atlas, Auth0
(including enabling Google sign-in) and a Gemini API key, and tells you exactly
which value goes in which `.env`.

```bash
npm run dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:5000`.

## How the analysis works

`POST /api/cv/upload` extracts the text, runs a cheap sanity check, then asks
Gemini for a review constrained to a JSON schema — so the response shape is
enforced by the API rather than hoped for in the prompt.

The core of the output is `actionItems`:

```js
{
  action:     'add' | 'remove' | 'modify' | 'keep',
  section:    'Work Experience',
  target:     '"Was responsible for deployments"',
  reason:     'Passive phrasing with no outcome…',
  suggestion: 'Delete this line and reuse the space for…',
  priority:   'critical' | 'important' | 'minor'
}
```

`priority` drives the traffic-light colours throughout the UI: critical is red,
important amber, minor green.

Alongside it the report carries scores (overall + ATS), strengths, weaknesses,
missing skills, grammar fixes, section notes, a rewritten professional summary
and before/after bullet points.

## API

All routes require a valid Auth0 bearer token and are scoped to the caller.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/health` | Public |
| `POST` | `/api/cv/upload` | `multipart/form-data`, field `cv`. Max 5 MB. Rate limited to 10/hour |
| `GET` | `/api/cv/history` | Latest 50, newest first |
| `GET` | `/api/cv/stats` | Total, best, latest and previous score |
| `GET` | `/api/cv/:id` | Full report |
| `DELETE` | `/api/cv/:id` | |
| `GET` | `/api/user/me` | Get-or-create profile |

Accepted uploads: **PDF, DOCX, TXT**, up to 5 MB. Legacy `.doc` is rejected —
`mammoth` cannot read it, so accepting it only produced a confusing failure later.
Scanned/image-only PDFs have no text layer and are rejected with an explanation.

## Project layout

```
backend/
  middleware/   auth (Auth0 JWT + requireUser), upload (multer), rateLimit
  models/       User, CVAnalysis
  routes/       cv, user
  services/     analyzeCV (Gemini), extractText (PDF/DOCX/TXT)
frontend/src/
  components/   ScoreRing, AnalyzingProgress, ActionPlan, Navbar,
                GoogleButton, ConfirmDialog, ErrorBoundary, ProtectedRoute
  pages/        LandingPage, Dashboard, CVHistory, AnalysisResult
  services/     api (axios + Auth0 token interceptor)
```

## Notes

- **Auth fails closed.** If `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` are missing the server
  throws on boot in production and 401s every request in development. It never
  falls through unauthenticated.
- **Uploaded files are deleted** as soon as the text is extracted. The first 10k
  characters of extracted text are stored with the analysis.
- **Costs.** Gemini has a free tier, but limits are per-project — check yours at
  <https://aistudio.google.com/rate-limit>.
