# Casemate – Go Live Guide

This guide walks you through setting **MONGODB_URI**, **JWT_SECRET**, deploying the **backend** and **frontend**, and configuring **FRONTEND_URL** and **CORS**.

---

## 1. Set MONGODB_URI (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in (or create an account).
2. **Create a cluster** (e.g. free M0).
3. **Database Access** → Add Database User:
   - Authentication: Password
   - Username and password (save them securely).
4. **Network Access** → Add IP Address:
   - For production: add `0.0.0.0/0` (allow from anywhere) so your hosted backend can connect.
5. **Get connection string:**
   - Clusters → **Connect** → **Connect your application** → copy the URI.
   - It looks like:  
     `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
6. **Set MONGODB_URI:**
   - Replace `USERNAME` and `PASSWORD` with your DB user.
   - Add database name: use `casemate` before the `?`:  
     `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/casemate?retryWrites=true&w=majority`
   - If the password contains special characters, [URL-encode](https://www.w3schools.com/tags/ref_urlencode.asp) them (e.g. `@` → `%40`).

Use this full string as **MONGODB_URI** in your backend environment (see backend deployment below).

---

## 2. Generate JWT_SECRET

Use a long, random string (at least 32 characters). **Never commit it to git.**

**Option A – Node (works on Windows and Mac/Linux):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as **JWT_SECRET**.

**Option B – PowerShell (Windows):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```
Use the output as **JWT_SECRET**.

Set this value in your **backend** environment variables (see below).

---

## 3. Deploy Backend

The backend needs these **environment variables**:

| Variable        | Example / notes |
|----------------|-----------------|
| `MONGODB_URI`  | From step 1     |
| `JWT_SECRET`   | From step 2     |
| `PORT`         | Often set by host (e.g. 5000); Render/Railway may override. |
| `FRONTEND_URL` | Your frontend URL, e.g. `https://casemate.vercel.app` (set after deploying frontend). |
| `ESEWA_BASE_URL` | eSewa API base URL (`https://rc-epay.esewa.com.np` for sandbox). |
| `ESEWA_MERCHANT_CODE` | eSewa merchant/product code (sandbox default: `EPAYTEST`). |
| `ESEWA_SECRET_KEY` | eSewa signing secret key from your merchant account. |
| `ESEWA_SUCCESS_URL` | Frontend callback URL after success (e.g. `/dashboard?tab=appointments&esewa=success`). |
| `ESEWA_FAILURE_URL` | Frontend callback URL after failure (e.g. `/dashboard?tab=appointments&esewa=failed`). |
| `JWT_EXPIRE`   | Optional, e.g. `7d` |
| `NODE_ENV`     | Set to `production` on the host. |

### Railway

