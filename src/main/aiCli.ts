import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AICliBinary, AIConfig, SubscriptionCli, SubscriptionTest } from '../shared/types'
import { shellPathReady } from './fix-path'
import type { TokenUsage } from './analytics'
import type { ChatMessage, ModelReply } from './aiTransport'

/**
 * Model calls served by an agent CLI the user already has installed and signed
 * in — `claude`, `gemini`, `codex`. It is the answer to "I pay for a
 * subscription, why do I also need an API key": the binary authenticates with
 * its own stored session and Gitcito never sees a credential.
 *
 * Three rules this module does not bend:
 *
 * - The binary is always launched with `execFile` and an argv array, never a
 *   shell. Prompts contain diffs, branch names and file contents — anything
 *   that reaches a shell reaches it as code.
 * - Only a binary the user explicitly configured as an account is ever run.
 *   Detection lists what is available; it never invokes anything.
 * - Nothing about this is more private than an API key. The prompt still leaves
 *   the machine to the same vendor, under the user's own account. The handbook
 *   says so plainly rather than letting "no API key" imply "no upload".
 */

/** How long a single CLI answer may take before it is killed. */
const CLI_TIMEOUT_MS = 180_000

/** Cap on captured stdout, so a runaway CLI cannot exhaust memory. */
const CLI_MAX_BUFFER = 8 * 1024 * 1024

interface CliSpec {
  /** Default executable name, looked up on PATH. */
  bin: string
  label: string
  /** Argv for one non-interactive prompt. */
  args: (model: string) => string[]
  /** Whether the prompt goes on stdin (true) or as the final argument. */
  stdin: boolean
  /**
   * When set, the prompt is written to a temporary file and this argv is
   * appended instead of using stdin — for CLIs with no stdin prompt mode
   * (`devin -p --prompt-file`), which also sidesteps the ~32k argv limit.
   */
  promptFile?: (path: string) => string[]
  /** Models worth offering before the user types their own. */
  models: string[]
}

const CLIS: Record<AICliBinary, CliSpec> = {
  claude: {
    bin: 'claude',
    label: 'Claude Code',
    // `--output-format json` gives a parseable envelope with token usage.
    args: (model) => ['-p', '--output-format', 'json', ...(model ? ['--model', model] : [])],
    stdin: true,
    models: ['haiku', 'sonnet', 'opus']
  },
  gemini: {
    bin: 'gemini',
    label: 'Gemini CLI',
    args: (model) => [...(model ? ['-m', model] : [])],
    stdin: true,
    models: ['gemini-2.5-flash', 'gemini-2.5-pro']
  },
  codex: {
    bin: 'codex',
    label: 'Codex CLI',
    args: (model) => ['exec', ...(model ? ['--model', model] : []), '-'],
    stdin: true,
    models: []
  },
  devin: {
    bin: 'devin',
    label: 'Devin CLI',
    args: (model) => [...(model ? ['--model', model] : [])],
    stdin: false,
    // `devin -p` cannot read a prompt from stdin; --prompt-file also avoids
    // the Windows argv length cap on large prompts.
    promptFile: (path) => ['-p', '--prompt-file', path],
    models: ['adaptive', 'swe-2-medium', 'swe-2-high', 'swe-2-max']
  }
}

export function cliSpec(binary: AICliBinary): CliSpec {
  return CLIS[binary] ?? CLIS.claude
}

export function cliModels(binary: AICliBinary): string[] {
  return cliSpec(binary).models
}

export const CLI_BINARIES = Object.keys(CLIS) as AICliBinary[]

/** Runs a command with an argv array — never a shell — and captures its output. */
function run(
  file: string,
  args: string[],
  input: string,
  timeout = CLI_TIMEOUT_MS,
  cwd?: string,
  env = process.env
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      { timeout, maxBuffer: CLI_MAX_BUFFER, windowsHide: true, cwd, env },
      (err, stdout, stderr) => {
        if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new Error(`\`${file}\` was not found. Install it, or set an explicit path on the account.`))
          return
        }
        if (err && (err as { killed?: boolean }).killed) {
          reject(new Error(`\`${file}\` did not answer within ${Math.round(timeout / 1000)}s.`))
          return
        }
        const code = (err as { code?: number } | null)?.code ?? 0
        resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr })
      }
    )
    // A CLI that exits without reading stdin (`which`, a missing binary, an
    // early auth failure) turns this write into EPIPE. Unhandled, that is an
    // uncaught exception in the main process; the exit code already reports it.
    child.stdin?.on('error', () => undefined)
    child.stdin?.end(input)
  })
}

