import { Fragment } from "react";
import { imageUrl } from "../hooks/useElmivetContent";

/* ==========================================================================
   Renders the Sanity `body` (Portable Text) of a globalInsight article.

   Supported, matching what the Content Center editor can author (and a little
   more, so older content still reads correctly):
     styles      normal, h1-h6, blockquote
     lists       bullet / number, with nesting by `level`
     decorators  strong, em, underline, code, strike-through
     annotations link (http, https, mailto, tel only)
     blocks      image (resolved asset) with optional caption
   Unknown block types are skipped, never replaced with invented content.
   No dependency: the structure is small and fully understood.
   ========================================================================== */

const SAFE_HREF = /^(https?:|mailto:|tel:)/i;
const EXTERNAL_HREF = /^https?:/i;

/* Headings sit under the dialog's own <h2> title, so the document outline stays valid. */
const HEADING_TAG = { h1: "h3", h2: "h3", h3: "h4", h4: "h5", h5: "h6", h6: "h6" };
const HEADING_CLASS = {
  h1: "mt-10 font-serif text-3xl font-bold leading-snug text-[#0A2540]",
  h2: "mt-9 font-serif text-2xl font-bold leading-snug text-[#0A2540]",
  h3: "mt-8 font-serif text-xl font-bold leading-snug text-[#0A2540]",
  h4: "mt-7 font-serif text-lg font-bold leading-snug text-[#0A2540]",
  h5: "mt-6 font-sans text-base font-bold text-[#0A2540]",
  h6: "mt-6 font-sans text-sm font-bold uppercase tracking-widest text-[#0A2540]",
};

/* ---------------------------- inline content ---------------------------- */
function renderText(text) {
  const lines = String(text ?? "").split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

function renderSpan(span, markDefs, key) {
  let node = renderText(span.text);
  const marks = Array.isArray(span.marks) ? span.marks : [];

  /* Apply innermost-first so the first mark ends up outermost. */
  for (const mark of [...marks].reverse()) {
    const def = markDefs.find((d) => d?._key === mark);
    if (def) {
      if (def._type === "link") {
        const href = typeof def.href === "string" ? def.href.trim() : "";
        if (SAFE_HREF.test(href)) {
          const external = EXTERNAL_HREF.test(href);
          node = (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="font-semibold text-[#0A2540] underline decoration-[#D9232D] decoration-2 underline-offset-2 transition-colors hover:text-[#D9232D]"
            >
              {node}
            </a>
          );
        }
      }
      continue; // unknown annotation: keep the text, drop the wrapper
    }

    if (mark === "strong") node = <strong className="font-bold text-[#0A2540]">{node}</strong>;
    else if (mark === "em") node = <em>{node}</em>;
    else if (mark === "underline") node = <u>{node}</u>;
    else if (mark === "strike-through") node = <s>{node}</s>;
    else if (mark === "code")
      node = <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em]">{node}</code>;
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function renderChildren(block) {
  const markDefs = Array.isArray(block.markDefs) ? block.markDefs : [];
  const spans = Array.isArray(block.children) ? block.children : [];
  return spans
    .filter((child) => child && child._type === "span")
    .map((span, i) => renderSpan(span, markDefs, span._key || i));
}

const blockHasText = (block) =>
  Array.isArray(block.children) &&
  block.children.some((c) => c?._type === "span" && typeof c.text === "string" && c.text.trim() !== "");

/* -------------------------------- lists --------------------------------- */
/* Groups consecutive list blocks into nested trees:
   { type: "list", listItem, level, items: [{ block, children: [list, ...] }] } */
function buildNodes(blocks) {
  const nodes = [];
  let stack = []; // open lists, outermost first

  const attach = (list) => {
    const parent = stack[stack.length - 1];
    if (parent) {
      let last = parent.items[parent.items.length - 1];
      if (!last) {
        last = { block: null, children: [] };
        parent.items.push(last);
      }
      last.children.push(list);
    } else {
      nodes.push(list);
    }
    stack.push(list);
  };

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    if (block._type === "block" && block.listItem) {
      const level = Number(block.level) > 0 ? Number(block.level) : 1;
      while (stack.length && stack[stack.length - 1].level > level) stack.pop();

      let top = stack[stack.length - 1];
      if (top && top.level === level && top.listItem !== block.listItem) {
        stack.pop(); // same depth, different list type: start a sibling list
        top = undefined;
      }
      if (!top || top.level < level) {
        attach({ type: "list", listItem: block.listItem, level, items: [] });
        top = stack[stack.length - 1];
      }
      top.items.push({ block, children: [] });
    } else {
      stack = [];
      nodes.push({ type: "block", block });
    }
  }
  return nodes;
}

function List({ node }) {
  const Tag = node.listItem === "number" ? "ol" : "ul";
  const marker = node.listItem === "number" ? "list-decimal" : "list-disc";
  return (
    <Tag className={`mt-5 space-y-2 pl-6 marker:text-[#D9232D] ${marker}`}>
      {node.items.map((item, i) => (
        <li key={item.block?._key || i} className="pl-1">
          {item.block && renderChildren(item.block)}
          {item.children.map((child, j) => (
            <List key={j} node={child} />
          ))}
        </li>
      ))}
    </Tag>
  );
}

/* -------------------------------- images -------------------------------- */
function BodyImage({ block }) {
  const asset = block.asset;
  const url = typeof asset?.url === "string" ? asset.url : "";
  if (!/^https?:\/\//i.test(url)) return null; // unresolved or deleted asset: nothing to show

  const caption = typeof block.caption === "string" ? block.caption.trim() : "";
  const alt = (typeof block.alt === "string" && block.alt.trim()) || caption;
  const width = Number(asset?.metadata?.dimensions?.width) || undefined;
  const height = Number(asset?.metadata?.dimensions?.height) || undefined;

  return (
    <figure className="my-9">
      <img
        src={imageUrl(url, { width: 1400 })}
        srcSet={`${imageUrl(url, { width: 700 })} 700w, ${imageUrl(url, { width: 1400 })} 1400w`}
        sizes="(min-width: 768px) 42rem, 100vw"
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full bg-slate-100"
      />
      {caption && (
        <figcaption className="mt-3 border-l-[3px] border-[#D9232D] pl-3 font-sans text-sm leading-relaxed text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* -------------------------------- blocks -------------------------------- */
function Block({ block }) {
  if (block._type === "image") return <BodyImage block={block} />;
  if (block._type !== "block") return null;
  if (!blockHasText(block)) return null; // empty paragraphs would only add stray gaps

  const style = block.style || "normal";

  if (HEADING_TAG[style]) {
    const Tag = HEADING_TAG[style];
    return <Tag className={HEADING_CLASS[style]}>{renderChildren(block)}</Tag>;
  }
  if (style === "blockquote") {
    return (
      <blockquote className="my-8 border-l-4 border-[#D9232D] bg-slate-50 py-4 pl-6 pr-4 font-serif text-xl italic leading-relaxed text-[#0A2540]">
        {renderChildren(block)}
      </blockquote>
    );
  }
  return <p className="mt-5 text-[1.0625rem] leading-8 text-slate-700">{renderChildren(block)}</p>;
}

export default function PortableTextBody({ value }) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const nodes = buildNodes(value);
  return (
    <div className="font-sans [&>*:first-child]:mt-0">
      {nodes.map((node, i) =>
        node.type === "list" ? (
          <List key={i} node={node} />
        ) : (
          <Block key={node.block?._key || i} block={node.block} />
        ),
      )}
    </div>
  );
}
