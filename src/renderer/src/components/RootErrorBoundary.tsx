import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'
import { windowApi } from '../infrastructure/api'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Last line of defence for the whole UI. An error that escapes every inner
 *  boundary would otherwise unmount the app and leave a blank window, so this
 *  hands the error to the main process, which logs it and reloads the page. */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[gitcito] UI error, reloading:', error, info.componentStack)
    const where = info.componentStack?.split('\n').find((line) => line.trim()) ?? ''
    windowApi.reportUiCrash(`${error.message} ${where.trim()}`)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="root-error-reload" role="status" aria-live="polite">
        {t('app.reloadingAfterError')}
      </div>
    )
  }
}
