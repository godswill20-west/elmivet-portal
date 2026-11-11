import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  Building2,
  Cpu,
  FileCheck,
  Globe,
  Image as ImageIcon,
  Layers,
  Mail,
  MapPin,
  Network,
  PackageSearch,
  ShieldCheck,
  Truck,
} from 'lucide-react';

/* ------------------------------------------------------------------ *
 *  CONTENT
 * ------------------------------------------------------------------ */
const INSIGHTS_PATH = '/global-insight';
const QUOTE_EMAIL = 'quotes@elmivet.com';
const QUOTE_MAILTO = `mailto:${QUOTE_EMAIL}?subject=${encodeURIComponent(
  'Cargo Quote Request'
)}&body=${encodeURIComponent(
  'Cargo type:\nWeight / volume:\nOrigin:\nDestination:\nCompany:\n'
)}`;

const MARKETS = [
  'Nigeria',
  'China (Guangdong)',
  'Benin Republic',
  'Togo',
  'International Markets',
];

const TECH = [
  {
    icon: MapPin,
    name: 'ElmiveTrack',
    tag: 'License-based',
    text: 'Our exclusive, license-based shipment tracking application providing real-time container visibility and cargo security updates.',
  },
  {
    icon: Cpu,
    name: 'ElmivetHub',
    tag: 'Client portal',
    text: 'Our integrated enterprise client portal for documentation, digital clearance requests, and port logistics management.',
  },
];

const PILLARS = [
  {
    icon: Anchor,
    title: 'Maritime & On-Dock Operations',
    detail: 'Tin Can Island Port & Eleme Logistics Yard',
  },
  {
    icon: Layers,
    title: 'China Strategic Sourcing & Warehousing',
    detail: 'Zhongshan City, Guangdong Hub',
  },
  {
    icon: FileCheck,
    title: 'Customs Brokerage & Freight Forwarding',
    detail: 'Seamless clearance covering Port Harcourt, Lagos, Cotonou, and Lomé',
  },
];

const WHY_ITEMS = [
  { icon: Anchor, text: 'Licensed Customs Bonded Terminal Operator' },
  { icon: FileCheck, text: 'Licensed Customs Brokerage Company' },
  {
    icon: ShieldCheck,
    text: 'Full Regulatory Compliance and Experienced Multidisciplinary Personnel',
  },
  { icon: Truck, text: 'End-to-end Logistics and Supply Chain Solutions' },
  { icon: Globe, text: 'Strategic Operations in Nigeria and China (Guangdong)' },
  {
    icon: Network,
    text: 'Regional Clearance Infrastructure at Nigeria, Benin Republic, and Togo Ports',
  },
  {
    icon: PackageSearch,
    text: 'Our import and export clients benefit from ElmivetTrack, our proprietary, license-based shipment tracking application, as well as ElmivetHub',
  },
  { icon: Layers, text: 'International Procurement and Global Sourcing' },
  { icon: BadgeCheck, text: 'Customer Centric Service Delivery' },
  { icon: Building2, text: 'Long-term Strategic Partnership' },
];

const SERVE_ITEMS = [
  'Multinational, Transnational and Domestic Enterprises',
  'Importers, Exporters and Trade Merchants',
  'Government Institutions, Public Sector & Statutory Bodies',
  'Freight Forwarding Partners and Brokers',
  'Growing and Mid-Market Enterprises',
  'Corporate Investors and Institutional Occupants',
  'Oil and Gas Firms',
  'Manufacturers, Energy and Infrastructure Developers',
  'Global Traders and Logistics Partners',
];

/* PLACEHOLDER teasers: replace with your real top-3 articles, ideally from a shared
   src/data/insights.js that the Global Insight page also imports. */
const INSIGHTS = [
  {
    category: 'Port Operations',
    title: 'Guangdong Bonded Hub Logistics Expansion',
    excerpt:
      'What expanding bonded-hub capacity in Guangdong means for sourcing, consolidation and onward shipping to West Africa.',
  },
  {
    category: 'Regulatory Notice',
    title: 'West Africa Port Clearance Regulations 2026',
    excerpt:
      'A practical briefing on clearance and documentation requirements for cargo moving through Nigeria, Benin Republic and Togo ports.',
  },
  {
    category: 'Market Intelligence',
    title: 'Global Freight Rate Index Updates',
    excerpt:
      'The latest movements in global freight rates and what they signal for importers, exporters and trade merchants.',
  },
];