/**
 * Flattens a chat into one prompt.
 *
 * These CLIs take a single string, so roles become labelled sections. System
 * text goes first and is marked as instructions, which is the closest thing to
 * a system prompt that survives the round trip.
 */
export function flattenMessages(messages: ChatMessage[]): string {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const turns = messages.filter((m) => m.role !== 'system')
  const parts: string[] = []
  if (system.length > 0) parts.push(`Instructions:\n${system.join('\n\n')}`)
  for (const turn of turns) {
    parts.push(turn.role === 'assistant' ? `Your previous reply:\n${turn.content}` : turn.content)
  }
  return parts.join('\n\n')
}

/** The `claude -p --output-format json` envelope, when the CLI produced one. */
interface ClaudeEnvelope {
  result?: string
  is_error?: boolean
  usage?: { input_tokens?: number; output_tokens?: number }
}

function parseClaudeReply(stdout: string): ModelReply | null {
  try {
    const json = JSON.parse(stdout) as ClaudeEnvelope
    if (json?.is_error) throw new Error(json.result || 'Claude Code request failed')
    if (typeof json?.result !== 'string') return null
    const usage: TokenUsage = {
      promptTokens: json.usage?.input_tokens ?? 0,
      completionTokens: json.usage?.output_tokens ?? 0,
      totalTokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
    }
    return { text: json.result, usage }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    // Older versions, or a CLI that ignored the flag, print plain text. Falling
    // back beats failing the whole feature over an output-format difference.
    return null
  }
}

const NO_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

/** One answer from a locally installed, already signed-in agent CLI. */
export async function runCliModel(cfg: AIConfig, messages: ChatMessage[]): Promise<ModelReply> {
  const stamped = (cfg.cliCwd ?? '').trim()
  const cwd = stamped && existsSync(stamped) ? stamped : undefined
  if (cfg.subscription && !cwd) {
    const directory = await mkdtemp(join(tmpdir(), 'gitcito-model-'))
    try {
      return await invokeCli(cfg, messages, directory, true)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  }
  return invokeCli(cfg, messages, cwd)
}

async function invokeCli(
  cfg: AIConfig, messages: ChatMessage[], cwd?: string, emptyDirectory = false
): Promise<ModelReply> {
  await shellPathReady()
  const binary = cfg.cli ?? 'claude'
  const spec = cliSpec(binary)
  const file = (cfg.cliPath ?? '').trim() || spec.bin
  const model = (cfg.model ?? '').trim()
  const prompt = flattenMessages(messages)
  const env = cfg.subscription ? subscriptionEnv() : process.env
  if (cfg.subscription) {
    if (binary !== 'codex' && binary !== 'claude') throw new Error('Unsupported subscription CLI')
    await requireSubscription(file, binary, env, cwd)
  }
  let code: number
  let stdout: string
  let stderr: string
  if (spec.promptFile) {
    const dir = await mkdtemp(join(tmpdir(), 'gitcito-prompt-'))
    try {
      const promptPath = join(dir, 'prompt.txt')
      await writeFile(promptPath, prompt, 'utf8')
      ;({ code, stdout, stderr } = await run(file, [...spec.args(model), ...spec.promptFile(promptPath)], '', undefined, cwd))
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {})
    }
  } else {
    const args = spec.args(model)
    if (cfg.subscription && binary === 'codex') {
      if (emptyDirectory) args.splice(1, 0, '--skip-git-repo-check')
      args.unshift(...CODEX_SUBSCRIPTION)
    }
    ;({ code, stdout, stderr } = await run(file, args, prompt, undefined, cwd, env))
  }
  if (code !== 0) {
    const detail = (stderr || stdout).trim().slice(0, 300)
    throw new Error(`\`${spec.bin}\` exited with code ${code}${detail ? `: ${detail}` : ''}`)
  }

  if (binary === 'claude') {
    const parsed = parseClaudeReply(stdout.trim())
    if (parsed) return parsed
  }
  return { text: stdout.trim(), usage: NO_USAGE }
}

// Provider CLIs also accept API credentials from the launching shell. A subscription
// account must use the CLI's own login even when Gitcito inherited those variables.
function subscriptionEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  for (const key of [
    'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN',
    'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX', 'CLAUDE_CODE_USE_FOUNDRY',
    'OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN'
  ]) delete env[key]
  return env
}

const CODEX_SUBSCRIPTION = ['-c', 'forced_login_method="chatgpt"', '-c', 'model_provider="openai"']

