import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './styles.css'
import '@xterm/xterm/css/xterm.css'

// Screenshot automation: only when launched with `--shot` (forwarded by the
// main process). Attaches the store bridge used by the capture harness.
if (window.api?.shotMode) {
  void import('./lib/shotBridge').then((m) => m.installShotBridge())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