/* Image placeholder tones, aspect ratios and caption offsets (cycled by index) */
const TONES = ['from-primary to-[#245A8D]', 'from-[#071A2E] to-primary', 'from-[#334155] to-primary'];
const SERVE_ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]'];
const SERVE_CAPTION_OFFSETS = ['ml-4 mr-10', 'ml-10 mr-4', 'ml-6 mr-6'];

/* ------------------------------------------------------------------ *
 *  SCROLL REVEAL
 *  Hidden (opacity-0) until it scrolls into view, then plays
 *  `animate-mouth-opening` (big upward fly-in + scale 0.92 -> 1).
 *  Requires --animate-mouth-opening in @theme (see index.css snippet).
 * ------------------------------------------------------------------ */
function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  // If IntersectionObserver is unavailable, show immediately.
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <Tag
      ref={ref}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
      className={`${className} ${
        visible ? 'animate-mouth-opening motion-reduce:animate-none' : 'opacity-0'
      }`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ *
 *  SHARED PIECES
 * ------------------------------------------------------------------ */
function ImagePlaceholder({ tone = TONES[0], className = '', label = 'Image placeholder' }) {
  return (
    <div className={`relative overflow-hidden bg-linear-to-br ${tone} ${className}`}>
      <span aria-hidden="true" className="absolute inset-3 border border-white/20" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
        <ImageIcon className="h-10 w-10" strokeWidth={1.25} aria-hidden="true" />
        <span className="font-sans text-[0.625rem] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
    </div>
  );
}

const CONTAINER_COLORS = ['#D9232D', '#F8FAFC', '#334155', '#64748B', '#B81B23', '#CBD5E1'];

/* Hero fallback illustration, shown until /assets/hero-port.jpg exists */
function HeroArt() {
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMax slice"
      className="h-full w-full"
      role="img"
      aria-label="Illustration of a container terminal with a quay crane"
    >
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A2540" />
          <stop offset="1" stopColor="#245A8D" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#heroSky)" />
      <g stroke="#F8FAFC" strokeOpacity="0.55" strokeWidth="3" fill="none">
        <path d="M70 340 V130 H320 M70 130 L35 185 M320 130 V165 M180 130 V340 M70 175 H180" />
        <path d="M250 130 V210" strokeDasharray="4 4" />
      </g>
      <rect x="232" y="210" width="36" height="16" fill="#D9232D" opacity="0.9" />
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 6 }).map((__, col) => (
          <rect
            key={`${row}-${col}`}
            x={col * 66 + 2}
            y={344 + row * 31}
            width="62"
            height="28"
            fill={CONTAINER_COLORS[(row * 3 + col * 5) % CONTAINER_COLORS.length]}
            opacity="0.88"
            stroke="#0A2540"
            strokeWidth="2"
          />
        ))
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 *  PAGE
 * ------------------------------------------------------------------ */
