/**
 * Typography helpers, buttons, status badges and the entrance animation.
 */
export const base = `
.ecc-kicker{margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--ecc-muted)}
.ecc-serif{font-family:var(--ecc-serif);font-weight:500;color:var(--ecc-navy);margin:0;letter-spacing:-.01em}
.ecc-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:13px 20px;border:1px solid var(--ecc-line);border-radius:12px;background:#fff;font-weight:600;font-size:13.5px;color:var(--ecc-navy);transition:transform .25s var(--ecc-ease),box-shadow .25s,background .2s,border-color .2s}
.ecc-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(10,37,64,.16)}
.ecc-btn:active{transform:scale(.97)}
.ecc-btn--light{background:#fff;border-color:#fff;color:var(--ecc-navy);padding:15px 24px}
.ecc-btn--glass{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.28);color:#fff;padding:15px 24px}
.ecc-btn--glass:hover{background:rgba(255,255,255,.16);box-shadow:none}
.ecc-btn--navy{background:var(--ecc-navy);border-color:var(--ecc-navy);color:#fff}
.ecc-btn--navy:hover{background:var(--ecc-navy2)}
.ecc-btn--red{color:var(--ecc-red);border-color:#F0C9CC;background:#fff}
.ecc-btn--quiet{border-color:transparent;background:none;box-shadow:none}
.ecc-btn--quiet:hover{background:var(--ecc-ivory2);box-shadow:none}
.ecc-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:600}
.ecc-badge i{width:6px;height:6px;border-radius:50%;background:currentColor}
.ecc-badge--live{background:var(--ecc-greenbg);color:var(--ecc-green)}
.ecc-badge--draft{background:var(--ecc-amberbg);color:var(--ecc-amber)}
.ecc-rise{animation:eccRise .7s var(--ecc-ease) backwards;animation-delay:calc(var(--ecc-stagger,0)*70ms)}
.ecc-btn--block { width: 100%; padding: 15px; }
`