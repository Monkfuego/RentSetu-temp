# Vercel Next.js Auth Demo

Simple email/password register + login + refresh token + forgot-password + Google sign-in example using Next.js API routes.

Notes:
- This demo uses a simple JSON file as a datastore (`/data/users.json`) for simplicity — not production-safe.
- On Vercel serverless functions, disk writes are ephemeral. Use a proper DB (Postgres, MongoDB, Supabase, etc.) for production.
- Configure environment variables (see `.env.example`) before deploying.

Routes:
- POST /api/auth/register  -> { email, password }
- POST /api/auth/login     -> { email, password }
- POST /api/auth/refresh   -> uses refresh token cookie
- POST /api/auth/forgot    -> { email } (sends/reset link via SMTP or logs)
- POST /api/auth/google    -> { idToken } (Google ID token from client)

To run locally:
1. Copy `.env.example` to `.env.local` and fill values.
2. `npm install`
3. `npm run dev`

