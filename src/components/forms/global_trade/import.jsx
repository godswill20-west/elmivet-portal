// src/components/forms/global_trade/import.jsx
import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import {
  ModalShell,
  Field,
  FadeIn,
  HOTLINES,
  WIDE_TYPES,
  SUBMIT_CLICK_GUARD_MS,
} from "../shared/FormPrimitives";

const QUOTES_TO = "quotes@elmivet.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (name, label, x = {}) => ({ name, label, type: "text", ...x });
const area = (name, label, x = {}) => ({ name, label, type: "textarea", ...x });
const radio = (name, label, options, x = {}) => ({
  name,
  label,
  type: "radio",
  options,
  required: true,
  ...x,
});
const select = (name, label, options, x = {}) => ({
  name,
  label,
  type: "select",
  options,
  required: true,
  ...x,
});
const isVisible = (field, values) =>
  [].concat(field.showIf || []).every((c) => values[c.field] === c.equals);

/* ==========================================================================
   Import and Export Facilitation: Request Form (Form 01)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   ========================================================================== */

/* IMPORT-LOGIC-START (pure logic: no JSX) */
const IMPORT_FORM_ID = "import-export-facilitation-request";
const IMPORT_FORM_NUMBER = 1;
const IMPORT_SUBMIT_LABEL = "Submit Request";
const IMPORT_SUBJECT_PREFIX = "[New Import & Export Request] \u2013 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const IMPORT_SUBMIT_ENDPOINT = "";

const IMPORT_DIRECTION_OPTIONS = [
  { code: "import", label: "Import (Inbound to West Africa)" },
  { code: "export", label: "Export (Outbound Globally)" },
];
const IMPORT_BUSINESS_OPTIONS = [
  { code: "manufacturer", label: "Manufacturer" },
  { code: "wholesaler", label: "Wholesaler" },
  { code: "retailer", label: "Retailer" },
  { code: "individual", label: "Individual" },
];
const IMPORT_SHIPPING_OPTIONS = [
  { code: "air_freight", label: "Air Freight" },
  { code: "ocean_freight", label: "Ocean Freight" },
];
const IMPORT_SCOPE_OPTIONS = [
  { code: "port_to_door", label: "Port-to-Door" },
  { code: "door_to_port", label: "Door-to-Port" },
  { code: "door_to_door", label: "Door-to-Door" },
];
const IMPORT_FREQUENCY_OPTIONS = [
  { code: "one_off", label: "One-off shipment" },
  { code: "weekly", label: "Weekly" },
  { code: "monthly", label: "Monthly" },
  { code: "quarterly", label: "Quarterly" },
];

const importLabels = (opts) => opts.map((o) => o.label);
const importChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, importLabels(opts), { codes: opts, ...x });

const IMPORT_STEPS = [
  {
    title: "Company & Contact",
    fields: [
      text("companyName", "Company Name", { required: true, autoComplete: "organization" }),
      text("contactName", "Contact Person Name", { required: true, autoComplete: "name" }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number", type: "tel", required: true, autoComplete: "tel" },
      { name: "whatsapp", label: "WhatsApp Number", type: "tel", autoComplete: "tel" },
    ],
  },
  {
    title: "Trade Details",
    fields: [
      importChoice(radio, "tradeDirection", "Trade Direction", IMPORT_DIRECTION_OPTIONS),
      importChoice(select, "natureOfBusiness", "Nature of Business", IMPORT_BUSINESS_OPTIONS, {
        required: false,
        wide: true,
      }),
      importChoice(radio, "shippingType", "Shipping Type", IMPORT_SHIPPING_OPTIONS),
      importChoice(select, "serviceScope", "Service Scope/Delivery Mode", IMPORT_SCOPE_OPTIONS, {
        required: false,
        wide: true,
      }),
      text("originCountry", "Country of Origin", { required: true }),
      text("destinationCountry", "Destination Country", { required: true }),
    ],
  },
  {
    title: "Cargo & Comments",
    fields: [
      text("goodsDescription", "Description of Goods", { required: true, wide: true }),
      importChoice(radio, "frequency", "Estimated Frequency", IMPORT_FREQUENCY_OPTIONS, { required: false }),
      text("tradeLicenses", "Special Trade Licenses Held (if any)", { wide: true }),
      area("comments", "Additional Comment"),
    ],
  },
];
const IMPORT_ALL_FIELDS = IMPORT_STEPS.flatMap((st) => st.fields);

const importVisibleFields = (values) =>
  IMPORT_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission. */
function validateImport(fields, values) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    const raw = values[fd.name];
    const v = typeof raw === "string" ? raw.trim() : "";
    const isChoice = fd.type === "radio" || fd.type === "select";
    if (!v) {
      if (fd.required) errors[fd.name] = isChoice ? "Please choose an option." : "This field is required.";
      return;
    }
    if (isChoice && !fd.options.includes(raw)) errors[fd.name] = "Please choose an option.";
    else if (fd.type === "email" && !EMAIL_RE.test(v)) errors[fd.name] = "Enter a valid email address.";
    else if (fd.type === "tel" && v.replace(/\D/g, "").length < 7) errors[fd.name] = "Enter a valid phone number.";
  });
  return errors;
}

