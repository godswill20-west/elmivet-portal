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
/* Multi-select checkboxes (value is an array of labels) and a single mandatory toggle (value is true/false).
   These two types are rendered by this file (CheckGroup / ConsentBox below); everything else uses the shared Field. */
const checks = (name, label, options, x = {}) => ({ name, label, type: "checkboxes", options, wide: true, ...x });
const consent = (name, label, x = {}) => ({ name, label, type: "consent", required: true, wide: true, ...x });
const isVisible = (field, values) =>
  [].concat(field.showIf || []).every((c) => values[c.field] === c.equals);

/* ==========================================================================
   Real Estate Offshore Investment Enquiry (Form 20), Commercial Division.
   Same structure as ChinaQuoteForm.jsx: own modal, own server-confirmed submit.
   It never reports success unless the server confirms it.
   ========================================================================== */

/* OFFSHORE-LOGIC-START (pure logic: no JSX) */
const OFFSHORE_FORM_ID = "real-estate-offshore-investment-enquiry";
const OFFSHORE_FORM_NUMBER = 20;
const OFFSHORE_SUBMIT_LABEL = "Submit Enquiry";
const OFFSHORE_SUBJECT_PREFIX = "[New Offshore Investment Enquiry] \u2013 ";

/* Message required by the specification for registered members (Option A). */
const OFFSHORE_MEMBER_MESSAGE =
  "Thank you for your continued trust. Your assigned Account Liaison Coordinator or Key Account Manager will contact you shortly.";

/* Set this to the real server endpoint when it exists. While it is empty the form refuses to
   claim success and shows an error instead. */
const OFFSHORE_SUBMIT_ENDPOINT = "/api/submit-quote";

const OFFSHORE_MEMBER_A = {
  code: "registered_member",
  label: "Registered Elmivet Kingdom Member (Offshore Real Estate Investment and Management)",
};
const OFFSHORE_MEMBER_B = { code: "new_international_investor", label: "New International Investor" };
const OFFSHORE_MEMBER_OPTIONS = [OFFSHORE_MEMBER_A, OFFSHORE_MEMBER_B];

const OFFSHORE_COUNTRY_CODES = [
  { code: "+234", label: "+234 (Nigeria)" },
  { code: "+44", label: "+44 (United Kingdom)" },
  { code: "+1", label: "+1 (USA / Canada)" },
  { code: "+233", label: "+233 (Ghana)" },
  { code: "+27", label: "+27 (South Africa)" },
  { code: "+254", label: "+254 (Kenya)" },
  { code: "+971", label: "+971 (United Arab Emirates)" },
  { code: "+49", label: "+49 (Germany)" },
  { code: "+33", label: "+33 (France)" },
  { code: "+86", label: "+86 (China)" },
  { code: "+91", label: "+91 (India)" },
];
const OFFSHORE_CHAT_OPTIONS = [
  { code: "whatsapp", label: "WhatsApp" },
  { code: "signal", label: "Signal" },
  { code: "zoom", label: "Zoom" },
  { code: "phone_call", label: "Phone call" },
];
const OFFSHORE_ENTITY_OPTIONS = [
  { code: "individual_joint_account", label: "Individual / Joint Account" },
  { code: "offshore_corporation_llc", label: "Offshore Corporation / LLC" },
  { code: "family_trust_spv", label: "Family Trust / Special Purpose Vehicle (SPV)" },
];
const OFFSHORE_REGION_OPTIONS = [
  { code: "uk", label: "United Kingdom (UK Properties)" },
  { code: "eu", label: "Continental Europe (EU Properties)" },
  { code: "usa", label: "USA" },
  {
    code: "african_nigerian_port_corridors",
    label: "African/Nigerian Port Corridors (High-yield local assets near trade zones)",
  },
  { code: "others", label: "Others" },
];
const OFFSHORE_CURRENCY_OPTIONS = [
  { code: "usd", label: "USD" },
  { code: "eur", label: "EUR" },
  { code: "gbp", label: "GBP" },
];
const OFFSHORE_CAPITAL_OPTIONS = [
  { code: "250k_500k", label: "250,000 \u2013 500,000" },
  { code: "500k_1m", label: "500,000 \u2013 1M" },
  { code: "1m_5m", label: "1M \u2013 5M" },
  { code: "5m_plus", label: "5M+" },
];
const OFFSHORE_FUNDS_OPTIONS = [
  { code: "corporate_profits_business_income", label: "Corporate Profits / Business Income" },
  { code: "liquidated_investments_stocks", label: "Liquidated Investments / Stocks" },
  { code: "inheritance_personal_savings", label: "Inheritance / Personal Savings" },
];
const OFFSHORE_TIMELINE_OPTIONS = [
  { code: "immediate_30_days", label: "Immediate Purchase (Within 30 days)" },
  { code: "strategic_window_3_6_months", label: "Strategic Window (3\u20136 months)" },
  { code: "portfolio_planning_research", label: "Portfolio Planning / Research phase" },
];

