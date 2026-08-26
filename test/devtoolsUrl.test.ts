import { describe, it, expect } from 'vitest'
import { extractDevToolsUrl } from '../src/main/launch'

// `flutter run` announces DevTools on the same stream as everything else; the
// address is the whole integration, so the line it arrives on is pinned here.
describe('flutter DevTools address', () => {
  it('reads the address out of the line flutter prints', () => {
    const line =
      'The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at: ' +
      'http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/'
    expect(extractDevToolsUrl(line)).toBe('http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/')
  })

  it('does not swallow the punctuation of a sentence-shaped log line', () => {
    expect(extractDevToolsUrl('DevTools is available at: http://127.0.0.1:9100/.')).toBe('http://127.0.0.1:9100/')
  })

  it('says nothing when the line is about something else', () => {
    expect(extractDevToolsUrl('A Dart VM Service is available at: http://127.0.0.1:53412/')).toBeNull()
    expect(extractDevToolsUrl('Syncing files to device…')).toBeNull()
  })
})
