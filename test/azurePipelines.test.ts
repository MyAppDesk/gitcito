import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  azureBuildLog,
  azureBuildRef,
  azureBuildUrl,
  azurePrChecks,
  azurePrDetail,
  mapAzureBuildPolicies,
  pickBuildLogs,
  type Ado,
  type AdoText
} from '../src/main/azurePr'
import { adoTail } from '../src/main/hosting'

const R = { org: 'example-org', project: 'My Project', repo: 'app' }
const BUILD_POLICY = '0609b952-1397-4640-95ec-e00a01b2c241'

describe('azureBuildRef — which links are this organization\'s builds', () => {
  it('accepts a build of this organization, in either host form', () => {
    expect(azureBuildRef('example-org', 'https://dev.azure.com/example-org/My%20Project/_build/results?buildId=42')).toEqual({
      project: 'My Project',
      buildId: 42
    })
    expect(azureBuildRef('example-org', 'https://dev.azure.com/EXAMPLE-ORG/p/_build/results?buildId=7&view=logs')).toEqual({
      project: 'p',
      buildId: 7
    })
    expect(azureBuildRef('example-org', 'https://example-org.visualstudio.com/p/_build/results?buildId=9')).toEqual({
      project: 'p',
      buildId: 9
    })
  })

  it('accepts the legacy collection segment', () => {
    expect(azureBuildRef('example-org',
      'https://example-org.visualstudio.com/DefaultCollection/My%20Project/_build/results?buildId=42'
    )).toEqual({ project: 'My Project', buildId: 42 })
  })

  it('refuses everything else, so the token is never sent there', () => {
    const refused = [
      'https://dev.azure.com/other-org/p/_build/results?buildId=42',
      'https://dev.azure.com.attacker.test/example-org/p/_build/results?buildId=42',
      'https://attacker.test/example-org/p/_build/results?buildId=42',
      'https://other-org.visualstudio.com/p/_build/results?buildId=42',
      'http://dev.azure.com/example-org/p/_build/results?buildId=42',
      'https://dev.azure.com/example-org/p/_build/results',
      'https://dev.azure.com/example-org/p/_build/results?buildId=-1',
      'https://dev.azure.com/example-org/p/_build/results?buildId=abc',
      'https://dev.azure.com/example-org/p/_release/results?buildId=42',
      'https://ci.example.com/job/42',
      'https://dev.azure.com/example-org/%E0%A4%A/_build/results?buildId=42',
      'not a url'
    ]
    for (const link of refused) expect(azureBuildRef('example-org', link), link).toBeNull()
  })
})

