import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import useElmivetContent, { imageUrl } from "../hooks/useElmivetContent";
import { describeSanityError } from "../lib/sanityConfig";
import { latestPublishedLabel } from "../lib/newsroom";
import ArticleReader from "../components/ArticleReader";
import Seo from '../components/Seo';
import { PAGE_SEO } from '../lib/seo';

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
   Cover image: the real Sanity cover photo (with its alt text). Keeps a fixed
   aspect ratio. If an article has no usable image, or the image fails to load,
   the branded gradient is shown instead (no "placeholder" wording).
   ========================================================================== */
function CoverArt({ tag, label, className }) {
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
      <TagPill tag={tag} />
    </div>
  );
}

function TagPill({ tag }) {
  if (!tag) return null;
  return (
    <span className="absolute left-4 top-4 bg-white/95 px-2.5 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-widest text-[#0A2540]">
      {tag}
    </span>
  );
}

function CoverImage({ article, className = "aspect-video", sizes, ratio = 0.5625 }) {
  const [failed, setFailed] = useState(false);
  const cover = article.cover;
  const alt = cover?.alt || `Cover image: ${article.title}`;

  if (!cover || failed) {
    return <CoverArt tag={article.tag} label={alt} className={className} />;
  }

  const src = (w) => imageUrl(cover.url, { width: w, height: Math.round(w * ratio) });
  return (
    <div className={`relative w-full overflow-hidden bg-slate-200 ${className}`}>
      <img
        src={src(900)}
        srcSet={`${src(480)} 480w, ${src(900)} 900w, ${src(1400)} 1400w`}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <TagPill tag={article.tag} />
    </div>
  );
}

/* ==========================================================================
   1. CONTENT SOURCE
   --------------------------------------------------------------------------
   All content comes from Sanity (see useElmivetContent):
     - every published globalInsight article, newest first
     - the single article chosen under "GlobalInsight page" in Featured Placements
   The legacy `isFeatured` flag is not used. Nothing here is ever replaced by
   sample articles: an empty result shows an empty state, a failure an error state.

   Article shape (see toNewsroomArticle in lib/newsroom.js)
     { id, key, title, slug, excerpt, category, tag, readTime, publishedAt,
       date, longDate, author, cover: { url, alt, width, height } | null, body }
   ========================================================================== */

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