1. Go to [Railway](https://railway.app), sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select your Casemate repo.
3. Set **Root Directory** to `backend` (or deploy only the backend folder).
4. **Variables** → Add:
   - `MONGODB_URI` = (your Atlas URI)
   - `JWT_SECRET` = (generated secret)
   - `FRONTEND_URL` = (your frontend URL, e.g. `https://your-app.vercel.app`)
5. Deploy. Note the generated URL (e.g. `https://casemate-api-production.up.railway.app`). You’ll use this as the backend URL for the frontend.

### Render

1. Go to [Render](https://render.com), sign in.
2. **New** → **Web Service** → connect repo, select Casemate.
3. **Root Directory:** `backend`.
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Environment** → Add:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
7. Deploy. Use the service URL (e.g. `https://casemate-api.onrender.com`) as the backend URL for the frontend.

After deploy, run the seed once if you want dummy data (e.g. via Railway/Render shell or locally with production `MONGODB_URI`):

```bash
cd backend
# Set MONGODB_URI in .env to production DB, then:
npm run seed
```

---

## 4. Deploy Frontend

The frontend must call your **deployed backend** in production. It uses **VITE_API_URL** for that.

1. Build command: `npm run build`
2. Publish the `dist` folder (or connect the repo and set build to that).

**Environment variable:**

| Variable         | Value |
|------------------|--------|
| `VITE_API_URL`   | Your backend URL **without** `/api`, e.g. `https://casemate-api-production.up.railway.app` |

The app will then request `{VITE_API_URL}/api/...`.

### Vercel

1. [Vercel](https://vercel.com) → **Add New** → **Project** → import Casemate repo.
2. **Root Directory:** `frontend`.
3. **Environment Variables:**
   - `VITE_API_URL` = `https://your-backend-url.railway.app` (or your Render URL) — no trailing slash, no `/api`.
4. Deploy. Your frontend URL will be like `https://casemate-xxx.vercel.app`.

### Netlify

1. [Netlify](https://netlify.com) → **Add new site** → **Import from Git** → select repo.
2. **Base directory:** `frontend`.
3. **Build command:** `npm run build`
4. **Publish directory:** `frontend/dist`
5. **Environment variables:**  
   `VITE_API_URL` = your backend URL (no `/api`).
6. Deploy. Frontend URL will be like `https://casemate.netlify.app`.

---

## 5. Set FRONTEND_URL and CORS (Backend)

CORS is already configured from **FRONTEND_URL** in the backend:

- **Single origin:** set `FRONTEND_URL` to your frontend URL, e.g.  
  `https://casemate-xxx.vercel.app`
- **Multiple origins:** use a comma-separated list, e.g.  
  `https://casemate.vercel.app,https://www.casemate.vercel.app`
- **Local development:** any `http://localhost:<port>` or `http://127.0.0.1:<port>` frontend origin is accepted automatically when `NODE_ENV` is not `production`.

Update the backend env on Railway/Render:

1. **Variables** → set `FRONTEND_URL` to the exact origin(s) of your frontend (scheme + host, no path).
2. Redeploy the backend so the new value is applied.

Then the browser will allow requests from your frontend to the API.

---

## 6. Checklist

- [ ] **MONGODB_URI** – Atlas URI with user, password, and database name `casemate`; IP allowlist includes `0.0.0.0/0` for production.
- [ ] **JWT_SECRET** – Long random string set in backend env only; never in git.
- [ ] **Backend** – Deployed (e.g. Railway/Render) with `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL`; note the backend URL.
- [ ] **Frontend** – Deployed (e.g. Vercel/Netlify) with `VITE_API_URL` = backend URL (no `/api`).
- [ ] **FRONTEND_URL** – In backend env, set to your frontend origin(s) so CORS allows requests.
- [ ] **Optional:** Run `npm run seed` once against production DB if you want seed data.

After this, your app is live: users open the frontend URL, and the frontend talks to your backend with CORS and auth working.

---

## 7. Optional: Email / Push / TURN configuration

This project includes simple placeholders for notifications and TURN support. Below are steps to wire them up in production.

Email (SendGrid)
- Install the official SendGrid package in the backend: `npm install @sendgrid/mail`
- Set `SENDGRID_API_KEY` in backend environment.
- Optionally set `NOTIFY_FROM_EMAIL` to your sender address.
- The backend will call SendGrid when a recipient is offline (see `backend/utils/notify.js`).

Email (SMTP fallback)
- Install `nodemailer` in backend (already added in dependencies).
- Set these backend env vars:
   - `SMTP_HOST` (e.g. `smtp.gmail.com`)
   - `SMTP_PORT` (usually `587`)
   - `SMTP_SECURE` (`false` for 587, `true` for 465)
   - `SMTP_USER` (your SMTP username/email)
   - `SMTP_PASS` (app password or SMTP password)
   - `NOTIFY_FROM_EMAIL` (sender address)
- OTP and notification emails will use SendGrid first (if configured), otherwise SMTP.

Push (Firebase Cloud Messaging)
- Create a Firebase project and generate a service account JSON (Server SDK).
- Set `FCM_SERVICE_ACCOUNT_JSON` in backend environment to the JSON string (carefully, or store it as a secret file and mount it).
- Install Firebase Admin: `npm install firebase-admin`
- Implement device token storage for users and call `sendPushNotification` with the token(s).

TURN server (for WebRTC NAT traversal)
- You can use a managed TURN provider (e.g., Twilio, Xirsys) or run your own `coturn` server.
- Configure env vars for the frontend build:
   - `VITE_TURN_URL` (e.g. `turn:turn.example.com:3478`)
   - `VITE_TURN_USER`
   - `VITE_TURN_PASS`
- The frontend `AppointmentChat` will add the TURN server automatically to the RTCPeerConnection if these variables are present.

Notes:
- Notifications require saving user contact info (email, device tokens) and respecting opt-in/privacy laws.
- TURN servers usually require credentials and are billed; use them in production for better connection reliability.
