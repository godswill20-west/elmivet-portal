import {Button} from '../components/Button'
import {OrgChartPreview} from '../components/OrgChartPreview'
import {StatusBadge} from '../components/StatusBadge'
import {formatDate} from '../lib/format'
import {formatFileSize} from '../lib/organogramUpload'
import {downloadUrl} from '../lib/organogramVersions'
import type {OrganogramVersion, VersionsView} from '../lib/organogramVersions'
import {stagger} from '../lib/style'

interface OrganogramPanelProps {
  view: VersionsView
  status: 'loading' | 'ready' | 'error'
  error: string | null
  /** Administrators only: others can look but not change. */
  canManage: boolean
  /** True while a version change is running: every change button waits. */
  busy: boolean
  onUpload: () => void
  onMakeCurrent: (version: OrganogramVersion) => void
  onUnpublish: (version: OrganogramVersion) => void
  onRetry: () => void
}

const versionName = (v: OrganogramVersion) => (v.versionNumber ? `Version ${v.versionNumber}` : v.title)

const uploadedLabel = (v: OrganogramVersion) => formatDate(v.publishedAt ?? v.createdAt) ?? 'Unknown'

function PdfLinks({version}: {version: OrganogramVersion}) {
  const download = downloadUrl(version)
  if (!version.url || !download) return null
  return (
    <>
      <a className="ecc-btn ecc-btn--quiet" href={version.url} target="_blank" rel="noopener noreferrer">
        View PDF
      </a>
      <a className="ecc-btn ecc-btn--quiet" href={download} rel="noopener noreferrer">
        Download
      </a>
    </>
  )
}

export function OrganogramPanel({
  view,
  status,
  error,
  canManage,
  busy,
  onUpload,
  onMakeCurrent,
  onUnpublish,
  onRetry,
}: OrganogramPanelProps) {
  const {current, latest} = view
  const latestIsNotCurrent = Boolean(latest && latest.id !== current?.id)

  return (
    <aside className="ecc-card ecc-org ecc-rise" style={stagger(7)} aria-label="Organogram">
      <div className="ecc-sec-head">
        <h2 className="ecc-serif" style={{fontSize: 22}}>
          Organogram
        </h2>
        {status === 'ready' ? (
          current ? (
            <StatusBadge tone="live">Current</StatusBadge>
          ) : (
            <StatusBadge tone="draft">None current</StatusBadge>
          )
        ) : null}
      </div>

      <div className="ecc-paper">
        <span className="ecc-pdf">PDF</span>
        <div className="ecc-doc-page">
          <OrgChartPreview />
        </div>
      </div>

      {status === 'loading' ? <p className="ecc-note">Loading organogram versions…</p> : null}

      {status === 'error' ? (
        <div className="ecc-ver-state" role="alert">
          <p className="ecc-cover-error" style={{margin: 0}}>
            {error ?? 'Could not load the organogram versions.'}
          </p>
          <Button variant="quiet" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <>
          {current ? (
            <>
              <h3>{current.title}</h3>
              <p className="ecc-row-cat" style={{margin: 0}}>
                Current organogram
              </p>
              <dl className="ecc-kv">
                <dt>Version</dt>
                <dd>{versionName(current)} (current)</dd>
                <dt>Effective</dt>
                <dd>{formatDate(current.effectiveDate) ?? 'Not set'}</dd>
                <dt>Uploaded</dt>
                <dd>{uploadedLabel(current)}</dd>
                <dt>File size</dt>
                <dd>{current.size ? formatFileSize(current.size) : 'Unknown'}</dd>
              </dl>
              <div className="ecc-ver-actions">
                <PdfLinks version={current} />
              </div>
            </>
          ) : (
            <>
              <h3>No current organogram</h3>
              <p className="ecc-note" style={{margin: '0 0 12px'}}>
                {view.versions.length
                  ? 'No version is marked current. Make an uploaded version current below.'
                  : 'Nothing has been uploaded yet.'}
              </p>
            </>
          )}

          {view.currentCount > 1 ? (
            <p className="ecc-cover-error" role="alert">
              {view.currentCount} versions are marked current. Making any version current again
              repairs this.
            </p>
          ) : null}
          {view.legacyCount > 0 ? (
            <p className="ecc-note">
              {view.legacyCount} older record{view.legacyCount === 1 ? ' has' : 's have'} no status
              yet. Run the organogram migration to give them version numbers.
            </p>
          ) : null}
          {latestIsNotCurrent && latest ? (
            <p className="ecc-note">
              The latest upload ({versionName(latest)}) is {latest.status === 'archived' ? 'archived' : 'not current'}.
              {current ? ` ${versionName(current)} is still the current organogram.` : ''}
            </p>
          ) : null}

          <div className="ecc-ver-actions" style={{marginTop: 12}}>
            <Button variant="navy" icon="upload" onClick={onUpload} disabled={busy}>
              Upload new version
            </Button>
            {current && canManage ? (
              <Button variant="quiet" onClick={() => onUnpublish(current)} disabled={busy}>
                Unpublish current
              </Button>
            ) : null}
          </div>
          {!canManage ? (
            <p className="ecc-note" style={{marginTop: 8}}>
              Only administrators can change the current organogram.
            </p>
          ) : null}

          <div className="ecc-versions">
            <p className="ecc-kicker" style={{marginBottom: 4}}>
              Version history · {view.versions.length}
            </p>
            {view.versions.length === 0 ? <p className="ecc-note">No versions yet.</p> : null}
            <ul>
              {view.versions.map((version) => (
                <li key={version.id}>
                  <div className="ecc-ver-top">
                    <b>{versionName(version)}</b>
                    {version.status === 'current' ? (
                      <span className="ecc-ver-tag ecc-ver-tag--current">Current</span>
                    ) : version.status === 'archived' ? (
                      <span className="ecc-ver-tag">Archived</span>
                    ) : (
                      <span className="ecc-ver-tag ecc-ver-tag--warn">No status</span>
                    )}
                    {latest?.id === version.id ? (
                      <span className="ecc-ver-tag ecc-ver-tag--latest">Latest upload</span>
                    ) : null}
                  </div>
                  <p className="ecc-ver-meta">
                    Uploaded {uploadedLabel(version)} · Effective {formatDate(version.effectiveDate) ?? 'not set'}
                    {version.size ? ` · ${formatFileSize(version.size)}` : ''}
                  </p>
                  {version.problem && version.status !== 'current' ? (
                    <p className="ecc-ver-meta ecc-ver-meta--warn">Cannot be made current: {version.problem}</p>
                  ) : null}
                  <div className="ecc-ver-actions">
                    <PdfLinks version={version} />
                    {canManage && version.status !== 'current' && !version.problem ? (
                      <Button variant="quiet" onClick={() => onMakeCurrent(version)} disabled={busy}>
                        Make current
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </aside>
  )
}
