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
   China Operations & Logistics: Request a Quote (Form 19)
   Separate form with its own modal. It reuses ModalShell, Field and FadeIn from
   ../shared/FormPrimitives, and only reports success after the server confirms it.
   ========================================================================== */

/* CHINA-LOGIC-START (pure logic: no JSX, covered by the logic checks) */
const CHINA_FORM_ID = "china-operations-logistics-quote";
const CHINA_FORM_NUMBER = 19;

/* Client-approved submit button text ("[Submit Button Text]" in the specification). */
const CHINA_SUBMIT_LABEL = "Generate My Route & Shipping Plan";

/* Subject template from the specification: [New China Freight Lead] – [Client Name / Company] */
const CHINA_SUBJECT_PREFIX = "[New China Freight Lead] \u2013 ";

/* Set this to the real server endpoint when it exists. While it is empty the form refuses to
   claim success and shows an error instead. */
const ENDPOINT = "/api/submit-quote";

/* Option lists. `label` is the exact client-facing wording; `code` is the stable internal value
   sent to the backend. The form state stores the label (that is what the shared Field renders). */
const CHINA_YES_NO = [
  { code: "yes", label: "Yes" },
  { code: "no", label: "No" },
];
const CHINA_SERVICE_AIR = { code: "air_freight_only", label: "Option A: Air Freight Only" };
const CHINA_SERVICE_SEA = { code: "sea_freight_standard_cargo", label: "Option B: General Sea Freight/Standard Cargo" };
const CHINA_SERVICE_PROCUREMENT = {
  code: "specialized_procurement_heavy_machinery",
  label: "Option C: Specialized Procurement / Heavy Machinery Support",
};
const CHINA_SERVICE_OPTIONS = [CHINA_SERVICE_AIR, CHINA_SERVICE_SEA, CHINA_SERVICE_PROCUREMENT];
const CHINA_WECHAT_OPTIONS = [
  { code: "yes", label: "Yes" },
  { code: "no", label: "No" },
  { code: "not_sure", label: "Not Sure" },
];
const CHINA_DIRECTION_OPTIONS = [
  { code: "import", label: "Import (Bringing goods from China into Nigeria/Africa)" },
  { code: "export", label: "Export (Sending goods out to China/Global markets)" },
];
const CHINA_FULFILMENT_OPTIONS = [
  { code: "door_to_door", label: "Door-to-Door (Complete factory pickup to final doorstep delivery)" },
  { code: "door_to_port", label: "Door-to-Port (Factory pickup up to departure/destination port arrival)" },
  { code: "port_to_door", label: "Port-to-Door (From departure/destination port up to final doorstep delivery)" },
];
const CHINA_FREIGHT_OPTIONS = [
  { code: "lcl", label: "Less than Container Load (LCL / Groupage)" },
  { code: "fcl_20ft", label: "Full Container Load (FCL - 20ft Container)" },
  { code: "fcl_40ft", label: "Full Container Load (FCL - 40ft)" },
  { code: "air_freight_express", label: "Air Freight Express" },
  { code: "others", label: "Others" },
];
const CHINA_HUB_METHOD_OPTIONS = [
  { code: "supplier_delivers_to_hub", label: "My supplier will deliver directly to Elmivet\u2019s China Hub" },
  {
    code: "elmivet_handles_pickup_and_haulage",
    label: "I want Elmivet to handle factory pickup and local haulage inside China to your hub.",
  },
];
const CHINA_PORT_OPTIONS = [
  { code: "port_harcourt", label: "Port Harcourt" },
  { code: "tin_can_island_port", label: "Tin Can Island Port" },
  { code: "apapa_port", label: "Apapa Port" },
  { code: "other_nigeria_ports", label: "Other Nigeria Ports" },
  { code: "cotonou_port", label: "Cotonou Port" },
  { code: "port_of_lome", label: "Port of Lomé" },
];
const CHINA_LAST_MILE_OPTIONS = [
  { code: "customer_pickup", label: "I will pick up my cargo directly from Elmivet\u2019s warehouse or hubs" },
  {
    code: "elmivet_delivery",
    label: "I require Elmivet\u2019s haulage fleet to deliver directly to my warehouse/store address.",
  },
];

