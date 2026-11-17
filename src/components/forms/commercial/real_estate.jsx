// src/components/forms/commercial/real_estate.jsx
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
   Real Estate & Project Request: Request Form (Form 11)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   NOTE: this form has two upload fields with different limits, so files are kept per field name
   ({ [fieldName]: File[] }) and each Field instance gets its own list and setter.
   ========================================================================== */

/* REALESTATE-LOGIC-START (pure logic: no JSX) */
const REALESTATE_FORM_ID = "real-estate-project-request";
const REALESTATE_FORM_NUMBER = 11;
const REALESTATE_SUBMIT_LABEL = "Submit Project Request";
const REALESTATE_SUBJECT_PREFIX = "[New Real Estate Request] \u2013 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const REALESTATE_SUBMIT_ENDPOINT = "";

const REALESTATE_ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];
const MB = 1024 * 1024;

const REALESTATE_BROKER = { code: "mandate_broker_facilitator", label: "Authorized Mandate, Broker or Facilitator" };
const REALESTATE_CLIENT_TYPE_OPTIONS = [
  { code: "individual_private_investor", label: "Individual/Private Investor" },
  { code: "corporate_entity", label: "Corporate Entity" },
  { code: "government_public_sector", label: "Government/Public Sector" },
  { code: "developer", label: "Developer" },
  { code: "joint_venture_partner", label: "Joint Venture Partner" },
  REALESTATE_BROKER,
];
const REALESTATE_REPRESENTING_OPTIONS = [
  { code: "buyer_investor", label: "Buyer/Investor" },
  { code: "seller_property_owner", label: "Seller/Property Owner" },
];
const REALESTATE_SERVICE_OPTIONS = [
  { code: "property_acquisition", label: "Property Acquisition" },
  { code: "property_sale", label: "Property Sale" },
  { code: "real_estate_development", label: "Real Estate Development" },
  { code: "rental_leasing", label: "Property Rental/Leasing" },
  { code: "project_management_supervision", label: "Project Management/Supervision" },
  { code: "joint_venture_evaluation", label: "Joint Venture Evaluation" },
];
const REALESTATE_PROPERTY_OPTIONS = [
  { code: "residential_land", label: "Residential Land" },
  { code: "commercial_space", label: "Commercial Space" },
  { code: "warehousing_industrial_land", label: "Warehousing/Industrial Land" },
  { code: "luxury_apartments", label: "Luxury Apartments" },
  { code: "empty_land_plots", label: "Empty Land Plots" },
  { code: "others", label: "Others" },
];
const REALESTATE_LOCATION_OPTIONS = [
  { code: "nigeria", label: "Nigeria" },
  { code: "off_shore_investment", label: "Off-Shore Investment" },
];

const realEstateLabels = (opts) => opts.map((o) => o.label);
const realEstateChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, realEstateLabels(opts), { codes: opts, ...x });

/* Conditions (shared isVisible()): the two representation fields only show for the broker route. */
const REALESTATE_IS_BROKER = { field: "clientType", equals: REALESTATE_BROKER.label };

const REALESTATE_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("clientName", "Client Name", {
        required: true,
        placeholder: "Enter Company\u2019s Name or Full Names",
        autoComplete: "name",
      }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
      realEstateChoice(radio, "clientType", "Client Type", REALESTATE_CLIENT_TYPE_OPTIONS),
      realEstateChoice(radio, "representing", "Who are you representing?", REALESTATE_REPRESENTING_OPTIONS, {
        showIf: [REALESTATE_IS_BROKER],
      }),
      {
        name: "mandateLetter",
        label: "Upload Letter of Mandate/Proof of Authority",
        type: "file",
        required: true,
        multiple: false,
        accept: ".pdf,.jpg,.jpeg,.png",
        maxFiles: 1,
        maxFileMB: 5,
        hint: "(PDF/Image, Max 5MB)",
        showIf: [REALESTATE_IS_BROKER],
      },
    ],
  },
  {
    title: "Project Details",
    fields: [
      realEstateChoice(select, "serviceCategory", "Service Category", REALESTATE_SERVICE_OPTIONS, { wide: true }),
      realEstateChoice(select, "propertyType", "Property Type", REALESTATE_PROPERTY_OPTIONS, { wide: true }),
      text("targetLocation", "Target Location", { required: true, wide: true }),
      text("budget", "Estimated Project/Investment Budget", { wide: true }),
      area("projectBrief", "Project Brief & Scope of Work"),
      realEstateChoice(radio, "preferredLocation", "Preferred Property Location", REALESTATE_LOCATION_OPTIONS),
    ],
  },
  {
    title: "Documents & Comments",
    fields: [
      {
        name: "siteDocuments",
        label: "Upload Site Survey or Briefing Documents",
        type: "file",
        multiple: true,
        accept: ".pdf,.jpg,.jpeg,.png",
        maxFiles: 5,
        maxFileMB: 10,
        hint: "(PDF/Image, Max 10MB)",
      },
      area("comments", "Additional Comment"),
    ],
  },
];
const REALESTATE_ALL_FIELDS = REALESTATE_STEPS.flatMap((st) => st.fields);

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const realEstateVisibleFields = (values) =>
  REALESTATE_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission.
   `files` is { [fieldName]: File[] }; each file field has its own count, size and type limits. */
