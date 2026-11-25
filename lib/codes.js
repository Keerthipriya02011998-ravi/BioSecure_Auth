import crypto from "crypto";
import { withDb, readDb } from "./db";
import { hmac } from "./session";
import { sendCode } from "./sender";

const TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

/** Create a 6-digit code for an existing user. Only a keyed hash is stored. */
export async function issueCode(user, identifier) {
  const now = Date.now();
  const result = await withDb((db) => {
    const last = db.codes.find((c) => c.userId === user.id);
    if (last && now - last.createdAt < COOLDOWN_MS) {
      return { error: `Please wait ${Math.ceil((COOLDOWN_MS - (now - last.createdAt)) / 1000)} seconds before asking for a new code.` };
    }
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    db.codes = db.codes.filter((c) => c.userId !== user.id && c.expiresAt > now);
    db.codes.push({
      userId: user.id,
      hash: hmac(`${user.id}:${code}`),
      createdAt: now,
      expiresAt: now + TTL_MS,
      attempts: 0,
    });
    return { code };
  });
  if (result.error) return result;
  await sendCode(identifier, result.code);
  return { ok: true, code: result.code };
}

/** Check a code. Single use, expires after 5 minutes, locks after 5 wrong tries. */
export async function checkCode(userId, input) {
  const code = String(input || "").trim();
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  return withDb((db) => {
    const entry = db.codes.find((c) => c.userId === userId);
    if (!entry || entry.expiresAt < Date.now()) return { error: "That code has expired. Ask for a new one." };
    if (entry.attempts >= MAX_ATTEMPTS) return { error: "Too many wrong attempts. Ask for a new code." };

    const a = Buffer.from(hmac(`${userId}:${code}`));
    const b = Buffer.from(entry.hash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      entry.attempts += 1;
      const left = MAX_ATTEMPTS - entry.attempts;
      return { error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong attempts. Ask for a new code." };
    }
    db.codes = db.codes.filter((c) => c.userId !== userId); // single use
    return { ok: true };
  });
}

export { readDb };
