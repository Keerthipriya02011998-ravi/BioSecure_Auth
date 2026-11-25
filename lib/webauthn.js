import { headers } from "next/headers";
import { withDb } from "./db";

export const RP_NAME = "Secure Access";

/** Relying-party id and origin. Derived from the request unless overridden by env. */
export function rpConfig() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return {
    rpID: process.env.RP_ID || host.split(":")[0],
    origin: process.env.ORIGIN || `${proto}://${host}`,
  };
}

const CHALLENGE_TTL = 5 * 60 * 1000;

export function saveChallenge(userId, kind, challenge) {
  return withDb((db) => {
    db.challenges = db.challenges.filter((c) => c.expiresAt > Date.now() && !(c.userId === userId && c.kind === kind));
    db.challenges.push({ userId, kind, challenge, expiresAt: Date.now() + CHALLENGE_TTL });
  });
}

/** Fetch and delete (single use). */
export function takeChallenge(userId, kind) {
  return withDb((db) => {
    const i = db.challenges.findIndex((c) => c.userId === userId && c.kind === kind && c.expiresAt > Date.now());
    if (i === -1) return null;
    const [entry] = db.challenges.splice(i, 1);
    return entry.challenge;
  });
}

export const toB64 = (u8) => Buffer.from(u8).toString("base64url");
export const fromB64 = (s) => new Uint8Array(Buffer.from(s, "base64url"));
