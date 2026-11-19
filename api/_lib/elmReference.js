// api/_lib/elmReference.js
//
// Official Elmivet reference IDs are issued by the database (see
// supabase/migrations/20261119120000_batch2a_unique_references.sql). This module only:
//   * asks the database to assign the reference for a stored submission, and
//   * double-checks the answer against the approved format before it is trusted.
//
// Quote format:        #ELM-1042[Division Code][Division Form Code]-[Unique Identifier]
// Consultation format: #ELM-104200-[Unique Identifier]
//
// The `reference` column / request field supplied by the browser is NOT the official reference.
// It is only an opaque idempotency token (safe retries + upload folder).

export const BASE = '#ELM-1042';
export const CONSULTATION_PREFIX = '#ELM-104200';

// website form number -> [division code, division form code]
export const FORM_CODES = Object.freeze({
  1: ['01', '01'], 2: ['01', '02'], 3: ['01', '03'], 4: ['01', '04'], 5: ['01', '05'],
  6: ['02', '01'], 7: ['02', '02'], 8: ['02', '03'], 9: ['02', '04'],
  10: ['03', '01'], 11: ['03', '02'], 12: ['03', '03'], 20: ['03', '04'],
  13: ['04', '01'], 14: ['04', '02'], 15: ['04', '03'], 16: ['04', '04'], 17: ['04', '05'], 18: ['04', '06'],
  19: ['05', '01'],
});

export function quotePrefix(formNumber) {
  const codes = FORM_CODES[formNumber];
  if (!codes) throw new Error(`No reference mapping for form ${formNumber}`);
  return `${BASE}${codes[0]}${codes[1]}`;
}

export function formatReference(prefix, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('Invalid sequence number');
  return `${prefix}-${String(n).padStart(3, '0')}`; // padStart never truncates: 1000 -> "1000"
}

export function isValidQuoteReference(ref, formNumber) {
  if (typeof ref !== 'string' || !FORM_CODES[formNumber]) return false;
  const prefix = quotePrefix(formNumber);
  return ref.startsWith(`${prefix}-`) && /^[0-9]{3,}$/.test(ref.slice(prefix.length + 1));
}

export function isValidConsultationReference(ref) {
  return (
    typeof ref === 'string' &&
    ref.startsWith(`${CONSULTATION_PREFIX}-`) &&
    /^[0-9]{3,}$/.test(ref.slice(CONSULTATION_PREFIX.length + 1))
  );
}

async function callAssign(supabase, fn, clientToken, isValid) {
  const { data, error } = await supabase.rpc(fn, { p_reference: clientToken });
  if (error) throw error;
  if (!isValid(data)) throw new Error('Database returned an unexpected reference format');
  return data;
}

/** Idempotent: returns the existing official reference if the submission already has one. */
export function assignQuoteReference(supabase, clientToken, formNumber) {
  return callAssign(supabase, 'elmivet_assign_quote_reference', clientToken, (r) =>
    isValidQuoteReference(r, formNumber)
  );
}

export function assignConsultationReference(supabase, clientToken) {
  return callAssign(supabase, 'elmivet_assign_consultation_reference', clientToken, isValidConsultationReference);
}
