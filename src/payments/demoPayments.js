// src/payments/demoPayments.js
// Offline demo payments: SA number validation, OTP simulation, receipts.

const sessions = new Map(); // sessionId -> { otp, expiresAt, payload }

/** Normalize + validate South African MSISDNs. Accepts 0XXXXXXXXX or +27XXXXXXXXX */
export function normalizeSANumber(input) {
  const raw = String(input || "").trim();
  if (!raw) return { ok: false, reason: "empty" };

  // Remove spaces/hyphens
  const clean = raw.replace(/[\s-]/g, "");

  // Accept formats:
  // 0XXXXXXXXX (10–11 digits starting with 0)
  // +27XXXXXXXXX (country code)
  // 27XXXXXXXXX (fallback)
  let digits = clean;
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("27")) {
    // already in country code form
  } else if (digits.startsWith("0")) {
    digits = "27" + digits.slice(1);
  }

  // SA mobile numbers are typically 11 digits after '27' (27 + 9 digits)
  const msisdn = "+" + digits;
  const valid = /^(\+27)[0-9]{9}$/.test(msisdn);
  if (!valid) return { ok: false, reason: "format" };
  return { ok: true, msisdn };
}

/** Start a demo payment: returns { ok, sessionId, otpHint } */
export async function runDemoPaymentFlow({ method, amount, days, listingId, msisdn }) {
  // Fake latency
  await wait(400);

  const norm = normalizeSANumber(msisdn);
  if (!norm.ok) return { ok: false, error: "Invalid SA number" };

  const sessionId = `sess_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const otp = String(100000 + Math.floor(Math.random() * 900000)); // 6-digit
  const expiresAt = Date.now() + 2 * 60 * 1000; // 2 mins

  sessions.set(sessionId, {
    otp,
    expiresAt,
    payload: { method, amount, days, listingId, msisdn: norm.msisdn },
  });

  return { ok: true, sessionId, otpHint: otp };
}

/** Confirm OTP: returns { ok, receipt } OR { ok:false, error } */
export async function confirmPayment({ sessionId, code }) {
  await wait(300);

  const sess = sessions.get(sessionId);
  if (!sess) return { ok: false, error: "No session" };
  if (Date.now() > sess.expiresAt) {
    sessions.delete(sessionId);
    return { ok: false, error: "Timed out" };
  }
  if (String(code).trim() !== String(sess.otp)) {
    return { ok: false, error: "Bad code" };
  }

  // Build a local "receipt"
  const ref = buildRef();
  const receipt = {
    ref,
    ts: Date.now(),
    ...sess.payload, // method, amount, days, listingId, msisdn
  };

  // One-time use
  sessions.delete(sessionId);
  return { ok: true, receipt };
}

/** Cancel a session (optional) */
export function cancelPayment(sessionId) {
  if (sessionId && sessions.has(sessionId)) sessions.delete(sessionId);
}

/** Utility: tiny sleep */
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Generate short-ish receipt references */
function buildRef() {
  const part = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `YAKA-${new Date().getFullYear()}-${part}`;
}