const chinaLabels = (opts) => opts.map((o) => o.label);
const chinaChoice = (builder, name, label, opts, x = {}) =>
  builder(name, label, chinaLabels(opts), { codes: opts, ...x });

/* Conditions (shared isVisible(): every condition in the list must hold).
   Everything after Question 5 needs Q5 = "No"; everything after Question 6 also needs Option B.
   Because each later field names ALL of its parent answers, changing an earlier answer
   re-derives visibility on the next render, with nothing left to clean up by hand. */
const CHINA_Q5_NO = { field: "dialect", equals: "No" };
const CHINA_Q6_SEA = { field: "serviceRequirement", equals: CHINA_SERVICE_SEA.label };
const CHINA_AFTER_Q5 = [CHINA_Q5_NO];
const CHINA_AFTER_Q6 = [CHINA_Q5_NO, CHINA_Q6_SEA];

/* Field order = order in the specification. `name` is the stable internal key. */
const CHINA_STEPS = [
  {
    title: "Client Information",
    fields: [
      text("fullName", "Full Name / Corporate Representative", { required: true, autoComplete: "name" }),
      text("companyName", "Company Name", { autoComplete: "organization" }),
      { name: "phone", label: "Phone Number (WhatsApp Preferred)", type: "tel", required: true, autoComplete: "tel" },
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email" },
      chinaChoice(
        radio,
        "dialect",
        "Do you prefer to communicate or discuss your request in a specific local dialect, or dedicated local dialect in China for this request?",
        CHINA_YES_NO
      ),
    ],
  },
  {
    title: "Service & Network Requirements",
    fields: [
      chinaChoice(
        radio,
        "serviceRequirement",
        "What best describes your service and network requirements in China for this request?",
        CHINA_SERVICE_OPTIONS,
        { showIf: CHINA_AFTER_Q5 }
      ),
      chinaChoice(radio, "activeWeChat", "Do you have an active WeChat ID?", CHINA_WECHAT_OPTIONS, {
        showIf: CHINA_AFTER_Q6,
      }),
    ],
  },
  {
    title: "Shipment Details",
    fields: [
      chinaChoice(radio, "directionOfTrade", "Direction of Trade", CHINA_DIRECTION_OPTIONS, { showIf: CHINA_AFTER_Q6 }),
      chinaChoice(select, "fulfilmentType", "Preferred Fulfilment Service Type", CHINA_FULFILMENT_OPTIONS, {
        wide: true,
        showIf: CHINA_AFTER_Q6,
      }),
      chinaChoice(select, "freightMode", "Shipment Type / Freight Mode", CHINA_FREIGHT_OPTIONS, {
        wide: true,
        showIf: CHINA_AFTER_Q6,
      }),
      area("goodsDescription", "Nature of Goods / Commodity Description", { required: true, showIf: CHINA_AFTER_Q6 }),
      area("cargoEstimate", "Estimated Cargo Weight (kg) or Volume (CBM)", { showIf: CHINA_AFTER_Q6 }),
      text("supplierLocation", "Supplier City / Province in China", {
        wide: true,
        hint: "(Allows our China Hub team to determine if factory-to-hub haulage is needed)",
        showIf: CHINA_AFTER_Q6,
      }),
    ],
  },
  {
    title: "Delivery & Comments",
    fields: [
      chinaChoice(select, "hubDeliveryMethod", "Delivery to China Hub Method", CHINA_HUB_METHOD_OPTIONS, {
        wide: true,
        showIf: CHINA_AFTER_Q6,
      }),
      chinaChoice(select, "port", "Origin/Destination Port", CHINA_PORT_OPTIONS, { wide: true, showIf: CHINA_AFTER_Q6 }),
      chinaChoice(select, "lastMileDelivery", "Last-Mile Delivery Requirement", CHINA_LAST_MILE_OPTIONS, {
        wide: true,
        showIf: CHINA_AFTER_Q6,
      }),
      text("deliveryAddress", "Delivery Address / Destination City", { wide: true, showIf: CHINA_AFTER_Q6 }),
      area("comments", "Additional comments", { showIf: CHINA_AFTER_Q6 }),
    ],
  },
];
const CHINA_ALL_FIELDS = CHINA_STEPS.flatMap((st) => st.fields);

