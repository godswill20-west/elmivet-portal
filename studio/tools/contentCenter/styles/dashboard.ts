/**
 * Hero, metric cards, featured story, recent articles and the organogram panel.
 */
export const dashboard = `
.ecc-frame{--ecc-navy:#0A2540;--ecc-navy2:#143A63;--ecc-ivory:#FAF7F0;--ecc-ivory2:#F2EDE0;--ecc-line:#E7E1D3;--ecc-ink:#0F172A;--ecc-body:#475569;--ecc-muted:#7A8696;--ecc-red:#C81E28;--ecc-green:#1F7A55;--ecc-greenbg:#E4F3EB;--ecc-amber:#946200;--ecc-amberbg:#FBF0D9;--ecc-sh:0 1px 2px rgba(10,37,64,.05),0 8px 24px rgba(10,37,64,.07);--ecc-serif:'Playfair Display',Georgia,serif;--ecc-sans:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;--ecc-ease:cubic-bezier(.16,1,.3,1)}
.ecc-frame{container-type:inline-size;position:relative;overflow:hidden;margin:0 auto;min-height:100vh;background:var(--ecc-ivory);color:var(--ecc-body);font:14px/1.55 var(--ecc-sans);-webkit-font-smoothing:antialiased;transition:max-width .5s var(--ecc-ease)}
.ecc-hero{position:relative;background:var(--ecc-navy);color:#fff;padding:44px 0 108px;overflow:hidden}
.ecc-hero::before{content:"";position:absolute;right:-120px;top:-160px;width:560px;height:560px;border-radius:50%;border:1px solid rgba(255,255,255,.1);box-shadow:0 0 0 70px rgba(255,255,255,.025),0 0 0 140px rgba(255,255,255,.02)}
.ecc-wrap{position:relative;max-width:1140px;margin:0 auto;padding:0 40px}
.ecc-brand{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#C9D6E6}
.ecc-brand b{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:#fff;color:var(--ecc-navy);font:600 17px var(--ecc-serif);letter-spacing:0}
.ecc-hero-row{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;flex-wrap:wrap;margin-top:44px}
.ecc-hero h1{font:500 50px/1.05 var(--ecc-serif);margin:0;letter-spacing:-.02em}
.ecc-hero h1 em{font-style:italic;color:#BFD0E6}
.ecc-hero p{margin:14px 0 0;max-width:44ch;color:#AFC0D6;font-size:15px}
.ecc-actions{display:flex;gap:12px;flex-wrap:wrap}
.ecc-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin-top:-64px;position:relative}
.ecc-card{background:#fff;border:1px solid var(--ecc-line);border-radius:18px;box-shadow:var(--ecc-sh)}
.ecc-metric{padding:22px;transition:transform .3s var(--ecc-ease),box-shadow .3s}
.ecc-metric:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(10,37,64,.05),0 18px 36px rgba(10,37,64,.12)}
.ecc-metric-top{display:flex;justify-content:space-between;align-items:center;color:var(--ecc-muted);font-weight:500}
.ecc-chip{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:var(--ecc-ivory2);color:var(--ecc-navy)}
.ecc-metric-num{margin:14px 0 4px;font:500 40px/1 var(--ecc-serif);color:var(--ecc-navy)}
.ecc-metric-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;font-size:12.5px;color:var(--ecc-muted)}
.ecc-up{color:var(--ecc-green);font-weight:600}
.ecc-spark{width:70px;height:26px;fill:none;stroke:var(--ecc-navy2);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ecc-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);gap:24px;margin-top:28px;padding-bottom:110px;align-items:start}
.ecc-sec-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 16px}
.ecc-sec-head h2{font:500 22px var(--ecc-serif);margin:0;color:var(--ecc-navy)}
.ecc-feature{overflow:hidden;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);transition:box-shadow .3s,transform .3s var(--ecc-ease);cursor:pointer;text-align:left;padding:0;width:100%}
.ecc-feature:hover{transform:translateY(-3px);box-shadow:0 2px 4px rgba(10,37,64,.05),0 22px 44px rgba(10,37,64,.13)}
.ecc-art{position:relative;min-height:260px;overflow:hidden;background:var(--ecc-c1)}
.ecc-art svg{position:absolute;inset:0;width:100%;height:100%;transition:transform .8s var(--ecc-ease)}
.ecc-feature:hover .ecc-art svg,.ecc-row:hover .ecc-thumb svg{transform:scale(1.06)}
.ecc-tag{position:absolute;left:14px;top:14px;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.94);color:var(--ecc-navy);font-size:11px;font-weight:600;letter-spacing:.04em}
.ecc-feature-body{padding:28px;display:flex;flex-direction:column;gap:12px}
.ecc-feature-body h3{font:500 25px/1.22 var(--ecc-serif);margin:0;color:var(--ecc-navy)}
.ecc-feature-body p{margin:0;color:var(--ecc-body)}
.ecc-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:auto;padding-top:16px;border-top:1px solid var(--ecc-line);font-size:12.5px;color:var(--ecc-muted)}
.ecc-lead{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ecc-red)}
.ecc-list{margin-top:24px;padding:8px 8px 4px}
.ecc-list-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 14px 10px}
.ecc-tabs{display:inline-flex;padding:3px;background:var(--ecc-ivory2);border-radius:10px}
.ecc-tab{padding:6px 14px;border:0;border-radius:8px;background:none;font-size:12.5px;font-weight:500;color:var(--ecc-muted);transition:.2s}
.ecc-tab[aria-selected=true]{background:#fff;color:var(--ecc-navy);font-weight:600;box-shadow:0 1px 3px rgba(10,37,64,.12)}
.ecc-row{display:grid;grid-template-columns:64px minmax(0,1fr) auto 92px 36px;gap:16px;align-items:center;padding:10px 14px;border-radius:12px;position:relative;transition:background .2s;cursor:pointer}
.ecc-row:hover{background:var(--ecc-ivory)}
.ecc-thumb{width:64px;height:48px;border-radius:9px;overflow:hidden;position:relative;background:var(--ecc-c1)}
.ecc-thumb svg{position:absolute;inset:0;width:100%;height:100%;transition:transform .5s var(--ecc-ease)}
.ecc-row-title{font-weight:600;color:var(--ecc-ink);font-size:14px;line-height:1.35}
.ecc-row-cat{font-size:12px;color:var(--ecc-muted)}
.ecc-row-date{font-size:12.5px;color:var(--ecc-muted);text-align:right}
.ecc-dots{width:34px;height:34px;border:0;border-radius:9px;background:none;display:grid;place-items:center;color:var(--ecc-muted);transition:.2s}
.ecc-dots:hover,.ecc-dots[aria-expanded=true]{background:var(--ecc-ivory2);color:var(--ecc-navy)}
.ecc-menu{position:absolute;right:14px;top:50px;z-index:5;min-width:170px;padding:6px;background:#fff;border:1px solid var(--ecc-line);border-radius:12px;box-shadow:0 16px 40px rgba(10,37,64,.18);opacity:0;transform:translateY(-6px) scale(.98);visibility:hidden;transform-origin:top right;transition:opacity .2s var(--ecc-ease),transform .2s var(--ecc-ease),visibility 0s .2s}
.ecc-menu.is-open{opacity:1;transform:none;visibility:visible;transition-delay:0s}
.ecc-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border:0;border-radius:8px;background:none;text-align:left;font-size:13px}
.ecc-menu button:hover{background:var(--ecc-ivory2)}
.ecc-menu .ecc-danger{color:var(--ecc-red)}
.ecc-org{padding:22px;position:sticky;top:20px}
.ecc-paper{margin:4px 0 18px;padding:26px 20px 22px;border-radius:14px;background:var(--ecc-ivory2);display:grid;place-items:center;position:relative;overflow:hidden}
.ecc-doc-page{width:76%;aspect-ratio:.77;background:#fff;border:1px solid var(--ecc-line);border-radius:6px;box-shadow:0 14px 30px rgba(10,37,64,.16);padding:12px;transform:rotate(-2deg);transition:transform .5s var(--ecc-ease)}
.ecc-org:hover .ecc-doc-page{transform:rotate(0) translateY(-4px)}
.ecc-doc-page svg{width:100%;height:100%}
.ecc-pdf{position:absolute;right:14px;top:14px;padding:3px 8px;border-radius:6px;background:var(--ecc-red);color:#fff;font-size:10px;font-weight:700;letter-spacing:.08em}
.ecc-org h3{font:500 20px/1.25 var(--ecc-serif);margin:10px 0 4px;color:var(--ecc-navy)}
.ecc-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:16px 0 18px;font-size:12.5px}
.ecc-kv dt{color:var(--ecc-muted)}
.ecc-kv dd{margin:0;text-align:right;color:var(--ecc-ink);font-weight:500}
.ecc-history{margin-top:18px;padding-top:14px;border-top:1px solid var(--ecc-line);font-size:12.5px}
.ecc-history div{display:flex;justify-content:space-between;padding:5px 0;color:var(--ecc-muted)}
.ecc-history b{color:var(--ecc-ink);font-weight:500}
@keyframes eccRise {
  from{opacity:0;transform:translateY(16px)}
}

/* Whole-row and whole-card click targets without nesting interactive elements */
.ecc-row-main { display: block; min-width: 0; padding: 0; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.ecc-row-main > span { display: block; }
.ecc-row-main::after { content: ""; position: absolute; inset: 0; border-radius: 12px; }
.ecc-row-main:focus-visible { outline: 0; }
.ecc-row-main:focus-visible::after { outline: 2px solid var(--ecc-navy2); outline-offset: -2px; }
.ecc-dots { position: relative; z-index: 1; }
.ecc-feature { position: relative; }
.ecc-feature-link { padding: 0; border: 0; background: none; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.ecc-feature-link::after { content: ""; position: absolute; inset: 0; }
.ecc-feature-link:focus-visible { outline: 0; }
.ecc-feature-link:focus-visible::after { outline: 2px solid var(--ecc-navy2); outline-offset: -3px; border-radius: 18px; }
.ecc-empty { display: grid; justify-items: center; gap: 6px; padding: 44px 20px; text-align: center; }
.ecc-empty strong { font: 500 18px var(--ecc-serif); color: var(--ecc-navy); }
.ecc-empty p { margin: 0; max-width: 38ch; color: var(--ecc-muted); }
.ecc-fallback { max-width: 560px; margin: 48px auto; padding: 28px; border-left: 3px solid var(--ecc-red); }
.ecc-fallback h2 { margin: 0 0 8px; font: 500 22px var(--ecc-serif); color: var(--ecc-navy); }
.ecc-fallback p { margin: 0 0 16px; color: var(--ecc-body); }

.ecc-preview-chip { margin-left: 8px; white-space: nowrap; padding: 3px 10px; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; background: rgba(255,255,255,.08); font-size: 10.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #C9D6E6; }
.ecc-metric-num--status { padding-top: 8px; font-size: 26px; }
.ecc-metric-num--status .ecc-badge { font-size: 13px; }
`