import { fileURLToPath } from 'node:url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

const JSX_DEV_SHIM: Record<string, string> = {
  'react/jsx-dev-runtime': fileURLToPath(new URL('./src/renderer/src/lib/jsxDevShim.ts', import.meta.url))
}

export default defineConfig(({ command }) => ({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    resolve: {
      // blobatar 0.1.0 ships its React entry built against the *dev* JSX
      // runtime, whose `jsxDEV` is undefined in a production React — without
      // this the packaged renderer dies on first paint. Build only: our own
      // code should keep the real dev runtime while developing. See the shim.
      alias: command === 'build' ? JSX_DEV_SHIM : undefined
    },
    build: {
      rollupOptions: {
        output: {
          // The translated handbook is one lazy Markdown module per page. Left
          // alone that is 61 chunks per locale — roughly 900 files, each a few
          // kilobytes, for no gain: a reader who opens Help in Japanese wants
          // all of the Japanese pages. Group each locale into one chunk.
          manualChunks(id) {
            const help = /docs\/help\/([a-z]{2}(?:-[A-Za-z]{2,4})?)\//.exec(id)
            return help ? `help-${help[1]}` : undefined
          }
        }
      }
    }
  }
}))
