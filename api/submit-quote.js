// api/submit-quote.js
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { assignQuoteReference } from './_lib/elmReference.js';

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
const ATTACHMENT_BUCKET = 'elmivet-quotes';
const ATTACHMENT_PATH_PREFIX = 'uploads/';
const ATTACHMENT_LINK_TTL_SECONDS = 7 * 24 * 60 * 60; // signed download links last 7 days

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OFFSHORE_ACK_KEYS = ['confirmPassport', 'confirmPrivacy', 'confirmContact'];

// Known service names. Any other form falls back to "<division> - Form N".
const SERVICE_NAMES = {
  1: 'Import and Export Facilitation',
  20: 'Real Estate Offshore Investment Enquiry',
};

// Customer-facing inquiry topic per form (titles as shown on the Services page). Used only for the
// customer confirmation email; it does not affect the stored service_name or the internal email.
const INQUIRY_TOPICS = {
  1: 'Import and Export Facilitation',
  2: 'Ocean and Air Freight Forwarding',
  3: 'Clearing & Customs Brokerage',
  4: 'Groupage / LCL Services',
  5: 'Bonded Terminal Operations',
  6: 'Road Haulage & Industrial Logistics',
  7: 'Warehousing & Storage',
  8: 'Packing & Removal',
  9: 'Domestic Bulk Haulage',
  10: 'Automobile Dealership & Importation',
  11: 'Real Estate & Project Request',
  12: 'Procurement & Bulk Merchandise',
  13: 'General Cleaning Services',
  14: 'Energy Solutions',
  15: 'Petroleum Marketing',
  16: 'Fabrication & Construction',
  17: 'Oil Servicing',
  18: 'Marine Services',
  19: 'China Operational & Logistics',
  20: 'Real Estate Offshore Investment Enquiry',
};

const ROW_COLUMNS =
  'id, reference, form_number, division, service_name, investor_type, payload_hash, status, ' +
  'customer_name, customer_email, customer_phone, company, answers, acknowledgements, attachments, upload_folder, ' +
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
  if (formNumber === 19) return 'China Operations & Logistics';
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
    customer.clientName,
    body.customerName,
    findByLabel(answers, /^Full Legal Name/i),
    customer.companyName,
    // Last-resort fallbacks, only reached when every name above is empty (previously a 400).
    customer.representativeName,
    customer.contactPerson,
    customer.managerName,
    customer.email
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
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: env.resendApiKey,
    },
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

// Backslashes and control characters (C0 range + DEL) are never valid in an attachment path.
// eslint-disable-next-line no-control-regex
const UNSAFE_PATH_CHARS_RE = /[\\\u0000-\u001F\u007F]/;

// The path must live inside this submission's own folder: `uploads/<upload_folder>/<filename>`.
function isValidAttachmentPath(path, uploadFolder) {
  if (typeof path !== 'string') return false;
  if (typeof uploadFolder !== 'string' || !uploadFolder || uploadFolder.includes('/')) return false;
  const prefix = `${ATTACHMENT_PATH_PREFIX}${uploadFolder}/`;
  return (
    path.startsWith(prefix) &&
    path.length > prefix.length &&
    !path.includes('..') &&
    !UNSAFE_PATH_CHARS_RE.test(path)
  );
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* Fallback entry (no link). Must never throw: it is used from catch blocks. */
function attachmentFallbackLink(a, i) {
  try {
    const item = isPlainObject(a) ? a : {};
    const path = typeof item.path === 'string' ? oneLine(item.path) : '';
    return {
      name: oneLine(cleanStr(item.name, 200)) || oneLine(path.split('/').pop()) || `Attachment ${i + 1}`,
      path,
      size: item.size,
      url: null,
    };
  } catch {
    return { name: `Attachment ${i + 1}`, path: '', size: undefined, url: null };
  }
}

/* Never throws. Used when the whole link-generation step fails unexpectedly. */
function attachmentFallbackLinks(attachments) {
  const out = [];
  try {
    if (Array.isArray(attachments)) {
      for (let i = 0; i < attachments.length; i += 1) out.push(attachmentFallbackLink(attachments[i], i));
    }
  } catch {
    /* keep whatever was collected so far */
  }
  return out;
}

async function buildAttachmentLink(supabase, a, i, uploadFolder) {
  const link = attachmentFallbackLink(a, i);
  const rawPath = isPlainObject(a) ? a.path : undefined;

  if (!isValidAttachmentPath(rawPath, uploadFolder)) {
    console.error(`[submit-quote] attachment ${i + 1}: invalid storage path, no link generated`);
    return link;
  }

  try {
    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(rawPath, ATTACHMENT_LINK_TTL_SECONDS);
    if (error) throw error;
    const url = data && data.signedUrl;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error('no usable signed URL returned');
    }
    link.url = url;
  } catch (err) {
    console.error(`[submit-quote] attachment ${i + 1}: signed URL generation failed:`, errMsg(err));
  }
  return link;
}

/*
 * Best effort: never throws. Returns one entry per stored attachment with a temporary signed
 * download URL, or url = null when no link could be generated (the email then shows the storage
 * path instead). Each attachment is isolated, and an unexpected failure anywhere falls back to
 * link-less entries so the internal notification is still sent. Signed URLs (which carry a token)
 * are never logged.
 */
