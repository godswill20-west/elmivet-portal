import { useEffect, useRef, useState } from "react";
import {
  FileText,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  X,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";

/* ==========================================================================
   Config
   ========================================================================== */
export const QUOTES_TO = "quotes@elmivet.com";
export const QUOTES_BCC = "elmivet19@gmail.com"; // hidden copy: must be added SERVER-SIDE
export const HOTLINES = [
  { label: "+234 707 603 5180", tel: "+2347076035180" },
  { label: "+234 812 892 5190", tel: "+2348128925190" },
];

export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const BLOCKED_RE = /\.(exe|mp4|zip|rar|7z|bat|cmd|msi|scr|js|sh|com|mov|avi)(\.|$)/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WIDE_TYPES = ["radio", "checkbox", "textarea", "file", "ack"];

/* After Next advances to the final step, the Submit button can appear under the pointer. For this
   long (ms) a click on Submit is ignored, so the tail of a quick double-click on Next can never
   land on Submit and send the form. A deliberate click on Submit comes much later and is unaffected. */
export const SUBMIT_CLICK_GUARD_MS = 600;

/* ==========================================================================
   Form field builders
   Rules: radio = 2 to 4 choices, select = 5+ choices.
   `others: true` appends "Others" and slides down a textarea when chosen.
   `showIf` = { field, equals } (or an array of them) for conditional fields.
   ========================================================================== */
export const text = (name, label, x = {}) => ({ name, label, type: "text", ...x });
export const number = (name, label, x = {}) => ({ name, label, type: "number", ...x });
export const date = (name, label, x = {}) => ({ name, label, type: "date", ...x });
export const area = (name, label, x = {}) => ({ name, label, type: "textarea", ...x });
export const radio = (name, label, options, x = {}) => ({
  name,
  label,
  type: "radio",
  options,
  required: true,
  ...x,
});
export const select = (name, label, options, x = {}) => ({
  name,
  label,
  type: "select",
  options,
  required: true,
  ...x,
});
export const checks = (name, label, options, x = {}) => ({
  name,
  label,
  type: "checkbox",
  options,
  ...x,
});
export const file = (name, label, x = {}) => ({ name, label, type: "file", ...x });

/* ==========================================================================
   Form helpers
   ========================================================================== */
export const isVisible = (field, values) =>
  [].concat(field.showIf || []).every((c) => values[c.field] === c.equals);

export const optionsOf = (field) =>
  field.others ? [...field.options, "Others"] : field.options;

export function validate(fields, values, files) {
  const errors = {};
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    const v = values[fd.name];

    if (fd.type === "file") {
      if (fd.required && files.length === 0) errors[fd.name] = "Please upload at least one file.";
      return;
    }
    if (fd.type === "checkbox") {
      if (fd.required && !(v && v.length)) errors[fd.name] = "Select at least one option.";
      if (v && v.includes("Others") && !(values[`${fd.name}_other`] || "").trim())
        errors[`${fd.name}_other`] = "Please specify.";
      return;
    }
    if (fd.required && !String(v ?? "").trim()) {
      errors[fd.name] = fd.type === "radio" || fd.type === "select" ? "Please choose an option." : "This field is required.";
    } else if (fd.type === "email" && v && !EMAIL_RE.test(v)) {
      errors[fd.name] = "Enter a valid email address.";
    } else if (fd.type === "tel" && v && v.replace(/\D/g, "").length < 7) {
      errors[fd.name] = "Enter a valid phone number.";
    }
    if (fd.type === "select" && v === "Others" && !(values[`${fd.name}_other`] || "").trim())
      errors[`${fd.name}_other`] = "Please specify.";
  });
  return errors;
}

/* Mock backend call. Replace with a real POST; add the BCC server-side. */
export async function submitQuote(payload) {
  console.info("[Elmivet quote request]", payload);
  // await fetch("/api/quotes", { method: "POST", body: JSON.stringify(payload) });
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

export const fmtSize = (b) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/* ==========================================================================
   Form UI pieces
   ========================================================================== */
export const inputClass =
  "w-full border border-slate-300 bg-white px-3 py-2.5 font-sans text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0A2540]";

export const choiceClass =
  "flex cursor-pointer items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 font-sans text-sm text-slate-700 transition-colors has-checked:border-[#0A2540] has-checked:bg-slate-50 has-checked:font-semibold has-checked:text-[#0A2540]";

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 font-sans text-xs font-medium text-[#D9232D]">
      {message}
    </p>
  );
}