const offLabels = (opts) => opts.map((o) => o.label);
const offChoice = (builder, name, label, opts, x = {}) => builder(name, label, offLabels(opts), { codes: opts, ...x });

/* Conditions (shared isVisible(): every condition in the list must hold).
   Option A shows only the short member panel on step 1; Option B unlocks every other question.
   Each field names its parent answer, so changing the answer re-derives visibility on the next render. */
const OFFSHORE_IS_A = [{ field: "memberStatus", equals: OFFSHORE_MEMBER_A.label }];
const OFFSHORE_IS_B = [{ field: "memberStatus", equals: OFFSHORE_MEMBER_B.label }];

/* Required flags: the specification marks only Source of Investment Funds and the three compliance
   items explicitly. The remaining required flags below are the minimum needed to act on an enquiry
   (identity, a way to reach the person, and the selector answers); change them here if the client differs. */
const OFFSHORE_STEPS = [
  {
    title: "Client Segmentation",
    fields: [
      offChoice(radio, "memberStatus", "Are you a registered member of Elmivet?", OFFSHORE_MEMBER_OPTIONS),
      text("memberFullName", "Full Legal Name", { required: true, autoComplete: "name", showIf: OFFSHORE_IS_A }),
      text("memberId", "Elmivet Member ID / Assigned Point of Contact (POC)", {
        required: true,
        wide: true,
        showIf: OFFSHORE_IS_A,
      }),
      area("memberInquiry", "Direct Inquiry", { required: true, showIf: OFFSHORE_IS_A }),
    ],
  },
  {
    title: "Basic & Corporate Profiling",
    fields: [
      text("fullLegalName", "Full Legal Name", {
        required: true,
        wide: true,
        autoComplete: "name",
        hint: "(Must match Passport or International ID)",
        showIf: OFFSHORE_IS_B,
      }),
      text("citizenship", "Primary Country of Citizenship", { required: true, showIf: OFFSHORE_IS_B }),
      text("residence", "Current Country of Residence", {
        required: true,
        autoComplete: "country-name",
        showIf: OFFSHORE_IS_B,
      }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email", showIf: OFFSHORE_IS_B },
      offChoice(select, "phoneCountryCode", "Country Code", OFFSHORE_COUNTRY_CODES, { showIf: OFFSHORE_IS_B }),
      { name: "phone", label: "Phone Number", type: "tel", required: true, autoComplete: "tel-national", showIf: OFFSHORE_IS_B },
      offChoice(checks, "chatChannels", "Preferred Chat Channels", OFFSHORE_CHAT_OPTIONS, { showIf: OFFSHORE_IS_B }),
      offChoice(radio, "entityStatus", "Purchasing Entity Status", OFFSHORE_ENTITY_OPTIONS, { showIf: OFFSHORE_IS_B }),
    ],
  },
  {
    title: "Global Asset & Location Targeting",
    fields: [
      offChoice(checks, "targetRegions", "Target Acquisition Region", OFFSHORE_REGION_OPTIONS, {
        required: true,
        showIf: OFFSHORE_IS_B,
      }),
    ],
  },
  {
    title: "Budget & Capital Capabilities",
    fields: [
      offChoice(select, "capitalCurrency", "Estimated Capital Allocation (Currency)", OFFSHORE_CURRENCY_OPTIONS, {
        showIf: OFFSHORE_IS_B,
      }),
      offChoice(select, "capitalRange", "Estimated Capital Allocation (Range)", OFFSHORE_CAPITAL_OPTIONS, {
        showIf: OFFSHORE_IS_B,
      }),
      offChoice(radio, "fundsSource", "Source of Investment Funds", OFFSHORE_FUNDS_OPTIONS, { showIf: OFFSHORE_IS_B }),
      offChoice(radio, "investmentTimeline", "Investment Timeline", OFFSHORE_TIMELINE_OPTIONS, { showIf: OFFSHORE_IS_B }),
    ],
  },
  {
    title: "Compliance and Verification",
    fields: [
      consent("confirmPassport", "I confirm that my provided details match my official government-issued passport.", {
        showIf: OFFSHORE_IS_B,
      }),
      consent(
        "confirmPrivacy",
        "I understand that Elmivet International Limited processes all information under strict global privacy laws (GDPR/NDPA compliance).",
        { showIf: OFFSHORE_IS_B }
      ),
      consent(
        "confirmContact",
        "I acknowledge that an Elmivet Point of Contact will reach out within official working hours (8:00 AM \u2013 5:00 PM WAT, Monday to Friday) or via remote demand arrangements.",
        { showIf: OFFSHORE_IS_B }
      ),
    ],
  },
];
const OFFSHORE_ALL_FIELDS = OFFSHORE_STEPS.flatMap((st) => st.fields);

/* The steps the person can currently reach. This drives navigation only; which FIELDS are
   shown, validated and sent is always decided by isVisible() on the live answers.
   - Option A -> the form ends on step 1 (Submit shown right away).
   - otherwise (including while unanswered) -> every step stays reachable, so a Submit
     button is never offered before the answer that allows it. */
function getOffshoreSteps(values) {
  if (values.memberStatus === OFFSHORE_MEMBER_A.label) return OFFSHORE_STEPS.slice(0, 1);
  return OFFSHORE_STEPS;
}

/* Every field that is currently shown, in order: the ONLY fields that are validated or sent. */
const offshoreVisibleFields = (values) =>
  getOffshoreSteps(values)
    .flatMap((st) => st.fields)
    .filter((fd) => isVisible(fd, values));

/* Stable name of the route the person took through the form (null while undecided). */
function offshoreBranch(values) {
  if (values.memberStatus === OFFSHORE_MEMBER_A.label) return OFFSHORE_MEMBER_A.code;
  if (values.memberStatus === OFFSHORE_MEMBER_B.label) return OFFSHORE_MEMBER_B.code;
  return null;
}

const isMulti = (fd) => fd.type === "checkboxes";
const isConsent = (fd) => fd.type === "consent";

/* Only visible fields are checked, so a hidden field can never block submission. */
function validateOffshore(fields, values) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    const raw = values[fd.name];
    if (isConsent(fd)) {
      if (fd.required && raw !== true) errors[fd.name] = "Please tick this box to continue.";
      return;
    }
    if (isMulti(fd)) {
      const picked = Array.isArray(raw) ? raw : [];
      if (picked.length === 0) {
        if (fd.required) errors[fd.name] = "Please choose at least one option.";
      } else if (!picked.every((p) => fd.options.includes(p))) {
        errors[fd.name] = "Please choose at least one option.";
      }
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
    else if (fd.type === "tel" && v.replace(/\D/g, "").length < 5) errors[fd.name] = "Enter a valid phone number.";
  });
  return errors;
}

