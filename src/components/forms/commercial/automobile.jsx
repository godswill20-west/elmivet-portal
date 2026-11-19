// src/components/forms/commercial/automobile.jsx
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
import { uploadQuoteFiles, fileSetSignature } from "../shared/quoteFileUpload";

const QUOTES_TO = "quotes@elmivet.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (name, label, x = {}) => ({ name, label, type: "text", ...x });
const area = (name, label, x = {}) => ({ name, label, type: "textarea", ...x });
const select = (name, label, options, x = {}) => ({
  name,
  label,
  type: "select",
  options,
  required: true,
  ...x,
});
const checkbox = (name, label, options, x = {}) => ({
  name,
  label,
  type: "checkbox",
  options,
  required: true,
  ...x,
});
const isVisible = (field, values) =>
  [].concat(field.showIf || []).every((c) => values[c.field] === c.equals);

/* ==========================================================================
   Automobile Dealership & Importation: Request Form (Form 10)
   Same structure as ChinaQuoteForm: own modal, shared primitives, and success is only
   reported after the server confirms it (no mock submit).
   NOTE: the checkbox fields assume the shared Field renders type "checkbox" from `options`
   and stores the selected labels as an array via setValue(name, array).
   ========================================================================== */

/* AUTOMOBILE-LOGIC-START (pure logic: no JSX) */
const AUTOMOBILE_FORM_ID = "automobile-dealership-importation-request";
const AUTOMOBILE_FORM_NUMBER = 10;
const AUTOMOBILE_SUBMIT_LABEL = "Submit Vehicle Request";
const AUTOMOBILE_SUBJECT_PREFIX = "[New Automobile Request] \u2013 ";

/* Set to the real server endpoint when it exists. While empty, the form refuses to claim success. */
const AUTOMOBILE_SUBMIT_ENDPOINT = "/api/submit-quote";
const AUTOMOBILE_UPLOAD_FAILED_MESSAGE = "We could not upload your files. Please try again.";

const AUTOMOBILE_MAX_FILES = 5;
const AUTOMOBILE_MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const AUTOMOBILE_ALLOWED_EXT = ["jpg", "jpeg", "png", "pdf"];

const AUTOMOBILE_PURPOSE_OPTIONS = [
  { code: "buy_in_nigeria", label: "Buy a Car in Nigeria" },
  { code: "direct_importation", label: "Direct Importation" },
  { code: "trade_in_swap", label: "Trade-In / Swap My Car" },
  { code: "sell_consign", label: "Sell / Consign My Car" },
  { code: "clearing_logistics_only", label: "Clearing & Logistics Only" },
];
const AUTOMOBILE_CONDITION_OPTIONS = [
  { code: "brand_new", label: "Brand New" },
  { code: "foreign_used_tokunbo", label: "Foreign Used [Tokunbo]" },
  { code: "direct_nigerian_used", label: "Direct Nigerian Used" },
  { code: "auction_salvage", label: "Auction Salvage" },
];
const AUTOMOBILE_SCOPE_OPTIONS = [
  { code: "local_inventory", label: "Buy from Local Inventory" },
  { code: "direct_import_clearing", label: "Direct Import & Clearing" },
  { code: "clearing_duty_only", label: "Clearing & Duty Settlement Only" },
];
/* One checkbox group: transmission (Automatic / Manual) and engine type (4-Cylinder ... Electric). */
const AUTOMOBILE_TRANSMISSION_ENGINE_OPTIONS = [
  { code: "automatic", label: "Automatic" },
  { code: "manual", label: "Manual" },
  { code: "four_cylinder", label: "4-Cylinder" },
  { code: "v6", label: "V6" },
  { code: "v8", label: "V8" },
  { code: "hybrid", label: "Hybrid" },
  { code: "electric", label: "Electric" },
];
const AUTOMOBILE_FINANCING_OPTIONS = [
  { code: "outright_payment", label: "Outright Full Payment" },
  { code: "staged_import_financing", label: "Staged Import Financing" },
  { code: "installment_fleet_facility", label: "Installment / Corporate Fleet Facility" },
];

