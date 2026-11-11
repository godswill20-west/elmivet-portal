import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   Scroll-triggered reveal using the project's `animate-mouth-opening` class.
   Stays hidden (opacity-0) until it enters the viewport, then plays once.
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

/* Shared section heading */
function SectionHeading({ title, subtitle, id }) {
  return (
    <div className="mb-12 max-w-3xl">
      <h2
        id={id}
        className="font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 font-sans text-lg leading-relaxed text-slate-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Small tag chip */
function Chip({ children }) {
  return (
    <span className="border border-slate-300 bg-slate-50 px-2.5 py-1 font-sans text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

/* ==========================================================================
   Content
   ========================================================================== */
const MISSION = {
  label: "Our Mission",
  statement:
    "To transform complex operational challenges into simple, practical business execution.",
  cards: [
    {
      title: "Strategic Alliances",
      text: "Building strong, borderless networks that seamlessly connect global trade routes to local markets.",
    },
    {
      title: "Operational Excellence",
      text: "Consistently delivering high-value products and services, asset-secure logistics, and rigorously compliant engineering.",
    },
    {
      title: "Sustainable Growth",
      text: "Fostering long-term financial security and innovative opportunities for our clients, employees, and partners.",
    },
  ],
};

const VISION = {
  label: "Our Vision",
  statement:
    "To become one of Africa’s most respected and globally recognized integrated logistics and business solution providers.",
  cards: [
    {
      title: "Continental Leadership",
      text: "Expanding our maritime, engineering, and bonded terminal networks to serve as the premier, highly reliable gateway for trade across African and global markets.",
    },
    {
      title: "Technology & Innovation",
      text: "Deploying modern, automated systems and sustainable methodologies to transform intricate operational challenges into streamlined business solutions.",
    },
    {
      title: "Excellence & Reliability",
      text: "Cultivating a trusted corporate ecosystem renowned for unyielding compliance, maximum asset security, and absolute client satisfaction.",
    },
  ],
};

const VALUES = [
  {
    title: "Uncompromising Integrity & Accountability",
    tags: ["Integrity", "Accountability", "Financial Security", "Respect"],
    text: "We honour our commitments with absolute transparency, protecting our clients’ financial security and corporate investments.",
  },
  {
    title: "Operational Excellence & Timely Delivery",
    tags: ["Excellence", "Timely Delivery", "Customer Service"],
    text: "We do not just meet standards; we set them, ensuring precise execution and timely delivery across every project.",
  },
  {
    title: "Visionary Leadership & Innovation",
    tags: ["Leadership", "Innovation", "Entrepreneurship"],
    text: "We lead from the front with an entrepreneurial mind-set, building smarter supply chains and infrastructure.",
  },
  {
    title: "Synergistic Teamwork",
    tags: ["Teamwork"],
    text: "The Specialists, The Managers, the System and The Process form a unified body of Elmivet International Limited transforming complex challenges into integrated solutions.",
  },
  {
    title: "Safety & Environmental Sustainability",
    tags: ["Safety", "Sustainability"],
    text: "We prioritize human life and environmental stewardship, enforcing strict safety protocols to protect our workforce and assets.",
  },
];

const PILLARS = [
  {
    title: "Aggressive Entrepreneurial Growth",
    tags: ["Innovation", "Strategic Thinking", "Modern Technology"],
    text: "We do not wait for markets to shift; we lead them by deploying cutting-edge technology and agile market strategies.",
  },
  {
    title: "Client-Centric Professionalism",
    tags: ["Responsiveness", "Integrity", "Elite Service Delivery"],
    text: "Our infrastructure exists to serve your bottom line with relentless responsiveness and absolute peace of mind.",
  },
  {
    title: "Industry-Defining Leadership",
    tags: ["Strategic Partnerships", "Continuous Improvement"],
    text: "We set the baseline for compliance and operational capacity in the maritime and energy sectors.",
  },
  {
    title: "A Culture of Absolute Excellence",
    tags: ["Teamwork", "Uncompromising Quality", "High Performance"],
    text: "Excellence is our corporate baseline, securing high-value industrial assets through unyielding quality control.",
  },
];

const LEADERS = [
  {
    initials: "NL",
    name: "Dr. Engr. Nadia Lizbeth",
    role: "Chief Executive Officer & Chairman",
    bio: "She provides strategic leadership, corporate governance, and long-term direction for Elmivet International Limited. Her vision continues to drive innovation, sustainable growth, operational excellence, and strong international partnerships.",
  },
  {
    initials: "EF",
    name: "Elizabeth Felix",
    role: "Acting Managing Director",
    bio: "Elizabeth Felix oversees the company’s daily operations, ensuring that every department delivers excellence while maintaining the highest standards of professionalism, customer satisfaction, operational efficiency, and regulatory compliance.",
  },
];

/* Mission / Vision block: statement + identical 3-card grid */
function StatementBlock({ data }) {
  return (
    <div>
      <Reveal>
        <div className="mb-8 border-l-[3px] border-[#D9232D] pl-5">
          <h3 className="font-sans text-sm font-semibold uppercase tracking-widest text-[#D9232D]">
            {data.label}
          </h3>
          <p className="mt-3 max-w-4xl font-serif text-2xl font-semibold leading-snug text-[#0A2540] sm:text-3xl">
            {data.statement}
          </p>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-3">
        {data.cards.map((card, i) => (
          <Reveal key={card.title} delay={i * 100} className="h-full">
            <article className="flex h-full flex-col border border-slate-200 border-t-4 border-t-[#0A2540] bg-white p-6 shadow-sm sm:p-8">
              <h4 className="font-serif text-xl font-bold text-[#0A2540]">
                {card.title}
              </h4>
              <p className="mt-3 font-sans leading-relaxed text-slate-600">
                {card.text}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Page
   ========================================================================== */
export default function About() {
  return (
    <main className="bg-slate-50 text-slate-700">
      {/* ---------------- 1. Hero / company overview ---------------- */}
      <header className="relative bg-[#0A2540] text-white overflow-hidden border-b border-slate-800">
        
        {/* HERO IMAGE PLACEHOLDER (Background Image Container) */}
        {/* Replace the Unsplash URL inside style={{ backgroundImage }} with your final image path when ready */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-99 mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=2000")',
          }}
        />

        {/* ULTRA-TRANSPARENT GRADIENT TINT (Keeps the background image crystal clear while preserving text contrast) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0A2540]/80 via-[#0A2540]/40 to-[#0A2540]/60"
        />

        {/* CONTENT CONTAINER (Preserving exact split-60-40 layout grid) */}
        <div className="container section-padding relative z-10">
          <div className="split-60-40 items-center gap-10 lg:gap-16">
            
            {/* Left: Headline & Reg Details (Unboxed, sitting directly over the clear hero background) */}
            <div className="space-y-6">
              <Reveal>
                <span className="inline-block rounded-sm border border-[#D9232D]/40 bg-[#D9232D]/20 px-3 py-1 font-sans text-xs font-bold uppercase tracking-widest text-red-400 backdrop-blur-md">
                  Corporate Profile &amp; Heritage
                </span>
              </Reveal>

              <Reveal delay={100}>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md">
                  Shaping Africa’s Commercial &amp; Logistical Future.
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="font-mono text-xs text-slate-300 flex items-center space-x-2">
                  <span>Elmivet International Limited</span>
                  <span className="text-[#D9232D] font-bold">· RC 8809789</span>
                </p>
              </Reveal>
            </div>

            {/* Right: Company Overview Card (Curved Edges & Original Width) */}
            <Reveal delay={300} className="h-full">
              <div className="bg-white/95 backdrop-blur-md text-slate-900 p-8 lg:p-10 rounded-2xl shadow-2xl border-t-4 border-[#D9232D] space-y-4">
                <h2 className="font-serif text-2xl lg:text-3xl font-bold text-[#0A2540]">
                  Company Overview
                </h2>
                <p className="font-sans text-base lg:text-lg leading-relaxed text-slate-700">
                  Founded on the principles of operational reliability and strict compliance, Elmivet International Limited has grown into one of Africa’s premier multi-sector conglomerates. We operate at the intersection of global commerce and local execution, providing enterprise-grade business solutions that eliminate operational bottlenecks and safeguard high-value corporate investments.
                </p>
              </div>
            </Reveal>

          </div>
        </div>
      </header>

      {/* ---------------- 2. Mission & vision ---------------- */}
      <section aria-label="Mission and vision" className="container section-padding">
        <div className="space-y-16">
          <StatementBlock data={MISSION} />
          <StatementBlock data={VISION} />
        </div>
      </section>

      {/* ---------------- 3. Core values ---------------- */}
      <section
        aria-labelledby="values-heading"
        className="border-y border-slate-200 bg-white"
      >
        <div className="container section-padding">
          <Reveal>
            <SectionHeading id="values-heading" title="Our Core Values" />
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            {VALUES.map((v, i) => (
              <Reveal
                key={v.title}
                delay={i * 90}
                className={`h-full ${i === 4 ? "sm:col-span-2 xl:col-span-1" : ""}`}
              >
                <article className="flex h-full flex-col border border-slate-200 bg-slate-50 p-6">
                  <h3 className="font-serif text-lg font-bold leading-snug text-[#0A2540]">
                    {v.title}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {v.tags.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                  <p className="mt-4 font-sans text-sm leading-relaxed text-slate-600">
                    {v.text}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 4. What we stand for ---------------- */}
      <section aria-labelledby="stand-heading" className="container section-padding">
        <Reveal>
          <SectionHeading
            id="stand-heading"
            title="What We Stand For"
            subtitle="The operational pillars that anchor our multi-sector execution."
          />
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 100} className="h-full">
              <article className="flex h-full flex-col bg-[#0A2540] p-6 text-white shadow-lg sm:p-7">
                <span aria-hidden="true" className="mb-5 block h-1 w-10 bg-[#D9232D]" />
                <h3 className="font-serif text-xl font-bold leading-snug text-white">
                  {p.title}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="border border-white/25 px-2.5 py-1 font-sans text-xs font-medium text-white/80"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-4 font-sans text-sm leading-relaxed text-slate-200">
                  {p.text}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- 5. Leadership & structure ---------------- */}
            {/* Meet Our Leadership Section */}
      <section className="bg-slate-100 py-20 px-6 lg:px-12 border-t border-slate-200">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#D9232D] uppercase block">
              EXECUTIVE STEWARDSHIP
            </span>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-[#0A2540]">
              Meet Our Leadership
            </h2>
            <p className="text-slate-600 text-sm">
              Guiding Elmivet International Limited with strategic foresight, regulatory compliance, and operational rigor.
            </p>
          </div>

          {/* The Executive Grid (Two Leaders in Off-White Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Leader 1 */}
              <div className="bg-white p-8 lg:p-10 border border-slate-200 shadow-sm rounded-xl space-y-4">
                {/* Initial Circle Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0052E1] via-[#6366f1] to-[#D9232D] flex items-center justify-center text-white font-serif text-2xl font-bold shadow-md">
                    N
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#D9232D] block">
                    Executive Direction
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#0A2540]">
                    Dr. Engr. Nadia Lizbeth
                  </h3>
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 pt-0.5">
                    Chief Executive Officer & Chairman
                  </p>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed font-sans pt-2 border-t border-slate-100">
                  She provides strategic leadership, corporate governance, and long-term direction for Elmivet International Limited. Her vision continues to drive innovation, sustainable growth, operational excellence, and strong international partnerships.
                </p>
              </div>

              {/* Leader 2 */}
              <div className="bg-white p-8 lg:p-10 border border-slate-200 shadow-sm rounded-xl space-y-4">
                {/* Initial Circle Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0052E1] via-[#6366f1] to-[#D9232D] flex items-center justify-center text-white font-serif text-2xl font-bold shadow-md">
                    E
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#D9232D] block">
                    Operational Management
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#0A2540]">
                    Elizabeth Felix
                  </h3>
                  <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 pt-0.5">
                    Acting Managing Director
                  </p>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed font-sans pt-2 border-t border-slate-100">
                  Elizabeth Felix oversees the company’s daily operations, ensuring that every department delivers excellence while maintaining the highest standards of professionalism, customer satisfaction, operational efficiency, and regulatory compliance.
                </p>
              </div>

          </div>

          {/* Premium CTA Button: View Corporate Structure & Governance */}
          <div className="pt-6 flex flex-col items-center justify-center space-y-4">
            <a
              href="#organogram" 
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-3 bg-[#0A2540] hover:bg-[#D9232D] text-white px-8 py-4 rounded-sm font-sans text-sm font-bold tracking-wide transition-all duration-300 shadow-md group cursor-pointer"
            >
              <span>View Corporate Structure & Governance</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform fill-current" viewBox="0 0 24 24">
                <path d="M5 13h11.586l-5.293 5.293 1.414 1.414L21.414 12l-7.707-7.707-1.414 1.414L16.586 11H5v2z"/>
              </svg>
            </a>
          </div>

          {/* Elegant Horizontal Divider & Footnote Clause */}
          <div className="pt-12 text-center space-y-4">
            <div className="w-16 h-0.5 bg-slate-300 mx-auto"></div>
            <p className="text-xs italic text-slate-500 max-w-xl mx-auto leading-relaxed">
              Elmivet International Limited is steered by a dedicated global executive and non-executive management team. To protect the privacy and security of our personnel, we limit our public profile to our primary executive leadership, while deeply valuing the collective commitment of our entire workforce.
            </p>
          </div>

        </div>
      </section>

    </main>
  );
}