/* Builds the payload from the VISIBLE answers only. Values typed into a field that is now hidden
   stay in the form (so they come back if the person changes their mind) but are never sent.
   Every key is always present, so each branch produces the same shape:
     asked: false -> the question was not shown on this route (value is null)
     value: null  -> shown but left blank (optional fields)
   Multi-select answers are arrays (with a matching `codes` array); mandatory toggles are true. */
function buildOffshorePayload(values, reference, submittedAt = new Date().toISOString()) {
  const visible = new Set(offshoreVisibleFields(values).map((fd) => fd.name));
  const answers = {};
  OFFSHORE_ALL_FIELDS.forEach((fd) => {
    const asked = visible.has(fd.name);
    const entry = { label: fd.label, asked };
    if (isConsent(fd)) {
      entry.value = asked && values[fd.name] === true ? true : null;
    } else if (isMulti(fd)) {
      const picked = asked && Array.isArray(values[fd.name]) ? values[fd.name].filter((p) => fd.options.includes(p)) : [];
      entry.value = picked.length ? picked : null;
      entry.codes = picked.map((p) => fd.codes.find((o) => o.label === p)?.code ?? null);
    } else {
      const raw = asked ? String(values[fd.name] ?? "").trim() : "";
      entry.value = raw || null;
      if (fd.codes) entry.code = raw ? fd.codes.find((o) => o.label === raw)?.code ?? null : null;
    }
    answers[fd.name] = entry;
  });
  const fullName = answers.memberFullName.value || answers.fullLegalName.value;
  const dial = answers.phoneCountryCode.code;
  const phoneNumber = answers.phone.value;
  const customer = {
    fullName,
    memberId: answers.memberId.value,
    email: answers.email.value,
    phone: phoneNumber ? [dial, phoneNumber].filter(Boolean).join(" ") : null,
  };
  const who = (fullName || customer.email || "").replace(/\s+/g, " ");
  return {
    form: { id: OFFSHORE_FORM_ID, number: OFFSHORE_FORM_NUMBER },
    reference,
    submittedAt,
    // The server sends this to quotes@elmivet.com and adds the hidden BCC itself.
    routing: { to: QUOTES_TO, subject: `${OFFSHORE_SUBJECT_PREFIX}${who}` },
    branch: offshoreBranch(values),
    customer,
    answers,
    // The specification has no upload field, so nothing is attached.
    attachments: [],
  };
}

