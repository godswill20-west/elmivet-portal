// api/get-upload-urls.js
//
// Issues short-lived signed upload tokens for the private `elmivet-quotes` bucket.
// The browser uploads the binary file straight to Supabase Storage with these tokens, then sends
// the returned storage paths to /api/submit-quote in `attachments`.
//
// The upload folder is derived from the quote reference EXACTLY as api/submit-quote.js derives it:
//   sha256Hex("elmivet-quote-session:" + reference).slice(0, 32)
// and every path is `uploads/${uploadFolder}/<index>-<safe name>.<ext>`, which is what submit-quote requires.
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'elmivet-quotes';
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB combined
const MAX_NAME_CHARS = 255;
const MAX_BASE_CHARS = 80;

const RATE_BUCKET = 'get-upload-urls';
const RATE_LIMIT = 20; // requests per IP per window (retries included)
const RATE_WINDOW_SECONDS = 600;

// Same rule as the frontend FileUpload component (BLOCKED_RE), also matched against inner extensions
// such as "invoice.exe.pdf".
const BLOCKED_RE = /\.(exe|mp4|zip|rar|7z|bat|cmd|msi|scr|js|sh|com|mov|avi)(\.|$)/i;

// Extensions the shared FileUpload component accepts. `mime` is the canonical type the file is stored
// with (the bucket enforces its own MIME allow-list on the upload). `accepts` are the types a browser
// may report for that extension; an empty or generic type is tolerated and replaced by `mime`.
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ALLOWED_TYPES = {
  pdf: { mime: 'application/pdf', accepts: ['application/pdf'] },
  doc: { mime: 'application/msword', accepts: ['application/msword'] },
  docx: { mime: DOCX, accepts: [DOCX] },
  xls: { mime: 'application/vnd.ms-excel', accepts: ['application/vnd.ms-excel'] },
  xlsx: { mime: XLSX, accepts: [XLSX] },
  csv: { mime: 'text/csv', accepts: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'] },
  txt: { mime: 'text/plain', accepts: ['text/plain'] },
  jpg: { mime: 'image/jpeg', accepts: ['image/jpeg', 'image/pjpeg'] },
  jpeg: { mime: 'image/jpeg', accepts: ['image/jpeg', 'image/pjpeg'] },
  png: { mime: 'image/png', accepts: ['image/png'] },
};
const GENERIC_TYPES = ['', 'application/octet-stream'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function errMsg(err) {
  return String((err && err.message) || err || 'unknown error').slice(0, 500);
}

function cleanStr(v, max) {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function fail(res, status, error) {
  return res.status(status).json({ ok: false, success: false, error });
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

// Identical rule to isValidReference() in api/submit-quote.js.
function isValidReference(reference, formNumber) {
  return (
    typeof reference === 'string' &&
    reference.length <= 40 &&
    new RegExp(`^ELM-${formNumber}-[A-Z0-9]{6,16}$`).test(reference)
  );
}

// Identical derivation to normalizePayload() in api/submit-quote.js.
function deriveUploadFolder(reference) {
  return sha256Hex(`elmivet-quote-session:${reference}`).slice(0, 32);
}

/* Storage-safe file name: no dots in the base (so ".." can never appear), only [A-Za-z0-9_-]. */
function safeBaseName(name, ext) {
  const base = name
    .slice(0, name.length - ext.length - 1)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_BASE_CHARS);
  return base || 'file';
}

/* Validates one file descriptor. Returns { error } or { name, size, ext, contentType }. */
function validateFile(file) {
  if (!isPlainObject(file)) return { error: 'Invalid file details.' };

  const name = cleanStr(file.name, MAX_NAME_CHARS + 1);
  if (!name || name.length > MAX_NAME_CHARS) return { error: 'Every file needs a valid name.' };
  if (BLOCKED_RE.test(name)) return { error: `Unsupported or unsafe file format: ${name}` };

  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  const rule = Object.prototype.hasOwnProperty.call(ALLOWED_TYPES, ext) ? ALLOWED_TYPES[ext] : null;
  if (!rule) return { error: `Unsupported file type: ${name}. Please use PDF, Office, CSV, TXT, JPG or PNG files.` };

  const size = file.size;
  if (!Number.isInteger(size) || size <= 0) return { error: `${name} is empty or has an invalid size.` };
  if (size > MAX_TOTAL_BYTES) return { error: `${name} exceeds the 25MB limit.` };

  const declared = typeof file.type === 'string' ? file.type.trim().toLowerCase() : '';
  if (!GENERIC_TYPES.includes(declared) && !rule.accepts.includes(declared)) {
    return { error: `${name} does not look like a .${ext} file.` };
  }

  return { name, size, ext, contentType: rule.mime };
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('[get-upload-urls] missing server environment configuration');
    return fail(res, 500, 'Service is not configured. Please try again later.');
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Rate limit (per IP), using the same RPC as submit-quote with its own bucket
    const ip =
      cleanStr(String(req.headers['x-real-ip'] || ''), 100) ||
      cleanStr(String(req.headers['x-forwarded-for'] || '').split(',')[0], 100) ||
      'unknown';
    const { data: rlData, error: rlError } = await supabaseAdmin.rpc('elmivet_check_rate_limit', {
      p_bucket: RATE_BUCKET,
      p_key_hash: sha256Hex(ip),
      p_limit: RATE_LIMIT,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (rlError || !Array.isArray(rlData) || !rlData[0]) {
      console.error('[get-upload-urls] rate limit check failed:', errMsg(rlError));
      return fail(res, 503, 'Service temporarily unavailable. Please try again shortly.');
    }
    if (rlData[0].out_allowed === false) {
      res.setHeader('Retry-After', String(rlData[0].out_retry_after_seconds || RATE_WINDOW_SECONDS));
      return fail(res, 429, 'Too many requests. Please try again later.');
    }

    // 2. Validate the request
    const body = parseBody(req);
    if (!body) return fail(res, 400, 'Invalid request.');

    const formNumber = Number(body.formNumber);
    if (!Number.isInteger(formNumber) || formNumber < 1 || formNumber > 20) {
      return fail(res, 400, 'Invalid form.');
    }
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!isValidReference(reference, formNumber)) return fail(res, 400, 'Invalid reference.');

    const files = body.files;
    if (!Array.isArray(files) || files.length === 0) return fail(res, 400, 'No files were provided.');
    if (files.length > MAX_FILES) return fail(res, 400, 'Maximum of 5 files allowed.');

    const checked = [];
    let totalSize = 0;
    for (const f of files) {
      const v = validateFile(f);
      if (v.error) return fail(res, 400, v.error);
      totalSize += v.size;
      checked.push(v);
    }
    if (totalSize > MAX_TOTAL_BYTES) return fail(res, 400, 'Total upload size cannot exceed 25MB.');

    // 3. Paths are deterministic for a given reference + file list, so a retry produces the same
    //    attachment paths (and therefore the same payload hash in submit-quote). `upsert` lets a retry
    //    overwrite an earlier partial upload instead of failing with "already exists".
    const uploadFolder = deriveUploadFolder(reference);
    const results = await Promise.all(
      checked.map(async (f, index) => {
        const path = `uploads/${uploadFolder}/${index + 1}-${safeBaseName(f.name, f.ext)}.${f.ext}`;
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUploadUrl(path, { upsert: true });
        if (error || !data || !data.token) {
          throw new Error(`createSignedUploadUrl failed: ${errMsg(error)}`);
        }
        return {
          index,
          originalName: f.name,
          path,
          token: data.token,
          contentType: f.contentType,
          size: f.size,
        };
      })
    );

    // The project URL is public (it is already in the frontend bundle). The secret key is never returned.
    return res.status(200).json({
      ok: true,
      success: true,
      bucket: BUCKET,
      supabaseUrl,
      uploads: results,
    });
  } catch (err) {
    console.error('[get-upload-urls] unexpected error:', errMsg(err));
    return fail(res, 500, 'We could not prepare your upload. Please try again.');
  }
}