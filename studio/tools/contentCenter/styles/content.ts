/**
 * Content styles shared by the drawer and modal forms: headers, facts, fields, choices, drop zones, writing surface.
 */
export const content = `
.ecc-drawer-top{display:flex;justify-content:space-between;align-items:center;padding:16px 24px}
.ecc-close{width:36px;height:36px;border:1px solid var(--ecc-line);border-radius:50%;background:#fff;font-size:18px;line-height:1;transition:.3s var(--ecc-ease)}
.ecc-close:hover{background:var(--ecc-navy);color:#fff;transform:rotate(90deg)}
.ecc-drawer-body{overflow-y:auto;padding:0 24px 24px}
.ecc-drawer-art{height:210px;border-radius:16px;overflow:hidden;position:relative;background:var(--ecc-c1)}
.ecc-drawer-art svg{position:absolute;inset:0;width:100%;height:100%}
.ecc-drawer-body h2{font:500 28px/1.2 var(--ecc-serif);margin:20px 0 10px;color:var(--ecc-navy)}
.ecc-facts{margin:20px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ecc-fact{padding:14px;border:1px solid var(--ecc-line);border-radius:12px;background:#fff}
.ecc-fact span{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ecc-muted);margin-bottom:3px}
.ecc-fact b{font-weight:600;color:var(--ecc-ink);font-size:13.5px}
.ecc-drawer-foot{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:16px 24px;border-top:1px solid var(--ecc-line);background:#fff}
.ecc-modal-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 30px;background:var(--ecc-navy);color:#fff}
.ecc-modal-head .ecc-serif{color:#fff;font-size:24px}
.ecc-modal-head .ecc-kicker{color:#9FB4CE;margin-bottom:4px}
.ecc-modal-head .ecc-close{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff}
.ecc-modal-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);overflow-y:auto}
.ecc-modal-col{padding:26px 30px}
.ecc-modal-col+.ecc-modal-col{background:#fff;border-left:1px solid var(--ecc-line)}
.ecc-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 30px;background:#fff;border-top:1px solid var(--ecc-line)}
.ecc-field{margin-bottom:18px}
.ecc-label{display:flex;justify-content:space-between;margin-bottom:6px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ecc-muted)}
.ecc-input,.ecc-area{width:100%;padding:11px 13px;border:1px solid var(--ecc-line);border-radius:10px;background:#fff;font:inherit;color:var(--ecc-ink);transition:border-color .2s,box-shadow .2s}
.ecc-input:focus,.ecc-area:focus{outline:0;border-color:var(--ecc-navy2);box-shadow:0 0 0 3px rgba(20,58,99,.12)}
.ecc-input--title{font:500 20px var(--ecc-serif);color:var(--ecc-navy)}
.ecc-area{resize:vertical;line-height:1.55}
.ecc-chips{display:flex;flex-wrap:wrap;gap:7px}
.ecc-choice{padding:7px 13px;border:1px solid var(--ecc-line);border-radius:999px;background:#fff;font-size:12.5px;transition:.2s}
.ecc-choice:hover{border-color:var(--ecc-navy)}
.ecc-choice[aria-pressed=true]{background:var(--ecc-navy);border-color:var(--ecc-navy);color:#fff}
.ecc-drop{display:grid;place-items:center;gap:6px;padding:24px;border:1.5px dashed #C9BFA8;border-radius:14px;background:var(--ecc-ivory);text-align:center;font-size:12.5px;color:var(--ecc-muted);transition:.25s}
.ecc-drop:hover{border-color:var(--ecc-navy);background:var(--ecc-ivory2)}
.ecc-drop .ecc-chip{background:#fff}
.ecc-drop b{color:var(--ecc-navy);font-size:14px}
.ecc-toolbar{display:flex;gap:3px;flex-wrap:wrap;padding:5px;background:var(--ecc-ivory2);border-radius:10px;margin-bottom:8px}
.ecc-tool{min-width:34px;height:32px;padding:0 9px;border:0;border-radius:7px;background:none;font-size:13px;font-weight:600;transition:.15s}
.ecc-tool:hover{background:#fff;color:var(--ecc-navy)}
.ecc-write{min-height:170px;font:13px/1.7 ui-monospace,Menlo,monospace}
.ecc-preview{margin-top:16px;padding:18px;border:1px solid var(--ecc-line);border-radius:12px;background:var(--ecc-ivory)}
.ecc-preview h3{font:500 20px var(--ecc-serif);margin:0 0 8px;color:var(--ecc-navy)}
.ecc-preview p,.ecc-preview li{font-size:14px;margin:0 0 8px}
.ecc-preview blockquote{margin:10px 0;padding-left:14px;border-left:3px solid var(--ecc-navy);font:italic 500 16px var(--ecc-serif);color:var(--ecc-navy)}
.ecc-preview figure{margin:10px 0}
.ecc-preview figure div{height:70px;border-radius:8px;background:var(--ecc-navy2)}
.ecc-preview figcaption{font-size:12px;color:var(--ecc-muted);margin-top:4px}
.ecc-preview a{color:var(--ecc-navy)}
.ecc-note{font-size:12px;color:var(--ecc-muted)}

.ecc-tool[disabled] { opacity: .45; cursor: not-allowed; }
.ecc-tool[disabled]:hover { background: none; color: inherit; }
.ecc-input[readonly] { background: var(--ecc-ivory); }
button.ecc-drop { width: 100%; font: inherit; }
.ecc-close { display: grid; place-items: center; padding: 0; }

/* Cover photograph field (Create / Edit Article). */
.ecc-cover-file { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; pointer-events: none; }
.ecc-drop:disabled { opacity: .6; cursor: not-allowed; }
.ecc-drop--active { border-color: var(--ecc-navy); background: var(--ecc-ivory2); }
.ecc-cover-card { border: 1px solid var(--ecc-line); border-radius: 14px; background: #fff; overflow: hidden; }
.ecc-cover-frame { position: relative; aspect-ratio: 16 / 9; background: var(--ecc-ivory2); display: grid; place-items: center; }
.ecc-cover-frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ecc-cover-wait { font-size: 12.5px; color: var(--ecc-muted); }
.ecc-cover-meta { display: grid; gap: 10px; padding: 12px 14px; }
.ecc-cover-file-info { margin: 0; font-size: 12.5px; color: var(--ecc-muted); overflow-wrap: anywhere; }
.ecc-cover-file-info b { color: var(--ecc-navy); font-weight: 600; }
.ecc-cover-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.ecc-cover-removed { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--ecc-amberbg); color: var(--ecc-amber); font-size: 12.5px; }
.ecc-cover-alt { margin-top: 14px; }
.ecc-cover-alt .ecc-note, .ecc-cover-error { margin: 6px 0 0; }
.ecc-cover-error { font-size: 12.5px; color: var(--ecc-red); }
.ecc-cover-alt .ecc-input[aria-invalid=true] { border-color: var(--ecc-red); }
.ecc-cover-alt .ecc-input[aria-invalid=true]:focus { box-shadow: 0 0 0 3px rgba(200,30,40,.14); }
.ecc-cover-empty-note { margin: 8px 0 0; }

.ecc-pdf-frame { position: relative; height: 320px; background: var(--ecc-ivory2); display: grid; place-items: center; }
.ecc-pdf-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #fff; }
.ecc-progress { height: 6px; border-radius: 999px; background: var(--ecc-ivory2); overflow: hidden; }
.ecc-progress span { display: block; height: 100%; background: var(--ecc-navy); transition: width .2s ease; }

`