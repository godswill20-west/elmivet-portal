import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Anchor,
  ArrowLeft,
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
import { imageUrl, useFeaturedInsights } from '../hooks/useElmivetContent';
import { describeSanityError } from '../lib/sanityConfig';
import { buildInsightHref, getLayoutVariant, normalizeInsights } from '../lib/featuredInsights';

/* ------------------------------------------------------------------ *
 *  CONTENT
 * ------------------------------------------------------------------ */
const INSIGHTS_PATH = '/globalInsight';
/* There is no separate article page: each card opens that article in the full-article reader on
   the Global Insight page (/globalInsight?article=<slug>). Missing/invalid slugs fall back to the
   listing. Set INSIGHT_DETAIL_PATH (e.g. '/global-insight') only if article pages are added later. */
const INSIGHT_DETAIL_PATH = null;
const INSIGHT_READER_PARAM = 'article';
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
    publicationNote: null
  },
  {
    icon: Cpu,
    name: 'ElmivetHub',
    tag: 'Client portal',
    text: 'A unified digital engagement platform connecting clients, partners and stakeholders with events, business opportunities, corporate updates and interactive experiences.',
    publicationNote: ' scheduled for publication in December 2026.',
  },
];

const PILLARS = [
  {
    icon: Anchor,
    title: 'Maritime & On-Dock Operations',
    detail: 'Tin Can Island Port & Eleme Logistics Yard',
    image: '/images/divisions/ondock.webp',
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
  {
    title: 'Freight Forwarding Partners and Brokers',
    image: '/images/audiences/audience-freight-partners.webp',
  },
  {
    title: 'Growing and Mid-Market Enterprises',
    image: '/images/audiences/audience-mid-market.webp',
  },
  {
    title: 'Corporate Investors and Institutional Occupants',
    image: '/images/audiences/audience-investors.webp',
  },
  {
    title: 'Oil and Gas Firms',
    image: '/images/audiences/audience-oil-gas.webp',
  },
  {
    title: 'Manufacturers, Energy and Infrastructure Developers',
    image: '/images/audiences/audience-manufacturers.webp',
  },
  {
    title: 'Global Traders and Logistics Partners',
    image: '/images/audiences/audience-global-traders.webp',
  },
  {
    title: 'Multinational, Transnational and Domestic Enterprises',
    image: '/images/audiences/audience-enterprises.webp',
  },
  {
    title: 'Importers, Exporters and Trade Merchants',
    image: '/images/audiences/audience-importers.webp',
  },
  {
    title: 'Government Institutions, Public Sector & Statutory Bodies',
    image: '/images/audiences/audience-government.webp',
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
 *  WHO WE SERVE IMAGE
 *  Every photo is cropped to the intended shape (SERVE_ASPECTS) so images of any size
 *  look consistent and the overlapping caption always sits on the picture. If a file is
 *  missing or fails to load, the gradient placeholder is shown instead of a broken icon.
 *  Optional: add `focus: 'object-top'` (or object-left, object-bottom...) to an item in
 *  SERVE_ITEMS to choose which part of the photo stays visible when it is cropped.
 * ------------------------------------------------------------------ */
function ServeImage({ item, index }) {
  const [failed, setFailed] = useState(false);
  const aspect = SERVE_ASPECTS[index % SERVE_ASPECTS.length];

  if (!item.image || failed) {
    return <ImagePlaceholder tone={TONES[index % TONES.length]} className={aspect} label={item.title} />;
  }

  return (
    <div className={`relative overflow-hidden bg-primary/10 ${aspect}`}>
      <img
        src={item.image}
        alt={item.title}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`absolute inset-0 h-full w-full object-cover ${item.focus || 'object-center'}`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  FEATURED INSIGHTS (Sanity-driven)
 *  Layout by article count: 0 hidden | 1 lead | 2 pair | 3 staggered trio | 4+ carousel
 * ------------------------------------------------------------------ */
const CARD_BASE =
  'flex h-full flex-col border border-border bg-paper transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-white hover:shadow-lg';
const CAROUSEL_ITEM =
  'flex shrink-0 snap-start basis-[85%] sm:basis-[calc((100%_-_2rem)/2)] lg:basis-[calc((100%_-_4rem)/3)]';

/* Cover image with the existing gradient placeholder when it is missing or fails to load. */
function InsightImage({ post, index, aspect, sizes }) {
  const [failed, setFailed] = useState(false);

  if (!post.coverImage || failed) {
    return (
      <ImagePlaceholder tone={TONES[index % TONES.length]} className={aspect} label="Article image" />
    );
  }

  const ratio = 0.625; // 16:10, matches the card image crop
  const src = (w) => imageUrl(post.coverImage, { width: w, height: Math.round(w * ratio) });

  return (
    <div className={`relative overflow-hidden bg-primary/10 ${aspect}`}>
      <img
        src={src(800)}
        srcSet={`${src(480)} 480w, ${src(800)} 800w, ${src(1200)} 1200w`}
        sizes={sizes}
        alt={post.coverAlt || `Cover image: ${post.title}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

function InsightCard({ post, index, lead = false }) {
  const href = buildInsightHref(post.slug, {
    listPath: INSIGHTS_PATH,
    detailBase: INSIGHT_DETAIL_PATH,
    queryParam: INSIGHT_READER_PARAM,
  });

  return (
    <Link to={href} className={`${CARD_BASE} ${lead ? 'lg:flex-row' : ''}`}>
      <div className={`relative ${lead ? 'lg:w-7/12 lg:shrink-0' : ''}`}>
        <InsightImage
          post={post}
          index={index}
          aspect={lead ? 'aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[22rem]' : 'aspect-[16/10]'}
          sizes={
            lead
              ? '(min-width: 1024px) 58vw, 100vw'
              : '(min-width: 1024px) 360px, (min-width: 640px) 50vw, 85vw'
          }
        />
        {post.label && (
          <span className="absolute left-5 top-5 bg-accent px-3 py-1 font-sans text-[0.625rem] font-bold uppercase tracking-widest text-white">
            {post.label}
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col p-6 ${lead ? 'lg:justify-center lg:p-10' : ''}`}>
        {post.publishedAt && (
          <time
            dateTime={post.publishedAt}
            className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest text-muted"
          >
            {post.date}
          </time>
        )}
        <h3
          className={`font-serif font-semibold leading-snug text-heading ${
            lead ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-2xl'
          }`}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p className={`mt-3 text-base leading-relaxed text-body ${lead ? '' : 'flex-1'}`}>
            {post.excerpt}
          </p>
        )}
        {/* keeps the "Read dispatch" row pinned to the card bottom when there is no excerpt */}
        {!post.excerpt && !lead && <div className="flex-1" />}
        <span
          className={`mt-6 inline-flex items-center gap-2 border-t border-border pt-4 font-sans text-sm font-semibold text-primary transition-colors duration-200 group-hover:text-accent ${
            lead ? 'lg:mt-8 lg:self-start' : ''
          }`}
        >
          Read dispatch
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

/* Scroll-snap carousel for 4+ articles. No autoplay; buttons + native scroll + keyboard. */
function InsightCarousel({ posts }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges, posts.length]);

  const scrollByCard = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector('li');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 32;
    const step = first ? first.getBoundingClientRect().width + gap : el.clientWidth * 0.8;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * step, behavior: reduce ? 'auto' : 'smooth' });
  };

  const buttonClass =
    'inline-flex h-11 w-11 items-center justify-center border border-border bg-white text-primary transition-colors duration-200 hover:border-accent hover:bg-accent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-white disabled:hover:text-primary';

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured dispatches">
      <div className="mt-14 flex items-center justify-between gap-4">
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-primary/70">
          {posts.length} featured dispatches
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={() => scrollByCard(-1)}
            disabled={edges.atStart}
            aria-label="Previous dispatches"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => scrollByCard(1)}
            disabled={edges.atEnd}
            aria-label="Next dispatches"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label="Featured dispatches, scroll horizontally"
        className="-mx-1 mt-6 flex snap-x snap-mandatory gap-8 overflow-x-auto px-1 pb-4 pt-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post, i) => (
          <li
            key={post.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${posts.length}`}
            className={`group ${CAROUSEL_ITEM}`}
          >
            <InsightCard post={post} index={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading dispatches"
      className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className={`border border-border bg-paper ${i === 2 ? 'hidden lg:block' : ''} ${
            i === 1 ? 'hidden md:block' : ''
          }`}
        >
          <div className="aspect-[16/10] animate-pulse bg-border motion-reduce:animate-none" />
          <div className="space-y-3 p-6">
            <div className="h-6 w-4/5 animate-pulse bg-border motion-reduce:animate-none" />
            <div className="h-4 w-full animate-pulse bg-border/70 motion-reduce:animate-none" />
            <div className="h-4 w-2/3 animate-pulse bg-border/70 motion-reduce:animate-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Presentational: takes plain props so every state can be rendered from simulated data. */
export function FeaturedInsightsView({ insights, loading = false, error = null, onRetry }) {
  const posts = useMemo(() => normalizeInsights(insights), [insights]);
  const variant = getLayoutVariant(posts.length);
  const failed = Boolean(error) && posts.length === 0;
  const empty = !loading && !failed && variant === 'none';
  const failure = failed ? describeSanityError(error) : null;

  return (
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

        {loading && posts.length === 0 && <InsightSkeleton />}

        {empty && (
          <div
            role="status"
            className="mt-14 border border-border border-l-4 border-l-accent bg-paper p-6 sm:p-8"
          >
            <p className="font-serif text-2xl font-semibold text-heading">
              No featured dispatches right now
            </p>
            <p className="mt-2 text-base leading-relaxed text-body">
              Featured dispatches and market intelligence will appear here as soon as they are
              published. You can read everything we have published in the newsroom.
            </p>
          </div>
        )}

        {failed && !loading && (
          <div
            role="alert"
            className="mt-14 flex flex-col items-start gap-4 border border-border border-l-4 border-l-accent bg-paper p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-base leading-relaxed text-body">
                Our latest dispatches could not be loaded right now.
              </p>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted">
                {failure.headline} {failure.detail}
              </p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-200 hover:bg-accent"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {variant === 'single' && (
          <ul className="mt-14">
            <Reveal as="li" delay={100} className="group">
              <InsightCard post={posts[0]} index={0} lead />
            </Reveal>
          </ul>
        )}

        {variant === 'pair' && (
          <ul className="mt-14 grid gap-8 md:grid-cols-2">
            {posts.map((post, i) => (
              <Reveal as="li" key={post.id} delay={100 + i * 100} className="group">
                <InsightCard post={post} index={i} />
              </Reveal>
            ))}
          </ul>
        )}

        {variant === 'trio' && (
          <ul className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:pb-12">
            {posts.map((post, i) => (
              <Reveal
                as="li"
                key={post.id}
                delay={100 + i * 100}
                className={['group', i === 1 ? 'lg:mt-10' : '', i === 2 ? 'lg:mt-20' : ''].join(' ')}
              >
                <InsightCard post={post} index={i} />
              </Reveal>
            ))}
          </ul>
        )}

        {variant === 'carousel' && (
          <Reveal delay={100}>
            <InsightCarousel posts={posts} />
          </Reveal>
        )}
      </div>
    </section>
  );
}

function FeaturedInsights() {
  // The homepage list comes ONLY from the "Homepage Featured Stories" selection in Sanity.
  // No sample articles: empty -> empty state, failure -> error state.
  const { data, loading, error, refetch } = useFeaturedInsights();

  return <FeaturedInsightsView insights={data} loading={loading} error={error} onRetry={refetch} />;
}

/* A rendering fault in this section hides it instead of taking down the homepage. */
class FeaturedInsightsBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Featured insights section failed to render:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        aria-label="Global Insights and Market Intelligence"
        className="border-t border-border bg-white py-20"
      >
        <div className="mx-auto max-w-[75rem] px-5">
          <div role="alert" className="border border-border border-l-4 border-l-accent bg-paper p-6">
            <p className="text-base leading-relaxed text-body">
              The latest dispatches could not be displayed because of a page error. Please refresh,
              or read them in the{' '}
              <Link to={INSIGHTS_PATH} className="font-semibold text-primary underline hover:text-accent">
                newsroom
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }
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
        {/* Maritime background image (Unobstructed & Crisp) */}
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {heroImgFailed ? (
            <div className="h-full w-full opacity-70">
              <HeroArt />
            </div>
          ) : (
            <img
              src="/images/hero/home-hero.webp"
              alt="hero image"
              className="h-full w-full object-cover"
              onError={() => setHeroImgFailed(true)}
            />
          )}
        </div>

        <div className="mx-auto grid max-w-[75rem] items-center gap-10 px-5 py-18 lg:grid-cols-12 lg:gap-8 lg:py-23">
          {/* Left: copy */}
          <Reveal className="lg:col-span-7">
            <p className="inline-flex items-center gap-3 border border-white/40 bg-primary/80 px-3.5 py-1.5 font-sans text-xs font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur-md">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              ELMIVET INTERNATIONAL LIMITED
            </p>
            
            <h1 className="mt-5 px-3 font-serif text-4xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] sm:text-5xl lg:text-6xl">
              <span className="block">Connecting Trade.</span>
              <span className="block">Powering Industry.</span>
              <span className="mt-1 block italic">
                <span className="block text-accent">Securing Assets.</span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl border-l-4 border-accent bg-primary/40 px-4 py-3 font-serif text-lg italic text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] backdrop-blur-xs md:text-xl">
              Excellent Solutions. Financial Security.
            </p>

            <div className="mt-6 flex flex-col gap-3.5 sm:flex-row">
              <Link
                to="/services"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-6 py-3 font-sans text-sm font-semibold text-primary shadow-xl transition-colors duration-200 hover:bg-paper hover:text-accent"
              >
                Explore Global Logistics
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 font-sans text-sm font-semibold text-white shadow-xl transition-colors duration-200 hover:bg-accent-hover"
              >
                Request Quote
              </Link>
            </div>

            <p className="bg-primary px-2 py-2 mt-6 inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <BadgeCheck className="h-4 w-4 text-white" aria-hidden="true" />
              RC 8809789 · Registered Terminal Operator
            </p>
          </Reveal>

          {/* Right: proprietary technology, staggered and overlapping */}
          <div className="lg:col-span-5">
            <Reveal delay={200}>
              <p className="mb-3 border-t-2 border-accent pt-2.5 font-sans text-xs font-bold uppercase tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Proprietary Technology Ecosystem
              </p>
            </Reveal>

          {TECH.map(({ icon: Icon, name, tag, text, publicationNote }, i) => (
              <Reveal
                key={name}
                delay={300 + i * 150}
                className={
                  i === 0
                    ? 'relative border-l-4 border-accent bg-white/95 p-5 text-body shadow-2xl backdrop-blur-md'
                    : 'relative z-10 mt-3 border border-white/30 bg-primary/90 p-5 text-white shadow-2xl backdrop-blur-md lg:-mt-2.5 lg:ml-8'
                }
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center ${
                      i === 0 ? 'bg-primary text-white' : 'bg-accent text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2
                        className={`font-serif text-xl font-bold ${
                          i === 0 ? 'text-primary' : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                        }`}
                      >
                        {name}
                      </h2>
                      <span
                        className={`px-2 py-0.5 font-sans text-[0.625rem] font-bold uppercase tracking-widest ${
                          i === 0 ? 'bg-accent/10 text-accent' : 'bg-white/20 text-white'
                        }`}
                      >
                        {tag}
                      </span>
                    </div>
                    
                    <p
                      className={`mt-1.5 text-sm leading-relaxed ${
                        i === 0 ? 'text-slate-800 font-medium' : 'text-white/95 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]'
                      }`}
                    >
                      {text}
                    </p>

                    {/* Conditional publication note that only shows if present */}
                    {publicationNote && (
                      <p
                        className={`mt-2 text-xs italic ${
                          i === 0 ? 'text-slate-600' : 'text-white/80'
                        }`}
                      >
                        {publicationNote}
                      </p>
                    )}
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
            {PILLARS.map(({ icon: Icon, title, detail, image }, i) => {
              const featured = i === 0;
              const hasImage = featured && Boolean(image);
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
                  {/* Background photo + dark navy overlay so the text stays clearly readable */}
                  {hasImage && (
                    <>
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'; // falls back to the plain navy card
                        }}
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-primary/30"
                      />
                    </>
                  )}

                  {/* Decorative watermark icon: only when there is no photo */}
                  {featured && !hasImage && (
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
                      } ${hasImage ? 'drop-shadow-md' : ''}`}
                    >
                      {title}
                    </h3>

                    <p
                      className={`mt-5 flex items-start gap-2 border-t pt-5 text-base leading-relaxed ${
                        featured
                          ? hasImage
                            ? 'border-white/30 text-white drop-shadow'
                            : 'border-white/20 text-white/85'
                          : 'border-border text-body'
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
                    } ${hasImage ? 'drop-shadow' : ''}`}
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
                key={item.title}
                delay={100 + (i % 3) * 100}
                className={[
                  'group',
                  i % 3 === 1 ? 'lg:mt-12' : '',
                  i % 3 === 2 ? 'lg:mt-24' : '',
                ].join(' ')}
              >
                <ServeImage item={item} index={i} />
                <div
                  className={`relative -mt-12 border-t-2 border-accent bg-white p-5 shadow-lg ${
                    SERVE_CAPTION_OFFSETS[i % 3]
                  }`}
                >
                  <h3 className="font-serif text-lg font-semibold leading-snug text-heading">
                    {item.title}
                  </h3>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ *
       *  7. GLOBAL INSIGHTS: LIVE FEATURED DISPATCHES (Sanity)
       *  Adapts to the number of featured articles; renders nothing if none.
       * ============================================================ */}
      <FeaturedInsightsBoundary>
        <FeaturedInsights />
      </FeaturedInsightsBoundary>

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