async function requireSubscription(
  file: string, binary: SubscriptionCli, env: NodeJS.ProcessEnv, cwd?: string
): Promise<void> {
  const args = binary === 'claude' ? ['auth', 'status', '--json'] : ['login', 'status']
  const { code, stdout, stderr } = await run(file, args, '', 15_000, cwd, env)
  if (code === 0) {
    if (binary === 'codex' && /logged in using ChatGPT/i.test(stdout + stderr)) return
    if (binary === 'claude') {
      const status: unknown = JSON.parse(stdout)
      if (status && typeof status === 'object' && 'loggedIn' in status && status.loggedIn === true &&
        'authMethod' in status && status.authMethod === 'claude.ai') return
    }
  }
  throw new Error(`Sign in with your subscription using ${binary === 'claude' ? 'claude auth login' : 'codex login'}.`)
}

/** The provider CLI opens its browser and owns the callback and credential storage. */
export async function signInSubscription(
  binary: SubscriptionCli, path: string, signal: AbortSignal
): Promise<SubscriptionTest> {
  if ((binary !== 'codex' && binary !== 'claude') || typeof path !== 'string') return 'failed'
  await shellPathReady()
  const directory = await mkdtemp(join(tmpdir(), 'gitcito-sign-in-'))
  const file = path.trim() || binary
  const env = subscriptionEnv()
  try {
    // Reuse a valid subscription session. Starting login again can replace the
    // provider's saved session before a new browser flow has completed.
    try {
      await requireSubscription(file, binary, env, directory)
      return 'connected'
    } catch {
      if (signal.aborted) return 'failed'
    }
    const args = binary === 'codex'
      ? [...CODEX_SUBSCRIPTION, 'login']
      : ['auth', 'login']
    await new Promise<void>((resolve, reject) => {
      const child = execFile(file, args, {
        cwd: directory, env, signal, timeout: 180_000, maxBuffer: CLI_MAX_BUFFER, windowsHide: true
      }, (error) => error ? reject(error) : resolve())
      // Keep stdin open for the provider's browser callback. Output can contain
      // one-time authorization URLs and remains inside this process.
      child.stdin?.on('error', () => undefined)
    })
    if (signal.aborted) return 'failed'
    await requireSubscription(file, binary, env, directory)
    return 'connected'
  } catch (error) {
    if (signal.aborted) return 'failed'
    return (error as NodeJS.ErrnoException)?.code === 'ENOENT' ? 'missing' : 'login'
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

/** Probe from an empty directory. Only a status crosses IPC, never CLI credentials or diagnostics. */
export async function testSubscription(binary: SubscriptionCli, path: string): Promise<SubscriptionTest> {
  if (binary !== 'codex' && binary !== 'claude') return 'failed'
  if (typeof path !== 'string') return 'failed'
  const file = path.trim() || binary
  await shellPathReady()
  const directory = await mkdtemp(join(tmpdir(), 'gitcito-connection-'))
  try {
    const env = subscriptionEnv()
    await requireSubscription(file, binary, env, directory)
    const args = binary === 'codex'
      ? ['exec', '--skip-git-repo-check', '--ephemeral', '--sandbox', 'read-only',
        ...CODEX_SUBSCRIPTION, '-']
      : ['-p', '--tools', '', '--no-session-persistence']
    const { code, stdout, stderr } = await run(file, args, 'Reply with exactly OK.', undefined, directory, env)
    if (code === 0 && stdout.trim().toUpperCase() === 'OK') return 'connected'
    if (/quota|usage.limit|rate.limit|hit your limit|429/i.test(stdout + stderr)) return 'limit'
    if (/log.?in|sign.?in|unauthoriz|401|expired/i.test(stdout + stderr)) return 'login'
    return 'failed'
  } catch (error) {
    const message = String(error)
    if (message.includes('was not found')) return 'missing'
    return message.includes('Sign in with your subscription') ? 'login' : 'failed'
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

/**
 * Which agent CLIs are on PATH. Used to populate the account editor — it
 * resolves the executable's location and nothing more, so listing has no side
 * effect on the user's session or usage.
 */
export async function detectCliBinaries(): Promise<{ binary: AICliBinary; label: string; path: string }[]> {
  await shellPathReady()
  const lookup = process.platform === 'win32' ? 'where' : 'which'
  const found: { binary: AICliBinary; label: string; path: string }[] = []
  for (const binary of CLI_BINARIES) {
    const spec = CLIS[binary]
    try {
      const { code, stdout } = await run(lookup, [spec.bin], '', 5_000)
      const path = stdout.split(/\r?\n/)[0]?.trim() ?? ''
      if (code === 0 && path) found.push({ binary, label: spec.label, path })
    } catch {
      // Not installed, or the lookup tool is missing: simply not offered.
    }
  }
  return found
}
