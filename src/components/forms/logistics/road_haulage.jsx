// src/components/forms/logistics/road_haulage.jsx
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

/* Today's date as YYYY-MM-DD in the visitor's local time (used to block past pickup dates). */
const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ==========================================================================
   Road Haulage & Industrial Logistics: Request Form (Form 06)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   ========================================================================== */

/* HAULAGE-LOGIC-START (pure logic: no JSX) */
const HAULAGE_FORM_ID = "road-haulage-industrial-logistics-request";
const HAULAGE_FORM_NUMBER = 6;
const HAULAGE_SUBMIT_LABEL = "Submit Haulage Request";
const HAULAGE_SUBJECT_PREFIX = "[New Road Haulage Request] \u2013 ";

/* Phone starts with the Nigerian country code; the person completes the number. */
const HAULAGE_PHONE_DEFAULT = "+234 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const HAULAGE_SUBMIT_ENDPOINT = "";

const HAULAGE_CLIENT_TYPE_OPTIONS = [
  { code: "corporate_client", label: "Corporate Client" },
  { code: "small_business_sme", label: "Small Business (SME)" },
  { code: "individual", label: "Individual" },
];
const HAULAGE_CARGO_OPTIONS = [
  { code: "containerized", label: "Containerized" },
  { code: "heavy_industrial_machinery", label: "Heavy Industrial Machinery" },
  { code: "loose_palletized_goods", label: "Loose Palletized Goods" },
  { code: "dredging_pipes_hoses", label: "Dredging Pipes, Hoses and Pipes" },
  { code: "raw_materials_project_cargo", label: "Raw Manufacturing Materials / Project Cargo" },
  { code: "fmcg_general_retail", label: "FMCG / General Retail Merchandise" },
  { code: "others", label: "Others" },
];
const HAULAGE_YES_NO = [
  { code: "yes", label: "Yes" },
  { code: "no", label: "No" },
];
const HAULAGE_FLEET_OPTIONS = [
  { code: "flatbed_20ft", label: "20ft Flatbed" },
  { code: "flatbed_40ft", label: "40ft Flatbed" },
  { code: "lowbed_trailer", label: "Lowbed Trailer" },
  { code: "box_truck", label: "Box Truck (5-Ton / 10-Ton enclosed)" },
  { code: "tipper_dump_truck", label: "Tipper Truck / Dump Truck" },
  { code: "not_sure_site_assessment", label: "Not Sure (Request Elmivet Site Assessment)" },
];
const HAULAGE_WINDOW_OPTIONS = [
  { code: "morning", label: "Morning (8 AM \u2013 12 PM)" },
  { code: "afternoon", label: "Afternoon (12 PM \u2013 4 PM)" },
  { code: "evening", label: "Evening (4 PM \u2013 7 PM)" },
];
const HAULAGE_FREQUENCY_OPTIONS = [
  { code: "one_off", label: "One-off supply" },
  { code: "weekly", label: "Weekly" },
  { code: "monthly", label: "Monthly" },
  { code: "quarterly", label: "Quarterly" },
];

const haulageLabels = (opts) => opts.map((o) => o.label);
const haulageChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, haulageLabels(opts), { codes: opts, ...x });

const HAULAGE_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("clientName", "Client Name", {
        required: true,
        placeholder: "Enter Company\u2019s Name or Full Names",
        autoComplete: "name",
      }),
      haulageChoice(radio, "clientType", "Client Type", HAULAGE_CLIENT_TYPE_OPTIONS),
      text("rcNumber", "RC Number / Business Registration Number", {
        wide: true,
        hint: "(For corporate vetting)",
      }),
      text("contactPerson", "Contact Person Full Name", { autoComplete: "name" }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
    ],
  },
  {
    title: "Route & Cargo",
    fields: [
      text("pickupAddress", "Exact Pickup Location Address", {
        required: true,
        wide: true,
        hint: "(Street, Landmark, City, State)",
      }),
      area("deliveryAddress", "Exact Delivery Destination Address", { required: true }),
      haulageChoice(select, "cargoType", "Type of Cargo to Move", HAULAGE_CARGO_OPTIONS, { wide: true }),
      { name: "weightTons", label: "Total Estimated Weight of Load (Tons)", type: "number", min: 0, step: "any" },
      haulageChoice(radio, "hazmat", "Are the goods hazardous or flammable (HAZMAT)?", HAULAGE_YES_NO),
    ],
  },
  {
    title: "Fleet & Schedule",
    fields: [
      haulageChoice(select, "fleetType", "Preferred Truck Fleet Type", HAULAGE_FLEET_OPTIONS, { wide: true }),
      { name: "pickupDate", label: "Required Date for Pickup", type: "date", blockPast: true },
      haulageChoice(radio, "pickupWindow", "Preferred Pickup Window", HAULAGE_WINDOW_OPTIONS, { required: false }),
      haulageChoice(radio, "escortRequired", "Is Escort / Security Coordination Required?", HAULAGE_YES_NO),
      haulageChoice(radio, "frequency", "Estimated Frequency", HAULAGE_FREQUENCY_OPTIONS, { required: false }),
      area("comments", "Additional Comment"),
    ],
  },
];
const HAULAGE_ALL_FIELDS = HAULAGE_STEPS.flatMap((st) => st.fields);

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const haulageVisibleFields = (values) =>
  HAULAGE_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission. */
function validateHaulage(fields, values) {
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
    else if (fd.type === "number" && !(Number(v) > 0)) errors[fd.name] = "Enter a valid number.";
    else if (fd.type === "date" && fd.blockPast && v < todayISO()) errors[fd.name] = "Pickup date cannot be in the past.";
  });
  return errors;
}

/* Builds the payload from the VISIBLE answers only. Every key is always present.
   asked: false -> not shown; value: null -> shown but left blank (optional fields). */
function buildHaulagePayload(values, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(haulageVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  HAULAGE_ALL_FIELDS.forEach((fd) => {
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    clientName: answers.clientName.value,
    contactPerson: answers.contactPerson.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const cargo = HAULAGE_CARGO_OPTIONS.find((o) => o.label === values.cargoType);
  return {
    form: { id: HAULAGE_FORM_ID, number: HAULAGE_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: {
      to: QUOTES_TO,
      subject: `${HAULAGE_SUBJECT_PREFIX}${(customer.clientName || "").replace(/\s+/g, " ")}`,
    },
    branch: cargo ? cargo.code : null,
    customer,
    answers,
    // The specification has no upload field, so nothing is attached.
    attachments: [],
  };
}

const makeHaulageReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitHaulageQuote(payload) {
  if (!HAULAGE_SUBMIT_ENDPOINT) {
    console.error("Road haulage request NOT sent: HAULAGE_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(HAULAGE_SUBMIT_ENDPOINT, {
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
/* HAULAGE-LOGIC-END */

export default function RoadHaulageForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // clicks on Submit before this time are ignored (SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({ phone: HAULAGE_PHONE_DEFAULT });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = HAULAGE_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(haulageVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value })); // answers are kept, even for fields that just got hidden
    setSendFailed(false);
    // Drop this field's own error and any error that belongs to a field that is no longer shown
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
    const found = validateHaulage(steps[current].fields, values);
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
    const found = validateHaulage(haulageVisibleFields(values), values);
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

    if (!referenceRef.current) referenceRef.current = makeHaulageReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result = { ok: false };
    try {
      result = await submitHaulageQuote(buildHaulagePayload(values, reference));
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
                  field={fd.blockPast ? { ...fd, min: todayISO() } : fd}
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
                key="haulage-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="haulage-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : HAULAGE_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}