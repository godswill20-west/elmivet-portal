import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { imageUrl, useInsightArticle } from "../hooks/useElmivetContent";
import { describeSanityError } from "../lib/sanityConfig";
import PortableTextBody from "./PortableTextBody";

/* ==========================================================================
   Accessible full-article reader (modal dialog).

   - Loads the article's real `body` from Sanity when opened (by slug or id).
   - role="dialog" + aria-modal, labelled by the title, Esc / backdrop / button close,
     focus is trapped inside and returned to the control that opened it,
     page scroll is locked while open.
   - Distinct loading, "no longer available" and error states. Never shows sample text.
   ========================================================================== */

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Skeleton() {
  return (
    <div aria-hidden="true" className="space-y-4 pt-2">
      <div className="aspect-video w-full animate-pulse bg-slate-200 motion-reduce:animate-none" />
      <div className="h-4 w-full animate-pulse bg-slate-200 motion-reduce:animate-none" />
      <div className="h-4 w-11/12 animate-pulse bg-slate-200 motion-reduce:animate-none" />
      <div className="h-4 w-4/5 animate-pulse bg-slate-200 motion-reduce:animate-none" />
      <div className="h-4 w-2/3 animate-pulse bg-slate-200 motion-reduce:animate-none" />
    </div>
  );
}

export default function ArticleReader({ articleKey, summary, onClose }) {
  const { data: article, loading, error, refetch } = useInsightArticle(articleKey);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const opener = useRef(null);

  /* Show the card's data instantly while the body loads. */
  const shown = article ?? summary ?? null;
  const titleId = "article-reader-title";

  /* Focus: remember the opener, move focus in, hand it back on close. */
  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const node = opener.current;
      if (node && typeof node.focus === "function" && document.contains(node)) node.focus();
    };
  }, []);

  /* Lock page scroll while the dialog is open. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const nodes = dialogRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes || nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const failure = error ? describeSanityError(error) : null;
  const notFound = !loading && !error && !article;
  const cover = article?.cover ?? summary?.cover ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex justify-center overflow-y-auto bg-[#0A2540]/70 p-0 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading}
        onKeyDown={onKeyDown}
        className="relative my-0 w-full max-w-3xl self-start bg-white shadow-2xl sm:my-6"
      >
        {/* Sticky bar keeps the close control reachable on long articles */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-8">
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-[#0A2540]">
            Elmivet Newsroom
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 border border-slate-300 px-3.5 py-1.5 font-sans text-xs font-semibold text-[#0A2540] transition-colors hover:border-[#0A2540] hover:bg-[#0A2540] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9232D]"
          >
            <span aria-hidden="true">✕</span>
            Close
          </button>
        </div>

        <article className="px-5 pb-12 pt-8 sm:px-10">
          {/* ---------- header (available as soon as the card data is) ---------- */}
          {shown ? (
            <header>
              <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                {shown.category && (
                  <span className="border-l-[3px] border-[#D9232D] pl-2 font-semibold uppercase tracking-widest text-[#D9232D]">
                    {shown.category}
                  </span>
                )}
                {shown.publishedAt && (
                  <time dateTime={shown.publishedAt} className="font-medium text-slate-500">
                    {shown.longDate}
                  </time>
                )}
                {shown.publishedAt && shown.readTime && (
                  <span className="text-slate-300" aria-hidden="true">
                    |
                  </span>
                )}
                {shown.readTime && <span className="font-medium text-slate-500">{shown.readTime}</span>}
              </div>

              <h2
                id={titleId}
                className="mt-4 font-serif text-3xl font-bold leading-tight text-[#0A2540] sm:text-4xl"
              >
                {shown.title}
              </h2>

              {shown.excerpt && (
                <p className="mt-4 font-sans text-lg leading-relaxed text-slate-600">{shown.excerpt}</p>
              )}

              {shown.author && (
                <p className="mt-5 font-sans text-sm font-semibold text-[#0A2540]">By {shown.author}</p>
              )}
            </header>
          ) : (
            <h2 id={titleId} className="font-serif text-3xl font-bold leading-tight text-[#0A2540]">
              {loading ? "Loading dispatch…" : notFound ? "Dispatch not available" : "Dispatch unavailable"}
            </h2>
          )}

          {cover && (
            <figure className="mt-8">
              <img
                src={imageUrl(cover.url, { width: 1400, height: 788 })}
                srcSet={`${imageUrl(cover.url, { width: 700, height: 394 })} 700w, ${imageUrl(cover.url, {
                  width: 1400,
                  height: 788,
                })} 1400w`}
                sizes="(min-width: 768px) 44rem, 100vw"
                alt={cover.alt || `Cover image: ${shown?.title ?? ""}`}
                decoding="async"
                className="aspect-video w-full bg-slate-100 object-cover"
              />
            </figure>
          )}

          <div className="mt-8 border-t border-slate-200 pt-2">
            {loading && <Skeleton />}

            {failure && (
              <div role="alert" className="mt-6 border border-slate-200 border-l-4 border-l-[#D9232D] bg-slate-50 p-5">
                <p className="font-serif text-lg font-bold text-[#0A2540]">
                  The full dispatch could not be loaded.
                </p>
                <p className="mt-2 font-sans text-sm text-slate-600">{failure.headline}</p>
                <p className="mt-1 break-words font-sans text-xs text-slate-500">
                  {failure.detail}
                </p>
                <button
                  type="button"
                  onClick={refetch}
                  className="mt-4 bg-[#0A2540] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#071a2e]"
                >
                  Try again
                </button>
              </div>
            )}

            {notFound && (
              <div role="status" className="mt-6 border border-slate-200 bg-slate-50 p-5">
                <p className="font-serif text-lg font-bold text-[#0A2540]">
                  This dispatch is no longer available.
                </p>
                <p className="mt-2 font-sans text-sm text-slate-600">
                  It may have been unpublished or moved. Return to the newsroom to see current dispatches.
                </p>
              </div>
            )}

            {article && (
              <div className="mt-6">
                {article.body && article.body.length > 0 ? (
                  <PortableTextBody value={article.body} />
                ) : (
                  <p role="status" className="font-sans text-sm text-slate-500">
                    This dispatch has no body text yet.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#0A2540] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#071a2e]"
            >
              ← Back to the newsroom
            </button>
          </div>
        </article>
      </div>
    </div>,
    document.body,
  );
}
