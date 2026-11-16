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
   1. CONTENT PROVIDER (temporary)
   --------------------------------------------------------------------------
   The ONLY part of this file that knows where Global Insights content comes
   from. Today it returns the hardcoded articles below. When the CMS is
   connected, replace the body of getGlobalInsightContent() so it returns the
   same shape. Nothing in sections 2 and 3 needs to change.

   Article shape
     {
       id,         required, unique (string or number)
       title,      required
       category,   required, one of CATEGORIES below
       tag,        optional, label on the image (falls back to category)
       excerpt,    optional
       date,       optional, display text
       readTime,   optional, display text
       author,     optional, display text (featured article only)
       imageAlt,   optional, accessible label for the image area
     }

   Content shape
     { featured: Article | null, articles: Article[] }

   Layout (column widths, "large" cards) is NOT part of the content.
   ========================================================================== */
const FEATURED_ARTICLE = {
  id: "hero",
  tag: "Industrial Cargo / Bonded Warehousing",
  category: "Guangdong Hub",
  title:
    "Guangdong International Customs Bonded Warehouse Expands Processing Capacity for West African Trade",
  excerpt:
    "Elmivet's bonded facility in Guangdong has added dedicated consolidation, inspection and re-packing lines for exporters shipping to West African ports. The expansion shortens dwell time before vessel loading and gives importers earlier visibility on customs documentation.",
  date: "November 6, 2026",
  readTime: "7 min read",
  author: "Elmivet Editorial Desk",
  imageAlt: "Guangdong bonded warehouse and container yard",
};

const ARTICLES = [
  {
    id: 2,
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
    category: "Port Operations",
    tag: "Terminal Notice",
    title: "Terminal Congestion Watch: Dwell Times at Major West African Ports",
    excerpt:
      "Our weekly read on yard density, discharge delays and what they mean for delivery planning and demurrage exposure.",
    date: "Oct 17, 2026",
    readTime: "6 min read",
  },
];

function getGlobalInsightContent() {
  return { featured: FEATURED_ARTICLE, articles: ARTICLES };
}

/* ==========================================================================
   2. SELECTION LOGIC (pure functions, no JSX)
   ========================================================================== */
const CATEGORIES = [
  "All",
  "Regulatory Notice",
  "Port Operations",
  "Global Logistics",
  "Guangdong Hub",
];

function filterByCategory(articles, category) {
  return category === "All"
    ? articles
    : articles.filter((article) => article.category === category);
}

/* Row widths on the 12-column desktop grid.
   Rows alternate pair (7/5, then 5/7, ...) and triple (4/4/4), starting with
   a pair, so 7 articles give exactly 7/5, 4/4/4, 5/7. The tail is adjusted so
   every row totals 12 and no stray card is left behind:
     3 left -> a triple      2 left -> a pair
     4 left -> two pairs     1 article in total -> one centred card (8 wide)
   Widths depend only on position, never on article ids. */
const PAIR_ROWS = [
  [7, 5],
  [5, 7],
];
const TRIPLE_ROW = [4, 4, 4];
const SINGLE_ROW = [8];

function buildRowLayout(count) {
  const rows = [];
  let remaining = count;
  let pairsPlaced = 0;

  const placePair = () => {
    rows.push([...PAIR_ROWS[pairsPlaced % 2]]);
    pairsPlaced += 1;
    remaining -= 2;
  };

  while (remaining > 0) {
    if (remaining === 1) {
      rows.push([...SINGLE_ROW]);
      remaining = 0;
    } else if (remaining === 2) {
      placePair();
    } else if (remaining === 3) {
      rows.push([...TRIPLE_ROW]);
      remaining = 0;
    } else if (remaining === 4) {
      placePair();
      placePair();
    } else if (rows.length % 2 === 0) {
      placePair();
    } else {
      rows.push([...TRIPLE_ROW]);
      remaining -= 3;
    }
  }
  return rows;
}

/* ==========================================================================
   3. PRESENTATION (receives content through props only)
   Full class strings are kept static so Tailwind v4 can detect them.
   ========================================================================== */
const SPAN_CLASSES = {
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  7: "lg:col-span-7",
  8: "lg:col-span-8 lg:col-start-3",
};
const LARGE_FROM_SPAN = 7;

