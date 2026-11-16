/**
 * Design tokens, frame and global resets for the Content Center. All values come from the approved mockup.
 */
export const tokens = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');

.ecc-frame {
  --ecc-navy:#0A2540;
  --ecc-navy2:#143A63;
  --ecc-ivory:#FAF7F0;
  --ecc-ivory2:#F2EDE0;
  --ecc-line:#E7E1D3;
  --ecc-ink:#0F172A;
  --ecc-body:#475569;
  --ecc-muted:#7A8696;
  --ecc-red:#C81E28;
  --ecc-green:#1F7A55;
  --ecc-greenbg:#E4F3EB;
  --ecc-amber:#946200;
  --ecc-amberbg:#FBF0D9;
  --ecc-sh:0 1px 2px rgba(10,37,64,.05),0 8px 24px rgba(10,37,64,.07);
  --ecc-serif:'Playfair Display',Georgia,serif;
  --ecc-sans:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;
  --ecc-ease:cubic-bezier(.16,1,.3,1);
}

/* The frame is the size container for responsive rules and the positioning context for toasts. */
.ecc-frame {
  container-type: inline-size;
  position: relative;
  height: 100%;
  background: var(--ecc-ivory);
  color: var(--ecc-body);
  font: 14px/1.55 var(--ecc-sans);
  -webkit-font-smoothing: antialiased;
}
/* The scroller is separate from the frame so overlays and toasts are never clipped or scrolled away. */
.ecc-scroll { height: 100%; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; }

/* Resets use :where() so they add no specificity and never override component classes. */
:where(.ecc-frame), :where(.ecc-frame) * { box-sizing: border-box; }
:where(.ecc-frame) button { font: inherit; color: inherit; cursor: pointer; }
.ecc-frame :is(button, input, textarea):focus-visible { outline: 2px solid var(--ecc-navy2); outline-offset: 2px; }
.ecc-i { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.ecc-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`