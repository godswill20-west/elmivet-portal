
// api/_lib/elmReference.js
//
// Official Elmivet reference IDs are issued by the database.
// This module:
//   - requests an official reference for a stored submission;
//   - validates newly generated references;
//   - accepts valid historical references when an existing
//     submission is retried.
//
// Quote format:
// #ELM-1042[Division Code][Actual Website Form Number]-[Sequence]
//
// Consultation format remains:
// #ELM-104200-[Sequence]
//
// The browser-supplied `reference` is only an idempotency token.
// It is NOT the official reference.

export const BASE = '#ELM-1042';
export const CONSULTATION_PREFIX = '#ELM-104200';

// Website form number -> [division code, actual website form number]
export const FORM_CODES = Object.freeze({
  1: ['01', '01'],
  2: ['01', '02'],
  3: ['01', '03'],
  4: ['01', '04'],
  5: ['01', '05'],

  6: ['02', '06'],
  7: ['02', '07'],
  8: ['02', '08'],
  9: ['02', '09'],

  10: ['03', '10'],
  11: ['03', '11'],
  12: ['03', '12'],
  20: ['03', '20'],

  13: ['04', '13'],
  14: ['04', '14'],
  15: ['04', '15'],
  16: ['04', '16'],
  17: ['04', '17'],
  18: ['04', '18'],

  19: ['05', '19'],
});

// Original division-local codes.
// Used ONLY to validate references already assigned historically.
// These codes must never be used to generate a new reference.
export const LEGACY_FORM_CODES = Object.freeze({
  1: ['01', '01'],
  2: ['01', '02'],
  3: ['01', '03'],
  4: ['01', '04'],
  5: ['01', '05'],

  6: ['02', '01'],
  7: ['02', '02'],
  8: ['02', '03'],
  9: ['02', '04'],

  10: ['03', '01'],
  11: ['03', '02'],
  12: ['03', '03'],
  20: ['03', '04'],

  13: ['04', '01'],
  14: ['04', '02'],
  15: ['04', '03'],
  16: ['04', '04'],
  17: ['04', '05'],
  18: ['04', '06'],

  19: ['05', '01'],
});

function isValidFormNumber(formNumber) {
  return (
    Number.isInteger(formNumber) &&
    formNumber >= 1 &&
    formNumber <= 20 &&
    Object.hasOwn(FORM_CODES, formNumber)
  );
}

export function quotePrefix(formNumber) {
  if (!isValidFormNumber(formNumber)) {
    throw new Error(`No reference mapping for form ${formNumber}`);
  }

  const [divisionCode, actualFormCode] = FORM_CODES[formNumber];

  return `${BASE}${divisionCode}${actualFormCode}`;
}

function legacyQuotePrefix(formNumber) {
  const codes = LEGACY_FORM_CODES[formNumber];

  if (!codes) return null;

  return `${BASE}${codes[0]}${codes[1]}`;
}

export function formatReference(prefix, n) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('Invalid sequence number');
  }

  return `${prefix}-${String(n).padStart(3, '0')}`;
}

export function isValidQuoteReference(ref, formNumber) {
  if (
    typeof ref !== 'string' ||
    !isValidFormNumber(formNumber)
  ) {
    return false;
  }

  const sequencePattern = /^[0-9]{3,}$/;

  const allowedPrefixes = new Set([
    quotePrefix(formNumber),
    legacyQuotePrefix(formNumber),
  ]);

  return [...allowedPrefixes].some((prefix) => {
    if (!prefix) return false;

    if (!ref.startsWith(`${prefix}-`)) return false;

    return sequencePattern.test(
      ref.slice(prefix.length + 1)
    );
  });
}

export function isValidConsultationReference(ref) {
  return (
    typeof ref === 'string' &&
    ref.startsWith(`${CONSULTATION_PREFIX}-`) &&
    /^[0-9]{3,}$/.test(
      ref.slice(CONSULTATION_PREFIX.length + 1)
    )
  );
}

async function callAssign(supabase, fn, clientToken, isValid) {
  const { data, error } = await supabase.rpc(fn, {
    p_reference: clientToken,
  });

  if (error) throw error;

  if (!isValid(data)) {
    throw new Error(
      'Database returned an unexpected reference format'
    );
  }

  return data;
}

/**
 * Idempotent:
 * - New submissions receive the corrected actual-form reference.
 * - Existing submissions retain their original historical reference.
 */
export function assignQuoteReference(
  supabase,
  clientToken,
  formNumber
) {
  return callAssign(
    supabase,
    'elmivet_assign_quote_reference',
    clientToken,
    (ref) => isValidQuoteReference(ref, formNumber)
  );
}

export function assignConsultationReference(
  supabase,
  clientToken
) {
  return callAssign(
    supabase,
    'elmivet_assign_consultation_reference',
    clientToken,
    isValidConsultationReference
  );
}