describe('build validation as checks', () => {
  const ev = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    status: 'approved',
    configuration: { type: { id: BUILD_POLICY }, settings: { displayName: 'PR build', buildDefinitionId: 3 } },
    context: { buildId: 42 },
    ...over
  })

  it('maps each build policy to a check that can show its log', () => {
    expect(mapAzureBuildPolicies(R, [ev()])).toEqual([
      { name: 'PR build', status: 'completed', conclusion: 'success', url: azureBuildUrl('example-org', 'My Project', 42), hasLog: true }
    ])
    expect(mapAzureBuildPolicies(R, [ev({ status: 'rejected' })])[0].conclusion).toBe('failure')
    expect(mapAzureBuildPolicies(R, [ev({ status: 'running' })])[0]).toMatchObject({ status: 'in_progress', conclusion: null })
    expect(mapAzureBuildPolicies(R, [ev({ status: 'queued', context: {} })])[0]).toMatchObject({
      status: 'queued',
      url: '',
      conclusion: null
    })
  })

  it('does not show an expired build as passing', () => {
    expect(mapAzureBuildPolicies(R, [ev({ context: { buildId: 42, isExpired: true } })])[0].conclusion).toBe('neutral')
  })

  it('leaves out other policies, and builds that do not apply to this PR', () => {
    const reviewers = { status: 'approved', configuration: { type: { id: 'fa4e907d-c16b-4a4c-9dfa-4906e5d171dd' } } }
    expect(mapAzureBuildPolicies(R, [reviewers, ev({ status: 'notApplicable' })])).toEqual([])
  })

  it('reads policies through the non-retrying caller, by the project id the PR carries, and shows a build once', async () => {
    const seen: { via: string; url: string }[] = []
    const answer = (url: string): unknown => {
      if (url.includes('/statuses?'))
        return {
          value: [
            { state: 'succeeded', context: { genre: 'ci', name: 'lint' }, targetUrl: 'https://ci.example.com/7' },
            // The same build the policy reports: listed once.
            { state: 'succeeded', context: { name: 'pipeline' }, targetUrl: 'https://example-org.visualstudio.com/My%20Project/_build/results?buildId=42&view=logs' }
          ]
        }
      if (url.includes('/pullrequests/5?')) return { pullRequestId: 5, title: 'x', status: 'active', repository: { project: { id: 'proj-guid' } } }
      if (url.includes('/policy/evaluations')) return { value: [ev()] }
      throw new Error(`unexpected ${url}`)
    }
    const ado: Ado = async <T,>(url: string) => (seen.push({ via: 'ado', url }), answer(url) as T)
    const optional: Ado = async <T,>(url: string) => (seen.push({ via: 'optional', url }), answer(url) as T)
    const checks = await azurePrChecks(ado, R, 5, optional)
    expect(checks.map((c) => c.name)).toEqual(['PR build', 'ci/lint'])
    const policy = seen.find((s) => s.url.includes('/policy/evaluations'))!
    expect(policy.via).toBe('optional')
    expect(decodeURIComponent(policy.url)).toContain('artifactId=vstfs:///CodeReview/CodeReviewId/proj-guid/5')
  })
})

describe('pickBuildLogs', () => {
  const rec = (type: string, name: string, order: number, result: string | null, log?: number): Record<string, unknown> => ({
    type,
    name,
    order,
    result,
    log: log === undefined ? null : { id: log }
  })

  it('shows the failed tasks, in order, where the reason is', () => {
    const records = [
      rec('Job', 'Build', 1, 'failed', 1),
      rec('Task', 'Test', 3, 'failed', 4),
      rec('Task', 'Install', 1, 'succeeded', 2),
      rec('Task', 'Lint', 2, 'failed', 3)
    ]
    expect(pickBuildLogs(records)).toEqual([
      { name: 'Lint', logId: 3 },
      { name: 'Test', logId: 4 }
    ])
  })

  it('falls back to each job\'s whole log when nothing failed, and caps the count', () => {
    const records = [rec('Job', 'A', 1, 'succeeded', 1), rec('Job', 'B', 2, null, 2), rec('Task', 'step', 1, 'succeeded', 3)]
    expect(pickBuildLogs(records)).toEqual([
      { name: 'A', logId: 1 },
      { name: 'B', logId: 2 }
    ])
    expect(pickBuildLogs(records, 1)).toHaveLength(1)
    expect(pickBuildLogs([rec('Task', 'no log yet', 1, 'failed')])).toEqual([])
  })
})