function validateRealEstate(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "file") {
      const list = files[fd.name] || [];
      const badType = list.some(
        (f) => !REALESTATE_ALLOWED_EXT.includes(String(f.name || "").split(".").pop().toLowerCase())
      );
      if (fd.required && list.length === 0) errors[fd.name] = "Please upload this document.";
      else if (list.length > fd.maxFiles) errors[fd.name] = `You can upload a maximum of ${fd.maxFiles} file${fd.maxFiles > 1 ? "s" : ""}.`;
      else if (badType) errors[fd.name] = "Only PDF or image files (JPG, PNG) are accepted.";
      else if (list.some((f) => (f.size || 0) > fd.maxFileMB * MB)) errors[fd.name] = `Each file must be ${fd.maxFileMB}MB or less.`;
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

/* Builds the payload from the VISIBLE answers only. Every key is always present.
   asked: false -> not shown; value: null -> shown but left blank (optional fields).
   Files of a hidden upload field are never listed. */
function buildRealEstatePayload(values, files, reference, submittedAt = new Date().toISOString()) {
  const visibleFields = realEstateVisibleFields(values);
  const visible = new Set(visibleFields.map((fd) => fd.name));
  const answers = {};
  REALESTATE_ALL_FIELDS.forEach((fd) => {
    if (fd.type === "file") return; // files travel in `attachments`
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    clientName: answers.clientName.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const clientType = REALESTATE_CLIENT_TYPE_OPTIONS.find((o) => o.label === values.clientType);
  // File metadata only. Replace with uploaded-object entries when the upload-URL workflow is connected.
  const attachments = visibleFields
    .filter((fd) => fd.type === "file")
    .flatMap((fd) =>
      (files[fd.name] || []).map((f) => ({ field: fd.name, name: f.name, size: f.size, type: f.type }))
    );
  return {
    form: { id: REALESTATE_FORM_ID, number: REALESTATE_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: {
      to: QUOTES_TO,
      subject: `${REALESTATE_SUBJECT_PREFIX}${(customer.clientName || "").replace(/\s+/g, " ")}`,
    },
    branch: clientType ? clientType.code : null,
    customer,
    answers,
    attachments,
  };
}

const makeRealEstateReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitRealEstateQuote(payload) {
  if (!REALESTATE_SUBMIT_ENDPOINT) {
    console.error("Real estate request NOT sent: REALESTATE_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(REALESTATE_SUBMIT_ENDPOINT, {
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
/* REALESTATE-LOGIC-END */

export default function RealEstateForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // clicks on Submit before this time are ignored (SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({});
  const [files, setFilesState] = useState({}); // { [fieldName]: File[] }
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = REALESTATE_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(realEstateVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value })); // answers are kept, even for fields that just got hidden
    setSendFailed(false);
    // Drop this field's own error and any error that belongs to a field that is no longer shown
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name && stillVisible.has(k)))
    );
  };

  const setFilesFor = (name, nextFiles) => {
    setFilesState((prev) => {
      const resolved = typeof nextFiles === "function" ? nextFiles(prev[name] || []) : nextFiles;
      return { ...prev, [name]: Array.from(resolved || []) };
    });
    setSendFailed(false);
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name)));
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
    const found = validateRealEstate(steps[current].fields, values, files);
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
    const found = validateRealEstate(realEstateVisibleFields(values), values, files);
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

    if (!referenceRef.current) referenceRef.current = makeRealEstateReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitRealEstateQuote(buildRealEstatePayload(values, files, reference));
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
                  files={files[fd.name] || []}
                  setFiles={(next) => setFilesFor(fd.name, next)}
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
                key="realestate-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="realestate-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : REALESTATE_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}