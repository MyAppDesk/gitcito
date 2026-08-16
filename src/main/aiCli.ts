import { execFile } from 'node:child_process'
import type { AICliBinary, AIConfig } from '../shared/types'
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
  timeout = CLI_TIMEOUT_MS
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      { timeout, maxBuffer: CLI_MAX_BUFFER, windowsHide: true },
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
    if (typeof json.result !== 'string') return null
    const usage: TokenUsage = {
      promptTokens: json.usage?.input_tokens ?? 0,
      completionTokens: json.usage?.output_tokens ?? 0,
      totalTokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
    }
    return { text: json.result, usage }
  } catch {
    // Older versions, or a CLI that ignored the flag, print plain text. Falling
    // back beats failing the whole feature over an output-format difference.
    return null
  }
}

const NO_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

/** One answer from a locally installed, already signed-in agent CLI. */
export async function runCliModel(cfg: AIConfig, messages: ChatMessage[]): Promise<ModelReply> {
  const binary = cfg.cli ?? 'claude'
  const spec = cliSpec(binary)
  const file = (cfg.cliPath ?? '').trim() || spec.bin
  const model = (cfg.model ?? '').trim()

  const { code, stdout, stderr } = await run(file, spec.args(model), flattenMessages(messages))
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

/**
 * Which agent CLIs are on PATH. Used to populate the account editor — it
 * resolves the executable's location and nothing more, so listing has no side
 * effect on the user's session or usage.
 */
export async function detectCliBinaries(): Promise<{ binary: AICliBinary; label: string; path: string }[]> {
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
