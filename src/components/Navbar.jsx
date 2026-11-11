import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

// Paths and labels exactly as specified.
// Tip: lowercase, hyphenated paths ('/about', '/industries', '/global-insight')
// are cleaner URLs than '/About Us', which the browser encodes as '/About%20Us'.
// If you change a path here, change the matching <Route path> in App.jsx too.
const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services', mega: true },
  { label: 'About', to: '/About' },
  { label: 'Contact & Support', to: '/contact' },
  { label: 'Global Insight', to: '/GlobalInsight' },
];

const CTA = { label: 'Book for Consultation' };

// Division ids match the section ids rendered on the Services page,
// so every link below deep-links to /services#<division-id>.
const SERVICES_PATH = '/services';
const DIVISIONS = [
  {
    id: 'global-trade',
    num: '01',
    title: 'Global Trade Division',
    services: [
      'Import & Export Facilitation',
      'Ocean & Air Freight Forwarding',
      'Clearing & Customs Brokerage',
      'Groupage / LCL Services',
      'Bonded Terminal Operations',
    ],
  },
  {
    id: 'logistics-supply-chain',
    num: '02',
    title: 'Logistics & Supply Chain Division',
    services: [
      'Road Haulage & Industrial Logistics',
      'Warehousing & Storage',
      'Packing & Removal',
      'Domestic Bulk Haulage',
    ],
  },
  {
    id: 'commercial',
    num: '03',
    title: 'Commercial Division',
    services: [
      'Automobile Dealership & Importation',
      'Real Estate & Project Request',
      'Procurement & Bulk Merchandise',
    ],
  },
  {
    id: 'industrial',
    num: '04',
    title: 'Industrial Division',
    services: [
      'General Cleaning Services',
      'Energy Solutions',
      'Petroleum Marketing',
      'Fabrication & Construction',
      'Oil Servicing',
      'Marine Services',
    ],
  },
];

const divisionLink = (id) => ({ pathname: SERVICES_PATH, hash: `#${id}` });

const SCROLL_HIDE_THRESHOLD = 80; // px scrolled before the bar may hide
const SCROLL_REVEAL_ZONE = 50; // px from top where the bar is always shown
const SCROLL_JITTER = 6; // ignore tiny scroll movements
const MEGA_CLOSE_DELAY = 120; // ms grace period so the pointer can travel into the panel

/* ==========================================================================
   Consultation modal (same shell + form styling patterns as the Services page)
   ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  'w-full border border-slate-300 bg-white px-3 py-2.5 font-sans text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0A2540]';

const choiceClass =
  'flex cursor-pointer items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 font-sans text-sm text-slate-700 transition-colors has-checked:border-[#0A2540] has-checked:bg-slate-50 has-checked:font-semibold has-checked:text-[#0A2540]';

const CONSULT_FIELDS = [
  {
    name: 'clientName',
    label: 'Client’s Name',
    type: 'text',
    required: true,
    placeholder: 'Enter Company’s Name or Full Names',
    autoComplete: 'name',
    wide: true,
  },
  {
    name: 'clientType',
    label: 'Client Type',
    type: 'radio',
    required: true,
    options: ['Corporate Client', 'Business Owner', 'Individual Customers'],
  },
  {
    name: 'email',
    label: 'Contact Email Address',
    type: 'email',
    required: true,
    autoComplete: 'email',
  },
  {
    name: 'phone',
    label: 'Phone Number (WhatsApp Preferred)',
    type: 'tel',
    required: true,
    autoComplete: 'tel',
  },
  {
    name: 'division',
    label: 'Target Division for Advisory',
    type: 'select',
    required: true,
    options: ['Global Trade', 'Logistics', 'Commercial', 'Industrial', 'Others'],
  },
  {
    name: 'area',
    label: 'Area of Consultation',
    type: 'select',
    options: [
      'Customs Duty Optimization',
      'Trade Compliance',
      'Supply Chain Logistics',
      'Bulk Material Supply Contracts',
      'Procurement & Sourcing',
      'Real Estate Development',
      'Oilfield/Marine Engineering',
      'Others',
    ],
  },
  {
    name: 'challenge',
    label: 'Describe Your Business Challenge / Project Inquiry',
    type: 'textarea',
    required: true,
  },
  {
    name: 'method',
    label: 'Preferred Consultation Method',
    type: 'radio',
    required: true,
    options: ['Phone Call', 'Email', 'In-Person Office Visit'],
  },
  {
    name: 'schedule',
    label: 'Preferred Date & Time',
    type: 'datetime-local',
  },
];

/* Two-step wizard: who you are, then what you need */
const CONSULT_STEPS = [
  { title: 'Your Details', names: ['clientName', 'clientType', 'email', 'phone'] },
  {
    title: 'Consultation Details',
    names: ['division', 'area', 'challenge', 'method', 'schedule'],
  },
].map((st) => ({
  title: st.title,
  fields: st.names.map((n) => CONSULT_FIELDS.find((fd) => fd.name === n)),
}));