const automobileLabels = (opts) => opts.map((o) => o.label);
const automobileChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, automobileLabels(opts), { codes: opts, ...x });

const AUTOMOBILE_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("clientName", "Client Name", {
        required: true,
        placeholder: "Enter Your Company\u2019s Name or Full Names",
        autoComplete: "name",
      }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
    ],
  },
  {
    title: "Service & Vehicle",
    fields: [
      automobileChoice(select, "servicePurpose", "Service Purpose", AUTOMOBILE_PURPOSE_OPTIONS, { wide: true }),
      text("makeModel", "Vehicle Make & Model", { required: true, wide: true }),
      text("yearRange", "Year of Manufacture", { required: true, hint: "(Preferred Year Range)" }),
      automobileChoice(checkbox, "vehicleCondition", "Vehicle Condition", AUTOMOBILE_CONDITION_OPTIONS),
    ],
  },
  {
    title: "Specification & Budget",
    fields: [
      automobileChoice(select, "purchaseScope", "Purchase Scope", AUTOMOBILE_SCOPE_OPTIONS, {
        required: false,
        wide: true,
      }),
      text("budget", "Target Budget Allocation", { required: true, wide: true }),
      automobileChoice(
        checkbox,
        "transmissionEngine",
        "Preferred Transmission & Engine Type",
        AUTOMOBILE_TRANSMISSION_ENGINE_OPTIONS
      ),
      text("features", "Key, Customized Features and Colour Preference", { wide: true }),
      automobileChoice(select, "financingOption", "Financing Option", AUTOMOBILE_FINANCING_OPTIONS, {
        required: false,
        wide: true,
      }),
    ],
  },
  {
    title: "Trade-In, Auction & Delivery",
    fields: [
      text("mileage", "Current Mileage / Odometer Reading", { wide: true, hint: "(For Trade-In & Sellers)" }),
      area("mechanicalHistory", "Vehicle Mechanical Condition & History", { hint: "(For Trade-In & Sellers)" }),
      text("auctionLot", "Auction Lot Number"),
      text("purchaseCountry", "Country of Purchase"),
      text("deliveryDestination", "Final Delivery Destination in Nigeria", { wide: true }),
    ],
  },
  {
    title: "Media & Comments",
    fields: [
      {
        name: "documents",
        label: "Upload Media / Documents",
        type: "file",
        multiple: true,
        accept: ".jpg,.jpeg,.png,.pdf",
        maxFiles: AUTOMOBILE_MAX_FILES,
        maxTotalMB: 25,
        hint: "(JPG, PNG, PDF \u2013 Maximum 5 documents or images, 25MB)",
      },
      area("comments", "Additional Comment"),
    ],
  },
];
const AUTOMOBILE_ALL_FIELDS = AUTOMOBILE_STEPS.flatMap((st) => st.fields);

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const automobileVisibleFields = (values) =>
  AUTOMOBILE_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission.
   Files are checked against the 5-file / 25MB / JPG-PNG-PDF limits. */
function validateAutomobile(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "file") {
      const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
      const badType = files.some((f) => !AUTOMOBILE_ALLOWED_EXT.includes(String(f.name || "").split(".").pop().toLowerCase()));
      if (files.length > AUTOMOBILE_MAX_FILES) errors[fd.name] = "You can upload a maximum of 5 files.";
      else if (badType) errors[fd.name] = "Only JPG, PNG or PDF files are accepted.";
      else if (total > AUTOMOBILE_MAX_TOTAL_BYTES) errors[fd.name] = "Files must total 25MB or less.";
      return;
    }
    const raw = values[fd.name];
    if (fd.type === "checkbox") {
      const list = Array.isArray(raw) ? raw : [];
      if (list.some((x) => !fd.options.includes(x))) errors[fd.name] = "Please choose a valid option.";
      else if (fd.required && list.length === 0) errors[fd.name] = "Please choose an option.";
      return;
    }
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
   Checkbox answers are sent as arrays (value and code). */