export function SlideDown({ open, children }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="pt-3">{children}</div>
      </div>
    </div>
  );
}

export function OtherBox({ field, open, values, setValue, errors, formId }) {
  const key = `${field.name}_other`;
  return (
    <SlideDown open={open}>
      <label htmlFor={`${formId}-${key}`} className="mb-1.5 block font-sans text-xs font-semibold text-slate-600">
        Please specify
      </label>
      <textarea
        id={`${formId}-${key}`}
        rows={3}
        disabled={!open}
        value={values[key] || ""}
        onChange={(e) => setValue(key, e.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={inputClass}
      />
      <FieldError message={errors[key]} />
    </SlideDown>
  );
}

export function FileUpload({ id, files, onChange, error }) {
  const inputRef = useRef(null);
  const [problems, setProblems] = useState([]);
  const [drag, setDrag] = useState(false);
  const total = files.reduce((s, f) => s + f.size, 0);

  const handle = (list) => {
    const next = [...files];
    const issues = [];
    let sum = total;
    Array.from(list).forEach((f) => {
      if (BLOCKED_RE.test(f.name)) {
        issues.push(`${f.name}: this file type is not allowed.`);
        return;
      }
      if (next.some((n) => n.name === f.name && n.size === f.size)) return;
      if (next.length >= MAX_FILES) {
        issues.push(`${f.name}: maximum of ${MAX_FILES} files reached.`);
        return;
      }
      if (sum + f.size > MAX_TOTAL_BYTES) {
        issues.push(`${f.name}: would exceed the 25 MB total limit.`);
        return;
      }
      next.push(f);
      sum += f.size;
    });
    setProblems(issues);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
        className="peer sr-only"
        onChange={(e) => handle(e.target.files)}
      />
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed px-4 py-6 text-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#D9232D] ${
          drag ? "border-[#D9232D] bg-red-50" : "border-slate-300 bg-slate-50 hover:border-[#0A2540]"
        }`}
      >
        <UploadCloud className="h-6 w-6 text-[#D9232D]" aria-hidden="true" />
        <span className="font-sans text-sm font-semibold text-[#0A2540]">
          Click to upload or drag files here
        </span>
        <span className="font-sans text-xs text-slate-500">
          Up to {MAX_FILES} files · 25 MB total · PDF, Office, CSV, TXT, JPG, PNG
        </span>
      </label>

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1">
          {problems.map((p) => (
            <li key={p} className="font-sans text-xs font-medium text-[#D9232D]">
              {p}
            </li>
          ))}
        </ul>
      )}
      <FieldError message={error} />

      {files.length > 0 && (
        <div className="mt-3">
          <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 font-sans text-sm text-slate-700">
                  <FileText className="h-4 w-4 shrink-0 text-[#0A2540]" aria-hidden="true" />
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtSize(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((n) => n !== f))}
                  aria-label={`Remove ${f.name}`}
                  className="shrink-0 p-1 text-slate-500 hover:text-[#D9232D]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 font-sans text-xs text-slate-500">
            {files.length}/{MAX_FILES} files · {fmtSize(total)} of 25 MB used
          </p>
        </div>
      )}
    </div>
  );
}

export function Field({ field, formId, values, setValue, errors, files, setFiles }) {
  const id = `${formId}-${field.name}`;
  const err = errors[field.name];
  const wide = field.wide || ["radio", "checkbox", "textarea", "file"].includes(field.type);
  const labelNode = (
    <>
      {field.label}
      {field.required && (
        <span className="text-[#D9232D]" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </>
  );
  const labelClass = "mb-1.5 block font-sans text-sm font-semibold text-[#0A2540]";
  const v = values[field.name];

  let control;
  if (field.type === "radio") {
    control = (
      <fieldset aria-describedby={err ? `${id}-err` : undefined}>
        <legend className={labelClass}>{labelNode}</legend>
        <div className="flex flex-wrap gap-3">
          {field.options.map((opt) => (
            <label key={opt} className={choiceClass}>
              <input
                type="radio"
                name={field.name}
                value={opt}
                checked={v === opt}
                onChange={() => setValue(field.name, opt)}
                className="h-4 w-4 accent-[#D9232D]"
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>
    );
  } else if (field.type === "checkbox") {
    const opts = optionsOf(field);
    const selected = v || [];
    control = (
      <fieldset aria-describedby={err ? `${id}-err` : undefined}>
        <legend className={labelClass}>{labelNode}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {opts.map((opt) => (
            <label key={opt} className={choiceClass}>
              <input
                type="checkbox"
                value={opt}
                checked={selected.includes(opt)}
                onChange={(e) =>
                  setValue(
                    field.name,
                    e.target.checked ? [...selected, opt] : selected.filter((s) => s !== opt)
                  )
                }
                className="h-4 w-4 accent-[#D9232D]"
              />
              {opt}
            </label>
          ))}
        </div>
        {field.others && (
          <OtherBox
            field={field}
            open={selected.includes("Others")}
            values={values}
            setValue={setValue}
            errors={errors}
            formId={formId}
          />
        )}
      </fieldset>
    );
  } else if (field.type === "select") {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <select
          id={id}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        >
          <option value="">Select an option</option>
          {optionsOf(field).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {field.others && (
          <OtherBox
            field={field}
            open={v === "Others"}
            values={values}
            setValue={setValue}
            errors={errors}
            formId={formId}
          />
        )}
      </>
    );
  } else if (field.type === "textarea") {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <textarea
          id={id}
          rows={4}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
        {field.hint && <p className="mt-1 font-sans text-xs text-slate-500">{field.hint}</p>}
      </>
    );
  } else if (field.type === "file") {
    control = (
      <>
        <span className={labelClass}>{labelNode}</span>
        <FileUpload id={id} files={files} onChange={setFiles} error={err} />
      </>
    );
  } else {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <input
          id={id}
          type={field.type}
          autoComplete={field.autoComplete}
          value={v || ""}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
      </>
    );
  }

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      {control}
      {field.type !== "file" && <FieldError id={`${id}-err`} message={err} />}
    </div>
  );
}

/* ==========================================================================
   Modals
   ========================================================================== */
export function ModalShell({ onClose, titleId, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
  closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    const originalOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#0A2540]/70 p-0 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-mouth-opening relative my-auto w-full max-w-3xl bg-white shadow-2xl outline-none"
      >
        {children}
      </div>
    </div>
  );
}

export function ThanksModal({ service, elmReference, onClose }) {
  return (
    <ModalShell onClose={onClose} titleId="thanks-title">
      <div className="px-6 py-10 text-center sm:px-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center bg-[#0A2540]">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        </span>
        <span className="mt-6 block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
          Request Received
        </span>
        <h2 id="thanks-title" className="mt-2 font-serif text-3xl font-bold text-[#0A2540]">
          Thank you. Our team is on it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-slate-600">
          Your quote request for <strong className="text-[#0A2540]">{service.title}</strong> has
          been logged. A member of our quotations desk will respond within{" "}
          <strong className="text-[#0A2540]">24 hours</strong>.
        </p>
        {elmReference && <p className="mt-3 font-mono text-xs text-slate-500">Reference: {elmReference}</p>}

        <div className="mt-8 border-t border-slate-200 pt-8">
          <p className="flex items-center justify-center gap-2 font-sans text-sm font-semibold text-[#0A2540]">
            <ShieldCheck className="h-4 w-4 text-[#D9232D]" aria-hidden="true" />
            Need it sooner? Call our hotlines directly.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            {HOTLINES.map((h) => (
              <a
                key={h.tel}
                href={`tel:${h.tel}`}
                className="bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                {h.label}
              </a>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 font-sans text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-[#D9232D]"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

export function OffshoreThanksModal({ service, elmReference, registered, onClose }) {
  return (
    <ModalShell onClose={onClose} titleId="offshore-thanks-title">
      <div className="px-6 py-10 text-center sm:px-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center bg-[#0A2540]">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
        </span>
        <span className="mt-6 block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
          Enquiry Received
        </span>
        <h2 id="offshore-thanks-title" className="mt-2 font-serif text-3xl font-bold text-[#0A2540]">
          {service?.title || "Real Estate Offshore Investment Enquiry"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-slate-600">
          {registered ? REGISTERED_MESSAGE : NEW_INVESTOR_MESSAGE}
        </p>
        {elmReference && <p className="mt-3 font-mono text-xs text-slate-500">Reference: {elmReference}</p>}
        <button
          type="button"
          onClick={onClose}
          className="mt-8 font-sans text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-[#D9232D]"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

/* ==========================================================================
   Real Estate Offshore Investment Enquiry (Commercial Division, Form 20)
   A separate form with its own modal. It reuses ModalShell, Field, validate and the
   shared styles above, but NOT submitQuote(): that function is a mock which always
   reports success, and this form collects sensitive investor information.
   ========================================================================== */

/* OFFSHORE-LOGIC-START (pure logic: no JSX, covered by the logic checks) */
export const OFFSHORE_REGISTERED =
  "Registered Elmivet Kingdom Member (Offshore Real Estate Investment and Management)";
export const OFFSHORE_NEW = "New International Investor";
const REGISTERED_ONLY = { field: "investorType", equals: OFFSHORE_REGISTERED };
const NEW_ONLY = { field: "investorType", equals: OFFSHORE_NEW };

export const REGISTERED_MESSAGE =
  "Thank you for your continued trust. Your assigned Account Liaison Coordinator or Key Account Manager will contact you shortly.";
export const NEW_INVESTOR_MESSAGE =
  "Thank you. An Elmivet Point of Contact will reach out within official working hours (8:00 AM – 5:00 PM WAT, Monday to Friday) or via remote demand arrangements.";

/* Set this to the real server endpoint that receives the enquiry. While it is empty the
   form refuses to claim success and shows an error instead. */
export const OFFSHORE_ENQUIRY_ENDPOINT = "/api/submit-quote";

const ack = (name, label) => ({ name, label, type: "ack", required: true, showIf: NEW_ONLY });

export const OFFSHORE_STEPS = [
  {
    title: "Client Segmentation",
    intro: "Tell us how you are connected to Elmivet so we can route your enquiry correctly.",
    fields: [
      radio("investorType", "Are you a registered member of Elmivet?", [OFFSHORE_REGISTERED, OFFSHORE_NEW]),
      text("fullName", "Full Legal Name", {
        required: true,
        autoComplete: "name",
        showIf: REGISTERED_ONLY,
      }),
      text("memberId", "Elmivet Member ID / Assigned Point of Contact (POC)", {
        required: true,
        showIf: REGISTERED_ONLY,
      }),
      area("inquiry", "Direct Inquiry", { required: true, showIf: REGISTERED_ONLY }),
    ],
  },
  {
    title: "Basic & Corporate Profiling",
    intro: "Please make sure your details match your passport or international ID.",
    fields: [
      text("fullName", "Full Legal Name (must match Passport or International ID)", {
        required: true,
        autoComplete: "name",
        showIf: NEW_ONLY,
      }),
      text("citizenship", "Primary Country of Citizenship", { required: true, showIf: NEW_ONLY }),
      text("residence", "Current Country of Residence", {
        required: true,
        autoComplete: "country-name",
        showIf: NEW_ONLY,
      }),
      { name: "email", label: "Email Address", type: "email", required: true, autoComplete: "email", showIf: NEW_ONLY },
      {
        name: "phone",
        label: "Phone Number (with country calling code)",
        type: "tel",
        required: true,
        autoComplete: "tel",
        hint: "Start with the country calling code, for example +44 7700 900123.",
        showIf: NEW_ONLY,
      },
      checks("channels", "Preferred Contact Channels", ["WhatsApp", "Signal", "Zoom", "Phone Call"], {
        required: true,
        showIf: NEW_ONLY,
      }),
      radio(
        "entity",
        "Purchasing Entity Status",
        ["Individual / Joint Account", "Offshore Corporation / LLC", "Family Trust / Special Purpose Vehicle (SPV)"],
        { showIf: NEW_ONLY }
      ),
    ],
  },
  {
    title: "Global Asset & Location Targeting",
    intro: "Choose every region you would consider for an acquisition.",
    fields: [
      checks(
        "regions",
        "Target Acquisition Region",
        [
          "United Kingdom (UK Properties)",
          "Continental Europe (EU Properties)",
          "USA",
          "African/Nigerian Port Corridors (High-yield local assets near trade zones)",
        ],
        { required: true, others: true, showIf: NEW_ONLY }
      ),
    ],
  },
  {
    title: "Budget & Capital Capabilities",
    intro: "An estimate is enough at this stage.",
    fields: [
      radio("currency", "Currency", ["USD", "EUR", "GBP"], { showIf: NEW_ONLY }),
      radio(
        "capitalRange",
        "Estimated Capital Allocation",
        ["250,000 – 500,000", "500,000 – 1,000,000", "1,000,000 – 5,000,000", "5,000,000+"],
        { hint: "Choose the band in the currency selected above.", showIf: NEW_ONLY }
      ),
      radio(
        "fundsSource",
        "Source of Investment Funds",
        ["Corporate Profits / Business Income", "Liquidated Investments / Stocks", "Inheritance / Personal Savings"],
        { showIf: NEW_ONLY }
      ),
      radio(
        "timeline",
        "Investment Timeline",
        ["Immediate Purchase (Within 30 days)", "Strategic Window (3–6 months)", "Portfolio Planning / Research Phase"],
        { showIf: NEW_ONLY }
      ),
    ],
  },
  {
    title: "Compliance & Verification",
    intro: "Please read and accept all three statements to submit your enquiry.",
    fields: [
      ack("ackPassport", "I confirm that my provided details match my official government-issued passport."),
      ack(
        "ackPrivacy",
        "I understand that Elmivet International Limited processes all information under strict global privacy laws (GDPR/NDPA compliance)."
      ),
      ack(
        "ackContact",
        "I acknowledge that an Elmivet Point of Contact will reach out within official working hours (8:00 AM – 5:00 PM WAT, Monday to Friday) or via remote demand arrangements."
      ),
    ],
  },
];

/* Phone: must begin with + and a country calling code, 7 to 15 digits in total. */
export const PHONE_RE = /^\+[\d\s().-]+$/;
export const PHONE_MESSAGE = "Enter your number with the country calling code, for example +44 7700 900123.";

/* Uses the shared validate() for the generic rules, then adds the extra checks.
   Hidden fields are skipped because every rule goes through isVisible(). */
export function validateOffshore(fields, values) {
  const errors = validate(fields.filter((fd) => fd.type !== "ack"), values, []);
  fields.forEach((fd) => {
    if (!isVisible(fd, values)) return;
    if (fd.type === "ack" && !values[fd.name]) {
      errors[fd.name] = "You must accept this statement to submit.";
    }
    if (fd.name === "phone" && !errors.phone && values.phone) {
      const phone = String(values.phone).trim();
      const digits = phone.replace(/\D/g, "");
      if (!PHONE_RE.test(phone) || digits.length < 7 || digits.length > 15 || digits[0] === "0") {
        errors.phone = PHONE_MESSAGE;
      }
    }
  });
  return errors;
}

/* Only fields that are visible for the chosen investor type are sent. */
export function buildOffshorePayload(fields, values, reference) {
  const registered = values.investorType === OFFSHORE_REGISTERED;
  const visible = fields.filter((fd) => isVisible(fd, values));
  const answers = {};
  visible.forEach((fd) => {
    if (fd.type === "ack") return;
    const v = values[fd.name];
    answers[fd.label] = Array.isArray(v) ? v : String(v ?? "").trim();
    if (fd.type === "checkbox" && Array.isArray(v) && v.includes("Others")) {
      answers[`${fd.label} (Others)`] = String(values[`${fd.name}_other`] ?? "").trim();
    }
  });
  const acknowledgements = visible
    .filter((fd) => fd.type === "ack")
    .map((fd) => ({ statement: fd.label, accepted: true }));
  return {
    form: "real-estate-offshore-investment-enquiry",
    formNumber: 20,
    reference,
    submittedAt: new Date().toISOString(),
    investorType: registered ? "registered-member" : "new-international-investor",
    answers,
    ...(acknowledgements.length ? { acknowledgements } : {}),
  };
}

/* Never reports success unless the server confirms it. Never logs the payload. */
export async function submitOffshoreEnquiry(payload) {
  if (!OFFSHORE_ENQUIRY_ENDPOINT) {
    console.error("Offshore enquiry NOT sent: OFFSHORE_ENQUIRY_ENDPOINT is not configured.");
    return { ok: false, reason: "not-configured" };
  }
  try {
    const res = await fetch(OFFSHORE_ENQUIRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: true, elmReference: data && typeof data.elmReference === "string" ? data.elmReference.trim() : "" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
/* OFFSHORE-LOGIC-END */

export const ackClass = choiceClass.replace("items-center", "items-start");

/* Gentle fade-in used when a field or step appears (no hidden inputs stay mounted). */
export function FadeIn({ children, className = "" }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function AckBox({ field, formId, checked, onChange, error }) {
  const id = `${formId}-${field.name}`;
  return (
    <div>
      <label htmlFor={id} className={ackClass}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D9232D]"
        />
        <span className="leading-relaxed">
          {field.label}
          <span className="text-[#D9232D]" aria-hidden="true">
            {" "}
            *
          </span>
        </span>
      </label>
      <FieldError id={`${id}-err`} message={error} />
    </div>
  );
}

export function OffshoreInvestmentModal({ service, onClose }) {
  const formId = `offshore-${service.num}`;
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const submittingRef = useRef(false); // blocks double-clicks before state updates land
  const submitArmedAt = useRef(0); // time before which a click on Submit is ignored (see SUBMIT_CLICK_GUARD_MS)
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);
  const [done, setDone] = useState(null); // { elmReference, registered }

  const isRegistered = values.investorType === OFFSHORE_REGISTERED;
  // Registered members get a single short step; new investors get all five.
  const steps = isRegistered ? [OFFSHORE_STEPS[0]] : OFFSHORE_STEPS;
  const lastStep = steps.length - 1;
  const current = Math.min(step, lastStep);
  const fields = steps.flatMap((st) => st.fields);

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setSendFailed(false);
    setErrors((prev) => {
      if (name === "investorType") return {}; // a different journey: old messages no longer apply
      if (!prev[name] && !prev[`${name}_other`]) return prev;
      const rest = { ...prev };
      delete rest[name];
      delete rest[`${name}_other`];
      return rest;
    });
  };

  useEffect(() => {
    if (current > 0) headingRef.current?.focus();
  }, [current]);

  useEffect(() => {
    if (sendFailed) formRef.current?.querySelector("[data-send-error]")?.scrollIntoView({ block: "center" });
  }, [sendFailed]);

  const focusFirstError = (found) => {
    const first = Object.keys(found)[0];
    window.setTimeout(() => {
      const el = document.getElementById(`${formId}-${first}`);
      if (el) el.focus();
      else formRef.current?.querySelector('[role="alert"]')?.scrollIntoView({ block: "center" });
    }, 0);
  };

  const handleNext = () => {
    const found = validateOffshore(steps[current].fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    submitArmedAt.current = Date.now() + SUBMIT_CLICK_GUARD_MS;
    setStep((n) => Math.min(n + 1, lastStep));
  };

  const handlePrevious = () => {
    setErrors({});
    setStep((n) => Math.max(n - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (current < lastStep) {
      handleNext();
      return;
    }
    if (submittingRef.current) return;

    const honeypot = new FormData(e.currentTarget).get("website");
    const found = validateOffshore(fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const badStep = steps.findIndex((st) =>
        st.fields.some((fd) => found[fd.name] || found[`${fd.name}_other`])
      );
      if (badStep !== -1 && badStep !== current) {
        setStep(badStep);
        return;
      }
      focusFirstError(found);
      return;
    }

    const reference = `ELM-${service.num}-${Date.now().toString(36).toUpperCase()}`;
    if (honeypot) {
      setDone({ elmReference: "", registered: isRegistered }); // bots only: nothing is sent, no reference shown
      return;
    }

    submittingRef.current = true;
    setSending(true);
    setSendFailed(false);
    let result;
    try {
      result = await submitOffshoreEnquiry(buildOffshorePayload(fields, values, reference));
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
    if (result.ok) setDone({ elmReference: result.elmReference, registered: isRegistered });
    else setSendFailed(true);
  };

  /* ---------------- Confirmation (only after the server confirmed) ---------------- */
  if (done) {
    return (
      <ModalShell onClose={onClose} titleId={`${formId}-title`}>
        <div className="px-6 py-10 text-center sm:px-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center bg-[#0A2540]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
          </span>
          <span className="mt-6 block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Enquiry Received
          </span>
          <h2 id={`${formId}-title`} className="mt-2 font-serif text-3xl font-bold text-[#0A2540]">
            {service.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-slate-600">
            {done.registered ? REGISTERED_MESSAGE : NEW_INVESTOR_MESSAGE}
          </p>
          {done.elmReference && (
            <p className="mt-3 font-mono text-xs text-slate-500">Reference: {done.elmReference}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="mt-8 font-sans text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-[#D9232D]"
          >
            Close
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} titleId={`${formId}-title`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
        <div>
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Investment Enquiry · Form {String(service.num).padStart(2, "0")}
          </span>
          <h2 id={`${formId}-title`} className="mt-1 font-serif text-2xl font-bold text-[#0A2540]">
            {service.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close enquiry form"
          className="-mr-2 shrink-0 p-2 text-slate-500 hover:text-[#D9232D]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="px-6 py-6 sm:px-8">
        {/* Step indicator: hidden for the short registered-member journey */}
        {!isRegistered && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
                Step {current + 1} of {steps.length}
              </span>
              <span
                ref={headingRef}
                tabIndex={-1}
                className="text-right font-serif text-lg font-bold text-[#0A2540] outline-none"
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
        )}

        <p className="mb-6 font-sans text-sm leading-relaxed text-slate-600">{steps[current].intro}</p>

        <div key={current} className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {steps[current].fields
            .filter((fd) => isVisible(fd, values))
            .map((fd) => (
              <FadeIn key={fd.name} className={fd.wide || WIDE_TYPES.includes(fd.type) ? "sm:col-span-2" : ""}>
                {fd.type === "ack" ? (
                  <AckBox
                    field={fd}
                    formId={formId}
                    checked={Boolean(values[fd.name])}
                    onChange={(checked) => setValue(fd.name, checked)}
                    error={errors[fd.name]}
                  />
                ) : (
                  <Field
                    field={fd}
                    formId={formId}
                    values={values}
                    setValue={setValue}
                    errors={errors}
                    files={[]}
                    setFiles={() => {}}
                  />
                )}
                {fd.hint && fd.type !== "textarea" && (
                  <p className="mt-1.5 font-sans text-xs text-slate-500">{fd.hint}</p>
                )}
              </FadeIn>
            ))}

          {current === 0 && isRegistered && (
            <FadeIn className="sm:col-span-2">
              <p
                role="status"
                className="border-l-4 border-[#0A2540] bg-slate-50 px-4 py-3 font-sans text-sm leading-relaxed text-slate-700"
              >
                {REGISTERED_MESSAGE}
              </p>
            </FadeIn>
          )}
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]">
            Please correct the highlighted fields and {current < lastStep ? "continue" : "submit again"}.
          </p>
        )}

        {sendFailed && (
          <div
            data-send-error
            role="alert"
            className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]"
          >
            <p>
              We could not send your enquiry just now. Your answers are still here, so you can try again. If this
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
            Fields marked * are required.
          </p>
          <div className="flex gap-3">
            {current === 0 ? (
              <button
                type="button"
                onClick={onClose}
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
            {current < lastStep ? (
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
                {sending ? "Sending..." : "Submit Enquiry"}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* ==========================================================================
   Editorial image placeholder
   - Offset outline frame (mirrors to the other side when `mirror` is true)
   - Red corner tab, inner keyline and a clear "[Division Image Placeholder]" tag
   - Optional overlapping caption plate
   - Pass `src` to swap in a real photo; the frame, tab and caption stay.
   ========================================================================== */
export function ImagePlaceholder({
  src,
  alt = "",
  label = "[Division Image Placeholder]",
  caption,
  aspect = "aspect-[4/3]",
  mirror = false,
  onDark = false,
  className = "",
}) {
  return (
    <figure className={`relative ${className}`}>
      {/* Offset editorial frame */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 translate-y-3 border ${
          mirror ? "-translate-x-3" : "translate-x-3"
        } ${onDark ? "border-white/30" : "border-[#0A2540]/30"}`}
      />

      {/* Image area */}
      <div className={`relative overflow-hidden bg-[#0A2540] shadow-lg ${aspect}`}>
        {src ? (
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-linear-to-br from-[#0A2540] via-[#12385e] to-[#245A8D]" />
            <span aria-hidden="true" className="absolute inset-3 border border-white/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-white/60">
              <ImageIcon className="h-9 w-9" strokeWidth={1.25} aria-hidden="true" />
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-widest">
                {label}
              </span>
            </div>
          </>
        )}
        {/* Red corner tab */}
        <span aria-hidden="true" className="absolute left-0 top-0 h-1 w-16 bg-[#D9232D]" />
      </div>

      {/* Overlapping caption plate */}
      {caption && (
        <figcaption
          className={`relative -mt-4 block w-fit bg-white px-4 py-2 font-sans text-[0.6875rem] font-bold uppercase tracking-widest text-[#0A2540] shadow-md ${
            mirror ? "ml-auto mr-4" : "ml-4"
          }`}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
