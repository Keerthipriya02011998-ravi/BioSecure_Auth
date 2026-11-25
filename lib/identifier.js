// Normalises and validates the email-or-phone identifier and the other sign-up fields.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseIdentifier(raw) {
  const value = String(raw || "").trim();
  if (!value) return { error: "Enter your email address or phone number." };

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
    return { type: "email", value: email };
  }

  const phone = value.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{10,15}$/.test(phone)) {
    return { error: "Enter a phone number with 10 to 15 digits, for example +919876543210." };
  }
  return { type: "phone", value: phone };
}

export function validateSurname(raw) {
  const surname = String(raw || "").trim().replace(/\s+/g, " ");
  if (surname.length < 1 || surname.length > 60) return { error: "Enter your surname (up to 60 characters)." };
  if (!/^[\p{L}\p{M}' .-]+$/u.test(surname)) return { error: "Surnames can only contain letters, spaces, apostrophes and hyphens." };
  return { value: surname };
}

export function validateDob(raw) {
  const s = String(raw || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: "Enter your date of birth." };
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return { error: "That date doesn't exist." };
  if (d > new Date()) return { error: "Date of birth can't be in the future." };
  if (d.getUTCFullYear() < 1900) return { error: "Enter a year after 1900." };
  return { value: s };
}