/* Builds the payload from the VISIBLE answers only. Every key is always present.
   asked: false -> not shown; value: null -> shown but left blank (optional fields). */
function buildImportPayload(values, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(importVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  IMPORT_ALL_FIELDS.forEach((fd) => {
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    companyName: answers.companyName.value,
    contactName: answers.contactName.value,
    phone: answers.phone.value,
    whatsapp: answers.whatsapp.value,
    email: answers.email.value,
  };
  const who = [customer.companyName, customer.contactName].filter(Boolean).join(" / ").replace(/\s+/g, " ");
  const direction = IMPORT_DIRECTION_OPTIONS.find((o) => o.label === values.tradeDirection);
  return {
    form: { id: IMPORT_FORM_ID, number: IMPORT_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: { to: QUOTES_TO, subject: `${IMPORT_SUBJECT_PREFIX}${who}` },
    branch: direction ? direction.code : null,
    customer,
    answers,
    // The specification has no upload field, so nothing is attached.
    attachments: [],
  };
}

const makeImportReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitImportQuote(payload) {
  if (!IMPORT_SUBMIT_ENDPOINT) {
    console.error("Import/Export request NOT sent: IMPORT_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(IMPORT_SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const confirmed =
      res.ok && data && typeof data === "object" && !data.error && data.ok !== false && data.success !== false;
    return confirmed ? { ok: true } : { ok: false, reason: `http-${res.status}` };
  } catch {
    return { ok: false, reason: "network" };
  }
}
/* IMPORT-LOGIC-END */

export default function ImportExportForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // clicks on Submit before this time are ignored (SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = IMPORT_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(importVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value }));
    setSendFailed(false);
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name && stillVisible.has(k)))
    );
  };

  useEffect(() => {
    if (current > 0) headingRef.current?.focus();
  }, [current]);

  // Whenever Submit becomes the visible action, ignore any click already in flight
  useEffect(() => {
    if (isLast) submitArmedAt.current = Date.now() + SUBMIT_CLICK_GUARD_MS;
  }, [isLast, current]);

  useEffect(() => {
    if (sendFailed) formRef.current?.querySelector("[data-send-error]")?.scrollIntoView({ block: "center" });
  }, [sendFailed]);

  const focusFirstError = (found) => {
    const first = Object.keys(found)[0];
    window.setTimeout(() => {
      const el =
        document.getElementById(`${formId}-${first}`) || formRef.current?.querySelector(`input[name="${first}"]`);
      if (el) el.focus();
      else formRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: "center" });
    }, 0);
  };

  const requestClose = () => {
    if (!submittingRef.current) onClose(); // never close while a send is in flight
  };

  const handleNext = () => {
    if (isLast || submittingRef.current) return;
    const found = validateImport(steps[current].fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    setStep(Math.min(current + 1, lastStep));
  };

  const handlePrevious = () => {
    if (submittingRef.current) return;
    setErrors({});
    setStep(Math.max(current - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Pressing Enter on an earlier step advances the wizard instead of submitting
    if (!isLast) {
      handleNext();
      return;
    }
    if (submittingRef.current) return;

    const honeypot = new FormData(e.currentTarget).get("website");
    const found = validateImport(importVisibleFields(values), values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // If an earlier step holds the problem, take the person back to it
      const badStep = steps.findIndex((st) => st.fields.some((fd) => found[fd.name]));
      if (badStep !== -1 && badStep !== current) {
        setStep(badStep);
        return;
      }
      focusFirstError(found);
      return;
    }
    if (honeypot) {
      setSendFailed(true); // bots only: nothing is sent, and a real person is never told it worked
      return;
    }

    if (!referenceRef.current) referenceRef.current = makeImportReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result = { ok: false };
    try {
      result = await submitImportQuote(buildImportPayload(values, reference));
    } catch {
      result = { ok: false };
    }
    if (result.ok) {
      onSent({ reference }); // the existing Thank You modal: only after the server confirmed
      return;
    }
    submittingRef.current = false;
    setSending(false);
    setSendFailed(true);
  };

  return (
    <ModalShell onClose={requestClose} titleId={`${formId}-title`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Quote Request · Form {String(service.num).padStart(2, "0")}
          </span>
          <h2 id={`${formId}-title`} className="mt-1 font-serif text-2xl font-bold text-[#0A2540]">
            {service.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close quote form"
          className="-mr-2 shrink-0 p-2 text-slate-500 hover:text-[#D9232D]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-6 py-6 sm:px-8">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
              Step {current + 1} of {steps.length}
            </span>
            <span
              ref={headingRef}
              tabIndex={-1}
              className="font-serif text-lg font-bold text-[#0A2540] outline-none"
            >
              {steps[current].title}
            </span>
          </div>
          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={current + 1}
            aria-label={`Step ${current + 1} of ${steps.length}: ${steps[current].title}`}
          >
            {steps.map((st, i) => (
              <span
                key={st.title}
                aria-hidden="true"
                className={`h-1 flex-1 transition-colors ${i <= current ? "bg-[#D9232D]" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>

        <div key={current} className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {steps[current].fields
            .filter((fd) => isVisible(fd, values))
            .map((fd) => (
              <FadeIn key={fd.name} className={fd.wide || WIDE_TYPES.includes(fd.type) ? "sm:col-span-2" : ""}>
                <Field
                  field={fd}
                  formId={formId}
                  values={values}
                  setValue={setValue}
                  errors={errors}
                  files={[]}
                  setFiles={() => {}}
                />
                {fd.hint && fd.type !== "textarea" && (
                  <p className="mt-1.5 font-sans text-xs text-slate-500">{fd.hint}</p>
                )}
              </FadeIn>
            ))}
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]">
            Please correct the highlighted fields and {!isLast ? "continue" : "submit again"}.
          </p>
        )}

        {sendFailed && (
          <div
            data-send-error
            role="alert"
            className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]"
          >
            <p>
              We could not send your request just now. Your answers are still here, so you can try again. If this
              keeps happening, please call one of our hotlines:
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
              {HOTLINES.map((h) => (
                <a key={h.tel} href={`tel:${h.tel}`} className="underline underline-offset-2">
                  {h.label}
                </a>
              ))}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-sans text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#0A2540]" aria-hidden="true" />
            Your request is sent securely to our quotations desk.
          </p>
          <div className="flex gap-3">
            {current === 0 ? (
              <button
                type="button"
                onClick={requestClose}
                className="border border-slate-300 px-5 py-3 font-sans text-sm font-semibold text-slate-600 transition-colors hover:border-[#0A2540] hover:text-[#0A2540]"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={sending}
                className="inline-flex items-center gap-2 border border-slate-300 px-5 py-3 font-sans text-sm font-semibold text-slate-600 transition-colors hover:border-[#0A2540] hover:text-[#0A2540] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
            )}
            {!isLast ? (
              <button
                key="import-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="import-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : IMPORT_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}