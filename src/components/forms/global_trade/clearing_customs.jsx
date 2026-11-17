// src/components/forms/global_trade/clearing_customs.jsx
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
   Clearing & Customs Brokerage: Request Form (Form 03)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   ========================================================================== */

/* CUSTOMS-LOGIC-START (pure logic: no JSX) */
const CUSTOMS_FORM_ID = "clearing-customs-brokerage-request";
const CUSTOMS_FORM_NUMBER = 3;
const CUSTOMS_SUBMIT_LABEL = "Submit Clearing Request";
const CUSTOMS_SUBJECT_PREFIX = "[New Clearing & Customs Request] \u2013 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const CUSTOMS_SUBMIT_ENDPOINT = "/api/submit-quote";

const CUSTOMS_MAX_FILES = 5;
const CUSTOMS_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const CUSTOMS_CLIENT_TYPE_OPTIONS = [
  { code: "direct_importer", label: "Direct Importer" },
  { code: "third_party_agent", label: "Third-Party Agent" },
  { code: "referrer", label: "Referrer" },
];
const CUSTOMS_REGIME_OPTIONS = [
  { code: "import_clearance", label: "Import Clearance" },
  { code: "export_clearance", label: "Export Clearance" },
];
const CUSTOMS_METHOD_OPTIONS = [
  { code: "air_freight", label: "Air Freight" },
  { code: "ocean_freight", label: "Ocean Freight" },
];
const CUSTOMS_SCOPE_OPTIONS = [
  { code: "port_to_door", label: "Port to Door" },
  { code: "door_to_door", label: "Door to Door" },
  { code: "door_to_port", label: "Door to Port" },
];
const CUSTOMS_PORT_OTHER = { code: "others", label: "Others" };
const CUSTOMS_PORT_OPTIONS = [
  { code: "onne_port_ph", label: "Onne Port [PH]" },
  { code: "apapa_port_lagos", label: "Apapa Port [Lagos]" },
  { code: "tin_can_port_lagos", label: "Tin Can Port [Lagos]" },
  { code: "cotonou_port_benin", label: "Cotonou Port [Benin]" },
  { code: "lome_port_togo", label: "Lome Port [Togo]" },
  { code: "ph_airport", label: "PH Airport" },
  { code: "lagos_airport", label: "Lagos Airport" },
  CUSTOMS_PORT_OTHER,
];
const CUSTOMS_SHIPMENT_TYPE_OPTIONS = [
  { code: "container_20ft", label: "20ft Container" },
  { code: "container_40ft", label: "40ft Container" },
  { code: "lcl_groupage", label: "LCL/Groupage" },
  { code: "roro_vehicle", label: "RORO Vehicle" },
  { code: "air_cargo", label: "Air Cargo" },
];

const customsLabels = (opts) => opts.map((o) => o.label);
const customsChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, customsLabels(opts), { codes: opts, ...x });

/* Conditions (shared isVisible()). The port details block only shows when "Others" is chosen. */
const CUSTOMS_PORT_IS_OTHER = { field: "port", equals: CUSTOMS_PORT_OTHER.label };