/* The steps the person can currently reach. This drives navigation only; which FIELDS are
   shown, validated and sent is always decided by isVisible() on the live answers.
   - Q5 = Yes                      -> the form ends on step 1 (Submit shown right away).
   - Q5 = No and Q6 = Option A / C -> the form ends on step 2 (Submit shown).
   - otherwise (including while Q5 / Q6 are still unanswered) -> every step stays reachable,
     so a Submit button is never offered before the answer that allows it. */
function getChinaSteps(values) {
  if (values.dialect === "Yes") return CHINA_STEPS.slice(0, 1);
  if (
    values.dialect === "No" &&
    (values.serviceRequirement === CHINA_SERVICE_AIR.label ||
      values.serviceRequirement === CHINA_SERVICE_PROCUREMENT.label)
  ) {
    return CHINA_STEPS.slice(0, 2);
  }
  return CHINA_STEPS;
}

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const chinaVisibleFields = (values) =>
  getChinaSteps(values)
    .flatMap((st) => st.fields)
    .filter((fd) => isVisible(fd, values));

/* Stable name of the route the person took through the form (null while undecided). */
function chinaBranch(values) {
  if (values.dialect === "Yes") return "local_dialect_support";
  if (values.dialect !== "No") return null;
  if (values.serviceRequirement === CHINA_SERVICE_AIR.label) return CHINA_SERVICE_AIR.code;
  if (values.serviceRequirement === CHINA_SERVICE_PROCUREMENT.label) return CHINA_SERVICE_PROCUREMENT.code;
  if (values.serviceRequirement === CHINA_SERVICE_SEA.label) return CHINA_SERVICE_SEA.code;
  return null;
}

/* Only visible fields are checked, so a hidden field can never block submission. */
function validateChina(fields, values) {
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

/* Builds the payload from the VISIBLE answers only. Values typed into a field that is now hidden
   stay in the form (so they come back if the person changes their mind) but are never sent.
   Every key is always present, so each branch produces the same shape:
     asked: false -> the question was not shown on this route (value is null)
     value: null  -> shown but left blank (optional fields) */
function buildChinaPayload(values, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(chinaVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  CHINA_ALL_FIELDS.forEach((fd) => {
    const asked = visible.has(fd.name);
    const raw = asked ? String(values[fd.name] ?? "").trim() : "";
    const entry = { label: fd.label, asked, value: raw || null };
    if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    answers[fd.name] = entry;
  });
  const customer = {
    fullName: answers.fullName.value,
    companyName: answers.companyName.value,
    phone: answers.phone.value,
    email: answers.email.value,
  };
  const who = [customer.fullName, customer.companyName].filter(Boolean).join(" / ").replace(/\s+/g, " ");
  return {
    form: { id: CHINA_FORM_ID, number: CHINA_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: { to: QUOTES_TO, subject: `${CHINA_SUBJECT_PREFIX}${who}` },
    branch: chinaBranch(values),
    customer,
    answers,
    // The specification has no upload field, so nothing is attached. Add entries here when the
    // upload-URL workflow is connected, only if the client adds an upload question.
    attachments: [],
  };
}

const makeChinaReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitChinaQuote(payload) {
  if (!ENDPOINT) {
    console.error("China quote NOT sent: ENDPOINT is not configured.");
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
/* CHINA-LOGIC-END */

export default function ChinaQuoteForm({ service, onClose, onSent }) {
  const formId = `quote-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // time before which a click on Submit is ignored (see SUBMIT_CLICK_GUARD_MS)
  const referenceRef = useRef(null); // one reference per form, reused on retry so the server can spot duplicates
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const steps = getChinaSteps(values);
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(chinaVisibleFields(next).map((fd) => fd.name));
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
    const found = validateChina(steps[current].fields, values);
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
    const found = validateChina(chinaVisibleFields(values), values);
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

    if (!referenceRef.current) referenceRef.current = makeChinaReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitChinaQuote(buildChinaPayload(values, reference));
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
                key="china-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="china-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : CHINA_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}