function buildAutomobilePayload(values, attachments, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(automobileVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  AUTOMOBILE_ALL_FIELDS.forEach((fd) => {
    if (fd.type === "file") return; // files travel in `attachments`
    const asked = visible.has(fd.name);
    if (fd.type === "checkbox") {
      const list = asked && Array.isArray(values[fd.name]) ? values[fd.name] : [];
      answers[fd.name] = {
        label: fd.label,
        asked,
        value: list.length ? list : null,
        code: list.length ? list.map((l) => fd.codes.find((o) => o.label === l)?.code ?? null) : null,
      };
      return;
    }
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
  const purpose = AUTOMOBILE_PURPOSE_OPTIONS.find((o) => o.label === values.servicePurpose);
  return {
    form: { id: AUTOMOBILE_FORM_ID, number: AUTOMOBILE_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: {
      to: QUOTES_TO,
      subject: `${AUTOMOBILE_SUBJECT_PREFIX}${(customer.clientName || "").replace(/\s+/g, " ")}`,
    },
    branch: purpose ? purpose.code : null,
    customer,
    answers,
    // Uploaded-object entries only: { path, name, size, type }. `path` is the exact Storage path.
    attachments: attachments.map((a) => ({ path: a.path, name: a.name, size: a.size, type: a.type })),
  };
}

const makeAutomobileReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitAutomobileQuote(payload) {
  if (!AUTOMOBILE_SUBMIT_ENDPOINT) {
    console.error("Automobile request NOT sent: AUTOMOBILE_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(AUTOMOBILE_SUBMIT_ENDPOINT, {
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
    return confirmed
      ? { ok: true, elmReference: typeof data.elmReference === "string" ? data.elmReference.trim() : "" }
      : { ok: false, reason: `http-${res.status}` };
  } catch {
    return { ok: false, reason: "network" };
  }
}
/* AUTOMOBILE-LOGIC-END */

export default function AutomobileForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // clicks on Submit before this time are ignored (SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const uploadedRef = useRef(null); // { reference, signature, attachments }: files already in Storage for this reference
  const [values, setValues] = useState({});
  const [files, setFilesState] = useState([]);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [sendFailMessage, setSendFailMessage] = useState(null); // set only when the upload step failed

  const steps = AUTOMOBILE_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(automobileVisibleFields(next).map((fd) => fd.name));
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
    uploadedRef.current = null; // the selection changed: earlier uploads can no longer be reused
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
    const found = validateAutomobile(steps[current].fields, values, files);
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
    const found = validateAutomobile(automobileVisibleFields(values), values, files);
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

    if (!referenceRef.current) referenceRef.current = makeAutomobileReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    setSendFailMessage(null);

    // 1) Upload the real files first. If this fails the quote is NOT submitted and no Thank You is shown.
    let attachments = [];
    if (files.length > 0) {
      const signature = fileSetSignature(files);
      if (
        uploadedRef.current &&
        uploadedRef.current.reference === reference &&
        uploadedRef.current.signature === signature
      ) {
        attachments = uploadedRef.current.attachments; // unchanged files already uploaded: reuse on retry
      } else {
        try {
          attachments = await uploadQuoteFiles({
            reference,
            formNumber: AUTOMOBILE_FORM_NUMBER,
            files,
          });
          uploadedRef.current = { reference, signature, attachments };
        } catch (err) {
          uploadedRef.current = null;
          submittingRef.current = false;
          setSending(false);
          setSendFailMessage((err && err.userMessage) || AUTOMOBILE_UPLOAD_FAILED_MESSAGE);
          setSendFailed(true);
          return;
        }
      }
    }

    // 2) Submit the quote with the uploaded storage paths, using the same reference as the upload.
    let result;
    try {
      result = await submitAutomobileQuote(buildAutomobilePayload(values, attachments, reference));
    } catch {
      result = { ok: false };
    }
    if (result.ok) {
      onSent({ elmReference: result.elmReference }); // the existing Thank You modal: only after the server confirmed
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
              {sendFailMessage ? `${sendFailMessage} ` : "We could not send your request just now. "}
              Your answers are still here, so you can try again. If this keeps happening, please call one of our
              hotlines:
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
                key="automobile-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="automobile-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : AUTOMOBILE_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}