import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
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
})
