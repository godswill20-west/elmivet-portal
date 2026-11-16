import {Button} from '../components/Button'
import {OrgChartPreview} from '../components/OrgChartPreview'
import {StatusBadge} from '../components/StatusBadge'
import {stagger} from '../lib/style'
import type {OrganogramSummary} from '../lib/types'

interface OrganogramPanelProps {
  organogram: OrganogramSummary
  onReplace: () => void
}

export function OrganogramPanel({organogram, onReplace}: OrganogramPanelProps) {
  return (
    <aside className="ecc-card ecc-org ecc-rise" style={stagger(7)} aria-label="Organogram">
      <div className="ecc-sec-head">
        <h2 className="ecc-serif" style={{fontSize: 22}}>
          Organogram
        </h2>
        <StatusBadge tone="live">Live on About</StatusBadge>
      </div>

      <div className="ecc-paper">
        <span className="ecc-pdf">PDF</span>
        <div className="ecc-doc-page">
          <OrgChartPreview />
        </div>
      </div>

      <h3>{organogram.title}</h3>
      <p className="ecc-row-cat" style={{margin: 0}}>
        Shown on the About page
      </p>

      <dl className="ecc-kv">
        <dt>Version</dt>
        <dd>{organogram.version} (current)</dd>
        <dt>Effective</dt>
        <dd>{organogram.effectiveLabel}</dd>
        <dt>File size</dt>
        <dd>{organogram.sizeLabel}</dd>
        <dt>Uploaded by</dt>
        <dd>{organogram.uploadedBy}</dd>
      </dl>

      <Button variant="navy" icon="upload" block onClick={onReplace}>
        Replace Organogram
      </Button>

      <div className="ecc-history">
        <p className="ecc-kicker" style={{marginBottom: 4}}>
          Previous versions
        </p>
        {organogram.previous.map((item) => (
          <div key={item.version}>
            <b>Version {item.version}</b>
            <span>{item.effectiveLabel}</span>
          </div>
        ))}
      </div>
    </aside>
  )
}