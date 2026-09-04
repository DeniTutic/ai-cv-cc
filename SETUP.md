# Setup guide

Three external services, all free tier: **MongoDB Atlas**, **Auth0**, **Google Gemini**.
Work top to bottom; each section ends with the values you paste into an `.env` file.

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Both `.env` files are gitignored. Never commit them.

---

## 1. MongoDB Atlas → `MONGO_URI`

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>.
2. **Create a cluster** → choose the **M0 Free** tier, pick a region near you.
3. **Database Access** → *Add New Database User*. Username + password (use *Autogenerate* and copy it).
4. **Network Access** → *Add IP Address* → **Allow access from anywhere** (`0.0.0.0/0`) for development.
5. **Database** → *Connect* → *Drivers* → *Node.js*. Copy the connection string.
6. Replace `<password>` with the real password and add the database name before the `?`:

```
mongodb+srv://cvuser:PASSWORD@cluster0.abc12.mongodb.net/ai-cv-analyzer?retryWrites=true&w=majority
```

> If the password contains `@ : / ? # [ ] %`, URL-encode it (`@` → `%40`). An un-encoded
> password is the single most common cause of an Atlas connection failure.

Paste into `backend/.env` as `MONGO_URI`.

---

## 2. Google Gemini → `GEMINI_API_KEY`

1. Go to <https://aistudio.google.com/apikey> and sign in.
2. **Create API key** → pick or create a Google Cloud project.
3. Copy the key into `backend/.env` as `GEMINI_API_KEY`.

**Which model?** `backend/.env` defaults to `GEMINI_MODEL=gemini-2.5-flash`. Google no longer
publishes fixed free-tier numbers in its docs — limits are per-project. Check what your key
actually gets at <https://aistudio.google.com/rate-limit>. If `gemini-2.5-flash` is rate-limited
for you, `gemini-3.5-flash-lite` typically has a higher daily allowance; just change the env var,
no code change needed.

> ⚠️ **Rotate the old key.** A Google API key was committed to this repo's public git history in
> commit `e70b4e7`. Even though it was removed in a later commit, it is still readable by anyone.
> Delete it at <https://console.cloud.google.com/apis/credentials> and use a fresh one here.

---

## 3. Auth0 → login, signup, and Google sign-in

### 3a. Tenant and application

1. Sign up at <https://auth0.com/signup>. Pick a region — your tenant domain looks like
   `dev-abc123.eu.auth0.com`. **This full string is your `AUTH0_DOMAIN`** (no `https://`).
2. **Applications → Applications → Create Application**
   - Name: `CVlens`
   - Type: **Single Page Web Applications**
   - Technology: React
3. In the app's **Settings** tab, copy the **Client ID** → `VITE_AUTH0_CLIENT_ID`.
4. Scroll to **Application URIs** and set all three (comma-separated lists):

   | Field | Value |
   |---|---|
   | Allowed Callback URLs | `http://localhost:5173` |
   | Allowed Logout URLs | `http://localhost:5173` |
   | Allowed Web Origins | `http://localhost:5173` |

   Add your production URL to each list when you deploy.
5. **Save Changes** (button at the bottom — easy to miss).

### 3b. API (this is what makes the backend accept tokens)

1. **Applications → APIs → Create API**
   - Name: `CVlens API`
   - **Identifier**: `https://api.ai-cv-analyzer.com` — this is the **audience**. It is just an
     identifier string; it never has to resolve to a real URL. But it must be *byte-identical*
     in three places: here, `AUTH0_AUDIENCE` (backend), and `VITE_AUTH0_AUDIENCE` (frontend).
   - Signing Algorithm: **RS256**
2. Create.

### 3c. Google sign-in

1. **Authentication → Social → Create Connection → Google / Gmail**.
2. For development you can click **Continue** to use Auth0's shared dev keys — Google login works
   immediately, but shows an Auth0-branded consent screen and is rate-limited.
3. For production, supply your own Google OAuth credentials:
   - <https://console.cloud.google.com/apis/credentials> → *Create Credentials* → *OAuth client ID*
   - Type: **Web application**
   - Authorized redirect URI: `https://YOUR_TENANT.auth0.com/login/callback`
   - Paste the Client ID and Client Secret into the Auth0 connection.
4. On the connection's **Applications** tab, make sure **CVlens** is toggled **on**.
   *If you skip this, the Google button returns "connection is not enabled".*

### 3d. Values

`backend/.env`:
```
AUTH0_DOMAIN=dev-abc123.eu.auth0.com
AUTH0_AUDIENCE=https://api.ai-cv-analyzer.com
```

`frontend/.env`:
```
VITE_AUTH0_DOMAIN=dev-abc123.eu.auth0.com
VITE_AUTH0_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
VITE_AUTH0_AUDIENCE=https://api.ai-cv-analyzer.com
```

---

## 4. Run it

```bash
npm run dev
```

Backend on <http://localhost:5000>, frontend on <http://localhost:5173>.

Sanity checks:

```bash
curl http://localhost:5000/api/health
```
→ `{"status":"ok","timestamp":"..."}`

```bash
curl -i http://localhost:5000/api/cv/history
```
→ must be **401 Unauthorized**. If this returns a list of analyses, the Auth0 env vars are not
loaded and the server is refusing to protect the route — check `backend/.env`.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Server exits with `AUTH0_DOMAIN and AUTH0_AUDIENCE are required` | `backend/.env` missing or misnamed. It must be `backend/.env`, not `.env` at the repo root. |
| `401 invalid audience` on every API call | `VITE_AUTH0_AUDIENCE` ≠ the API Identifier in Auth0. They must match exactly, trailing slash included. |
| `Service not found: https://...` at login | The API in step 3b was never created, or the audience is misspelled. |
| Login redirects to a blank page or `Callback URL mismatch` | `http://localhost:5173` missing from Allowed Callback URLs. |
| `MongoServerError: bad auth` | Password not URL-encoded, or the DB user was created in a different project. |
| Analysis fails with `429` | Gemini free-tier daily/minute quota hit. Check <https://aistudio.google.com/rate-limit>. |
| Upload returns 413 | File over 5 MB. |
