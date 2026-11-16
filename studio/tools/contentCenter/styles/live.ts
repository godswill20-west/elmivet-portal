/**
 * Styles for live article data: cover photographs, loading skeletons, search and filter toolbar,
 * error and confirmation states. Everything is scoped with the ecc- prefix.
 */
export const live = `
/* Cover photographs fill the same wrappers the generated illustrations use. */
.ecc-art img,.ecc-thumb img,.ecc-drawer-art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s var(--ecc-ease)}
.ecc-feature:hover .ecc-art img,.ecc-row:hover .ecc-thumb img{transform:scale(1.06)}

/* Disabled controls (no permission, or an operation is running). */
.ecc-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.ecc-menu button:disabled{opacity:.45;cursor:not-allowed}
.ecc-menu button:disabled:hover{background:none}
.ecc-drawer-status{display:inline-flex;align-items:center;flex-wrap:wrap;gap:8px}

/* List header, search and filters. */
.ecc-list-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ecc-refreshing{font-size:12px;color:var(--ecc-muted);margin-left:4px}
.ecc-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 14px 10px}
.ecc-search{flex:1 1 220px;min-width:0;padding:9px 13px}
.ecc-select{flex:0 1 200px;min-width:0;padding:9px 13px}
.ecc-input:disabled{opacity:.6;cursor:not-allowed}
.ecc-more{display:flex;justify-content:center;padding:8px 0 4px}
.ecc-empty--error strong{color:var(--ecc-red)}

/* Loading skeletons. */
.ecc-skel{display:block;background:linear-gradient(90deg,var(--ecc-ivory2) 25%,#F8F4EA 50%,var(--ecc-ivory2) 75%);background-size:200% 100%;animation:ecc-shimmer 1.4s ease-in-out infinite}
.ecc-skel-line{height:12px;border-radius:6px;margin:6px 0;width:100%}
.ecc-skel-line--title{height:16px;width:78%}
.ecc-skel-line--short{width:36%}
.ecc-skel-line--date{width:70px;margin-left:auto}
.ecc-skel-pill{width:84px;height:22px;border-radius:999px}
.ecc-row--skeleton{cursor:default}
.ecc-row--skeleton:hover{background:none}
.ecc-feature--skeleton{cursor:default}
.ecc-feature--skeleton:hover{transform:none;box-shadow:var(--ecc-sh)}
@keyframes ecc-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.ecc-skel{animation:none}}

/* Delete / unpublish confirmation. */
.ecc-confirm{padding:24px 30px 8px}
.ecc-confirm p{margin:14px 0 0;color:var(--ecc-body)}
.ecc-confirm-article{display:grid;gap:2px;padding:14px 16px;border:1px solid var(--ecc-line);border-radius:12px;background:var(--ecc-ivory)}
.ecc-confirm-article b{font:500 18px/1.3 var(--ecc-serif);color:var(--ecc-navy)}
.ecc-confirm-article span{font-size:12.5px;color:var(--ecc-muted)}
.ecc-confirm-warn{color:var(--ecc-red)}

@container (max-width:640px){
  .ecc-toolbar{padding-inline:6px}
  .ecc-select{flex-basis:100%}
  .ecc-confirm{padding-inline:18px}
  /* The skeleton row mirrors the real row, which drops the badge and date on small screens. */
  .ecc-row--skeleton>.ecc-skel-pill,.ecc-row--skeleton>.ecc-skel-line--date{display:none}
}
`