async function buildAttachmentLinks(supabase, attachments, uploadFolder) {
  try {
    if (!Array.isArray(attachments)) return [];
    return await Promise.all(
      attachments.map(async (a, i) => {
        try {
          return await buildAttachmentLink(supabase, a, i, uploadFolder);
        } catch (err) {
          console.error(`[submit-quote] attachment ${i + 1}: unexpected link error:`, errMsg(err));
          return attachmentFallbackLink(a, i);
        }
      })
    );
  } catch (err) {
    console.error('[submit-quote] attachment link generation failed:', errMsg(err));
    return attachmentFallbackLinks(attachments);
  }
}

function buildInternalEmail(rec, attachmentLinks, elmReference) {
  const rows = [
    ['Reference', elmReference],
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
  const files = Array.isArray(attachmentLinks) ? attachmentLinks : [];
  const ttlDays = ATTACHMENT_LINK_TTL_SECONDS / 86400;
  const sizeLabel = (f) => {
    const size = formatFileSize(f.size);
    return size ? ` (${size})` : '';
  };
  const fileHtml = (f) =>
    f.url
      ? `<li><a href="${escapeHtml(f.url)}">${escapeHtml(f.name)}</a>${escapeHtml(sizeLabel(f))}</li>`
      : `<li>${escapeHtml(f.name)}${escapeHtml(sizeLabel(f))} &mdash; download link unavailable. ` +
        `Storage path: ${escapeHtml(f.path || '—')}</li>`;
  const fileLine = (f) =>
    f.url
      ? `- ${f.name}${sizeLabel(f)}: ${f.url}`
      : `- ${f.name}${sizeLabel(f)} — download link unavailable. Storage path: ${f.path || '—'}`;

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
      ? `<h3 style="font-family:Arial,sans-serif">Attachments</h3>` +
        (files.some((f) => f.url)
          ? `<p style="font-family:Arial,sans-serif;font-size:12px;color:#666">Download links expire in ${ttlDays} days.</p>`
          : '') +
        `<ul style="font-family:Arial,sans-serif;font-size:14px">${files.map(fileHtml).join('')}</ul>`
      : '');

  const line = ([k, v]) => `${k}: ${v}`;
  const text = [
    `New ${rec.division} submission`,
    ...rows.map(line),
    '',
    'Answers',
    ...answers.map(line),
    ...(acks.length ? ['', 'Acknowledgements', ...acks.map(line)] : []),
    ...(files.length
      ? [
          '',
          files.some((f) => f.url) ? `Attachments (download links expire in ${ttlDays} days)` : 'Attachments',
          ...files.map(fileLine),
        ]
      : []),
  ].join('\n');

  return {
    subject: oneLine(`[${rec.division}] ${rec.service_name} – ${rec.customer_name} (${elmReference})`),
    html,
    text,
  };
}

function buildCustomerEmail(rec, elmReference) {
  const topic = INQUIRY_TOPICS[rec.form_number] || rec.service_name || rec.division;
  const html =
    `<p>Dear ${escapeHtml(rec.customer_name)},</p>` +
    `<p>Thank you for your inquiry regarding ${escapeHtml(topic)}. ` +
    `Our team has received your inquiry and will review your details and respond within 24 hours.</p>` +
    `<p>Reference ID: ${escapeHtml(elmReference)}</p>` +
    `<p>Best regards,<br/>Elmivet International Team</p>`;
  const text =
    `Dear ${rec.customer_name},\n\n` +
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

/* Best effort: never throws, never affects the HTTP response. */
async function sendCustomerConfirmation(supabase, getTransporter, rec, includeFailed, elmReference) {
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
    const mail = buildCustomerEmail(rec, elmReference);
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
  resendApiKey: process.env.RESEND_API_KEY,
};

if (!env.supabaseUrl || !env.supabaseKey || !env.resendApiKey) {
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
        const completedElmReference = await assignQuoteReference(supabase, rec.reference, row.form_number);
        await sendCustomerConfirmation(
          supabase,
          getTransporter,
          rec,
          rec.customer_email_attempts < MAX_CUSTOMER_EMAIL_ATTEMPTS,
          completedElmReference
        );
        return reply(res, 200, {
          ok: true,
          success: true,
          reference: rec.reference,
          elmReference: completedElmReference,
        });
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

    // 3b. Official reference: issued by the database, once per stored submission (idempotent on retry).
    //     `rec.reference` above is only the browser's idempotency token, never the official ID.
    const elmReference = await assignQuoteReference(supabase, rec.reference, row.form_number);

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
        return reply(res, 200, { ok: true, success: true, reference: rec.reference, elmReference });
      }
      return fail(res, 409, 'Your submission is still being processed. Please try again in a minute.');
    }

    let internalError = null;
    try {
      const attachmentLinks = await buildAttachmentLinks(supabase, rec.attachments, rec.upload_folder);
      const mail = buildInternalEmail(rec, attachmentLinks, elmReference);
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
    await sendCustomerConfirmation(supabase, getTransporter, rec, false, elmReference);

    return reply(res, 200, { ok: true, success: true, reference: rec.reference, elmReference });
  } catch (err) {
    console.error('[submit-quote] unexpected error:', errMsg(err));
    return fail(res, 500, 'Something went wrong. Please try again.');
  }
}