function validateConsultation(values, fields = CONSULT_FIELDS) {
  const errors = {};
  fields.forEach((fd) => {
    const v = values[fd.name];
    if (fd.required && !String(v ?? '').trim()) {
      errors[fd.name] =
        fd.type === 'radio' || fd.type === 'select'
          ? 'Please choose an option.'
          : 'This field is required.';
    } else if (fd.type === 'email' && v && !EMAIL_RE.test(v)) {
      errors[fd.name] = 'Enter a valid email address.';
    } else if (fd.type === 'tel' && v && v.replace(/\D/g, '').length < 7) {
      errors[fd.name] = 'Enter a valid phone number.';
    } else if (fd.type === 'datetime-local' && v && new Date(v) < new Date()) {
      errors[fd.name] = 'Choose a future date and time.';
    }
  });
  return errors;
}

/* Mock backend call. Replace with a real POST; add any hidden copy server-side. */
async function submitConsultation(payload) {
  console.info('[Elmivet consultation request]', payload);
  // await fetch("/api/consultations", { method: "POST", body: JSON.stringify(payload) });
  await new Promise((r) => setTimeout(r, 900));
  return { ok: true };
}

const nowForDateTimeInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function ModalShell({ onClose, titleId, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    const originalOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center overflow-y-auto bg-[#0A2540]/70 p-0 backdrop-blur-sm sm:p-6"
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

function ConsultField({ field, formId, values, setValue, errors, minDateTime }) {
  const id = `${formId}-${field.name}`;
  const err = errors[field.name];
  const wide = field.wide || ['radio', 'textarea'].includes(field.type);
  const labelNode = (
    <>
      {field.label}
      {field.required && (
        <span className="text-[#D9232D]" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </>
  );
  const labelClass = 'mb-1.5 block font-sans text-sm font-semibold text-[#0A2540]';
  const v = values[field.name];

  let control;
  if (field.type === 'radio') {
    control = (
      <fieldset aria-describedby={err ? `${id}-err` : undefined}>
        <legend className={labelClass}>{labelNode}</legend>
        <div className="flex flex-wrap gap-3">
          {field.options.map((opt) => (
            <label key={opt} className={choiceClass}>
              <input
                type="radio"
                name={`${formId}-${field.name}`}
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
  } else if (field.type === 'select') {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <select
          id={id}
          value={v || ''}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        >
          <option value="">Select an option</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </>
    );
  } else if (field.type === 'textarea') {
    control = (
      <>
        <label htmlFor={id} className={labelClass}>
          {labelNode}
        </label>
        <textarea
          id={id}
          rows={4}
          value={v || ''}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
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
          placeholder={field.placeholder}
          min={field.type === 'datetime-local' ? minDateTime : undefined}
          value={v || ''}
          onChange={(e) => setValue(field.name, e.target.value)}
          aria-invalid={Boolean(err)}
          aria-describedby={err ? `${id}-err` : undefined}
          className={inputClass}
        />
      </>
    );
  }

  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      {control}
      {err && (
        <p id={`${id}-err`} role="alert" className="mt-1.5 font-sans text-xs font-medium text-[#D9232D]">
          {err}
        </p>
      )}
    </div>
  );
}

function ConsultationModal({ onClose }) {
  const formId = 'consult';
  const lastStep = CONSULT_STEPS.length - 1;
  const [step, setStep] = useState(0);
  const stepHeadingRef = useRef(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState(null);
  const [minDateTime] = useState(nowForDateTimeInput);

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    if (step > 0) stepHeadingRef.current?.focus();
  }, [step]);

  const handleNext = () => {
    const found = validateConsultation(values, CONSULT_STEPS[step].fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    setStep((n) => Math.min(n + 1, lastStep));
  };

  const handlePrevious = () => {
    setErrors({});
    setStep((n) => Math.max(n - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Pressing Enter on the first step advances instead of submitting
    if (step < lastStep) {
      handleNext();
      return;
    }
    const honeypot = new FormData(e.currentTarget).get('website');
    const found = validateConsultation(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      const badStep = CONSULT_STEPS.findIndex((st) => st.fields.some((fd) => found[fd.name]));
      if (badStep !== -1 && badStep !== step) {
        setStep(badStep);
        return;
      }
      document.getElementById(`${formId}-${first}`)?.focus();
      return;
    }
    const ref = `ELM-ADV-${Date.now().toString(36).toUpperCase()}`;
    if (honeypot) {
      setReference(ref);
      return;
    }

    const answers = {};
    CONSULT_FIELDS.forEach((fd) => {
      answers[fd.label] = values[fd.name] ?? '';
    });

    setSending(true);
    await submitConsultation({
      subject: 'Executive Advisory Session Request',
      reference: ref,
      answers,
    });
    setSending(false);
    setReference(ref);
  };

  if (reference) {
    return (
      <ModalShell onClose={onClose} titleId="consult-thanks-title">
        <div className="px-6 py-10 text-center sm:px-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center bg-[#0A2540]">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" aria-hidden="true" />
          </span>
          <span className="mt-6 block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Request Received
          </span>
          <h2 id="consult-thanks-title" className="mt-2 font-serif text-3xl font-bold text-[#0A2540]">
            Thank you. Our team is on it.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-sans leading-relaxed text-slate-600">
            Your advisory session request has been logged. A member of our team will contact you
            using your preferred method within <strong className="text-[#0A2540]">24 hours</strong>.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-500">Reference: {reference}</p>
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
            Book for Consultation
          </span>
          <h2 id={`${formId}-title`} className="mt-1 font-serif text-2xl font-bold text-[#0A2540]">
            Request an Executive Advisory Session
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close consultation form"
          className="-mr-2 shrink-0 p-2 text-slate-500 hover:text-[#D9232D]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="px-6 py-6 sm:px-8">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
              Step {step + 1} of {CONSULT_STEPS.length}
            </span>
            <span
              ref={stepHeadingRef}
              tabIndex={-1}
              className="font-serif text-lg font-bold text-[#0A2540] outline-none"
            >
              {CONSULT_STEPS[step].title}
            </span>
          </div>
          <div
            className="mt-3 flex gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={CONSULT_STEPS.length}
            aria-valuenow={step + 1}
            aria-label={`Step ${step + 1} of ${CONSULT_STEPS.length}: ${CONSULT_STEPS[step].title}`}
          >
            {CONSULT_STEPS.map((st, i) => (
              <span
                key={st.title}
                aria-hidden="true"
                className={`h-1 flex-1 transition-colors ${i <= step ? 'bg-[#D9232D]' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {CONSULT_STEPS[step].fields.map((fd) => (
            <ConsultField
              key={fd.name}
              field={fd}
              formId={formId}
              values={values}
              setValue={setValue}
              errors={errors}
              minDateTime={minDateTime}
            />
          ))}
        </div>

        {/* Honeypot: hidden from people, tempting to bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="mt-6 border-l-4 border-[#D9232D] bg-red-50 px-4 py-3 font-sans text-sm text-[#D9232D]">
            Please correct the highlighted fields and {step < lastStep ? 'continue' : 'submit again'}.
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-sans text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#0A2540]" aria-hidden="true" />
            Your request is sent securely to our advisory desk.
          </p>
          <div className="flex gap-3">
            {step === 0 ? (
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
            {step < lastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D]"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#D9232D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Submit Request'}
                {!sending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/* Smooth vertical expand/collapse (grid-rows trick); `invisible` keeps closed links out of the tab order */
function Collapse({ open, id, children }) {
  return (
    <div
      id={id}
      className={[
        'grid transition-[grid-template-rows,visibility] duration-300 ease-in-out',
        open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
      ].join(' ')}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/* ==========================================================================
   Navbar
   ========================================================================== */
export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [openDivision, setOpenDivision] = useState(null);
  const [consultOpen, setConsultOpen] = useState(false);

  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const megaTimer = useRef(null);
  const location = useLocation();

  // Smart hide / show on scroll (throttled with rAF, listener registered once)
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastScrollY.current) >= SCROLL_JITTER) {
        if (y < SCROLL_REVEAL_ZONE || y < lastScrollY.current) {
          setIsVisible(true);
        } else if (y > SCROLL_HIDE_THRESHOLD) {
          setIsVisible(false);
          setIsMobileMenuOpen(false);
          setMegaOpen(false);
        }
        lastScrollY.current = y;
      }
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setIsMobileMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  // Close the mega menu with Escape
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMegaOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [megaOpen]);

  useEffect(() => () => clearTimeout(megaTimer.current), []);

  // Deep links (/services#division-id): the router doesn't scroll to hashes, so do it here.
  // Retries briefly because the Services page may still be mounting after navigation.
  useEffect(() => {
    if (!location.hash) return undefined;
    const id = decodeURIComponent(location.hash.slice(1));
    let tries = 0;
    let timer;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (tries++ < 20) timer = setTimeout(attempt, 50);
    };
    timer = setTimeout(attempt, 0);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash, location.key]);

  const closeMenu = () => setIsMobileMenuOpen(false);

  const openMega = () => {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const scheduleCloseMega = () => {
    clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMegaOpen(false), MEGA_CLOSE_DELAY);
  };
  const closeMegaNow = () => {
    clearTimeout(megaTimer.current);
    setMegaOpen(false);
  };

  const openConsultation = () => {
    closeMenu();
    closeMegaNow();
    setConsultOpen(true);
  };

  // Desktop link: navy/slate highlight box on hover (no red); accent only for the active page
  const desktopLink = ({ isActive }, forceHover = false) =>
    [
      'relative inline-flex items-center gap-1 rounded-md px-3 py-2 font-sans text-sm transition-colors duration-200',
      "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-accent after:transition-transform after:duration-300 after:content-['']",
      isActive
        ? `font-bold text-accent after:scale-x-100 hover:bg-slate-100 ${forceHover ? 'bg-slate-100' : ''}`
        : `font-medium after:scale-x-0 hover:bg-slate-100 hover:text-primary ${
            forceHover ? 'bg-slate-100 text-primary' : 'text-slate-600'
          }`,
    ].join(' ');

  // Mobile link: full-width row with a red spine when active
  const mobileLink = ({ isActive }) =>
    [
      'block border-l-2 py-3 pl-4 font-sans text-base transition-colors duration-200',
      isActive
        ? 'border-accent font-bold text-accent'
        : 'border-transparent font-medium text-primary hover:border-border-strong hover:text-accent',
    ].join(' ');

  const onServicesRoute = location.pathname.toLowerCase().startsWith(SERVICES_PATH);

  return (
    <header
      className={[
        // Always-visible background; the bar takes up its own space so page content starts below it
        'sticky top-0 z-50 w-full border-b border-border bg-white/90 shadow-md backdrop-blur-md',
        'transition-transform duration-300 ease-in-out',
        isVisible ? 'translate-y-0' : '-translate-y-full',
      ].join(' ')}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-18 w-full max-w-[75rem] items-center justify-between px-5"
      >
        {/* Brand */}
        <Link
          to="/"
          onClick={closeMenu}
          aria-label="Elmivet International, home"
          className="flex items-center gap-3"
        >
          {!logoFailed ? (
            <img
              src="/assets/logo.png"
              alt=""
              className="h-9 w-auto object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-md bg-primary font-serif text-xl font-bold text-white"
            >
              E
            </span>
          )}

          <span className="flex flex-col">
            <span
              className="font-serif text-xl font-extrabold leading-none tracking-wide text-primary"
            >
              ELMIVET
            </span>
            <span className="mt-1 font-sans text-[0.5625rem] font-bold leading-none tracking-[0.2em] text-accent">
              INTERNATIONAL
            </span>
          </span>
        </Link>

        {/* Desktop links (list stretches to the full bar height so the pointer never leaves the hover zone) */}
        <ul className="hidden items-center gap-1 self-stretch lg:flex xl:gap-2">
          {NAV_ITEMS.map((item) =>
            item.mega ? (
              <li
                key={item.to}
                className="flex items-center self-stretch"
                onMouseEnter={openMega}
                onMouseLeave={scheduleCloseMega}
                onFocus={openMega}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) scheduleCloseMega();
                }}
              >
                <NavLink
                  to={item.to}
                  aria-haspopup="true"
                  aria-expanded={megaOpen}
                  aria-controls="mega-services"
                  onClick={closeMegaNow}
                  className={(state) => desktopLink(state, megaOpen)}
                >
                  {item.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={`size-3.5 transition-transform duration-200 ${megaOpen ? 'rotate-180' : ''}`}
                  />
                </NavLink>

                {/* Mega menu: spans the full header width, anchored to the bottom of the bar */}
                <div
                  id="mega-services"
                  className={[
                    'absolute inset-x-0 top-full',
                    'transition-[opacity,transform,visibility] duration-200 ease-out',
                    megaOpen
                      ? 'visible translate-y-0 opacity-100'
                      : 'pointer-events-none invisible -translate-y-2 opacity-0',
                  ].join(' ')}
                >
                  <div className="mx-auto grid w-full max-w-[75rem] grid-cols-4 gap-4 px-5 pb-8 pt-3">
                    {DIVISIONS.map((d) => (
                      <div key={d.id} className="rounded-md border border-border bg-white p-4 shadow-lg">
                        <Link
                          to={divisionLink(d.id)}
                          onClick={closeMegaNow}
                          className="group -mx-2 block rounded-md border-t-4 border-primary px-2 pb-2 pt-3 transition-colors duration-200 hover:bg-slate-100"
                        >
                          <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-widest text-accent">
                            Division {d.num}
                          </span>
                          <span className="mt-1 block font-serif text-lg font-bold leading-snug text-primary">
                            {d.title}
                          </span>
                        </Link>
                        <ul className="mt-2 flex flex-col">
                          {d.services.map((s) => (
                            <li key={s}>
                              <Link
                                to={divisionLink(d.id)}
                                onClick={closeMegaNow}
                                className="-mx-2 block rounded-md px-2 py-1.5 font-sans text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-primary"
                              >
                                {s}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ) : (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className={desktopLink}>
                  {item.label}
                </NavLink>
              </li>
            )
          )}
        </ul>

        {/* Desktop CTA */}
        <button
          type="button"
          onClick={openConsultation}
          aria-haspopup="dialog"
          className="hidden rounded-md bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover lg:inline-block"
        >
          {CTA.label}
        </button>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-drawer"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="flex size-10 flex-col items-center justify-center gap-[5px] rounded-md lg:hidden"
        >
          <span
            className={`h-0.5 w-6 bg-primary transition-all duration-300 ${
              isMobileMenuOpen ? 'translate-y-[7px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-primary transition-all duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`h-0.5 w-6 bg-primary transition-all duration-300 ${
              isMobileMenuOpen ? '-translate-y-[7px] -rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      {/* Mobile drawer: animates height via grid rows; `invisible` removes closed links from tab order */}
      <div
        id="mobile-drawer"
        className={[
          'grid transition-[grid-template-rows,visibility] duration-300 ease-in-out lg:hidden',
          isMobileMenuOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-border bg-white px-5 pb-6 pt-3">
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) =>
                item.mega ? (
                  <li key={item.to}>
                    <button
                      type="button"
                      aria-expanded={mobileServicesOpen}
                      aria-controls="mobile-services"
                      onClick={() => setMobileServicesOpen((o) => !o)}
                      className={[
                        'flex w-full items-center justify-between border-l-2 py-3 pl-4 pr-2 text-left font-sans text-base transition-colors duration-200',
                        onServicesRoute
                          ? 'border-accent font-bold text-accent'
                          : 'border-transparent font-medium text-primary hover:border-border-strong hover:text-accent',
                      ].join(' ')}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={`size-5 shrink-0 transition-transform duration-300 ${
                          mobileServicesOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <Collapse open={mobileServicesOpen} id="mobile-services">
                      <ul className="ml-4 flex flex-col border-l border-border">
                        {DIVISIONS.map((d) => {
                          const isOpen = openDivision === d.id;
                          return (
                            <li key={d.id}>
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={`mobile-division-${d.id}`}
                                onClick={() => setOpenDivision(isOpen ? null : d.id)}
                                className="flex w-full items-center justify-between py-2.5 pl-4 pr-2 text-left font-sans text-sm font-semibold text-primary transition-colors duration-200 hover:text-accent"
                              >
                                {d.title}
                                <ChevronRight
                                  aria-hidden="true"
                                  className={`size-4 shrink-0 text-slate-400 transition-transform duration-300 ${
                                    isOpen ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>

                              <Collapse open={isOpen} id={`mobile-division-${d.id}`}>
                                <ul className="flex flex-col pb-2 pl-4">
                                  {d.services.map((s) => (
                                    <li key={s}>
                                      <Link
                                        to={divisionLink(d.id)}
                                        onClick={closeMenu}
                                        className="block border-l border-border py-2 pl-4 font-sans text-sm text-slate-600 transition-colors duration-200 hover:border-primary hover:text-primary"
                                      >
                                        {s}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </Collapse>
                            </li>
                          );
                        })}
                      </ul>
                    </Collapse>
                  </li>
                ) : (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={closeMenu}
                      className={mobileLink}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                )
              )}
            </ul>

            <button
              type="button"
              onClick={openConsultation}
              aria-haspopup="dialog"
              className="mt-4 block w-full rounded-md bg-primary px-5 py-3 text-center font-sans text-sm font-semibold text-white transition-colors duration-200 hover:bg-primary-hover"
            >
              {CTA.label}
            </button>
          </div>
        </div>
      </div>

      {/* Portalled to <body>: the header's transform/backdrop-filter would otherwise trap a fixed overlay */}
      {consultOpen && createPortal(<ConsultationModal onClose={() => setConsultOpen(false)} />, document.body)}
    </header>
  );
}
