import {ErrorBoundary} from './components/ErrorBoundary'
import {OverlayProvider} from './overlay/OverlayProvider'
import {Dashboard} from './sections/Dashboard'
import {css} from './styles'

/**
 * The Content Center: one single-page dashboard. Articles and the organogram open in drawers and
 * modals on top of it; there are no separate pages.
 */
export function ContentCenterTool() {
  return (
    <>
      <style>{css}</style>
      <OverlayProvider>
        <ErrorBoundary resetKey="content-center">
          <Dashboard />
        </ErrorBoundary>
      </OverlayProvider>
    </>
  )
}