describe('azureBuildLog', () => {
  const link = azureBuildUrl('example-org', 'My Project', 42)

  it('reads the failed tasks\' logs, each under its name', async () => {
    const urls: string[] = []
    const ado: Ado = async <T,>(url: string) => {
      urls.push(url)
      return {
        records: [
          { type: 'Task', name: 'Lint', order: 1, result: 'failed', log: { id: 3 } },
          { type: 'Task', name: 'Test', order: 2, result: 'failed', log: { id: 4 } }
        ]
      } as T
    }
    const text: AdoText = async (url, max) => (urls.push(url), expect(max).toBeGreaterThan(0), `log ${url.match(/logs\/(\d+)/)![1]}`)
    const log = await azureBuildLog(ado, text, R, link)
    expect(log).toBe('── Lint ──\nlog 3\n── Test ──\nlog 4')
    expect(urls[0]).toBe('https://dev.azure.com/example-org/My%20Project/_apis/build/builds/42/timeline?api-version=7.1')
    expect(urls.slice(1)).toEqual([
      'https://dev.azure.com/example-org/My%20Project/_apis/build/builds/42/logs/3?api-version=7.1',
      'https://dev.azure.com/example-org/My%20Project/_apis/build/builds/42/logs/4?api-version=7.1'
    ])
  })

  it('asks nothing of anyone for a link that is not this organization\'s build', async () => {
    let calls = 0
    const ado: Ado = async <T,>() => (calls++, {} as T)
    const text: AdoText = async () => (calls++, 'x')
    expect(await azureBuildLog(ado, text, R, 'https://ci.example.com/job/42')).toBeNull()
    expect(await azureBuildLog(ado, text, R, 'https://dev.azure.com/other-org/p/_build/results?buildId=1')).toBeNull()
    expect(calls).toBe(0)
  })

  it('is null when the token may not read builds, so the page offers the browser', async () => {
    const ado: Ado = async () => {
      throw new Error('401')
    }
    expect(await azureBuildLog(ado, async () => 'x', R, link)).toBeNull()
    const okTimeline: Ado = async <T,>() => ({ records: [{ type: 'Job', name: 'A', log: { id: 1 } }] }) as T
    expect(await azureBuildLog(okTimeline, async () => null, R, link)).toBeNull()
  })
})

describe('adoTail — a log read over real HTTP', () => {
  let server: Server
  let base = ''
  const auth: string[] = []

  beforeAll(async () => {
    server = createServer((req, res) => {
      auth.push(req.headers.authorization ?? '')
      if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'text/plain' })
        // Two hundred thousand lines, written in pieces: only the end may stay.
        for (let i = 0; i < 200_000; i++) res.write(`line ${i}\n`)
        res.end()
      } else if (req.url === '/redirect') {
        res.writeHead(302, { location: '/signin' })
        res.end()
      } else if (req.url === '/signin') {
        res.writeHead(203, { 'content-type': 'text/html' })
        res.end('<html>sign in</html>')
      } else {
        res.writeHead(401)
        res.end()
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it('keeps only the tail, starting on a whole line', async () => {
    const log = await adoTail(`${base}/big`, 'pat', 1000)
    expect(log).not.toBeNull()
    expect(log!.length).toBeLessThanOrEqual(1000)
    expect(log!.startsWith('line ')).toBe(true)
    expect(log!.endsWith('line 199999\n')).toBe(true)
    expect(auth.at(-1)).toBe(`Basic ${Buffer.from(':pat').toString('base64')}`)
  })

  it('is null for a sign-in page or a refusal', async () => {
    expect(await adoTail(`${base}/signin`, 'pat', 1000)).toBeNull()
    expect(await adoTail(`${base}/denied`, 'pat', 1000)).toBeNull()
    expect(await adoTail(`${base}/redirect`, 'pat', 1000)).toBeNull()
  })
})

describe('scope-dependent reads never go through the credential retry', () => {
  // The retry drops a borrowed git credential on 401/403. A token without Work
  // Items or Build answers exactly that, so those reads must not trigger it.
  it('reads a PR\'s work items through the non-retrying caller', async () => {
    const via: Record<string, string> = {}
    const answer = (url: string): unknown =>
      url.includes('/threads?')
        ? { value: [] }
        : url.includes('/workitems?') || url.includes('/wit/')
          ? { value: [] }
          : { pullRequestId: 5, title: 'x', status: 'active' }
    const ado: Ado = async <T,>(url: string) => ((via[url] = 'ado'), answer(url) as T)
    const optional: Ado = async <T,>(url: string) => ((via[url] = 'optional'), answer(url) as T)
    await azurePrDetail(ado, R, 5, optional)
    const workItems = Object.entries(via).filter(([u]) => u.includes('/workitems'))
    expect(workItems.length).toBeGreaterThan(0)
    for (const [, v] of workItems) expect(v).toBe('optional')
  })
})
