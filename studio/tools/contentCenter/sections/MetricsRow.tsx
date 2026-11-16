import type {ReactNode} from 'react'

import {Icon} from '../components/Icon'
import type {IconName} from '../components/Icon'
import {StatusBadge} from '../components/StatusBadge'
import {useCountUp} from '../hooks/useCountUp'
import {sparklinePath} from '../lib/articles'
import {stagger} from '../lib/style'
import type {DashboardStats, OrganogramSummary} from '../lib/types'

interface MetricCardProps {
  label: string
  icon: IconName
  index: number
  children: ReactNode
}

function MetricCard({label, icon, index, children}: MetricCardProps) {
  return (
    <div className="ecc-card ecc-metric ecc-rise" style={stagger(index)}>
      <div className="ecc-metric-top">
        {label}
        <span className="ecc-chip">
          <Icon name={icon} />
        </span>
      </div>
      {children}
    </div>
  )
}

/** Large animated figure. The animation is hidden from assistive technology, which reads the final value. */
function MetricNumber({value, loading}: {value: number; loading: boolean}) {
  const shown = useCountUp(loading ? 0 : value)
  return (
    <div className="ecc-metric-num">
      <span aria-hidden="true">{loading ? '–' : shown}</span>
      <span className="ecc-sr">{loading ? 'Loading' : value}</span>
    </div>
  )
}

function Sparkline({points}: {points: string}) {
  return (
    <svg className="ecc-spark" viewBox="0 0 70 26" aria-hidden="true" focusable="false">
      <path d={points} />
    </svg>
  )
}

interface MetricsRowProps {
  /** Null while the articles are loading or could not be loaded. */
  stats: DashboardStats | null
  organogram: OrganogramSummary
}

export function MetricsRow({stats, organogram}: MetricsRowProps) {
  const loading = stats === null
  const empty = {total: 0, published: 0, drafts: 0, createdThisMonth: 0}
  const counts = stats ?? empty
  const flat = [0, 0]

  return (
    <section className="ecc-metrics" aria-label="Overview">
      <MetricCard label="Total Articles" icon="doc" index={2}>
        <MetricNumber value={counts.total} loading={loading} />
        <div className="ecc-metric-foot">
          <span>
            {loading ? (
              'Loading…'
            ) : counts.createdThisMonth > 0 ? (
              <>
                <span className="ecc-up">+{counts.createdThisMonth}</span> this month
              </>
            ) : (
              'None new this month'
            )}
          </span>
          <Sparkline points={sparklinePath(stats?.trend.total ?? flat)} />
        </div>
      </MetricCard>
      <MetricCard label="Published" icon="check" index={3}>
        <MetricNumber value={counts.published} loading={loading} />
        <div className="ecc-metric-foot">
          <span>Live on GlobalInsight</span>
          <Sparkline points={sparklinePath(stats?.trend.published ?? flat)} />
        </div>
      </MetricCard>
      <MetricCard label="Drafts" icon="pen" index={4}>
        <MetricNumber value={counts.drafts} loading={loading} />
        <div className="ecc-metric-foot">
          <span>Not published yet</span>
          <Sparkline points={sparklinePath(stats?.trend.drafts ?? flat)} />
        </div>
      </MetricCard>
      <MetricCard label="Organogram" icon="org" index={5}>
        <div className="ecc-metric-num ecc-metric-num--status">
          <StatusBadge tone="live">Live</StatusBadge>
        </div>
        <div className="ecc-metric-foot">
          <span>
            Version {organogram.version} · {organogram.effectiveLabel}
          </span>
        </div>
      </MetricCard>
    </section>
  )
}
