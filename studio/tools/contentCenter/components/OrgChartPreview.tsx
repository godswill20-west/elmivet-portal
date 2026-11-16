/** Miniature organisation chart drawn on the document preview. Decorative. */
export function OrgChartPreview() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#0A2540" strokeWidth="1.2">
        <rect x="38" y="8" width="44" height="18" rx="3" fill="#0A2540" />
        <path d="M60 26v12M22 38h76M22 38v12M60 38v12M98 38v12" />
        <rect x="6" y="50" width="32" height="16" rx="3" />
        <rect x="44" y="50" width="32" height="16" rx="3" />
        <rect x="82" y="50" width="32" height="16" rx="3" />
        <path d="M22 66v12M60 66v12M98 66v12M10 78h24M48 78h24M86 78h24" />
        <rect x="2" y="90" width="26" height="13" rx="2" opacity=".6" />
        <rect x="32" y="90" width="26" height="13" rx="2" opacity=".6" />
        <rect x="62" y="90" width="26" height="13" rx="2" opacity=".6" />
        <rect x="92" y="90" width="26" height="13" rx="2" opacity=".6" />
      </g>
      <g fill="#CBD5E1">
        <rect x="8" y="118" width="104" height="3" />
        <rect x="8" y="126" width="80" height="3" />
        <rect x="8" y="134" width="94" height="3" />
      </g>
    </svg>
  )
}