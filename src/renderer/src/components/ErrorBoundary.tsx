import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Shown above the error message. */
  label?: string
  /** Called when the user dismisses (e.g. close the modal). */
  onReset?: () => void
}

interface State {
  error: Error | null
}

/** Catches render/runtime errors in its subtree so one broken view never blanks
 *  the whole app. Shows the error and a dismiss button. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console for diagnosis.
    console.error('[gitcito] UI error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h3>{this.props.label ?? 'Something went wrong'}</h3>
          <pre className="error-boundary-msg">{this.state.error.message}</pre>
          <div className="modal-actions">
            <button
              className="btn primary"
              onClick={() => {
                this.setState({ error: null })
                this.props.onReset?.()
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
