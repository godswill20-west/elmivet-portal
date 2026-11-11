import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   Scroll-triggered reveal: adds `animate-mouth-opening` when the element
   enters the viewport. Hidden (opacity-0) until then.
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
   Image placeholder: swap for <img> later. Keeps a fixed aspect ratio.
   ========================================================================== */
function ImagePlaceholder({ tag, label, className = "aspect-video" }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden bg-gradient-to-br from-[#0A2540] via-[#12385f] to-slate-700 ${className}`}
    >
      {/* container-stack pattern */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 36px), repeating-linear-gradient(0deg, rgba(255,255,255,0.25) 0 1px, transparent 1px 28px)",
        }}
      />
      {/* ship / crane silhouette */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 120"
        className="absolute inset-x-0 bottom-0 w-full text-white/15"
        fill="currentColor"
        preserveAspectRatio="xMidYMax slice"
      >
        <rect x="40" y="60" width="26" height="22" />
        <rect x="68" y="60" width="26" height="22" />
        <rect x="96" y="60" width="26" height="22" />
        <rect x="54" y="38" width="26" height="22" />
        <rect x="82" y="38" width="26" height="22" />
        <path d="M20 84h200l-18 22H38z" />
        <path d="M250 20h8v86h-8zM250 20l70 18v6l-70-12zM320 38v40h-4V38z" />
        <path d="M230 106h170v14H230z" />
      </svg>
      <span className="absolute left-4 top-4 bg-white/95 px-2.5 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-widest text-[#0A2540]">
        {tag}
      </span>
      <span className="absolute bottom-3 right-4 font-sans text-[0.65rem] font-medium uppercase tracking-widest text-white/60">
        Image placeholder
      </span>
    </div>
  );
}

/* ==========================================================================
   Data
   Full class strings are kept static so Tailwind v4 can detect them.
   ========================================================================== */
const CATEGORIES = [
  "All",
  "Regulatory Notice",
  "Port Operations",
  "Global Logistics",
  "Guangdong Hub",
];

const HERO = {
  tag: "Industrial Cargo / Bonded Warehousing",
  category: "Guangdong Hub",
  title:
    "Guangdong International Customs Bonded Warehouse Expands Processing Capacity for West African Trade",
  excerpt:
    "Elmivet's bonded facility in Guangdong has added dedicated consolidation, inspection and re-packing lines for exporters shipping to West African ports. The expansion shortens dwell time before vessel loading and gives importers earlier visibility on customs documentation.",
  date: "November 6, 2026",
  readTime: "7 min read",
  author: "Elmivet Editorial Desk",
};

const POSTS = [
  {
    id: 1,
    span: "lg:col-span-7",
    category: "Regulatory Notice",
    tag: "Customs & Compliance",
    title: "Updated Declaration Requirements for Electronics and Machinery Exports",
    excerpt:
      "Exporters should review revised documentation checklists and HS code declarations before the next booking cycle to avoid clearance holds.",
    date: "Nov 4, 2026",
    readTime: "5 min read",
    large: true,
  },
  {
    id: 2,
    span: "lg:col-span-5",
    category: "Port Operations",
    tag: "Port Operations",
    title: "Berth Scheduling Changes Affecting Lagos-Bound Consolidated Cargo",
    excerpt:
      "Revised vessel windows may shift gate-in deadlines. Here is what shippers need to confirm with their booking agents.",
    date: "Nov 2, 2026",
    readTime: "4 min read",
  },
  {
    id: 3,
    span: "lg:col-span-4",
    category: "Global Logistics",
    tag: "Ocean Freight",
    title: "Ocean Freight Rate Outlook for the Fourth Quarter",
    excerpt:
      "A look at capacity, surcharges and routing trends on Asia to West Africa lanes.",
    date: "Oct 30, 2026",
    readTime: "6 min read",
  },
  {
    id: 4,
    span: "lg:col-span-4",
    category: "Regulatory Notice",
    tag: "Import Duties",
    title: "Reminder: Pre-Shipment Inspection Rules for Nigerian Importers",
    excerpt:
      "A plain-language summary of inspection steps, certificates and typical timelines.",
    date: "Oct 27, 2026",
    readTime: "5 min read",
  },
  {
    id: 5,
    span: "lg:col-span-4",
    category: "Guangdong Hub",
    tag: "Warehouse Update",
    title: "New Cut-Off Times for Guangdong Hub Cargo Receiving",
    excerpt:
      "Updated receiving hours and weekend handling arrangements for peak shipping weeks.",
    date: "Oct 24, 2026",
    readTime: "3 min read",
  },
  {
    id: 6,
    span: "lg:col-span-5",
    category: "Global Logistics",
    tag: "Supply Chain",
    title: "Building Resilient Supply Chains Across Two Continents",
    excerpt:
      "How buyers are splitting shipments, buffering stock and using bonded storage to manage disruption.",
    date: "Oct 20, 2026",
    readTime: "8 min read",
  },
  {
    id: 7,
    span: "lg:col-span-7",
    category: "Port Operations",
    tag: "Terminal Notice",
    title: "Terminal Congestion Watch: Dwell Times at Major West African Ports",
    excerpt:
      "Our weekly read on yard density, discharge delays and what they mean for delivery planning and demurrage exposure.",
    date: "Oct 17, 2026",
    readTime: "6 min read",
    large: true,
  },
];

/* ==========================================================================
   Page
   ========================================================================== */
