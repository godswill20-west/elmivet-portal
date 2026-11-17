import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck, ArrowRight, ArrowLeft } from "lucide-react";
import { ModalShell, Field, FadeIn, HOTLINES, WIDE_TYPES, SUBMIT_CLICK_GUARD_MS } from "../shared/FormPrimitives";

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
   Marine Services: Request a Quote (Form 18)
   Separate form with its own modal. It reuses ModalShell, Field and FadeIn from
   ../shared/FormPrimitives, and only reports success after the server confirms it.
   ========================================================================== */

/* MARINE-LOGIC-START (pure logic: no JSX) */
const MARINE_FORM_ID = "marine-services-quote";
const MARINE_FORM_NUMBER = 18;
const MARINE_SUBMIT_LABEL = "Submit Request";
const MARINE_SUBJECT_PREFIX = "[New Marine Services Lead] \u2013 ";
const MARINE_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/* Set this to the real server endpoint when it exists. While it is empty the form refuses to
   claim success and shows an error instead. */
const ENDPOINT = "/api/submit-quote";

const MARINE_CLIENT_TYPE_OPTIONS = [
  { code: "shipowner_fleet_manager", label: "Shipowner / Fleet Manager" },
  { code: "charterer_shipping_line_operator", label: "Charterer / Shipping Line Operator" },
  { code: "offshore_exploration_construction", label: "Offshore Exploration / Construction Firm" },
  { code: "freight_forwarder_logistics_provider", label: "Freight Forwarder / Logistics Provider" },
  { code: "authorized_mandate_broker_facilitator", label: "Authorized Mandate, Broker, or Facilitator" },
];
const MARINE_CLIENT_MANDATE = MARINE_CLIENT_TYPE_OPTIONS[4];
const MARINE_REPRESENTING_OPTIONS = [
  { code: "vessel_principal_charterer", label: "Vessel Principal/Charterer" },
  { code: "shipping_agent", label: "Shipping Agent" },
];
const MARINE_SERVICE_OPTIONS = [
  { code: "vessel_chartering", label: "Vessel Chartering" },
  { code: "bunkering_services", label: "Bunkering Services" },
  { code: "jetty_logistics", label: "Jetty Logistics" },
  { code: "crew_change_support", label: "Crew Change Support" },
  { code: "maritime_security_coordination", label: "Maritime Security Coordination" },
  { code: "others", label: "Others" },
];
const MARINE_LOCATION_OPTIONS = [
  { code: "port_harcourt_port_area", label: "Port Harcourt Port Area" },
  { code: "onne_port_area", label: "Onne Port Area" },
  { code: "lagos_offshore", label: "Lagos Offshore" },
  { code: "bonny_river", label: "Bonny River" },
  { code: "others", label: "Others" },
];

const marineLabels = (opts) => opts.map((o) => o.label);
const marineChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, marineLabels(opts), { codes: opts, ...x });

/* Conditions: shown only when the client type is "Authorized Mandate, Broker, or Facilitator". */
const MARINE_IF_MANDATE = [{ field: "clientType", equals: MARINE_CLIENT_MANDATE.label }];

