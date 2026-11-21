import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { forgejoJobLog, forgejoJobLogUrl, readTail } from '../src/main/forgejo'
import { logTail } from '../src/renderer/src/lib/ciLog'

const BASE = 'https://forge.example.org'

describe('forgejoJobLogUrl — where the token may go', () => {
  it('turns an Actions job link on this instance into its log route', () => {
    expect(forgejoJobLogUrl(BASE, `${BASE}/studio/catalog/actions/runs/12/jobs/0`)).toBe(
      `${BASE}/studio/catalog/actions/runs/12/jobs/0/logs`
    )
    expect(forgejoJobLogUrl(`${BASE}/`, `${BASE}/studio/catalog/actions/runs/12/jobs/3/`)).toBe(
      `${BASE}/studio/catalog/actions/runs/12/jobs/3/logs`
    )
  })

  it('refuses anything else, so the token never leaves for it', () => {
    const refused = [
      'https://ci.example.com/build/12', // an external CI's status
      'https://forge.example.org.evil.example/studio/catalog/actions/runs/1/jobs/0', // a look-alike host
      'http://forge.example.org/studio/catalog/actions/runs/1/jobs/0', // another scheme
      `${BASE}/studio/catalog/actions/runs/1`, // a run, not a job
      `${BASE}/studio/catalog/actions/runs/1/jobs/0/../../../../../admin`,
      `${BASE}/studio/catalog/actions/runs/x/jobs/0`,
      `${BASE}/a/b/c/actions/runs/1/jobs/0`,
      `${BASE}/studio/catalog/actions/runs/1/jobs/0?redirect=https://evil.example`,
      ''
    ]
    for (const target of refused) expect(forgejoJobLogUrl(BASE, target), target).toBeNull()
  })
})

describe('forgejoJobLog — against a real HTTP server', () => {
  let server: Server
  let base = ''
  const seenAuth: string[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      seenAuth.push(String(req.headers.authorization ?? ''))
      if (req.url === '/o/r/actions/runs/1/jobs/0/logs') {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('step one\n\u001b[31merror: boom\u001b[0m\n')
      } else if (req.url === '/o/r/actions/runs/1/jobs/1/logs') {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<html>sign in</html>')
      } else if (req.url === '/o/r/actions/runs/1/jobs/2/logs') {
        res.writeHead(303, { location: '/user/login' })
        res.end()
      } else {
        res.writeHead(404)
        res.end()
      }
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  it('reads the log with the token', async () => {
    expect(await forgejoJobLog(base, 'secret-token', `${base}/o/r/actions/runs/1/jobs/0`)).toContain('error: boom')
    expect(seenAuth.at(-1)).toBe('token secret-token')
  })

  it('answers null for a sign-in page, a redirect or a missing job', async () => {
    expect(await forgejoJobLog(base, 't', `${base}/o/r/actions/runs/1/jobs/1`)).toBeNull()
    expect(await forgejoJobLog(base, 't', `${base}/o/r/actions/runs/1/jobs/2`)).toBeNull()
    expect(await forgejoJobLog(base, 't', `${base}/o/r/actions/runs/1/jobs/9`)).toBeNull()
  })

  it('sends nothing for a link that is not a job here', async () => {
    const before = seenAuth.length
    expect(await forgejoJobLog(base, 't', 'https://ci.example.com/build/1')).toBeNull()
    expect(seenAuth.length).toBe(before)
  })
})

describe('logTail', () => {
  it('keeps the end of a long log and counts what it dropped', () => {
    const text = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\r\n') + '\n\n'
    expect(logTail(text, 3)).toEqual({ text: 'line 7\nline 8\nline 9', dropped: 7 })
    expect(logTail('a\nb', 5)).toEqual({ text: 'a\nb', dropped: 0 })
  })
})

describe('readTail — a long log, streamed', () => {
  let server: Server
  let base = ''
  beforeAll(async () => {
    server = createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      if (req.url === '/small') return void res.end('one\ntwo\n')
      // ~4 MB in many writes, so the body arrives in chunks.
      let i = 0
      const write = (): void => {
        while (i < 60000) {
          const ok = res.write(`line ${String(i++).padStart(6, '0')} ${'x'.repeat(60)}\n`)
          if (!ok) return void res.once('drain', write)
        }
        res.end('last line\n')
      }
      write()
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  it('keeps only the end, from a whole line', async () => {
    const tail = await readTail(await fetch(`${base}/big`), 2000)
    expect(Buffer.byteLength(tail)).toBeLessThanOrEqual(2000)
    expect(tail.startsWith('line ')).toBe(true)
    expect(tail.endsWith('last line\n')).toBe(true)
  })

  it('returns a short log whole', async () => {
    expect(await readTail(await fetch(`${base}/small`), 2000)).toBe('one\ntwo\n')
  })
})