export default function GlobalInsight() {
  const [active, setActive] = useState("All");
  const [opened, setOpened] = useState(null);

  const visiblePosts =
    active === "All" ? POSTS : POSTS.filter((p) => p.category === active);

  return (
    <main className="bg-slate-50 text-slate-700">
      {/* ---------------- 1. Newsroom header ---------------- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container section-padding">
          <div className="rule-masthead mb-10 flex items-center justify-between font-sans text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-widest text-[#0A2540]">
              Elmivet Newsroom
            </span>
            <span>Updated November 10, 2026</span>
          </div>

          <span className="inline-block font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            Global Insights &amp; Market Intelligence
          </span>

          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-bold leading-tight tracking-tight text-[#0A2540] sm:text-5xl lg:text-6xl">
            Maritime, Customs &amp; Supply Chain Newsroom
          </h1>

          <p className="measure mt-6 font-sans text-lg leading-relaxed text-slate-600">
            Official regulatory updates, port clearance notices, Guangdong hub
            announcements, and global trade analyses from Elmivet International
            Limited.
          </p>
        </div>
      </header>

      <div className="container section-padding">
        {/* ---------------- 2. Hero article ---------------- */}
        <Reveal>
          <article className="overflow-hidden border border-slate-200 bg-white shadow-lg">
            <div className="grid lg:grid-cols-5">
              <div className="lg:col-span-3">
                <ImagePlaceholder
                  tag={HERO.tag}
                  label="Guangdong bonded warehouse and container yard"
                  className="aspect-video lg:aspect-auto lg:h-full lg:min-h-[26rem]"
                />
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-2">
                <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                  <span className="bg-[#D9232D] px-2.5 py-1 font-semibold uppercase tracking-widest text-white">
                    Latest Dispatch
                  </span>
                  <span className="font-medium text-slate-500">{HERO.date}</span>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <span className="font-medium text-slate-500">{HERO.readTime}</span>
                </div>

                <h2 className="mt-5 font-serif text-2xl font-bold leading-snug text-[#0A2540] sm:text-3xl">
                  {HERO.title}
                </h2>

                <p className="mt-4 font-sans leading-relaxed text-slate-600">
                  {HERO.excerpt}
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A2540] font-sans text-xs font-bold text-white"
                  >
                    E
                  </span>
                  <span className="border border-slate-300 px-3 py-1 font-sans text-xs font-semibold text-[#0A2540]">
                    By {HERO.author}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpened("hero")}
                  aria-pressed={opened === "hero"}
                  className="mt-8 w-fit bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#071a2e]"
                >
                  Read Full Dispatch →
                </button>
              </div>
            </div>
          </article>
        </Reveal>

        {/* ---------------- 3. News feed ---------------- */}
        <section aria-labelledby="feed-heading" className="mt-16">
          <div className="flex flex-col gap-5 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <h2
              id="feed-heading"
              className="font-serif text-3xl font-bold text-[#0A2540]"
            >
              Newsroom Feed
            </h2>

            <div
              role="group"
              aria-label="Filter news by category"
              className="flex flex-wrap gap-2"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActive(cat)}
                  aria-pressed={active === cat}
                  className={`border px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors ${
                    active === cat
                      ? "border-[#0A2540] bg-[#0A2540] text-white"
                      : "border-slate-300 bg-white text-slate-600 hover:border-[#0A2540] hover:text-[#0A2540]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* key remounts cards so the entrance animation replays on filter */}
          <div
            key={active}
            className="editorial-grid mt-10 !grid-cols-1 gap-8 lg:!grid-cols-12"
          >
            {visiblePosts.map((post, i) => (
              <Reveal
                key={post.id}
                delay={(i % 3) * 90}
                className={active === "All" ? post.span : "lg:col-span-4"}
              >
                <article className="group flex h-full flex-col border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
                  <ImagePlaceholder
                    tag={post.tag}
                    label={`${post.title} header image`}
                    className={post.large ? "aspect-video lg:aspect-[2/1]" : "aspect-video"}
                  />

                  <div className="flex flex-1 flex-col p-6">
                    <span className="w-fit border-l-[3px] border-[#D9232D] pl-2 font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
                      {post.category}
                    </span>

                    <h3
                      className={`mt-3 font-serif font-bold leading-snug text-[#0A2540] ${
                        post.large ? "text-2xl" : "text-xl"
                      }`}
                    >
                      {post.title}
                    </h3>

                    <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-slate-600">
                      {post.excerpt}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 font-sans text-xs text-slate-500">
                      <span>
                        {post.date}
                        <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
                        {post.readTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpened(post.id)}
                        aria-pressed={opened === post.id}
                        aria-label={`View article: ${post.title}`}
                        className="font-semibold text-[#0A2540] transition-colors hover:text-[#D9232D]"
                      >
                        {opened === post.id ? "Opened ✓" : "View →"}
                      </button>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {visiblePosts.length === 0 && (
            <p className="mt-10 font-sans text-slate-500">
              No updates in this category yet. Check back soon or choose another
              category.
            </p>
          )}
        </section>

        {/* ---------------- Closing rule ---------------- */}
        <Reveal className="mt-16">
          <div className="rule-accent-l bg-white py-6 pr-6 shadow-sm">
            <p className="font-serif text-xl italic text-[#0A2540]">
              Need a notice explained for your shipment?
            </p>
            <p className="mt-2 font-sans text-sm text-slate-600">
              Contact the Elmivet desk and we will point you to the relevant
              regulation or port notice.
            </p>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
