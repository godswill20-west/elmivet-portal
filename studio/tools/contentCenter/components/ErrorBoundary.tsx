import {Component} from 'react'
import type {ErrorInfo, ReactNode} from 'react'

import {Button} from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** When this value changes (e.g. the user navigates), a previous error is cleared. */
  resetKey: string
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Keeps a failure inside one view from taking down the whole tool. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {error: null}

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error}
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Content Center] A view failed to render.', error, info.componentStack)
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({error: null})
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="ecc-wrap">
        <div className="ecc-card ecc-fallback" role="alert">
          <h2>Something went wrong</h2>
          <p>
            This part of the Content Center could not be displayed. Your content is not affected.
          </p>
          <Button variant="navy" onClick={() => this.setState({error: null})}>
            Try again
          </Button>
        </div>
      </div>
    )
  }
}