function FeaturedArticle({ article, onOpen }) {
  return (
    <Reveal>
      <article className="overflow-hidden border border-slate-200 bg-white shadow-lg">
        <div className="grid lg:grid-cols-5">
          <div className="lg:col-span-3">
            <CoverImage
              article={article}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="aspect-video lg:aspect-auto lg:h-full lg:min-h-[26rem]"
            />
          </div>

          <div className="flex flex-col justify-center p-6 sm:p-10 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
              <span className="bg-[#D9232D] px-2.5 py-1 font-semibold uppercase tracking-widest text-white">
                Latest Dispatch
              </span>
              {article.longDate && (
                <time dateTime={article.publishedAt} className="font-medium text-slate-500">
                  {article.longDate}
                </time>
              )}
              {article.longDate && article.readTime && (
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
              onClick={(event) => onOpen(article, event)}
              aria-haspopup="dialog"
              aria-label={`Read full dispatch: ${article.title}`}
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

function ArticleCard({ article, large, onOpen }) {
  return (
    <article className="group flex h-full flex-col border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
      <CoverImage
        article={article}
        ratio={large ? 0.5 : 0.5625}
        sizes={large ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
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
            {article.publishedAt ? (
              <time dateTime={article.publishedAt}>{article.date}</time>
            ) : null}
            {article.date && article.readTime && (
              <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
            )}
            {article.readTime}
          </span>
          <button
            type="button"
            onClick={(event) => onOpen(article, event)}
            aria-haspopup="dialog"
            aria-label={`View article: ${article.title}`}
            className="font-semibold text-[#0A2540] transition-colors hover:text-[#D9232D]"
          >
            View →
          </button>
        </div>
      </div>
    </article>
  );
}

function ArticleGrid({ articles, onOpen }) {
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
            onOpen={onOpen}
          />
        </Reveal>
      ))}
    </div>
  );
}

function NewsroomSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dispatches" role="status" className="mt-10">
      <div className="editorial-grid !grid-cols-1 gap-8 lg:!grid-cols-12">
        {[
          "lg:col-span-7",
          "lg:col-span-5",
          "lg:col-span-4",
          "lg:col-span-4 hidden lg:block",
          "lg:col-span-4 hidden lg:block",
        ].map((span, i) => (
          <div key={i} className={`border border-slate-200 bg-white shadow-sm ${span}`}>
            <div className="aspect-video animate-pulse bg-slate-200 motion-reduce:animate-none" />
            <div className="space-y-3 p-6">
              <div className="h-3 w-1/3 animate-pulse bg-slate-200 motion-reduce:animate-none" />
              <div className="h-6 w-4/5 animate-pulse bg-slate-200 motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse bg-slate-100 motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse bg-slate-100 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading dispatches…</span>
    </div>
  );
}

function NewsroomErrorState({ error, onRetry }) {
  const info = describeSanityError(error);
  return (
    <div
      role="alert"
      className="mt-10 border border-slate-200 border-l-4 border-l-[#D9232D] bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="font-serif text-2xl font-bold text-[#0A2540]">
        The newsroom could not be loaded right now.
      </p>
      <p className="mt-3 font-sans text-sm leading-relaxed text-slate-600">{info.headline}</p>
      <p className="mt-1 break-words font-sans text-xs leading-relaxed text-slate-500">
        {info.detail}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 bg-[#0A2540] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#071a2e]"
      >
        Try again
      </button>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { insights, featured, loading, error, refetch } = useElmivetContent();

  /* The reader is driven by the URL: /global-insight/<slug> is the dedicated article URL, and the
     legacy ?article=<slug> query parameter still works for old links and bookmarks. Either way the
     browser Back button closes it, and the homepage cards deep-link straight into it. */
  const { slug: routeSlug } = useParams(); // already URL-decoded by the router
  const openKey = routeSlug || searchParams.get("article");
  const openArticle = (article) => {
    navigate(`/global-insight/${encodeURIComponent(article.key)}`, { state: { reader: true } });
  };
  const closeArticle = () => {
    if (location.state?.reader) {
      navigate(-1); // opened from this page: Back and Close behave the same
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("article"); // so a leftover legacy parameter cannot reopen the reader
    if (routeSlug) {
      // opened from a dedicated article link: go to the newsroom listing
      const search = next.toString();
      navigate({ pathname: "/global-insight", search: search ? `?${search}` : "" }, { replace: true });
      return;
    }
    setSearchParams(next, { replace: true }); // opened from a legacy link: just drop the parameter
  };
  const readerSummary =
    openKey &&
    [featured, ...insights].find((a) => a && (a.key === openKey || a.slug === openKey || a.id === openKey));

  /* The featured article is the hero; the feed lists the others so nothing appears twice.
     (An article may still be featured on the homepage too: that selection is independent.) */
  const feedArticles = featured ? insights.filter((a) => a.id !== featured.id) : insights;
  const visibleArticles = filterByCategory(feedArticles, active);
  const hasFeatured = !loading && !error && Boolean(featured);
  const hasFeed = feedArticles.length > 0;
  const nothingPublished = !loading && !error && insights.length === 0 && !featured;
  const updatedLabel = loading || error ? "" : latestPublishedLabel(featured ? [featured, ...insights] : insights);

  return (
    <main className="bg-slate-50 text-slate-700">
      <Seo {...PAGE_SEO.globalInsight} />
      {/* ---------------- 1. Newsroom header ---------------- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="container section-padding">
          <div className="rule-masthead mb-10 flex items-center justify-between font-sans text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-widest text-[#0A2540]">
              Elmivet Newsroom
            </span>
            {updatedLabel && <span>Updated {updatedLabel}</span>}
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
        {hasFeatured && <FeaturedArticle article={featured} onOpen={openArticle} />}

        {/* ---------------- 3. News feed ---------------- */}
        <section
          aria-labelledby="feed-heading"
          className={hasFeatured ? "mt-16" : ""}
          aria-busy={loading}
        >
          <div className="flex flex-col gap-5 border-b border-slate-300 pb-5 md:flex-row md:items-end md:justify-between">
            <h2
              id="feed-heading"
              className="font-serif text-3xl font-bold text-[#0A2540]"
            >
              Newsroom Feed
            </h2>

            {hasFeed && !loading && !error && (
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

          {loading && <NewsroomSkeleton />}

          {error && <NewsroomErrorState error={error} onRetry={refetch} />}

          {nothingPublished && <NewsroomEmptyState />}

          {!loading && !error && !nothingPublished && !hasFeed && (
            <p role="status" className="mt-10 font-sans text-slate-500">
              The featured dispatch above is our only published dispatch for now. New dispatches will
              appear here as soon as they are published.
            </p>
          )}

          {!loading && !error && hasFeed && (
            <>
              {/* key remounts cards so the entrance animation replays on filter */}
              <ArticleGrid key={active} articles={visibleArticles} onOpen={openArticle} />

              {visibleArticles.length === 0 && (
                <p className="mt-10 font-sans text-slate-500">
                  No updates in this category yet. Check back soon or choose another
                  category.
                </p>
              )}
            </>
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

      {/* ---------------- Full article reader ---------------- */}
      {openKey && (
        <ArticleReader
          key={openKey}
          articleKey={openKey}
          summary={readerSummary || null}
          onClose={closeArticle}
        />
      )}
    </main>
  );
}