const makeOffshoreReference = (num) =>
  `ELM-${num}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

/* Never reports success unless the server confirms it. Never logs the payload.
   Success = HTTP 2xx AND a JSON object body that does not say it failed. */
async function submitOffshoreQuote(payload) {
  if (!OFFSHORE_SUBMIT_ENDPOINT) {
    console.error("Offshore investment enquiry NOT sent: OFFSHORE_SUBMIT_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(OFFSHORE_SUBMIT_ENDPOINT, {
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
/* OFFSHORE-LOGIC-END */

/* Multi-select checkbox group (value: array of labels) */
function CheckGroup({ field, formId, values, setValue, errors }) {
  const picked = Array.isArray(values[field.name]) ? values[field.name] : [];
  const err = errors[field.name];
  const toggle = (opt) =>
    setValue(field.name, picked.includes(opt) ? picked.filter((p) => p !== opt) : [...picked, opt]);
  return (
    <fieldset aria-describedby={err ? `${formId}-${field.name}-error` : undefined}>
      <legend className="font-sans text-sm font-semibold text-[#0A2540]">
        {field.label}
        {field.required && (
          <span className="text-[#D9232D]" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {field.options.map((opt, i) => (
          <label key={opt} className="flex cursor-pointer items-start gap-3 font-sans text-sm text-slate-700">
            <input
              type="checkbox"
              id={i === 0 ? `${formId}-${field.name}` : undefined}
              name={field.name}
              checked={picked.includes(opt)}
              onChange={() => toggle(opt)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#D9232D]"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {err && (
        <p id={`${formId}-${field.name}-error`} className="mt-2 font-sans text-xs font-semibold text-[#D9232D]">
          {err}
        </p>
      )}
    </fieldset>
  );
}

/* Single mandatory toggle (value: true / false) */
function ConsentBox({ field, formId, values, setValue, errors }) {
  const err = errors[field.name];
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 font-sans text-sm text-slate-700">
        <input
          type="checkbox"
          id={`${formId}-${field.name}`}
          name={field.name}
          checked={values[field.name] === true}
          onChange={(e) => setValue(field.name, e.target.checked)}
          aria-describedby={err ? `${formId}-${field.name}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D9232D]"
        />
        <span>
          {field.label}
          <span className="text-[#D9232D]" aria-hidden="true">
            {" "}
            *
          </span>
        </span>
      </label>
      {err && (
        <p id={`${formId}-${field.name}-error`} className="mt-2 font-sans text-xs font-semibold text-[#D9232D]">
          {err}
        </p>
      )}
    </div>
  );
}

export default function OffshoreInvestmentForm({ service, onClose, onSent }) {
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

  const steps = getOffshoreSteps(values);
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const isLast = current === lastStep;

  const setValue = (name, value) => {
    const next = { ...values, [name]: value };
    const stillVisible = new Set(offshoreVisibleFields(next).map((fd) => fd.name));
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
    const found = validateOffshore(steps[current].fields, values);
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
    const found = validateOffshore(offshoreVisibleFields(values), values);
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

    if (!referenceRef.current) referenceRef.current = makeOffshoreReference(service.num);
    const reference = referenceRef.current;

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitOffshoreQuote(buildOffshorePayload(values, reference));
    } catch {
      result = { ok: false };
    }
    if (result.ok) {
      onSent({ elmReference: result.elmReference, registered: values.memberStatus === OFFSHORE_MEMBER_A.label });
      return;
    }
    submittingRef.current = false;
    setSending(false);
    setSendFailed(true);
  };

  const renderField = (fd) => {
    if (isMulti(fd)) return <CheckGroup field={fd} formId={formId} values={values} setValue={setValue} errors={errors} />;
    if (isConsent(fd)) return <ConsentBox field={fd} formId={formId} values={values} setValue={setValue} errors={errors} />;
    return (
      <Field
        field={fd}
        formId={formId}
        values={values}
        setValue={setValue}
        errors={errors}
        files={[]}
        setFiles={() => {}}
      />
    );
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
                {renderField(fd)}
                {fd.hint && fd.type !== "textarea" && (
                  <p className="mt-1.5 font-sans text-xs text-slate-500">{fd.hint}</p>
                )}
              </FadeIn>
            ))}
          {current === 0 && values.memberStatus === OFFSHORE_MEMBER_A.label && (
            <FadeIn className="sm:col-span-2">
              <p
                role="status"
                className="border-l-4 border-[#0A2540] bg-slate-50 px-4 py-3 font-sans text-sm text-[#0A2540]"
              >
                {OFFSHORE_MEMBER_MESSAGE}
              </p>
            </FadeIn>
          )}
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
                key="offshore-next"
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                key="offshore-submit"
                type="submit"
                disabled={sending}
                onClick={(e) => {
                  if (Date.now() < submitArmedAt.current) e.preventDefault();
                }}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending..." : OFFSHORE_SUBMIT_LABEL}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}