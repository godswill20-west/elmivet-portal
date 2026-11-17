// api/submit-quote.js
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Vercel Node function setting. Must stay within your plan's limit.
export const config = { maxDuration: 30 };

const INTERNAL_TO = 'quotes@elmivet.com';
const INTERNAL_BCC = 'elmivet19@gmail.com';
const FROM_ADDRESS = 'noreply@elmivet.com';

const RATE_BUCKET = 'submit-quote';
const RATE_LIMIT = 10; // requests per IP per window
const RATE_WINDOW_SECONDS = 600;
const CLAIM_STALE_SECONDS = 120; // longer than the function's maxDuration
const MAX_CUSTOMER_EMAIL_ATTEMPTS = 3;
const MAX_ANSWERS_CHARS = 100000;
const MAX_ATTACHMENTS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFSHORE_ACK_KEYS = ['confirmPassport', 'confirmPrivacy', 'confirmContact'];

// Known service names. Any other form falls back to "<division> - Form N".
const SERVICE_NAMES = {
  1: 'Import and Export Facilitation',
  20: 'Real Estate Offshore Investment Enquiry',
};

const ROW_COLUMNS =
  'id, reference, form_number, division, service_name, investor_type, payload_hash, status, ' +
  'customer_name, customer_email, customer_phone, company, answers, acknowledgements, attachments, ' +
  'customer_email_status, customer_email_attempts';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function cleanStr(v, max) {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function firstStr(max, ...candidates) {
  for (const c of candidates) {
    const s = cleanStr(c, max);
    if (s) return s;
  }
  return '';
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

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (isPlainObject(v)) {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}

function errMsg(err) {
  return String((err && err.message) || err || 'unknown error').slice(0, 500);
}

function getDivision(formNumber) {
  if (formNumber >= 1 && formNumber <= 5) return 'Global Trade';
  if (formNumber >= 6 && formNumber <= 9) return 'Logistics & Supply Chain';
  if (formNumber >= 10 && formNumber <= 12) return 'Commercial';
  if (formNumber >= 13 && formNumber <= 18) return 'Industrial';
  if (formNumber === 19) return 'Marine Services';
  return 'Commercial'; // Form 20
}

function getServiceName(formNumber, division) {
  return SERVICE_NAMES[formNumber] || `${division} - Form ${formNumber}`;
}

function findByLabel(answers, re) {
  for (const [key, entry] of Object.entries(answers)) {
    const label = isPlainObject(entry) && typeof entry.label === 'string' ? entry.label : key;
    if (re.test(label)) {
      const value = isPlainObject(entry) && 'value' in entry ? entry.value : entry;
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return '';
}

function reply(res, status, body) {
  return res.status(status).json(body);
}

function fail(res, status, error, extra = {}) {
  return reply(res, status, { ok: false, success: false, error, ...extra });
}

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

/* ------------------------------------------------------------------ */
/* Payload normalization (server decides form / division / service)    */
/* ------------------------------------------------------------------ */

function isValidReference(reference, formNumber) {
  return (
    typeof reference === 'string' &&
    reference.length <= 40 &&
    new RegExp(`^ELM-${formNumber}-[A-Z0-9]{6,16}$`).test(reference)
  );
}

function normalizePayload(body) {
  const formNumber = Number(isPlainObject(body.form) ? body.form.number : body.formNumber);
  if (!Number.isInteger(formNumber) || formNumber < 1 || formNumber > 20) {
    return { error: 'Invalid form.' };
  }

  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  if (!isValidReference(reference, formNumber)) {
    return { error: 'Invalid reference.' };
  }

  if (!isPlainObject(body.answers)) return { error: 'Invalid answers.' };
  const answers = body.answers;
  let answersSize = 0;
  try {
    answersSize = JSON.stringify(answers).length;
  } catch {
    return { error: 'Invalid answers.' };
  }
  if (answersSize > MAX_ANSWERS_CHARS) return { error: 'Submission is too large.' };

  const customer = isPlainObject(body.customer) ? body.customer : {};

  const customerName = firstStr(
    200,
    customer.contactName,
    customer.fullName,
    customer.name,
    body.customerName,
    findByLabel(answers, /^Full Legal Name/i),
    customer.companyName
  );
  if (!customerName) return { error: 'A contact name is required.' };

  const rawEmail = firstStr(
    254,
    customer.email,
    body.customerEmail,
    findByLabel(answers, /^Email Address$/i)
  ).toLowerCase();
  const customerEmail = EMAIL_RE.test(rawEmail) ? rawEmail : null;

  const customerPhone =
    firstStr(50, customer.phone, body.customerPhone, findByLabel(answers, /^Phone Number/i)) || null;
  const company = firstStr(200, customer.companyName, customer.company) || null;

  let investorType = null;
  if (formNumber === 20) {
    const raw = cleanStr(String(body.investorType ?? body.branch ?? ''), 60).toLowerCase().replace(/_/g, '-');
    if (raw === 'registered-member' || raw === 'new-international-investor') investorType = raw;
    else return { error: 'Invalid investor type.' };
  }

  // Acknowledgements: accept the array form, or derive them from the consent answers (Form 20).
  let acknowledgements = null;
  if (Array.isArray(body.acknowledgements)) {
    acknowledgements = body.acknowledgements.slice(0, 20).map((a) => ({
      statement: cleanStr(isPlainObject(a) ? a.statement : '', 500),
      accepted: isPlainObject(a) && a.accepted === true,
    }));
  } else if (formNumber === 20) {
    const derived = OFFSHORE_ACK_KEYS.map((k) => answers[k])
      .filter((e) => isPlainObject(e) && e.asked !== false && e.value === true)
      .map((e) => ({ statement: cleanStr(e.label, 500), accepted: true }));
    acknowledgements = derived.length ? derived : null;
  }
  if (investorType === 'new-international-investor') {
    const ok =
      Array.isArray(acknowledgements) &&
      acknowledgements.length >= OFFSHORE_ACK_KEYS.length &&
      acknowledgements.every((a) => a.accepted === true);
    if (!ok) return { error: 'All compliance statements must be accepted.' };
  }

  // Upload session/folder are not sent by the forms: derive them from the reference so retries are stable.
  const seed = sha256Hex(`elmivet-quote-session:${reference}`).slice(0, 32);
  const uploadFolder = seed;
  const uploadSessionId = `${seed.slice(0, 8)}-${seed.slice(8, 12)}-${seed.slice(12, 16)}-${seed.slice(16, 20)}-${seed.slice(20)}`;

  // Attachments: the current forms send []. Anything else must live inside this submission's folder.
  const rawAttachments = body.attachments === undefined ? [] : body.attachments;
  if (!Array.isArray(rawAttachments) || rawAttachments.length > MAX_ATTACHMENTS) {
    return { error: 'Invalid attachments.' };
  }
  const attachments = [];
  for (const a of rawAttachments) {
    const path = isPlainObject(a) ? cleanStr(a.path, 500) : '';
    if (!path.startsWith(`uploads/${uploadFolder}/`) || path.includes('..')) {
      return { error: 'Invalid attachments.' };
    }
    const item = { path };
    if (typeof a.name === 'string') item.name = cleanStr(a.name, 200);
    if (Number.isFinite(a.size)) item.size = a.size;
    if (typeof a.type === 'string') item.type = cleanStr(a.type, 100);
    attachments.push(item);
  }

  const division = getDivision(formNumber);
  const serviceName = getServiceName(formNumber, division);

  const payloadHash = sha256Hex(
    stableStringify({
      formNumber,
      customerName,
      customerEmail,
      customerPhone,
      company,
      investorType,
      answers,
      acknowledgements,
      attachments,
    })
  );

  return {
    row: {
      reference,
      upload_session_id: uploadSessionId,
      upload_folder: uploadFolder,
      payload_hash: payloadHash,
      form_number: formNumber,
      division,
      service_name: serviceName,
      investor_type: investorType,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      company,
      answers,
      acknowledgements,
      attachments,
      customer_email_status: customerEmail ? 'pending' : 'skipped',
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

function formatValue(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).join(', ');
  if (isPlainObject(v)) return JSON.stringify(v);
  return String(v).slice(0, 5000);
}

function answerRows(answers) {
  const rows = [];
  for (const [key, entry] of Object.entries(isPlainObject(answers) ? answers : {})) {
    let label = key;
    let value = entry;
    if (isPlainObject(entry) && 'value' in entry) {
      if (entry.asked === false) continue;
      label = typeof entry.label === 'string' && entry.label ? entry.label : key;
      value = entry.value;
    }
    rows.push([label, formatValue(value)]);
  }
  return rows;
}

function buildInternalEmail(rec) {
  const rows = [
    ['Reference', rec.reference],
    ['Form', `#${rec.form_number} — ${rec.service_name}`],
    ['Division', rec.division],
    ...(rec.investor_type ? [['Investor type', rec.investor_type]] : []),
    ['Name', rec.customer_name],
    ['Email', rec.customer_email || '—'],
    ['Phone', rec.customer_phone || '—'],
    ['Company', rec.company || '—'],
  ];
  const answers = answerRows(rec.answers);
  const acks = Array.isArray(rec.acknowledgements)
    ? rec.acknowledgements.map((a) => [a.statement, a.accepted ? 'Accepted' : 'Not accepted'])
    : [];
  const files = Array.isArray(rec.attachments) ? rec.attachments.map((a) => a.path) : [];

  const tr = ([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;vertical-align:top"><strong>${escapeHtml(k)}</strong></td>` +
    `<td style="padding:4px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`;
  const table = (list) => `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${list.map(tr).join('')}</table>`;

  const html =
    `<h2 style="font-family:Arial,sans-serif">New ${escapeHtml(rec.division)} submission</h2>` +
    table(rows) +
    `<h3 style="font-family:Arial,sans-serif">Answers</h3>${table(answers)}` +
    (acks.length ? `<h3 style="font-family:Arial,sans-serif">Acknowledgements</h3>${table(acks)}` : '') +
    (files.length
      ? `<h3 style="font-family:Arial,sans-serif">Attachments (storage paths)</h3><ul>${files
          .map((p) => `<li>${escapeHtml(p)}</li>`)
          .join('')}</ul>`
      : '');

  const line = ([k, v]) => `${k}: ${v}`;
  const text = [
    `New ${rec.division} submission`,
    ...rows.map(line),
    '',
    'Answers',
    ...answers.map(line),
    ...(acks.length ? ['', 'Acknowledgements', ...acks.map(line)] : []),
    ...(files.length ? ['', 'Attachments (storage paths)', ...files] : []),
  ].join('\n');

  return {
    subject: oneLine(`[${rec.division}] ${rec.service_name} – ${rec.customer_name} (${rec.reference})`),
    html,
    text,
  };
}

function buildCustomerEmail(rec) {
  const name = escapeHtml(rec.customer_name);
  const division = escapeHtml(rec.division);
  const html =
    `<p>Dear ${name},</p>` +
    `<p>Thank you for contacting Elmivet International regarding <strong>${division}</strong>. ` +
    `Our team has received your submission and will review your details and respond within <strong>24 hours</strong>.</p>` +
    `<p>Your reference: <strong>${escapeHtml(rec.reference)}</strong></p>` +
    `<p>Best regards,<br/>Elmivet International Team</p>`;
  const text =
    `Dear ${rec.customer_name},\n\n` +
    `Thank you for contacting Elmivet International regarding ${rec.division}. ` +
    `Our team has received your submission and will review your details and respond within 24 hours.\n\n` +
    `Your reference: ${rec.reference}\n\nBest regards,\nElmivet International Team`;
  return {
    subject: oneLine(`We received your ${rec.division} inquiry — Elmivet International`),
    html,
    text,
  };
}

/* Best effort: never throws, never affects the HTTP response. */
async function sendCustomerConfirmation(supabase, getTransporter, rec, includeFailed) {
  if (!rec.customer_email) return;
  let claim = null;
  try {
    const { data, error } = await supabase.rpc('elmivet_quote_claim_customer_email', {
      p_reference: rec.reference,
      p_include_failed: includeFailed,
      p_stale_seconds: CLAIM_STALE_SECONDS,
    });
    if (error) throw error;
    claim = Array.isArray(data) ? data[0] : null;
  } catch (err) {
    console.error('[submit-quote] customer claim failed:', errMsg(err));
    return;
  }
  if (!claim) return; // already sent, skipped, or being sent elsewhere

  let ok = false;
  let error = null;
  try {
    const mail = buildCustomerEmail(rec);
    await getTransporter().sendMail({
      from: `"Elmivet International" <${FROM_ADDRESS}>`,
      to: rec.customer_email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    ok = true;
  } catch (err) {
    error = errMsg(err);
    console.error('[submit-quote] customer email failed:', error);
  }

  try {
    const { error: finishErr } = await supabase.rpc('elmivet_quote_finish_customer_email', {
      p_id: claim.out_id,
      p_claim_token: claim.out_claim_token,
      p_ok: ok,
      p_error: ok ? null : error,
    });
    if (finishErr) throw finishErr;
  } catch (err) {
    console.error('[submit-quote] customer finish failed:', errMsg(err));
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
    supabaseKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    smtpUser: process.env.ZOHO_SMTP_USER,
    smtpPass: process.env.ZOHO_SMTP_PASS,
  };
  if (!env.supabaseUrl || !env.supabaseKey || !env.smtpUser || !env.smtpPass) {
    console.error('[submit-quote] missing server environment configuration');
    return fail(res, 500, 'Service is not configured. Please try again later.');
  }

  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let transporter = null;
    const getTransporter = () => {
      if (!transporter) transporter = createTransporter(env);
      return transporter;
    };

    // 1. Rate limit (per IP)
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
      console.error('[submit-quote] rate limit check failed:', errMsg(rlError));
      return fail(res, 503, 'Service temporarily unavailable. Please try again shortly.');
    }
    if (rlData[0].out_allowed === false) {
      res.setHeader('Retry-After', String(rlData[0].out_retry_after_seconds || RATE_WINDOW_SECONDS));
      return fail(res, 429, 'Too many requests. Please try again later.');
    }

    // 2. Validate + normalize
    const body = parseBody(req);
    if (!body) return fail(res, 400, 'Invalid request.');
    const parsed = normalizePayload(body);
    if (parsed.error) return fail(res, 400, parsed.error);
    const row = parsed.row;

    // 3. Insert, or find the existing submission for this reference (retry / duplicate)
    let rec;
    let isExisting = false;
    const { data: inserted, error: insertError } = await supabase
      .from('quote_submissions')
      .insert(row)
      .select(ROW_COLUMNS)
      .single();

    if (!insertError) {
      rec = inserted;
    } else if (insertError.code === '23505') {
      isExisting = true;
      const { data: existing, error: selectError } = await supabase
        .from('quote_submissions')
        .select(ROW_COLUMNS)
        .eq('reference', row.reference)
        .maybeSingle();
      if (selectError) throw selectError;
      if (!existing) return fail(res, 409, 'This reference cannot be used. Please try again.');
      rec = existing;
    } else {
      throw insertError;
    }

    if (isExisting) {
      if (rec.form_number !== row.form_number) {
        return fail(res, 409, 'This reference cannot be used. Please try again.');
      }

      if (rec.status === 'completed') {
        if (rec.payload_hash !== row.payload_hash) {
          return fail(res, 409, 'This reference has already been submitted.');
        }
        // Already delivered internally: just make sure the customer confirmation is not lost.
        await sendCustomerConfirmation(
          supabase,
          getTransporter,
          rec,
          rec.customer_email_attempts < MAX_CUSTOMER_EMAIL_ATTEMPTS
        );
        return reply(res, 200, { ok: true, success: true, reference: rec.reference });
      }

      if (rec.payload_hash !== row.payload_hash) {
        // Same reference, edited answers, not yet delivered: replace the stored payload.
        const { data: replaced, error: replaceError } = await supabase.rpc('elmivet_quote_replace_payload', {
          p_reference: row.reference,
          p_upload_session_id: row.upload_session_id,
          p_form_number: row.form_number,
          p_payload_hash: row.payload_hash,
          p_customer_name: row.customer_name,
          p_customer_email: row.customer_email,
          p_customer_phone: row.customer_phone,
          p_company: row.company,
          p_investor_type: row.investor_type,
          p_answers: row.answers,
          p_acknowledgements: row.acknowledgements,
          p_attachments: row.attachments,
        });
        if (replaceError) throw replaceError;
        if (replaced !== true) {
          return fail(res, 409, 'Your earlier submission is still being processed. Please try again in a minute.');
        }
        rec = {
          ...rec,
          payload_hash: row.payload_hash,
          customer_name: row.customer_name,
          customer_email: row.customer_email,
          customer_phone: row.customer_phone,
          company: row.company,
          investor_type: row.investor_type,
          answers: row.answers,
          acknowledgements: row.acknowledgements,
          attachments: row.attachments,
          customer_email_status: row.customer_email_status,
        };
      }
    }

    // 4. Internal email: claim -> send -> finish
    const { data: claimData, error: claimError } = await supabase.rpc('elmivet_quote_claim_internal_email', {
      p_reference: rec.reference,
      p_stale_seconds: CLAIM_STALE_SECONDS,
    });
    if (claimError) throw claimError;
    const claim = Array.isArray(claimData) ? claimData[0] : null;

    if (!claim) {
      // Nothing to claim: either already completed, or another request is sending right now.
      const { data: current, error: currentError } = await supabase
        .from('quote_submissions')
        .select('status')
        .eq('reference', rec.reference)
        .maybeSingle();
      if (currentError) throw currentError;
      if (current && current.status === 'completed') {
        return reply(res, 200, { ok: true, success: true, reference: rec.reference });
      }
      return fail(res, 409, 'Your submission is still being processed. Please try again in a minute.');
    }

    let internalError = null;
    try {
      const mail = buildInternalEmail(rec);
      await getTransporter().sendMail({
        from: `"Elmivet Web Portal" <${FROM_ADDRESS}>`,
        to: INTERNAL_TO,
        bcc: INTERNAL_BCC,
        ...(rec.customer_email ? { replyTo: rec.customer_email } : {}),
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    } catch (err) {
      internalError = errMsg(err);
      console.error('[submit-quote] internal email failed:', internalError);
    }

    const { data: finished, error: finishError } = await supabase.rpc('elmivet_quote_finish_internal_email', {
      p_id: claim.out_id,
      p_claim_token: claim.out_claim_token,
      p_ok: internalError === null,
      p_error: internalError,
    });
    if (finishError) {
      console.error('[submit-quote] internal finish failed:', errMsg(finishError));
      return fail(res, 500, 'We could not complete your submission. Please try again.');
    }

    if (internalError !== null) {
      return fail(res, 502, 'We could not send your submission right now. Please try again.');
    }

    if (finished !== true) {
      // Claim was lost (e.g. reclaimed as stale). Only report success if it really is completed.
      const { data: current } = await supabase
        .from('quote_submissions')
        .select('status')
        .eq('reference', rec.reference)
        .maybeSingle();
      if (!current || current.status !== 'completed') {
        return fail(res, 500, 'We could not complete your submission. Please try again.');
      }
    }

    // 5. Customer confirmation (best effort; never blocks success)
    await sendCustomerConfirmation(supabase, getTransporter, rec, false);

    return reply(res, 200, { ok: true, success: true, reference: rec.reference });
  } catch (err) {
    console.error('[submit-quote] unexpected error:', errMsg(err));
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
}