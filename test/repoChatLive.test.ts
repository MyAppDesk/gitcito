import { afterAll, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { answerRepoChat } from '../src/main/repoChat'
import { defaultProfile } from '../src/shared/types'

const live = process.env.GITCITO_LIVE_AI === '1' ? it : it.skip
const roots: string[] = []

afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })))

live('prepares a license file action through an OpenAI-compatible provider', async () => {
  const endpoint = process.env.GITCITO_LIVE_ENDPOINT
  const apiKey = process.env.GITCITO_LIVE_API_KEY
  const model = process.env.GITCITO_LIVE_MODEL
  expect(endpoint && apiKey && model).toBeTruthy()

  const repo = mkdtempSync(join(tmpdir(), 'gitcito-live-chat-'))
  roots.push(repo)
  execFileSync('git', ['-C', repo, 'init'])
  execFileSync('git', ['-C', repo, 'config', 'user.name', 'Gitcito Test'])
  execFileSync('git', ['-C', repo, 'config', 'user.email', 'gitcito@example.invalid'])
  writeFileSync(join(repo, 'LICENSE'), 'MIT License\n\nCopyright MyAppDesk\n')
  execFileSync('git', ['-C', repo, 'add', 'LICENSE'])
  execFileSync('git', ['-C', repo, 'commit', '-m', 'test: seed license'])

  const reply = await answerRepoChat(
    repo,
    [
      {
        role: 'user',
        content: 'Change LICENSE to Apache 2.0. Propose the file change without committing.'
      }
    ],
    {
      ...defaultProfile().ai,
      enabled: true,
      provider: 'openai',
      endpoint: endpoint!,
      apiKey: apiKey!,
      model: model!,
      repoChatActions: true
    }
  ).catch(() => {
    throw new Error('Live provider probe failed without exposing its configuration.')
  })
  expect(
    reply.actions?.some((action) => action.type === 'edit_file' || action.type === 'write_file')
  ).toBe(true)
}, 60_000)