export default function Home() {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <main className="flex-1 bg-paper font-sans text-body">
      {/* ============================================================ *
       *  1. HERO + PROPRIETARY TECHNOLOGY (ElmiveTrack & ElmivetHub)
       * ============================================================ */}
      <section className="relative isolate overflow-hidden bg-primary text-white">
        {/* Maritime background + navy overlay */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {heroImgFailed ? (
            <div className="h-full w-full opacity-70">
              <HeroArt />
            </div>
          ) : (
            <img
              src="/assets/hero-port.jpg"
              alt=""
              className="h-full w-full object-cover"
              onError={() => setHeroImgFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-primary via-primary/90 to-primary/50" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-primary/80 to-transparent" />
        </div>

        <div className="mx-auto grid max-w-[75rem] items-center gap-14 px-5 py-20 lg:grid-cols-12 lg:gap-10 lg:py-32">
          {/* Left: copy */}
          <Reveal className="lg:col-span-7">
            <p className="inline-flex items-center gap-3 border border-white/30 bg-white/10 px-3.5 py-1.5 font-sans text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              ELMIVET INTERNATIONAL LIMITED
            </p>
            
            <h1 className="mt-8 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="block">Connecting Trade.</span>
              <span className="block">Powering Industry.</span>
              <span className="mt-1 block italic">
                <span className="block text-accent">Securing Assets.</span>
              </span>
            </h1>

            <p className="mt-8 max-w-xl border-l-2 border-accent pl-5 font-serif text-xl italic text-white/90 md:text-2xl">
              Excellent Solutions. Financial Security.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-7 py-3.5 font-sans text-sm font-semibold text-primary shadow-md transition-colors duration-200 hover:bg-paper hover:text-accent"
              >
                Explore Global Logistics
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-md bg-accent px-7 py-3.5 font-sans text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-accent-hover"
              >
                Request Quote
              </Link>
            </div>

            <p className="mt-8 inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-white/70">
              <BadgeCheck className="h-4 w-4 text-white" aria-hidden="true" />
              RC 8809789 · Registered Terminal Operator
            </p>
          </Reveal>

          {/* Right: proprietary technology, staggered and overlapping */}
          <div className="lg:col-span-5">
            <Reveal delay={200}>
              <p className="mb-4 border-t-2 border-accent pt-3 font-sans text-xs font-bold uppercase tracking-widest text-white/70">
                Proprietary Technology Ecosystem
              </p>
            </Reveal>

            {TECH.map(({ icon: Icon, name, tag, text }, i) => (
              <Reveal
                key={name}
                delay={300 + i * 150}
                className={
                  i === 0
                    ? 'relative border-l-4 border-accent bg-white p-6 text-body shadow-lg'
                    : 'relative z-10 mt-4 border border-white/25 bg-primary/80 p-6 text-white shadow-lg backdrop-blur-md lg:-mt-3 lg:ml-10'
                }
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center ${
                      i === 0 ? 'bg-primary text-white' : 'bg-accent text-white'
                    }`}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2
                        className={`font-serif text-2xl font-bold ${
                          i === 0 ? 'text-primary' : 'text-white'
                        }`}
                      >
                        {name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 font-sans text-[0.625rem] font-bold uppercase tracking-widest ${
                          i === 0 ? 'bg-accent/10 text-accent' : 'bg-white/15 text-white'
                        }`}
                      >
                        {tag}
                      </span>
                    </div>
                    <p
                      className={`mt-2 text-sm leading-relaxed ${
                        i === 0 ? 'text-body' : 'text-white/85'
                      }`}
                    >
                      {text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ *
       *  2. MARKETS
       * ============================================================ */}
      <section aria-label="Operational capacity" className="border-b border-border bg-white">
        <div className="border-y border-border bg-white">
          <ul className="mx-auto flex max-w-[75rem] flex-wrap items-center justify-center gap-x-8 gap-y-2 px-5 py-4 font-sans text-xs font-semibold uppercase tracking-widest text-muted">
            {MARKETS.map((market, i) => (
              <li key={market} className="flex items-center gap-8">
                {market}
                {i < MARKETS.length - 1 && (
                  <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-accent sm:block" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ *
       *  3. EDITORIAL STATEMENT
       * ============================================================ */}

        <section className="bg-slate-50 px-5 py-20 lg:py-20">
          <Reveal className="relative mx-auto max-w-[75rem] pt-8">
            <blockquote
              className="relative rounded-3xl border border-slate-200 border-l-4 border-l-accent bg-white p-8 sm:p-12 lg:p-16"
            >
              {/* Overlapping badge: made bigger and positioned half outside */}
              <div className="absolute -top-7 right-8 z-20 sm:right-12">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-2 translate-y-2 border border-accent rounded-sm"
                />
                <p className="relative flex items-center gap-3.5 bg-primary px-7 py-4 font-sans text-sm font-bold uppercase tracking-[0.25em] text-white">
                  <span aria-hidden="true" className="h-0.5 w-8 bg-accent" />
                  The Statement
                </p>
              </div>

              {/* Quote mark in the left gutter */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-6 top-6 select-none font-serif text-[5rem] leading-none text-accent/20 sm:left-10 sm:top-8 sm:text-[8rem] lg:left-14"
              >
                &ldquo;
              </span>

              {/* Reduced font size and moved closer to the quote mark */}
              <p className="relative pt-6 font-serif text-lg leading-relaxed text-heading sm:pl-16 sm:pt-0 md:text-xl lg:pl-20 lg:text-2xl lg:leading-[1.4]">
                Elmivet International Limited is a licensed Customs Bonded Terminal Operator and a Licensed Customs Brokerage Company providing integrated logistics, supply chain across Nigeria, China, Benin Republic,
                Togo and International markets.
              </p>
            </blockquote>
          </Reveal>
        </section>

      {/* ============================================================ *
       *  4. STRATEGIC PILLARS OF EXECUTION (asymmetrical grid)
       * ============================================================ */}
      <section className="bg-paper py-20 lg:py-10">
        <div className="mx-auto max-w-[75rem] px-5">
          <Reveal className="max-w-2xl border-l-4 border-accent pl-5">
            <p className="font-sans text-xs font-bold uppercase tracking-widest text-accent">
              Core Operational Pillars
            </p>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">
              Strategic Pillars of Execution
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-12">
            {PILLARS.map(({ icon: Icon, title, detail }, i) => {
              const featured = i === 0;
              return (
                <Reveal
                  key={title}
                  delay={100 + i * 100}
                  className={[
                    'group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                    featured
                      ? 'justify-between bg-primary p-8 text-white lg:col-span-7 lg:row-span-2 lg:p-14'
                      : 'border border-border bg-white p-8 lg:col-span-5',
                    i === 2 ? 'lg:relative lg:z-10 lg:-ml-12 lg:shadow-lg' : '',
                  ].join(' ')}
                >
                  {featured && (
                    <Icon
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-10 -right-10 h-72 w-72 text-white/5"
                      strokeWidth={1}
                    />
                  )}

                  <div className="relative">
                    <span
                      className={`flex h-14 w-14 items-center justify-center ${
                        featured ? 'bg-accent text-white' : 'bg-primary text-white'
                      }`}
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
                    </span>

                    <h3
                      className={`mt-8 font-serif font-bold leading-tight ${
                        featured
                          ? 'text-3xl text-white md:text-4xl lg:text-5xl'
                          : 'text-2xl text-heading'
                      }`}
                    >
                      {title}
                    </h3>

                    <p
                      className={`mt-5 flex items-start gap-2 border-t pt-5 text-base leading-relaxed ${
                        featured ? 'border-white/20 text-white/85' : 'border-border text-body'
                      }`}
                    >
                      <MapPin
                        className={`mt-1 h-4 w-4 shrink-0 ${featured ? 'text-white' : 'text-accent'}`}
                        aria-hidden="true"
                      />
                      {detail}
                    </p>
                  </div>

                  <Link
                    to="/services"
                    className={`relative mt-8 inline-flex items-center gap-2 font-sans text-sm font-semibold transition-colors duration-200 ${
                      featured ? 'text-white hover:text-white/80' : 'text-primary hover:text-accent'
                    }`}
                  >
                    Explore services
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ *
       *  5. WHY CHOOSE ELMIVET: 9 COMMITMENTS
       * ============================================================ */}
      <section className="bg-white py-20 lg:py-20">
        <div className="mx-auto grid max-w-[75rem] gap-16 px-5 lg:grid-cols-12 lg:gap-12">
          <header className="lg:col-span-4">
            <Reveal className="relative lg:sticky lg:top-28">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-2 -top-14 select-none font-serif text-[9rem] font-bold leading-none text-primary/5"
              >
                99
              </span>
              <div className="relative border-l-4 border-accent pl-5">
                <p className="font-sans text-xs font-bold uppercase tracking-widest text-accent">
                  Why Choose Elmivet
                </p>
                <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">
                  The commitments behind every consignment.
                </h2>
              </div>
            </Reveal>
          </header>

          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
            {WHY_ITEMS.map(({ icon: Icon, text }, i) => (
              <Reveal
                as="li"
                key={text}
                delay={100 + (i % 2) * 100}
                className={[
                  'group relative border border-border bg-paper p-7 transition-all duration-300',
                  'hover:-translate-y-1 hover:border-accent/50 hover:bg-white hover:shadow-lg',
                  i % 2 === 1 ? 'sm:mt-14' : '',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full"
                />
                <span className="flex h-12 w-12 items-center justify-center bg-primary text-white transition-colors duration-300 group-hover:bg-accent">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="mt-6 border-t border-border-strong pt-4 font-serif text-xl font-semibold leading-snug text-heading">
                  {text}
                </h3>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ *
       *  6. WHO WE SERVE: OVERLAPPING IMAGE-LED EDITORIAL LAYOUT
       * ============================================================ */}
      <section className="border-t border-border bg-paper py-20 lg:py-20">
        <div className="mx-auto max-w-[75rem] px-5">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
            <Reveal className="lg:col-span-7">
              <p className="font-sans text-xs font-bold uppercase tracking-widest text-accent">
                Who We Serve
              </p>
              <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">
                Empowering Enterprises Across Local &amp; Global Markets
              </h2>
            </Reveal>
            <Reveal
              delay={200}
              className="border-l-2 border-accent pl-5 text-lg leading-relaxed text-body lg:col-span-5"
            >
              <p>
                Elmivet International Limited delivers efficient, compliant, and customer-focused
                solutions across different industries and sectors. We proudly partner with:
              </p>
            </Reveal>
          </div>

          <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:pb-20">
            {SERVE_ITEMS.map((item, i) => (
              <Reveal
                as="li"
                key={item}
                delay={100 + (i % 3) * 100}
                className={[
                  'group',
                  i % 3 === 1 ? 'lg:mt-12' : '',
                  i % 3 === 2 ? 'lg:mt-24' : '',
                ].join(' ')}
              >
                {/* Swap ImagePlaceholder for an <img className="h-full w-full object-cover"> later */}
                <ImagePlaceholder
                  tone={TONES[i % TONES.length]}
                  className={`${SERVE_ASPECTS[i % 3]} shadow-md transition-transform duration-500 group-hover:scale-[1.02]`}
                />
                <div
                  className={`relative -mt-12 border-t-2 border-accent bg-white p-5 shadow-lg ${
                    SERVE_CAPTION_OFFSETS[i % 3]
                  }`}
                >
                  <h3 className="font-serif text-lg font-semibold leading-snug text-heading">
                    {item}
                  </h3>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ *
       *  7. GLOBAL INSIGHTS: EDITORIAL PREVIEW
       * ============================================================ */}
      <section
        aria-label="Global Insights and Market Intelligence"
        className="border-t border-border bg-white py-20 lg:py-20"
      >
        <div className="mx-auto max-w-[75rem] px-5">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <Reveal className="max-w-2xl border-l-4 border-accent pl-5">
              <p className="font-sans text-xs font-bold uppercase tracking-widest text-accent">
                GLOBAL TRADE INSIGHTS
              </p>
              <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">
                Latest Dispatches &amp; Market Intelligence
              </h2>
            </Reveal>

            <Link
              to={INSIGHTS_PATH}
              className="group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md bg-primary px-7 py-3.5 font-sans text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-accent lg:self-auto"
            >
              View All Market Insights
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          <ul className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:pb-12">
            {INSIGHTS.map((post, i) => (
              <Reveal
                as="li"
                key={post.title}
                delay={100 + i * 100}
                className={['group', i === 1 ? 'lg:mt-10' : '', i === 2 ? 'lg:mt-20' : ''].join(' ')}
              >
                <Link
                  to={INSIGHTS_PATH}
                  className="flex h-full flex-col border border-border bg-paper transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-white hover:shadow-lg"
                >
                  <div className="relative">
                    <ImagePlaceholder
                      tone={TONES[i % TONES.length]}
                      className="aspect-[16/10]"
                      label="Article image"
                    />
                    <span className="absolute left-5 top-5 bg-accent px-3 py-1 font-sans text-[0.625rem] font-bold uppercase tracking-widest text-white">
                      {post.category}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-serif text-2xl font-semibold leading-snug text-heading">
                      {post.title}
                    </h3>
                    <p className="mt-3 flex-1 text-base leading-relaxed text-body">
                      {post.excerpt}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 border-t border-border pt-4 font-sans text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-accent">
                      Read dispatch
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ *
       *  8. DIRECT QUOTE CALL-TO-ACTION STRIP
       * ============================================================ */}
      <section className="relative overflow-hidden bg-white text-primary">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-20 select-none font-serif text-[18rem] font-bold leading-none text-white/5"
        >
          @
        </span>

        <div className="relative mx-auto grid max-w-[75rem] gap-10 px-5 py-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
          <Reveal className="border-l-4 border-accent pl-6 lg:col-span-8">
            <p className="font-sans text-xs font-bold uppercase tracking-widest text-primary/70">
              Direct Quote Desk
            </p>
            <h2 className="mt-3 font-serif text-4xl font-bold leading-tight md:text-5xl">
              Send us your cargo specifications. We&rsquo;ll take it from here.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary/85">
              Enterprise clients can submit cargo details straight to our quotes desk at{' '}
              <span className="font-semibold text-primary">{QUOTE_EMAIL}</span>. Include cargo
              type, weight or volume, origin and destination.
            </p>
          </Reveal>

          <Reveal delay={200} className="flex flex-col gap-4 lg:col-span-4">
            <a
              href={QUOTE_MAILTO}
              className="group inline-flex items-center justify-center gap-3 rounded-md bg-accent px-7 py-4 font-sans text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-accent-hover"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              Email Cargo Specifications
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
            <Link
              to="/services"
              className="text-center font-sans text-sm font-semibold text-primary/80 underline decoration-white/30 underline-offset-4 transition-colors duration-200 hover:text-accent"
            >
              Prefer a form? Go to Services
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
