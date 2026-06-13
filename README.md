# CVlens — AI CV Analyzer

A full-stack SaaS platform that lets users upload their CV and receive detailed AI-powered improvement recommendations. Built with React, Node.js, MongoDB, Auth0, and OpenAI GPT-4o.

---

## Project Structure

```
ai-cv-analyzer/
├── backend/                   # Node.js + Express API
│   ├── models/
│   │   ├── User.js            # Auth0 user model
│   │   └── CVAnalysis.js      # CV analysis result model
│   ├── routes/
│   │   ├── cv.js              # /api/cv/* endpoints
│   │   └── user.js            # /api/user/me endpoint
│   ├── middleware/
│   │   ├── auth.js            # Auth0 JWT validation
│   │   └── upload.js          # Multer file upload
│   ├── services/
│   │   ├── extractText.js     # PDF/DOCX/TXT text extraction
│   │   └── openai.js          # OpenAI GPT-4o analysis
│   ├── server.js              # Express entry point
│   ├── .env.example           # Environment variable template
│   └── package.json
│
└── frontend/                  # React + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx        # Public home page
    │   │   ├── Dashboard.jsx          # Upload + stats
    │   │   ├── AnalysisResult.jsx     # Full AI report
    │   │   ├── CVHistory.jsx          # Past analyses list
    │   │   └── CVDetail.jsx           # Single analysis detail
    │   ├── components/
    │   │   ├── Navbar.jsx             # Top navigation
    │   │   ├── ProtectedRoute.jsx     # Auth guard
    │   │   ├── LoadingScreen.jsx      # Full-page loader
    │   │   ├── AnalyzingProgress.jsx  # Animated analysis steps
    │   │   └── ScoreCard.jsx          # Score display card
    │   ├── services/
    │   │   └── api.js                 # Axios + Auth0 token injection
    │   ├── App.jsx                    # Router
    │   ├── main.jsx                   # Auth0Provider + React root
    │   └── index.css                  # Global styles
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Auth0 account (free tier works)
- OpenAI API key

---

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your .env values (see below)
npm run dev
```

### Backend .env

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-cv-analyzer
OPENAI_API_KEY=sk-...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.ai-cv-analyzer.com
FRONTEND_URL=http://localhost:5173
```

---

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your .env values
npm run dev
```

### Frontend .env

```
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://api.ai-cv-analyzer.com
VITE_API_BASE_URL=http://localhost:5000
```

---

## Auth0 Configuration

1. Create a new **Single Page Application** in Auth0 dashboard
2. Set **Allowed Callback URLs**: `http://localhost:5173/dashboard`
3. Set **Allowed Logout URLs**: `http://localhost:5173`
4. Set **Allowed Web Origins**: `http://localhost:5173`
5. Create a new **API** in Auth0:
   - Identifier: `https://api.ai-cv-analyzer.com`
   - This becomes your `AUTH0_AUDIENCE`

---

## API Endpoints

| Method | Path               | Auth | Description                        |
|--------|--------------------|------|------------------------------------|
| GET    | /api/health        | No   | Health check                       |
| GET    | /api/user/me       | Yes  | Get/create user profile            |
| POST   | /api/cv/upload     | Yes  | Upload & analyze CV                |
| GET    | /api/cv/history    | Yes  | List all analyses for user         |
| GET    | /api/cv/stats      | Yes  | Summary stats (count, best score)  |
| GET    | /api/cv/:id        | Yes  | Get single analysis                |
| DELETE | /api/cv/:id        | Yes  | Delete analysis (owner only)       |

---

## Features

- **Landing page** — hero, features, how it works, CTA
- **Auth0 authentication** — login, signup, protected routes
- **CV upload** — PDF, DOCX, TXT up to 5MB
- **AI analysis** — GPT-4o returns structured JSON report
- **Animated progress** — 5-step checkpoint animation during analysis
- **Detailed results** — scores, strengths, weaknesses, grammar issues, missing skills, bullet rewrites, improved summary, action plan
- **CV history** — full history with delete support
- **Dashboard stats** — total analyzed, best score, latest score
- **Toast notifications** — success/error feedback
- **Rate limiting** — 100 req/15min general, 10 uploads/hour per IP
- **Security** — helmet, CORS, JWT validation, user isolation

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, React Router 6    |
| Auth       | Auth0 (auth0-react)               |
| HTTP       | Axios                             |
| Backend    | Node.js, Express                  |
| Database   | MongoDB, Mongoose                 |
| File upload| Multer                            |
| CV parsing | pdf-parse, mammoth                |
| AI         | OpenAI GPT-4o (json_object mode)  |
| Styling    | CSS Modules + Google Fonts        |
