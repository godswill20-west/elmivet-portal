
// api/_lib/elmReference.js

export const BASE = '#ELM-1042';
export const CONSULTATION_PREFIX = '#ELM-104200';

// Website form number -> [division code, position within division]
export const FORM_CODES = Object.freeze({
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

// Previously generated actual-form-number prefixes.
// Validation only: never use these to generate new references.
export const LEGACY_FORM_CODES = Object.freeze({
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

function isValidFormNumber(formNumber) {
  return (
    Number.isInteger(formNumber) &&
    Object.hasOwn(FORM_CODES, formNumber)
  );
}

function buildPrefix(formNumber, mapping) {
  const codes = mapping[formNumber];
  if (!codes) return null;

  return `${BASE}${codes[0]}${codes[1]}`;
}

export function quotePrefix(formNumber) {
  if (!isValidFormNumber(formNumber)) {
    throw new Error(`No reference mapping for form ${formNumber}`);
  }

  return buildPrefix(formNumber, FORM_CODES);
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

  const prefixes = [
    buildPrefix(formNumber, FORM_CODES),
    buildPrefix(formNumber, LEGACY_FORM_CODES),
  ];

  return prefixes.some((prefix) =>
    ref.startsWith(`${prefix}-`) &&
    /^[0-9]{3,}$/.test(ref.slice(prefix.length + 1))
  );
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
    throw new Error('Database returned an unexpected reference format');
  }

  return data;
}

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
