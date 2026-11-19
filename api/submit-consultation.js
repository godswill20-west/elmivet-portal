// api/submit-consultation.js
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { assignConsultationReference } from './_lib/elmReference.js';

export const config = { maxDuration: 30 };

const INTERNAL_TO = 'quotes@elmivet.com';
const INTERNAL_BCC = 'elmivet19@gmail.com';
const FROM_ADDRESS = 'noreply@elmivet.com';

const TABLE = 'consultation_requests';
const RATE_BUCKET = 'submit-consultation';
const RATE_LIMIT = 5; // requests per IP per window
const RATE_WINDOW_SECONDS = 600;
const CLAIM_STALE_SECONDS = 120; // longer than the function's network timeouts
const MAX_BODY_CHARS = 20000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFERENCE_RE = /^ELM-ADV-[A-Z0-9]{6,16}$/;
const SCHEDULE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Must match the options in Navbar.jsx and the SQL check constraints.
const CLIENT_TYPES = ['Corporate Client', 'Business Owner', 'Individual Customers'];
const DIVISIONS = ['Global Trade', 'Logistics', 'Commercial', 'Industrial', 'Others'];
const AREAS = [
  'Customs Duty Optimization',
  'Trade Compliance',
  'Supply Chain Logistics',
  'Bulk Material Supply Contracts',
  'Procurement & Sourcing',
  'Real Estate Development',
  'Oilfield/Marine Engineering',
  'Others',
];
const METHODS = ['Phone Call', 'Email', 'In-Person Office Visit'];

