import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { withDb, readDb } from "./db";

const COOKIE = "sa_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.SESSION_SECRET || "dev-only-secret-change-me-please-0123456789";
  return new TextEncoder().encode(s);
}

export function hmac(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

/**
 * ONE ACTIVE DEVICE
 * Each user has exactly one `activeSession`. Logging in on any device overwrites it,
 * so every token issued before that moment stops matching and is rejected.
 */
export async function startSession(userId, userAgent) {
  const sid = crypto.randomUUID();
  await withDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    user.activeSession = {
      sid,
      device: describeDevice(userAgent),
      startedAt: new Date().toISOString(),
    };
  });
  const token = await new SignJWT({ sid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/**
 * Returns { status: "ok", user } | { status: "replaced" } | { status: "none" }.
 * "replaced" means the token is genuine but the account is now signed in on another device.
 */
export async function getSession() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return { status: "none" };
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret()));
  } catch {
    return { status: "none" };
  }
  const db = await readDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || !user.activeSession) return { status: "none" };
  if (user.activeSession.sid !== payload.sid) return { status: "replaced", user };
  return { status: "ok", user };
}

export async function endSession(userId, sid) {
  await withDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user?.activeSession?.sid === sid) user.activeSession = null;
  });
  clearCookie();
}

export function describeDevice(ua = "") {
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Mac OS X|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
  const browser = /Edg\//i.test(ua) ? "Edge" : /OPR\//i.test(ua) ? "Opera" : /Chrome\//i.test(ua) ? "Chrome" : /Firefox\//i.test(ua) ? "Firefox" : /Safari\//i.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email || null,
    phone: user.phone || null,
    surname: user.surname,
    dob: user.dob,
    device: user.activeSession?.device || null,
    signedInAt: user.activeSession?.startedAt || null,
    biometricsEnabled: (user.credentials || []).length > 0,
    biometricCount: (user.credentials || []).length,
  };
}
