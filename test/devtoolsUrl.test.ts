import { describe, it, expect } from 'vitest'
import { extractDevToolsUrl } from '../src/main/launch'

// A dev tool earns a place in the table by serving a web UI on loopback and
// printing its address. The lines it prints are the whole integration, so they
// are pinned here.

describe('dev tools announced on a session\'s output', () => {
  it('reads the Flutter DevTools line', () => {
    const line =
      'The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at: ' +
      'http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/'
    expect(extractDevToolsUrl(line)).toEqual({
      url: 'http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/',
      name: 'Flutter DevTools'
    })
  })

  it('reads the other tools, naming each one', () => {
    expect(extractDevToolsUrl('Serving DevTools at http://127.0.0.1:9101/')).toMatchObject({
      name: 'Dart DevTools'
    })
    expect(extractDevToolsUrl('Vue Devtools listening on http://localhost:8098')).toMatchObject({
      name: 'Vue DevTools'
    })
    expect(extractDevToolsUrl('Prisma Studio is up on http://localhost:5555')).toMatchObject({
      name: 'Prisma Studio'
    })
    expect(
      extractDevToolsUrl('Webpack Bundle Analyzer is started at http://127.0.0.1:8888')
    ).toMatchObject({ name: 'Bundle Analyzer' })
  })

  it('does not swallow the punctuation of a sentence-shaped log line', () => {
    expect(extractDevToolsUrl('DevTools is available at: http://127.0.0.1:9100/.')?.url).toBe(
      'http://127.0.0.1:9100/'
    )
  })

  it('only ever offers an address served by this machine', () => {
    // The panel that loads it refuses anything else anyway; not offering it in
    // the first place is where that decision belongs.
    expect(extractDevToolsUrl('DevTools is available at: https://devtools.example.com/')).toBeNull()
  })

  it('says nothing when the line is about something else', () => {
    // A VM service endpoint is for a debugger to attach to, not a page to open.
    expect(extractDevToolsUrl('A Dart VM Service is available at: http://127.0.0.1:53412/')).toBeNull()
    expect(extractDevToolsUrl('Debugger listening on ws://127.0.0.1:9229/2f1e')).toBeNull()
    expect(extractDevToolsUrl('Syncing files to device…')).toBeNull()
  })
})
