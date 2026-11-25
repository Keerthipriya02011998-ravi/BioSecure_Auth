# Secure Access

A Next.js app for the RSVR Technologies internship assignment:

- Sign up with **email or phone**, plus **surname** and **date of birth**
- Log in with a **6-digit code**, or **Face ID / fingerprint / Windows Hello** (WebAuthn passkeys)
- **One active device per account**

## Run it

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. Needs Node 18.17 or newer.

## Try the main features

1. **Sign up** at `/signup`. A code is sent. In demo mode it is shown on screen and printed in the terminal, because no email or SMS service is connected.
2. **Log in** with the code. On the dashboard click **Turn on biometric login** and approve Face ID, fingerprint or Windows Hello.
3. **Log out**, then log in again using the **Face ID or fingerprint** tab.
4. **One device:** log in with the same account in a second browser (or a private window). The first one is signed out within about 4 seconds and sees a "logged in on another device" message.

## How each requirement works

| Requirement | Implementation |
|---|---|
| Email or phone sign-up | `lib/identifier.js` detects and validates email vs phone, normalises it, and rejects duplicates. |
| DOB and surname | Validated on the client (date picker limits) and the server (real date, not in the future, letters only for surname). |
| 6-digit code login | `lib/codes.js`: random code from `crypto.randomInt`, stored only as an HMAC hash, expires in 5 min, single use, locks after 5 wrong tries, 30 s resend cooldown. |
| Face ID / biometrics | `@simplewebauthn` passkeys with `authenticatorAttachment: "platform"` and `userVerification: "required"`. Only the public key is stored. Biometric data never leaves the device. |
| One active device | `lib/session.js`: each user has a single `activeSession`. Any new login overwrites it, so older session cookies stop matching and are rejected on the next request. The dashboard polls `/api/auth/me` to show the sign-out quickly. |
| Sessions | Signed JWT in an `httpOnly`, `sameSite=lax` cookie (`secure` in production). |

## Project structure

```
app/
  signup/page.js            sign-up form
  login/                    code and biometric tabs
  dashboard/                protected page, device info, enable biometrics
  api/auth/
    signup, request-code, verify-code, me, logout
    webauthn/{register-options,register-verify,login-options,login-verify}
components/                 Shell, CodeInput (6 boxes), CodeStep
lib/
  db.js                     JSON-file database (swap for Postgres/MySQL here)
  codes.js  session.js  webauthn.js  identifier.js  sender.js
```

## Notes and limits

- **Biometrics need a secure origin.** `http://localhost` works for testing. On a phone, use HTTPS (a deployment or a tunnel such as ngrok). Passkeys are tied to the domain, so set `RP_ID` and `ORIGIN` in `.env.local` if you run behind a proxy.
- **Sending codes:** `lib/sender.js` only logs the code. Plug in Twilio/MSG91 (SMS) and Resend/SendGrid (email) there, then set `DEMO_SHOW_CODE=false`.
- **Storage:** data lives in `data/db.json` so the project runs with zero setup. Serverless hosts have temporary disks, so use a real database there. Only `lib/db.js` needs to change.
- **Set `SESSION_SECRET`** to a long random value before deploying.