const COLUMNS =
  'id, reference, payload_hash, client_name, client_type, email, phone, division, area, ' +
  'challenge, method, preferred_schedule, internal_email_status, customer_email_status';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanStr(v, max) {
  if (typeof v !== 'string') return '';
  // Strips control characters but keeps tab, LF and CR (multi-line challenge text).
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const oneLine = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

const sha256Hex = (s) => crypto.createHash('sha256').update(s).digest('hex');

const errMsg = (err) => String((err && err.message) || err || 'unknown error').slice(0, 500);

const reply = (res, status, body) => res.status(status).json(body);
const fail = (res, status, error) => reply(res, status, { ok: false, success: false, error });

function parseBody(req) {
  const b = req.body;
  if (isPlainObject(b)) return b;
  if (typeof b === 'string') {
    try {
      const parsed = JSON.parse(b);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function newReference() {
  return `ELM-ADV-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function normalize(body) {
  // Reference: use the one the form generated (makes retries idempotent), or create one.
  let reference;
  if (body.reference === undefined || body.reference === null || body.reference === '') {
    reference = newReference();
  } else {
    reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!REFERENCE_RE.test(reference)) return { error: 'Invalid reference.' };
  }

  const clientName = cleanStr(body.clientName, 200);
  if (!clientName) return { error: 'Client name is required.' };

  const clientType = cleanStr(body.clientType, 60);
  if (!CLIENT_TYPES.includes(clientType)) return { error: 'Please choose a valid client type.' };

  const email = cleanStr(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };

  const phone = cleanStr(body.phone, 50);
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (phoneDigits < 7 || phoneDigits > 20) return { error: 'Enter a valid phone number.' };

  const division = cleanStr(body.division, 60);
  if (!DIVISIONS.includes(division)) return { error: 'Please choose a valid division.' };

  // Optional in the form.
  const areaRaw = cleanStr(body.area, 80);
  if (areaRaw && !AREAS.includes(areaRaw)) return { error: 'Please choose a valid area of consultation.' };
  const area = areaRaw || null;

  const challenge = cleanStr(body.challenge, 5000);
  if (!challenge) return { error: 'Please describe your business challenge or project inquiry.' };

  const method = cleanStr(body.method, 60);
  if (!METHODS.includes(method)) return { error: 'Please choose a valid consultation method.' };

  // Optional. Format from <input type="datetime-local">: YYYY-MM-DDTHH:mm (no timezone).
  const scheduleRaw = cleanStr(body.schedule, 16);
  let preferredSchedule = null;
  if (scheduleRaw) {
    if (!SCHEDULE_RE.test(scheduleRaw)) return { error: 'Choose a valid date and time.' };
    const ts = Date.parse(`${scheduleRaw}:00Z`);
    if (Number.isNaN(ts) || new Date(ts).toISOString().slice(0, 16) !== scheduleRaw) {
      return { error: 'Choose a valid date and time.' };
    }
    // Timezone is unknown, so allow a 36h grace window instead of a strict "future" check.
    const now = Date.now();
    if (ts < now - 36 * 3600 * 1000) return { error: 'Choose a future date and time.' };
    if (ts > now + 3 * 365 * 24 * 3600 * 1000) return { error: 'Choose a valid date and time.' };
    preferredSchedule = scheduleRaw;
  }

  const payloadHash = sha256Hex(
    JSON.stringify([clientName, clientType, email, phone, division, area, challenge, method, preferredSchedule])
  );

  return {
    row: {
      reference,
      payload_hash: payloadHash,
      client_name: clientName,
      client_type: clientType,
      email,
      phone,
      division,
      area,
      challenge,
      method,
      preferred_schedule: preferredSchedule,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

function createTransporter(env) {
  return nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: { user: env.smtpUser, pass: env.smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

function buildInternalEmail(rec, elmReference) {
  const rows = [
    ['Reference', elmReference],
    ['Client name', rec.client_name],
    ['Client type', rec.client_type],
    ['Email', rec.email],
    ['Phone', rec.phone],
    ['Target division', rec.division],
    ['Area of consultation', rec.area || '—'],
    ['Preferred method', rec.method],
    ['Preferred date & time', rec.preferred_schedule ? `${rec.preferred_schedule.replace('T', ' ')} (as entered by client)` : '—'],
    ['Challenge / project inquiry', rec.challenge],
  ];

  const tr = ([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;vertical-align:top"><strong>${escapeHtml(k)}</strong></td>` +
    `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`;

  const html =
    `<h2 style="font-family:Arial,sans-serif">New consultation request</h2>` +
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.map(tr).join('')}</table>`;

  const text = ['New consultation request', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');

  return {
    subject: oneLine(`[Consultation] ${rec.division} – ${rec.client_name} (${elmReference})`),
    html,
    text,
  };
}

function buildCustomerEmail(rec, elmReference) {
  // Inquiry topic: the area of consultation if the client chose one, otherwise the target division.
  const topic = rec.area || rec.division;
  const html =
    `<p>Dear ${escapeHtml(rec.client_name)},</p>` +
    `<p>Thank you for your inquiry regarding ${escapeHtml(topic)}. ` +
    `Our team has received your inquiry and will review your details and respond within 24 hours.</p>` +
    `<p>Reference ID: ${escapeHtml(elmReference)}</p>` +
    `<p>Best regards,<br/>Elmivet International Team</p>`;
  const text =
    `Dear ${rec.client_name},\n\n` +
    `Thank you for your inquiry regarding ${topic}. ` +
    `Our team has received your inquiry and will review your details and respond within 24 hours.\n\n` +
    `Reference ID: ${elmReference}\n\n` +
    `Best regards,\nElmivet International Team`;
  return {
    subject: oneLine(`We’ve received your inquiry Ref ${elmReference}`),
    html,
    text,
  };
}

/* ------------------------------------------------------------------ */
/* Delivery state (atomic claims, so retries never double-send)        */
/* ------------------------------------------------------------------ */

// Claims the internal email if it is pending/failed, or stuck in "sending" past the stale window.
async function claimInternalEmail(supabase, reference) {
  const claimedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - CLAIM_STALE_SECONDS * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ internal_email_status: 'sending', internal_email_claimed_at: claimedAt, internal_email_error: null })
    .eq('reference', reference)
    .or(
      `internal_email_status.in.(pending,failed),` +
        `and(internal_email_status.eq.sending,internal_email_claimed_at.lt.${staleBefore})`
    )
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? { rec: data, claimedAt } : null;
}

async function finishInternalEmail(supabase, id, claimedAt, errorText) {
  const patch =
    errorText === null
      ? { internal_email_status: 'sent', internal_email_sent_at: new Date().toISOString(), internal_email_error: null }
      : { internal_email_status: 'failed', internal_email_error: errorText };
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .eq('internal_email_status', 'sending')
    .eq('internal_email_claimed_at', claimedAt)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length === 1;
}

async function currentInternalStatus(supabase, reference) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('internal_email_status')
    .eq('reference', reference)
    .maybeSingle();
  if (error) throw error;
  return data ? data.internal_email_status : null;
}

/* Best effort: never throws, never affects the HTTP response. One attempt, no automatic retry. */
async function sendCustomerConfirmation(supabase, getTransporter, rec, elmReference) {
  let claimed = false;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ customer_email_status: 'sending' })
      .eq('reference', rec.reference)
      .eq('customer_email_status', 'pending')
      .select('id')
      .maybeSingle();
    if (error) throw error;
    claimed = !!data;
  } catch (err) {
    console.error('[submit-consultation] customer claim failed:', errMsg(err));
    return;
  }
  if (!claimed) return; // already sent/failed, or being sent elsewhere

  let errorText = null;
  try {
    const mail = buildCustomerEmail(rec, elmReference);
    await getTransporter().sendMail({
      from: `"Elmivet International" <${FROM_ADDRESS}>`,
      to: rec.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    errorText = errMsg(err);
    console.error('[submit-consultation] customer email failed:', errorText);
  }

  try {
    const patch =
      errorText === null
        ? { customer_email_status: 'sent', customer_email_sent_at: new Date().toISOString(), customer_email_error: null }
        : { customer_email_status: 'failed', customer_email_error: errorText };
    const { error } = await supabase.from(TABLE).update(patch).eq('reference', rec.reference);
    if (error) throw error;
  } catch (err) {
    console.error('[submit-consultation] customer status update failed:', errMsg(err));
  }
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Method not allowed.');
  }

  const env = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_SECRET_KEY,
    smtpUser: process.env.ZOHO_SMTP_USER,
    smtpPass: process.env.ZOHO_SMTP_PASS,
  };
  if (!env.supabaseUrl || !env.supabaseKey || !env.smtpUser || !env.smtpPass) {
    console.error('[submit-consultation] missing server environment configuration');
    return fail(res, 500, 'Service is not configured. Please try again later.');
  }

  try {
    // 1. Parse + size guard
    const body = parseBody(req);
    if (!body) return fail(res, 400, 'Invalid request.');
    let bodySize = 0;
    try {
      bodySize = JSON.stringify(body).length;
    } catch {
      return fail(res, 400, 'Invalid request.');
    }
    if (bodySize > MAX_BODY_CHARS) return fail(res, 400, 'Submission is too large.');

    // 2. Honeypot: bots fill the hidden "website" field. Pretend success, save and send nothing.
    if (cleanStr(typeof body.website === 'string' ? body.website : '', 200)) {
      return reply(res, 200, { ok: true, success: true, reference: newReference() });
    }

    const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let transporter = null;
    const getTransporter = () => {
      if (!transporter) transporter = createTransporter(env);
      return transporter;
    };

    // 3. Rate limit (per IP, own bucket, existing RPC)
    const ip =
      cleanStr(String(req.headers['x-real-ip'] || ''), 100) ||
      cleanStr(String(req.headers['x-forwarded-for'] || '').split(',')[0], 100) ||
      'unknown';
    const { data: rlData, error: rlError } = await supabase.rpc('elmivet_check_rate_limit', {
      p_bucket: RATE_BUCKET,
      p_key_hash: sha256Hex(ip),
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (rlError || !Array.isArray(rlData) || !rlData[0]) {
      console.error('[submit-consultation] rate limit check failed:', errMsg(rlError));
      return fail(res, 503, 'Service temporarily unavailable. Please try again shortly.');
    }
    if (rlData[0].out_allowed === false) {
      res.setHeader('Retry-After', String(rlData[0].out_retry_after_seconds || RATE_WINDOW_SECONDS));
      return fail(res, 429, 'Too many requests. Please try again later.');
    }

    // 4. Validate + normalize
    const parsed = normalize(body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const row = parsed.row;

    // 5. Save (or find the existing request for this reference on retry)
    let rec;
    const { data: inserted, error: insertError } = await supabase
      .from(TABLE)
      .insert(row)
      .select(COLUMNS)
      .single();

    if (!insertError) {
      rec = inserted;
    } else if (insertError.code === '23505') {
      const { data: existing, error: selectError } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .eq('reference', row.reference)
        .maybeSingle();
      if (selectError) throw selectError;
      if (!existing || existing.payload_hash !== row.payload_hash) {
        return fail(res, 409, 'This reference cannot be used. Please try again.');
      }
      rec = existing;
    } else {
      throw insertError;
    }

    // 5b. Official reference: issued by the database, once per stored request (idempotent on retry).
    //     `rec.reference` is only the browser's idempotency token, never the official ID.
    const elmReference = await assignConsultationReference(supabase, rec.reference);

    // 6. Internal notification: claim -> send -> finish
    const claim = await claimInternalEmail(supabase, rec.reference);

    if (!claim) {
      // Already sent, or another request is sending it right now.
      const status = await currentInternalStatus(supabase, rec.reference);
      if (status === 'sent') {
        await sendCustomerConfirmation(supabase, getTransporter, rec, elmReference);
        return reply(res, 200, { ok: true, success: true, reference: rec.reference, elmReference });
      }
      return fail(res, 409, 'Your request is still being processed. Please try again in a minute.');
    }

    let internalError = null;
    try {
      const mail = buildInternalEmail(claim.rec, elmReference);
      await getTransporter().sendMail({
        from: `"Elmivet Web Portal" <${FROM_ADDRESS}>`,
        to: INTERNAL_TO,
        bcc: INTERNAL_BCC,
        replyTo: claim.rec.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (err) {
      internalError = errMsg(err);
      console.error('[submit-consultation] internal email failed:', internalError);
    }

    let finished = false;
    try {
      finished = await finishInternalEmail(supabase, claim.rec.id, claim.claimedAt, internalError);
    } catch (err) {
      console.error('[submit-consultation] internal finish failed:', errMsg(err));
      return fail(res, 500, 'We could not complete your request. Please try again.');
    }

    if (internalError !== null) {
      return fail(res, 502, 'We could not send your request right now. Please try again.');
    }

    if (!finished) {
      // Claim was lost (e.g. reclaimed as stale). Only report success if it really is sent.
      const status = await currentInternalStatus(supabase, rec.reference);
      if (status !== 'sent') return fail(res, 500, 'We could not complete your request. Please try again.');
    }

    // 7. Customer confirmation (best effort; never blocks success)
    await sendCustomerConfirmation(supabase, getTransporter, rec, elmReference);

    return reply(res, 200, { ok: true, success: true, reference: rec.reference, elmReference });
  } catch (err) {
    console.error('[submit-consultation] unexpected error:', errMsg(err));
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
}