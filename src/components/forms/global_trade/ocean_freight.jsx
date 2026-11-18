// src/components/forms/global_trade/ocean_freight.jsx
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
   Ocean and Air Freight Forwarding: Freight Forwarding Request (Form 02)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   ========================================================================== */

/* OCEAN-LOGIC-START (pure logic: no JSX) */
const OCEAN_FORM_ID = "ocean-air-freight-forwarding-request";
const OCEAN_FORM_NUMBER = 2;
const OCEAN_SUBMIT_LABEL = "Submit Freight Request";
const OCEAN_SUBJECT_PREFIX = "[New Freight Forwarding Request] \u2013 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const OCEAN_SUBMIT_ENDPOINT = "/api/submit-quote";

const OCEAN_MAX_FILES = 5;
const OCEAN_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const OCEAN_SHIPMENT_TYPE_OPTIONS = [
  { code: "import", label: "Import" },
  { code: "export", label: "Export" },
];
const OCEAN_CLIENT_TYPE_OPTIONS = [
  { code: "corporate_client", label: "Corporate Client" },
  { code: "business_owner", label: "Business Owner" },
  { code: "individual_customer", label: "Individual Customers" },
];
const OCEAN_METHOD_OPTIONS = [
  { code: "air_freight", label: "Air Freight" },
  { code: "ocean_freight", label: "Ocean Freight" },
];
const OCEAN_SCOPE_OPTIONS = [
  { code: "port_to_door", label: "Port to Door" },
  { code: "door_to_door", label: "Door to Door" },
  { code: "door_to_port", label: "Door to Port" },
];

const oceanLabels = (opts) => opts.map((o) => o.label);
const oceanChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, oceanLabels(opts), { codes: opts, ...x });

const OCEAN_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("clientName", "Client Name", {
        required: true,
        placeholder: "Enter Company\u2019s Name or Full Names",
        autoComplete: "name",
      }),
      oceanChoice(radio, "shipmentType", "Shipment Type", OCEAN_SHIPMENT_TYPE_OPTIONS),
      oceanChoice(radio, "clientType", "Client Types", OCEAN_CLIENT_TYPE_OPTIONS),
      { name: "phone", label: "Phone Number (WhatsApp)", type: "tel", required: true, autoComplete: "tel" },
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
    ],
  },
  {
    title: "Shipping Details",
    fields: [
      oceanChoice(radio, "shippingMethod", "Shipping Method", OCEAN_METHOD_OPTIONS),
      oceanChoice(select, "serviceScope", "Service Scope / Delivery Mode", OCEAN_SCOPE_OPTIONS, {
        required: false,
        wide: true,
      }),
      text("originAddress", "Origin Address / City", {
        required: true,
        wide: true,
        hint: "(If Import, please type Origin City or Address. If Export, please type West African location)",
      }),
      text("destinationAddress", "Destination City / Delivery Address", {
        required: true,
        wide: true,
        hint: "(If Import, please type West African location. If Export, please type global delivery address)",
      }),
    ],
  },
  {
    title: "Cargo & Documents",
    fields: [
      { name: "totalWeight", label: "Total Weight (kg)", type: "number", min: 0, step: "any" },
      text("dimensions", "Dimensions / Volume (CBM)"),
      text("goodsDescription", "Description of Goods", { required: true, wide: true }),
      { name: "shippingDate", label: "Estimated Shipping Date", type: "date" },
      {
        name: "documents",
        label: "Document Upload",
        type: "file",
        multiple: true,
        maxFiles: OCEAN_MAX_FILES,
        maxTotalMB: 25,
        hint: "(Maximum 5 files; 25MB)",
      },
      area("comments", "Additional Comment"),
    ],
  },
];
const OCEAN_ALL_FIELDS = OCEAN_STEPS.flatMap((st) => st.fields);

const oceanVisibleFields = (values) =>
  OCEAN_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked. Files are checked against the 5-file / 25MB limits. */
function validateOcean(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "file") {
      const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
      if (files.length > OCEAN_MAX_FILES) errors[fd.name] = "You can upload a maximum of 5 files.";
      else if (total > OCEAN_MAX_TOTAL_BYTES) errors[fd.name] = "Files must total 25MB or less.";
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
    else if (fd.type === "number" && !(Number(v) > 0)) errors[fd.name] = "Enter a valid number.";
  });
  return errors;
}

/* Builds the payload from the VISIBLE answers only. Every key is always present.
   asked: false -> not shown; value: null -> shown but left blank (optional fields). */
function buildOceanPayload(values, files, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(oceanVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  OCEAN_ALL_FIELDS.forEach((fd) => {
    if (fd.type === "file") return; // files travel in `attachments`
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    contactName: answers.clientName.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const method = OCEAN_METHOD_OPTIONS.find((o) => o.label === values.shippingMethod);
  return {
    form: { id: OCEAN_FORM_ID, number: OCEAN_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: {
      to: QUOTES_TO,
      subject: `${OCEAN_SUBJECT_PREFIX}${(customer.clientName || "").replace(/\s+/g, " ")}`,
    },
    branch: method ? method.code : null,
    customer,
    answers,
    // File metadata only. Replace with uploaded-object entries when the upload-URL workflow is connected.
    attachments: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
  };
}

const makeOceanReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitOceanQuote(payload) {
  if (!OCEAN_SUBMIT_ENDPOINT) {
    console.error("Freight request NOT sent: OCEAN_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(OCEAN_SUBMIT_ENDPOINT, {
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
/* OCEAN-LOGIC-END */

export default function OceanFreightForm({ service, onClose, onSent }) {
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

  const steps = OCEAN_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(oceanVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value }));
    setSendFailed(false);
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
    const found = validateOcean(steps[current].fields, values, files);
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
    const found = validateOcean(oceanVisibleFields(values), values, files);
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

    if (!referenceRef.current) referenceRef.current = makeOceanReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitOceanQuote(buildOceanPayload(values, files, reference));
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
                key="ocean-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="ocean-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : OCEAN_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}