const CUSTOMS_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("importerName", "Importer Name / Company Name", { required: true, autoComplete: "organization" }),
      customsChoice(radio, "clientType", "Client Types", CUSTOMS_CLIENT_TYPE_OPTIONS),
      customsChoice(radio, "customsRegime", "Customs Declaration Regime", CUSTOMS_REGIME_OPTIONS),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
    ],
  },
  {
    title: "Shipping Details",
    fields: [
      customsChoice(radio, "shippingMethod", "Shipping Method", CUSTOMS_METHOD_OPTIONS),
      customsChoice(select, "serviceScope", "Service Scope / Delivery Mode", CUSTOMS_SCOPE_OPTIONS, {
        required: false,
        wide: true,
      }),
      customsChoice(select, "port", "Port of Arrival/Departure", CUSTOMS_PORT_OPTIONS, { wide: true }),
      area("portOther", "Please Specify Your Port of Arrival/Departure", {
        required: true,
        showIf: [CUSTOMS_PORT_IS_OTHER],
      }),
      customsChoice(select, "shipmentType", "Shipment Type", CUSTOMS_SHIPMENT_TYPE_OPTIONS, {
        required: false,
        wide: true,
      }),
    ],
  },
  {
    title: "Cargo & Documents",
    fields: [
      text("goodsDescription", "Description of Goods", { required: true, wide: true }),
      text("country", "Country of Export/Destination Country", { required: true, wide: true }),
      { name: "arrivalDate", label: "Estimated Date of Port Arrival", type: "date" },
      {
        name: "documents",
        label: "Document Upload",
        type: "file",
        multiple: true,
        maxFiles: CUSTOMS_MAX_FILES,
        maxTotalMB: 25,
        hint: "(Maximum 5 Files; 25MB)",
      },
      area("comments", "Additional Comment"),
    ],
  },
];
const CUSTOMS_ALL_FIELDS = CUSTOMS_STEPS.flatMap((st) => st.fields);

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const customsVisibleFields = (values) =>
  CUSTOMS_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission.
   Files are checked against the 5-file / 25MB limits. */
function validateCustoms(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "file") {
      const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
      if (files.length > CUSTOMS_MAX_FILES) errors[fd.name] = "You can upload a maximum of 5 files.";
      else if (total > CUSTOMS_MAX_TOTAL_BYTES) errors[fd.name] = "Files must total 25MB or less.";
      return;
    }
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

/* Builds the payload from the VISIBLE answers only. Values typed into a field that is now hidden
   stay in the form but are never sent. Every key is always present.
   asked: false -> not shown; value: null -> shown but left blank (optional fields). */
function buildCustomsPayload(values, files, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(customsVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  CUSTOMS_ALL_FIELDS.forEach((fd) => {
    if (fd.type === "file") return; // files travel in `attachments`
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    importerName: answers.importerName.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const regime = CUSTOMS_REGIME_OPTIONS.find((o) => o.label === values.customsRegime);
  return {
    form: { id: CUSTOMS_FORM_ID, number: CUSTOMS_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: {
      to: QUOTES_TO,
      subject: `${CUSTOMS_SUBJECT_PREFIX}${(customer.importerName || "").replace(/\s+/g, " ")}`,
    },
    branch: regime ? regime.code : null,
    customer,
    answers,
    // File metadata only. Replace with uploaded-object entries when the upload-URL workflow is connected.
    attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
  };
}

const makeCustomsReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitCustomsQuote(payload) {
  if (!CUSTOMS_SUBMIT_ENDPOINT) {
    console.error("Clearing & customs request NOT sent: CUSTOMS_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(CUSTOMS_SUBMIT_ENDPOINT, {
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
/* CUSTOMS-LOGIC-END */

export default function ClearingCustomsForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // clicks on Submit before this time are ignored (SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({});
  const [files, setFilesState] = useState([]);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = CUSTOMS_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(customsVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value })); // answers are kept, even for fields that just got hidden
    setSendFailed(false);
    // Drop this field's own error and any error that belongs to a field that is no longer shown
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name && stillVisible.has(k)))
    );
  };

  const setFiles = (nextFiles) => {
    const resolved = typeof nextFiles === "function" ? nextFiles(files) : nextFiles;
    setFilesState(Array.from(resolved || []));
    setSendFailed(false);
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== "documents")));
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
    const found = validateCustoms(steps[current].fields, values, files);
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
    const found = validateCustoms(customsVisibleFields(values), values, files);
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

    if (!referenceRef.current) referenceRef.current = makeCustomsReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitCustomsQuote(buildCustomsPayload(values, files, reference));
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
                  files={files}
                  setFiles={setFiles}
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
                key="customs-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="customs-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : CUSTOMS_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}