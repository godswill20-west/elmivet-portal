import { useEffect, useRef, useState } from "react";
import {
  Globe,
  Building2,
  Warehouse,
  Anchor,
  Ship,
  MapPin,
  Truck,
  PhoneCall,
  MessageSquare,
  Mail,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  PackageCheck,
  Wrench,
} from "lucide-react";

/* ==========================================================================
   Scroll-triggered reveal using the project's `animate-mouth-opening` class.
   Hidden (opacity-0) until it enters the viewport, then plays once.
   ========================================================================== */
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
      className={`${className} ${visible ? "animate-mouth-opening" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Content
   ========================================================================== */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=2000";

const HUBS = [
  {
    Icon: Building2,
    title: "Group Head Office",
    address:
      "Mummy B Road, Opposite AXXA Mansard, Off Stadium Road, Port Harcourt, Rivers State, Nigeria.",
  },
  {
    Icon: Warehouse,
    title: "Logistics & Industrial Hub",
    address: "5 Alode Road, Eleme, Rivers State, Nigeria.",
  },
  {
    Icon: Anchor,
    title: "On-Dock Facility",
    address: "Tin Can Island Port, Lagos State, Nigeria.",
  },
  {
    Icon: Ship,
    title: "China Strategic Warehouse",
    address:
      "1st Floor, Yongsheng Building, Yongyi 1st Road, Henglan Town, Zhongshan City, Guangdong Province, China.",
  },
];

const REGIONAL = [
  {
    title: "Port Harcourt Terminal",
    address:
      "21 Bekwere Wosu (Formerly Igboukwu Street), D-Line, Port Harcourt, Rivers State.",
  },
  {
    title: "Lagos Transit Hub",
    address:
      "Adebola House (Suite 100, Rear Wing), 38 Opebi Road, Ikeja, Lagos State.",
  },
  {
    title: "Abuja Office",
    address:
      "Plot 104, Apartment 4, Emmanuel Adiele Street, Off Mike Akhigbe Way, Jabi, FCT Abuja.",
  },
  {
    title: "Aba Center",
    address: "15 Margaret Avenue, Beside Enitona Hotel, Old GRA, Aba, Abia State.",
  },
  {
    title: "Anambra Outlet / Market Hub",
    address:
      "Shop 12, Central Line, Zone 3, Electrical Dealers International Market, Obosi, Anambra State.",
  },
];

const EMAIL_BLOCKS = [
  {
    Icon: Mail,
    title: "General Enquiries & Partnerships",
    mailbox: "info@elmivet.com",
  },
  {
    Icon: FileText,
    title: "Service Quotations",
    mailbox: "quotes@elmivet.com",
  },
  {
    Icon: ShieldAlert,
    title: "Complaints & Escalations",
    mailbox: "escalations@elmivet.com",
  },
  {
    Icon: PackageCheck,
    title: "Logistics & After Sale Support",
    mailbox: "support@elmivet.com",
  },
  {
    Icon: Building2,
    title: "Elmivet China Hub",
    mailbox: "china@elmivet.com",
  },
];

const WA_TEXT =
  "Hello%20Elmivet%20International%20Limited%2C%20I%20would%20like%20to%20make%20an%20enquiry";

/* Brand colours are written out in full so Tailwind can detect them. */
const SOCIALS = [
  {
    mark: "in",
    label: "LinkedIn: Elmivet International Limited",
    href: "https://www.linkedin.com/company/refiny-international-limited/",
    badge: "bg-[#0A66C2]",
    hover: "hover:border-[#0A66C2]",
  },
  {
    mark: "f",
    label: "Facebook: Elmivet Facebook Page",
    href: "https://www.facebook.com/share/19dNBZ3bwa/",
    badge: "bg-[#1877F2]",
    hover: "hover:border-[#1877F2]",
  },
  {
    mark: "X",
    label: "X: @Elmivet_int_ltd",
    href: "https://x.com/Elmivet_int_ltd",
    badge: "bg-black",
    hover: "hover:border-black",
  },
  {
    mark: "ig",
    label: "Instagram: @elmivet_international",
    href: "https://www.instagram.com/elmivet_international?stkn=YzhzeHFwNXhsY2p1",
    badge: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    hover: "hover:border-[#DD2A7B]",
  },
  {
    mark: "▶",
    label: "YouTube: Elmivet International Channel",
    href: "https://youtube.com/@elmivetinternationallimited?si=VT1Tvp-apbM5cAK8",
    badge: "bg-[#FF0000]",
    hover: "hover:border-[#FF0000]",
  },
];

const TIKTOK_CORPORATE = [
  {
    label: "Main Corporate Brand",
    handle: "@elmivet_int_ltd",
    href: "https://www.tiktok.com/@elmivet_int_ltd?_r=1&_t=ZS-9AEqhYIG8Ju",
  },
  {
    label: "Import/Export Division",
    handle: "@elmivet_impex",
    href: "https://www.tiktok.com/@elmivet_impex?_r=1&_t=ZS-9AEqlszZjVQ",
  },
  {
    label: "Logistics & Customs Clearance",
    handle: "@clearing_forwarding",
    href: "https://www.tiktok.com/@clearing_forwarding?_r=1&_t=ZS-9AEqs29ADt1",
  },
];

/* Shared link style for contact details */
const linkClass =
  "inline-flex items-center gap-1 font-medium text-[#0A2540] underline decoration-slate-300 underline-offset-4 transition-colors hover:text-[#D9232D] hover:decoration-[#D9232D]";

/* ==========================================================================
   Page
   ========================================================================== */
export default function Contact() {
  return (
    <main className="bg-slate-50 text-slate-700">
      {/* ---------------- 1a. Hero banner ---------------- */}
      <section
        aria-labelledby="hubs-heading"
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
      >
        {/* Dark navy overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#0A2540]/90 backdrop-blur-xs"
        />

        <div className="container relative z-10 pb-24 pt-16 sm:pt-20 md:pb-32 lg:pt-24">
          <span className="inline-flex items-center gap-2 bg-white px-3 py-1.5 font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            <Globe className="h-4 w-4 text-[#D9232D]" aria-hidden="true" />
            Global Infrastructure &amp; Hubs
          </span>

          <h1
            id="hubs-heading"
            className="mt-6 max-w-4xl font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Strategic Locations Across Nigeria &amp; China.
          </h1>

          <p className="mt-6 font-sans text-sm text-slate-300">
            Elmivet International Limited · RC 8809789
          </p>
          <span aria-hidden="true" className="mt-6 block h-1 w-16 bg-[#D9232D]" />
        </div>
      </section>

      {/* ---------------- 1b. Hub cards (overlap the hero from md up) ---------------- */}
      <section
        aria-label="Flagship locations"
        className="flow-root border-b border-slate-200 bg-white pb-16 pt-10 md:pt-0"
      >
        <div className="container">
          <div className="relative z-10 grid gap-6 md:-mt-16 md:grid-cols-2">
            {HUBS.map(({ Icon, title, address }, i) => (
              <Reveal key={title} delay={(i % 2) * 100} className="h-full">
                <article className="flex h-full items-start gap-5 border border-slate-200 border-l-4 border-l-[#0A2540] bg-slate-50 p-6 shadow-lg sm:p-8">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center border border-slate-200 bg-white shadow-sm"
                  >
                    <Icon className="h-6 w-6 text-[#D9232D]" />
                  </span>
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#0A2540]">
                      {title}
                    </h2>
                    <p className="mt-2 font-sans leading-relaxed text-slate-600">
                      {address}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="relative mt-12 mx-auto max-w-6xl px-4 pt-4">
          <blockquote
            className="relative rounded-3xl border border-slate-200 border-l-4 border-r-4 border-l-accent border-r-accent bg-slate-50 px-6 pt-12 pb-8 text-center sm:px-8 sm:pt-10 sm:pb-8"
          >
            
            {/* Centered Overlapping Badge with full-width red bottom line */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-lg sm:w-auto">
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-2 translate-y-2 border border-accent rounded-sm hidden sm:block"
              />
              <h2 className="relative flex flex-wrap items-center justify-center gap-2 bg-primary px-4 py-3.5 sm:px-6 sm:py-4 font-sans text-xs sm:text-sm font-bold uppercase tracking-[0.15em] sm:tracking-[0.25em] text-white text-center">
                <Wrench className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />
                <span className="leading-snug">Engineering &amp; Fabrication Yard</span>
              </h2>
            </div>

            {/* Centered Address Text with safe mobile spacing */}
            <p className="mt-4 font-sans text-sm sm:text-base leading-relaxed text-slate-600">
              Iwoye Street, Odogunyan, Ikorodu, Lagos
            </p>
          </blockquote>
        </Reveal>


      </section>

      {/* ---------------- 2. Cargo drop-off & regional operations ---------------- */}
      <section
        aria-labelledby="regional-heading"
        className="w-full bg-slate-100 px-6 py-16"
      >
        <div className="mx-auto w-full max-w-[75rem]">
          <Reveal>
            <div className="mb-12 max-w-3xl">
              <h2
                id="regional-heading"
                className="font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
              >
                Cargo Drop-Off &amp; Regional Operations
              </h2>
              <p className="mt-3 font-sans text-lg leading-relaxed text-slate-600">
                Conveniently located transit hubs for localized freight
                handling, commercial distribution, and regional border
                clearance.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {REGIONAL.map((loc, i) => (
              <Reveal key={loc.title} delay={(i % 3) * 90} className="h-full">
                <article className="flex h-full gap-4 border border-slate-200 bg-white p-6 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center bg-red-50"
                  >
                    <MapPin className="h-4 w-4 text-[#D9232D]" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#0A2540]">
                      {loc.title}
                    </h3>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-slate-600">
                      {loc.address}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}

            {/* Border operations: visually distinct final card */}
            <Reveal delay={90} className="h-full">
              <article className="flex h-full gap-4 bg-[#0A2540] p-6 text-white shadow-lg">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center bg-white"
                >
                  <Truck className="h-4 w-4 text-[#D9232D]" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">
                    Regional Border Operations
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-slate-200">
                    Seamless clearance access covering Cotonou Port (Benin
                    Republic) &amp; Lomé Port (Togo).
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-4 block h-1 w-10 bg-[#D9232D]"
                  />
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- 3. Direct communication channels ---------------- */}
      <section aria-labelledby="channels-heading" className="container section-padding">
        <Reveal>
          <div className="mb-12 max-w-3xl">
            <h2
              id="channels-heading"
              className="font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
            >
              Direct Communication Channels
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Block 1: phone & WhatsApp */}
          <Reveal className="h-full">
            <article className="flex h-full flex-col border-2 border-[#0A2540] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-4">
                {/* Navy tile so the emerald icons keep strong contrast */}
                <span
                  aria-hidden="true"
                  className="flex items-center justify-center border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <PhoneCall className="h-5 w-5 text-emerald-400" />
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                </span>
                <h3 className="font-serif text-xl font-bold text-[#0A2540]">
                  Phone &amp; WhatsApp
                </h3>
              </div>

              <p className="mt-4 font-sans text-slate-700">
                <a href="tel:+2347076035180" className={linkClass}>
                  +234 707 603 5180
                </a>
                <span className="mx-2 text-slate-300" aria-hidden="true">
                  |
                </span>
                <a href="tel:+2348128925190" className={linkClass}>
                  +234 812 892 5190
                </a>
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`https://wa.me/2347076035180?text=${WA_TEXT}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] px-5 py-3 text-center font-sans text-sm font-semibold text-[#06361a] transition-colors hover:bg-[#1ebe5b]"
                >
                  Chat on WhatsApp
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={`https://wa.me/2348128925190?text=${WA_TEXT}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] px-5 py-3 text-center font-sans text-sm font-semibold text-[#06361a] transition-colors hover:bg-[#1ebe5b]"
                >
                  Chat on WhatsApp
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </article>
          </Reveal>

          {/* Blocks 2-4: email channels */}
          {EMAIL_BLOCKS.map(({ Icon, title, mailbox, }, i) => (
            <Reveal key={title} delay={(i + 1) * 90} className="h-full">
              <article className="flex h-full flex-col border-2 border-[#0A2540] bg-white p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200 bg-slate-50"
                  >
                    <Icon className="h-5 w-5 text-[#D9232D]" />
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#0A2540]">
                    {title}
                  </h3>
                </div>
                <dl className="mt-5 space-y-3 font-sans">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
                      Mailbox
                    </dt>
                    <dd className="mt-1 break-all">
                      <a href={`mailto:${mailbox}`} className={linkClass}>
                        {mailbox}
                      </a>
                    </dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- 4. Digital media & social networks ---------------- */}
      <section
        aria-labelledby="social-heading"
        className="border-t border-slate-200 bg-white"
      >
        <div className="container section-padding">
          <Reveal>
            <div className="mb-12 max-w-3xl">
              <h2
                id="social-heading"
                className="font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
              >
                Connect with Us on Social Media
              </h2>
              <p className="mt-3 font-sans text-lg leading-relaxed text-slate-600">
                Follow our official networks for trade updates, business
                testimonials, industry insights, and creative entertainment.
              </p>
            </div>
          </Reveal>

          {/* Official platforms */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOCIALS.map((s, i) => (
              <Reveal key={s.label} delay={(i % 3) * 80}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-4 border border-slate-200 bg-slate-50 p-4 font-sans text-sm font-semibold text-[#0A2540] transition-colors ${s.hover}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold text-white ${s.badge}`}
                  >
                    {s.mark}
                  </span>
                  <span>{s.label}</span>
                  <ArrowUpRight
                    className="ml-auto h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </a>
              </Reveal>
            ))}
          </div>

          {/* TikTok split grid */}
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* Corporate */}
            <Reveal className="h-full">
              <article className="h-full border border-slate-200 border-t-4 border-t-[#0A2540] bg-slate-50 p-6 sm:p-8">
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#0A2540]">
                  TikTok · Business &amp; Logistics
                </span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-[#0A2540]">
                  Corporate Operations
                </h3>
                <ul className="mt-6 divide-y divide-slate-200">
                  {TIKTOK_CORPORATE.map((t) => (
                    <li
                      key={t.handle}
                      className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-sans text-sm text-slate-600">
                        {t.label}
                      </span>
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClass}
                      >
                        {t.handle}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            {/* Creative hub */}
            <Reveal delay={120} className="h-full">
              <article className="h-full border-2 border-dashed border-[#D9232D] bg-white p-6 sm:p-8">
                <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
                  TikTok · Entertainment Only
                </span>
                <h3 className="mt-2 font-serif text-2xl font-bold text-[#0A2540]">
                  Creative Hub
                </h3>

                <div className="mt-6 flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-sans text-sm text-slate-600">
                    AI Creative Stories
                  </span>
                  <a
                    href="https://www.tiktok.com/@elmivet_storyai?_r=1&_t=ZS-9AEqy2F1v68"
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    @elmivet_storyai
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>

                <div className="mt-5">
                  <span className="inline-block bg-[#D9232D] px-2.5 py-1 font-sans text-xs font-semibold text-white">
                    (Creative Space)
                  </span>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-slate-600">
                    Note: This is our official creative space dedicated purely
                    to AI-generated storytelling and entertainment. No
                    corporate or logistics content is posted here.
                  </p>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
