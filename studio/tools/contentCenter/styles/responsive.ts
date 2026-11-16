/**
 * Container-query layout for tablet and mobile, plus the reduced-motion override.
 */
export const responsive = `
@container (max-width:960px) {
  .ecc-grid{grid-template-columns:1fr}
  .ecc-org{position:static}
  .ecc-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ecc-modal-body{grid-template-columns:1fr}
  .ecc-modal-col+.ecc-modal-col{border-left:0;border-top:1px solid var(--ecc-line)}
}
@container (max-width:640px) {
  .ecc-wrap{padding:0 18px}
  .ecc-hero{padding:28px 0 96px}
  .ecc-hero h1{font-size:36px}
  .ecc-hero-row{margin-top:30px}
  .ecc-actions,.ecc-actions .ecc-btn{width:100%}
  .ecc-metrics{gap:12px;margin-top:-56px}
  .ecc-metric{padding:16px}
  .ecc-metric-num{font-size:32px}
  .ecc-spark{display:none}
  .ecc-feature{grid-template-columns:1fr}
  .ecc-art{min-height:190px}
  .ecc-row{grid-template-columns:56px minmax(0,1fr) 34px;gap:12px}
  .ecc-row>.ecc-badge,.ecc-row>.ecc-row-date{display:none}
  .ecc-thumb{width:56px;height:44px}
  .ecc-list-head{padding-inline:6px}
  .ecc-drawer{width:100%}
  .ecc-dialog--modal[open]{padding:0}
  .ecc-modal{height:100%;border-radius:0}
  .ecc-modal-head,.ecc-modal-col,.ecc-modal-foot{padding-inline:18px}
  .ecc-modal-foot .ecc-btn{flex:1}
  .ecc-facts{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce) {
  .ecc-frame *{animation:none!important;transition-duration:.01ms!important;transition-delay:0s!important}
}
@container (max-width: 640px) {
  .ecc-modal { border-radius: 0; }
  .ecc-modal--narrow { width: 100%; }
  .ecc-toasts { bottom: 18px; }
  .ecc-brand { flex-wrap: wrap; row-gap: 10px; }
  .ecc-preview-chip { margin-left: 0; }
}
`