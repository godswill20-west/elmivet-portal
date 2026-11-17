// src/components/forms/shared/quoteFileUpload.js
//
// Uploads the real File objects a quote form collected to the private `elmivet-quotes` bucket,
// using signed upload tokens from /api/get-upload-urls, and returns attachment metadata that can be
// sent as `attachments` to /api/submit-quote.
//
// Never logs file contents, tokens or keys.
import { createClient } from "@supabase/supabase-js";

const UPLOAD_URLS_ENDPOINT = "/api/get-upload-urls";
const SIGN_TIMEOUT_MS = 30000;
const GENERIC_MESSAGE = "We could not upload your files. Please try again.";

/* The signed token authorises each upload, but the Supabase client still needs the project's PUBLIC
   (publishable / anon) key. This is the only frontend Supabase setting this helper reads.
   If the site already exports a shared Supabase client, pass it as `supabaseClient` instead
   (see uploadQuoteFiles) and this fallback is never used. */
function readPublicKey() {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
}

let cachedClient = null;
let cachedClientUrl = "";

function getClient(supabaseUrl) {
  if (cachedClient && cachedClientUrl === supabaseUrl) return cachedClient;
  const key = readPublicKey();
  if (!supabaseUrl || !key) {
    throw new QuoteUploadError("upload-not-configured");
  }
  cachedClient = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  cachedClientUrl = supabaseUrl;
  return cachedClient;
}

/* `userMessage` is always safe to show to a customer. */
export class QuoteUploadError extends Error {
  constructor(code, userMessage = GENERIC_MESSAGE) {
    super(code);
    this.name = "QuoteUploadError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

/* Stable identity of a file selection. Lets a form skip re-uploading unchanged files when only the
   quote submission failed and the person retries. */
export function fileSetSignature(files) {
  return Array.from(files || [])
    .map((f) => `${f.name}:${f.size}:${f.lastModified || 0}`)
    .join("|");
}

async function requestSignedUploads({ reference, formNumber, files }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SIGN_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(UPLOAD_URLS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        formNumber,
        files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      }),
      signal: controller.signal,
    });
  } catch {
    throw new QuoteUploadError("sign-network", "We could not reach the upload service. Please check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.ok === false || data.success === false || !Array.isArray(data.uploads)) {
    // 400 responses carry a customer-safe validation message (for example "file type not supported").
    const detail = res.status === 400 && data && typeof data.error === "string" ? data.error : "";
    throw new QuoteUploadError(`sign-http-${res.status}`, detail ? `${GENERIC_MESSAGE} ${detail}` : GENERIC_MESSAGE);
  }
  return data;
}

/**
 * Uploads `files` and returns [{ path, name, size, type }] in the same order as `files`.
 * Throws QuoteUploadError (with a customer-safe `userMessage`) if anything fails; the caller must then
 * NOT submit the quote.
 *
 * @param {object}   opts
 * @param {string}   opts.reference       Quote reference (reused on retries; decides the storage folder)
 * @param {number}   opts.formNumber      Form number (1-20), must match the reference
 * @param {File[]}   opts.files           Real browser File objects
 * @param {object=}  opts.supabaseClient  Optional existing Supabase client to reuse
 */
export async function uploadQuoteFiles({ reference, formNumber, files, supabaseClient }) {
  const list = Array.from(files || []);
  if (list.length === 0) return []; // forms without attachments never touch the network

  if (list.some((f) => !(f instanceof Blob))) {
    throw new QuoteUploadError("invalid-file");
  }

  const signed = await requestSignedUploads({ reference, formNumber, files: list });
  const uploads = signed.uploads;

  if (uploads.length !== list.length) throw new QuoteUploadError("sign-mismatch");
  const byIndex = new Map(uploads.map((u) => [u.index, u]));
  if (byIndex.size !== list.length) throw new QuoteUploadError("sign-mismatch");

  const client = supabaseClient || getClient(signed.supabaseUrl);
  const bucket = typeof signed.bucket === "string" && signed.bucket ? signed.bucket : "elmivet-quotes";
  const attachments = [];

  for (let i = 0; i < list.length; i += 1) {
    const file = list[i];
    const slot = byIndex.get(i);
    if (!slot || typeof slot.path !== "string" || !slot.path.startsWith("uploads/") || typeof slot.token !== "string") {
      throw new QuoteUploadError("sign-mismatch");
    }

    let uploadError = null;
    try {
      const { error } = await client.storage
        .from(bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: slot.contentType });
      uploadError = error || null;
    } catch (err) {
      uploadError = err || new Error("upload failed");
    }
    if (uploadError) {
      throw new QuoteUploadError(
        "upload-failed",
        `We could not upload "${file.name}". Please check your connection and try again.`
      );
    }

    attachments.push({
      path: slot.path, // exact storage path: submit-quote requires uploads/<folder>/...
      name: file.name,
      size: file.size,
      type: slot.contentType || file.type || "",
    });
  }

  return attachments;
}