/* Field order = order in the specification. `name` is the stable internal key. */
const MARINE_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("clientName", "Client Name", {
        required: true,
        autoComplete: "organization",
        wide: true,
        placeholder: "Enter Your Company\u2019s Name or Full Names as a Vessel Owner or Charterer Name",
      }),
      text("representativeName", "Representative Full Names", { required: true, autoComplete: "name" }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
    ],
  },
  {
    title: "Operational Sector",
    fields: [
      // The specification does not mark this dropdown optional, so it is required (it drives the conditional fields).
      marineChoice(select, "clientType", "Client Type / Operational Sector", MARINE_CLIENT_TYPE_OPTIONS, {
        wide: true,
      }),
      marineChoice(radio, "representing", "Who are you representing?", MARINE_REPRESENTING_OPTIONS, {
        showIf: MARINE_IF_MANDATE,
      }),
      {
        name: "mandateUpload",
        label: "Upload Letter of Mandate / Proof of Authority",
        type: "file",
        required: true,
        maxSizeMB: 5,
        hint: "Max 5MB",
        showIf: MARINE_IF_MANDATE,
      },
    ],
  },
  {
    title: "Service Requirements",
    fields: [
      marineChoice(select, "marineService", "Required Marine Service", MARINE_SERVICE_OPTIONS, { wide: true }),
      text("vesselTypeName", "Vessel Type & Name", { required: true }),
      marineChoice(select, "operationLocation", "Operation Location / Nigerian Port Waters", MARINE_LOCATION_OPTIONS, {
        wide: true,
      }),
      text("operationalDuration", "Operational Duration"),
      area("scopeOfWork", "Scope of Work/Detailed Description"),
    ],
  },
];
const MARINE_ALL_FIELDS = MARINE_STEPS.flatMap((st) => st.fields);

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const marineVisibleFields = (values) =>
  MARINE_STEPS.flatMap((st) => st.fields).filter((fd) => isVisible(fd, values));

/* Only visible fields are checked, so a hidden field can never block submission. */
function validateMarine(fields, values, files = []) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "file") {
      if (files.length === 0) {
        if (fd.required) errors[fd.name] = "Please upload a file.";
      } else if (files.some((f) => f.size > MARINE_MAX_FILE_BYTES)) {
        errors[fd.name] = "File is too large. Maximum size is 5MB.";
      }
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

/* Builds the payload from the VISIBLE answers only. Every key is always present:
     asked: false -> the question was not shown on this route (value is null)
     value: null  -> shown but left blank (optional fields) */
function buildMarinePayload(values, files, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(marineVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  MARINE_ALL_FIELDS.forEach((fd) => {
    const asked = visible.has(fd.name);
    if (fd.type === "file") {
      answers[fd.name] = { label: fd.label, asked, value: asked && files.length ? files.map((f) => f.name).join(", ") : null };
      return;
    }
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    clientName: answers.clientName.value,
    representativeName: answers.representativeName.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const mandateAsked = visible.has("mandateUpload");
  return {
    form: { id: MARINE_FORM_ID, number: MARINE_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: { to: QUOTES_TO, subject: `${MARINE_SUBJECT_PREFIX}${customer.clientName}` },
    branch: values.clientType === MARINE_CLIENT_MANDATE.label ? MARINE_CLIENT_MANDATE.code : null,
    customer,
    answers,
    // File metadata only: the actual upload goes through the upload-URL workflow once it is connected.
    attachments: mandateAsked
      ? files.map((f) => ({ field: "mandateUpload", name: f.name, size: f.size, type: f.type }))
      : [],
  };
}

const makeMarineReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitMarineQuote(payload) {
  if (!ENDPOINT) {
    console.error("Marine services quote NOT sent: ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(ENDPOINT, {
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
/* MARINE-LOGIC-END */

export default function MarineServicesForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // time before which a click on Submit is ignored (see SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = MARINE_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(marineVisibleFields(next).map((fd) => fd.name));
    setValues((prev) => ({ ...prev, [name]: value })); // answers are kept, even for fields that just got hidden
    setSendFailed(false);
    // Drop this field's own error and any error that belongs to a field that is no longer shown
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => k !== name && stillVisible.has(k)))
    );
  };

  const handleSetFiles = (next) => {
    setFiles(next);
    setSendFailed(false);
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== "mandateUpload")));
  };

  useEffect(() => {
    if (current > 0) headingRef.current?.focus();
  }, [current]);

  // Whenever Submit becomes the visible action, ignore any click already in flight (see guard above)
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
    const found = validateMarine(steps[current].fields, values, files);
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
    const found = validateMarine(marineVisibleFields(values), values, files);
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

    if (!referenceRef.current) referenceRef.current = makeMarineReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitMarineQuote(buildMarinePayload(values, files, reference));
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
                  setFiles={handleSetFiles}
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
                key="marine-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="marine-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : MARINE_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}