function FeaturedArticle({ article, isOpened, onOpen }) {
  return (
    <Reveal>
      <article className="overflow-hidden border border-slate-200 bg-white shadow-lg">
        <div className="grid lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ImagePlaceholder
              tag={article.tag ?? article.category}
              label={article.imageAlt ?? `${article.title} header image`}
              className="aspect-video lg:aspect-auto lg:h-full lg:min-h-[26rem]"
            />
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
              <span className="bg-[#D9232D] px-2.5 py-1 font-semibold uppercase tracking-widest text-white">
                Latest Dispatch
              </span>
              {article.date && (
                <span className="font-medium text-slate-500">{article.date}</span>
              )}
              {article.date && article.readTime && (
                <span className="text-slate-300" aria-hidden="true">|</span>
              )}
              {article.readTime && (
                <span className="font-medium text-slate-500">{article.readTime}</span>
              )}
            </div>

            <h2 className="mt-5 font-serif text-2xl font-bold leading-snug text-[#0A2540] sm:text-3xl">
              {article.title}
            </h2>

            {article.excerpt && (
              <p className="mt-4 font-sans leading-relaxed text-slate-600">
                {article.excerpt}
              </p>
            )}

            {article.author && (
              <div className="mt-6 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A2540] font-sans text-xs font-bold text-white"
                >
                  E
                </span>
                <span className="border border-slate-300 px-3 py-1 font-sans text-xs font-semibold text-[#0A2540]">
                  By {article.author}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpen(article.id)}
              aria-pressed={isOpened}
              className="mt-8 w-fit bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#071a2e]"
            >
              Read Full Dispatch →
            </button>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

function ArticleCard({ article, large, isOpened, onOpen }) {
  return (
    <article className="group flex h-full flex-col border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <ImagePlaceholder
        tag={article.tag ?? article.category}
        label={`${article.title} header image`}
        className={large ? "aspect-video lg:aspect-[2/1]" : "aspect-video"}
      />

      <div className="flex flex-1 flex-col p-6">
        {article.category && (
          <span className="w-fit border-l-[3px] border-[#D9232D] pl-2 font-sans text-xs font-semibold uppercase tracking-widest text-[#D9232D]">
            {article.category}
          </span>
        )}

        <h3
          className={`mt-3 font-serif font-bold leading-snug text-[#0A2540] ${
            large ? "text-2xl" : "text-xl"
          }`}
        >
          {article.title}
        </h3>

        {article.excerpt ? (
          <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-slate-600">
            {article.excerpt}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 font-sans text-xs text-slate-500">
          <span>
            {article.date}
            {article.date && article.readTime && (
              <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
            )}
            {article.readTime}
          </span>
          <button
            type="button"
            onClick={() => onOpen(article.id)}
            aria-pressed={isOpened}
            aria-label={`View article: ${article.title}`}
            className="font-semibold text-[#0A2540] transition-colors hover:text-[#D9232D]"
          >
            {isOpened ? "Opened ✓" : "View →"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ArticleGrid({ articles, opened, onOpen }) {
  const spans = buildRowLayout(articles.length).flat();

  return (
    <div className="editorial-grid mt-10 !grid-cols-1 gap-8 lg:!grid-cols-12">
      {articles.map((article, i) => (
        <Reveal
          key={article.id}
          delay={(i % 3) * 90}
          className={SPAN_CLASSES[spans[i]]}
        >
          <ArticleCard
            article={article}
            large={spans[i] >= LARGE_FROM_SPAN}
            isOpened={opened === article.id}
            onOpen={onOpen}
          />
        </Reveal>
      ))}
    </div>
  );
}

function NewsroomEmptyState() {
  return (
    <Reveal className="mt-10">
      <div className="border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="font-serif text-2xl font-bold text-[#0A2540]">
          No dispatches published yet
        </p>
        <p className="mx-auto mt-3 max-w-xl font-sans text-sm leading-relaxed text-slate-600">
          Regulatory notices, port updates and Guangdong hub announcements will
          appear here as soon as they are published.
        </p>
      </div>
    </Reveal>
  );
}

/* ==========================================================================
   Page
   ========================================================================== */
export default function GlobalInsight() {
  const [active, setActive] = useState("All");
  const [opened, setOpened] = useState(null);

  const { featured, articles } = getGlobalInsightContent();
  const hasFeatured = Boolean(featured?.title);
  const visibleArticles = filterByCategory(articles, active);
  const hasArticles = articles.length > 0;

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
        {hasFeatured && (
          <FeaturedArticle
            article={featured}
            isOpened={opened === featured.id}
            onOpen={setOpened}
          />
        )}

        {/* ---------------- 3. News feed ---------------- */}
        <section
          aria-labelledby="feed-heading"
          className={hasFeatured ? "mt-16" : ""}
        >
          <div className="flex flex-col gap-5 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <h2
              id="feed-heading"
              className="font-serif text-3xl font-bold text-[#0A2540]"
            >
              Newsroom Feed
            </h2>

            {hasArticles && (
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
            )}
          </div>

          {hasArticles ? (
            <>
              {/* key remounts cards so the entrance animation replays on filter */}
              <ArticleGrid
                key={active}
                articles={visibleArticles}
                opened={opened}
                onOpen={setOpened}
              />

              {visibleArticles.length === 0 && (
                <p className="mt-10 font-sans text-slate-500">
                  No updates in this category yet. Check back soon or choose another
                  category.
                </p>
              )}
            </>
          ) : (
            <NewsroomEmptyState />
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