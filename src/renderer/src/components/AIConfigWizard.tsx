import { useState, useMemo } from 'react'
import {
  Bot, Github, MousePointer2, Wind, Terminal, Code2, GitCommit,
  Loader2, ChevronRight, ChevronLeft, Check, FileText, Wand2,
  Sparkles, Plus, X, Server, MessageSquare, Zap, SlidersHorizontal,
  HelpCircle, FolderOpen
} from 'lucide-react'
import { marked } from 'marked'
import { useUIStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { aiApi, shellApi, type GeneratedFile, type ArtifactRequest, type ArtifactSuggestion } from '../infrastructure/api'
import type { AIConfig } from '../../../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type CategoryId = 'instructions' | 'agents' | 'skills' | 'mcps' | 'prompts' | 'per-file' | 'hooks' | 'git-hooks'
type BuiltinFrameworkId = 'claude-code' | 'copilot' | 'cursor' | 'windsurf' | 'aider' | 'opencode' | 'codex'

interface Category {
  id: CategoryId
  label: string
  description: string
  Icon: typeof Bot
}

interface Framework {
  id: string
  label: string
  Icon: typeof Bot
  custom?: boolean
}

interface Artifact {
  id: string
  path: string
  label: string
  description: string
  categories: CategoryId[]
  /** Framework IDs this artifact belongs to. '*' means any/all frameworks (e.g. git hooks). */
  frameworks: (BuiltinFrameworkId | '*')[]
  isFolder?: boolean
}

// ── Catalog ───────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'instructions', label: 'Persistent Instructions', description: 'Project-wide rules fed to the AI every session', Icon: FileText },
  { id: 'agents', label: 'Custom Agents', description: 'Specialized subagents for review, security, testing…', Icon: Bot },
  { id: 'skills', label: 'Skills / Commands', description: 'Reusable slash commands and invokable actions', Icon: Wand2 },
  { id: 'mcps', label: 'MCPs', description: 'Model Context Protocol server configuration', Icon: Server },
  { id: 'prompts', label: 'Reusable Prompts', description: 'Shareable prompt files for common tasks', Icon: MessageSquare },
  { id: 'per-file', label: 'Per-file Instructions', description: 'Rules scoped to specific file types or directories', Icon: SlidersHorizontal },
  { id: 'hooks', label: 'AI Tool Hooks', description: 'Lifecycle hooks for your AI coding tool', Icon: Zap },
  { id: 'git-hooks', label: 'Git Hooks', description: 'Shell scripts triggered by git lifecycle events', Icon: GitCommit },
]

const BUILTIN_FRAMEWORKS: Framework[] = [
  { id: 'claude-code', label: 'Claude Code', Icon: Bot },
  { id: 'copilot', label: 'GitHub Copilot', Icon: Github },
  { id: 'cursor', label: 'Cursor', Icon: MousePointer2 },
  { id: 'windsurf', label: 'Windsurf', Icon: Wind },
  { id: 'aider', label: 'Aider', Icon: Terminal },
  { id: 'opencode', label: 'OpenCode', Icon: Code2 },
  { id: 'codex', label: 'Codex (OpenAI)', Icon: Zap },
]

const CATALOG: Artifact[] = [
  // ── Instructions
  { id: 'claude-md', path: 'CLAUDE.md', label: 'CLAUDE.md', description: 'Project instructions for Claude Code', categories: ['instructions'], frameworks: ['claude-code'] },
  { id: 'claude-local-md', path: 'CLAUDE.local.md', label: 'CLAUDE.local.md', description: 'Local overrides (gitignored, machine-specific)', categories: ['instructions'], frameworks: ['claude-code'] },
  { id: 'copilot-instructions', path: '.github/copilot-instructions.md', label: 'copilot-instructions.md', description: 'Repo-wide instructions for GitHub Copilot', categories: ['instructions'], frameworks: ['copilot'] },
  { id: 'cursor-project-rules', path: '.cursor/rules/project.mdc', label: 'Project rules', description: 'Project-wide Cursor AI rules', categories: ['instructions'], frameworks: ['cursor'] },
  { id: 'cursorrules', path: '.cursorrules', label: '.cursorrules (legacy)', description: 'Legacy Cursor rules file for older versions', categories: ['instructions'], frameworks: ['cursor'] },
  { id: 'windsurfrules', path: '.windsurfrules', label: '.windsurfrules', description: 'Windsurf rules and project conventions', categories: ['instructions'], frameworks: ['windsurf'] },
  { id: 'windsurfignore', path: '.windsurfignore', label: '.windsurfignore', description: 'Files Windsurf should ignore', categories: ['instructions'], frameworks: ['windsurf'] },
  { id: 'aider-conf', path: '.aider.conf.yml', label: '.aider.conf.yml', description: 'Aider model, auto-commits, lint commands', categories: ['instructions'], frameworks: ['aider'] },
  { id: 'aider-conventions', path: 'CONVENTIONS.md', label: 'CONVENTIONS.md', description: 'Coding conventions referenced by Aider', categories: ['instructions'], frameworks: ['aider'] },
  { id: 'aiderignore', path: '.aiderignore', label: '.aiderignore', description: 'Files Aider should not read or modify', categories: ['instructions'], frameworks: ['aider'] },
  { id: 'opencode-json', path: 'opencode.json', label: 'opencode.json', description: 'OpenCode configuration with system prompt', categories: ['instructions'], frameworks: ['opencode'] },
  { id: 'agents-md', path: 'AGENTS.md', label: 'AGENTS.md', description: 'Project instructions for Codex agents', categories: ['instructions'], frameworks: ['codex'] },

  // ── Agents
  { id: 'claude-agent-reviewer', path: '.claude/agents/code-reviewer.md', label: 'code-reviewer', description: 'Subagent for automated code review (correctness, security)', categories: ['agents'], frameworks: ['claude-code'], isFolder: true },
  { id: 'claude-agent-security', path: '.claude/agents/security-auditor.md', label: 'security-auditor', description: 'Subagent for security auditing — OWASP, secrets, injection', categories: ['agents'], frameworks: ['claude-code'], isFolder: true },
  { id: 'claude-agent-tester', path: '.claude/agents/test-writer.md', label: 'test-writer', description: 'Subagent for generating and running tests', categories: ['agents'], frameworks: ['claude-code'], isFolder: true },
  { id: 'copilot-agent', path: '.github/agents/default.yml', label: 'default agent', description: 'GitHub Copilot agent configuration', categories: ['agents'], frameworks: ['copilot'], isFolder: true },

  // ── Skills / Commands
  { id: 'claude-cmd-review', path: '.claude/commands/review.md', label: '/review', description: 'Code review slash command for Claude Code', categories: ['skills'], frameworks: ['claude-code'], isFolder: true },
  { id: 'claude-cmd-test', path: '.claude/commands/test.md', label: '/test', description: 'Test runner slash command', categories: ['skills'], frameworks: ['claude-code'], isFolder: true },
  { id: 'claude-cmd-deploy', path: '.claude/commands/deploy.md', label: '/deploy', description: 'Deployment checklist slash command', categories: ['skills'], frameworks: ['claude-code'], isFolder: true },
  { id: 'copilot-prompt-review', path: '.github/prompts/code-review.prompt.md', label: '/code-review', description: 'Reusable Copilot code review prompt', categories: ['skills', 'prompts'], frameworks: ['copilot'], isFolder: true },
  { id: 'copilot-prompt-explain', path: '.github/prompts/explain.prompt.md', label: '/explain', description: 'Reusable Copilot explain prompt', categories: ['skills', 'prompts'], frameworks: ['copilot'], isFolder: true },
  { id: 'copilot-prompt-test', path: '.github/prompts/test-generation.prompt.md', label: '/test-generation', description: 'Copilot prompt for generating tests', categories: ['skills', 'prompts'], frameworks: ['copilot'], isFolder: true },

  // ── MCPs
  { id: 'claude-mcp', path: '.mcp.json', label: '.mcp.json', description: 'MCP server configuration for Claude Code', categories: ['mcps'], frameworks: ['claude-code'] },

  // ── Hooks (AI tool)
  { id: 'claude-settings', path: '.claude/settings.json', label: 'settings.json', description: 'Claude Code settings, permissions, and lifecycle hooks', categories: ['hooks', 'mcps'], frameworks: ['claude-code'] },

  // ── Per-file Instructions
  { id: 'copilot-ts-instructions', path: '.github/instructions/typescript.instructions.md', label: 'TypeScript instructions', description: 'Copilot instructions scoped to TS/TSX files', categories: ['per-file'], frameworks: ['copilot'], isFolder: true },
  { id: 'copilot-test-instructions', path: '.github/instructions/testing.instructions.md', label: 'Testing instructions', description: 'Copilot instructions scoped to test files', categories: ['per-file'], frameworks: ['copilot'], isFolder: true },
  { id: 'copilot-api-instructions', path: '.github/instructions/api.instructions.md', label: 'API instructions', description: 'Copilot instructions scoped to API/backend files', categories: ['per-file'], frameworks: ['copilot'], isFolder: true },
  { id: 'cursor-ts-rules', path: '.cursor/rules/typescript.mdc', label: 'TypeScript rules', description: 'Cursor rules scoped to TypeScript files', categories: ['per-file'], frameworks: ['cursor'], isFolder: true },
  { id: 'cursor-testing-rules', path: '.cursor/rules/testing.mdc', label: 'Testing rules', description: 'Cursor rules scoped to test files', categories: ['per-file'], frameworks: ['cursor'], isFolder: true },

  // ── Git Hooks (framework-agnostic)
  { id: 'hook-pre-commit', path: '.git/hooks/pre-commit', label: 'pre-commit', description: 'Run lint and format checks before each commit', categories: ['git-hooks'], frameworks: ['*'] },
  { id: 'hook-commit-msg', path: '.git/hooks/commit-msg', label: 'commit-msg', description: 'Validate commit message format', categories: ['git-hooks'], frameworks: ['*'] },
  { id: 'hook-pre-push', path: '.git/hooks/pre-push', label: 'pre-push', description: 'Run tests before pushing to remote', categories: ['git-hooks'], frameworks: ['*'] },
  { id: 'hook-post-commit', path: '.git/hooks/post-commit', label: 'post-commit', description: 'Notifications or CI triggers after commit', categories: ['git-hooks'], frameworks: ['*'] },
  { id: 'hook-prepare-commit-msg', path: '.git/hooks/prepare-commit-msg', label: 'prepare-commit-msg', description: 'Pre-populate commit message from branch/ticket', categories: ['git-hooks'], frameworks: ['*'] },
  { id: 'hook-post-merge', path: '.git/hooks/post-merge', label: 'post-merge', description: 'Install deps or run migrations after merge', categories: ['git-hooks'], frameworks: ['*'] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseMarkdown(content: string): string {
  try {
    const result = marked.parse(content, { async: false })
    return typeof result === 'string' ? result : ''
  } catch {
    return content
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AIConfigWizard({
  spec
}: {
  spec: { repoPath: string; repoName: string }
}): React.JSX.Element {
  const closeModal = useUIStore((s) => s.closeModal)
  const toast = useUIStore((s) => s.toast)
  const activeProfileId = useSettingsStore((s) => s.settings.activeProfileId)
  const profiles = useSettingsStore((s) => s.settings.profiles)
  const aiCfg: AIConfig = (profiles.find((p) => p.id === activeProfileId) ?? profiles[0]).ai

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryId>>(new Set())

  // Step 2
  const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set())
  const [customFrameworks, setCustomFrameworks] = useState<Framework[]>([])
  const [customFrameworkInput, setCustomFrameworkInput] = useState('')

  // Step 3 — artifacts
  const [selectedArtifacts, setSelectedArtifacts] = useState<Set<string>>(new Set())
  const [context, setContext] = useState('')
  const [suggestions, setSuggestions] = useState<ArtifactSuggestion[]>([])
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [customArtifacts, setCustomArtifacts] = useState<ArtifactRequest[]>([])
  const [customPath, setCustomPath] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)

  // Step 4 — generate + preview
  const [generating, setGenerating] = useState(false)
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[] | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'rendered' | 'raw'>('rendered')

  const allFrameworks = useMemo(
    () => [...BUILTIN_FRAMEWORKS, ...customFrameworks],
    [customFrameworks]
  )

  // Derived artifacts from catalog based on selected categories × frameworks
  const derivedArtifacts = useMemo(() => {
    const seen = new Set<string>()
    return CATALOG.filter((a) => {
      if (!a.categories.some((c) => selectedCategories.has(c))) return false
      if (!a.frameworks.includes('*') && !a.frameworks.some((f) => selectedFrameworks.has(f))) return false
      if (seen.has(a.path)) return false
      seen.add(a.path)
      return true
    })
  }, [selectedCategories, selectedFrameworks])

  const flatArtifacts: ArtifactRequest[] = useMemo(() => {
    const paths = new Set<string>()
    const result: ArtifactRequest[] = []
    for (const a of derivedArtifacts) {
      if (selectedArtifacts.has(a.id) && !paths.has(a.path)) {
        paths.add(a.path)
        result.push({ path: a.path, description: a.description })
      }
    }
    for (const s of suggestions) {
      if (selectedSuggestions.has(s.path) && !paths.has(s.path)) {
        paths.add(s.path)
        result.push({ path: s.path, description: s.description })
      }
    }
    for (const c of customArtifacts) {
      if (!paths.has(c.path)) {
        paths.add(c.path)
        result.push(c)
      }
    }
    return result
  }, [derivedArtifacts, selectedArtifacts, suggestions, selectedSuggestions, customArtifacts])

  const previewContent = generatedFiles?.find((f) => f.path === previewFile)?.content ?? ''
  const previewHtml = useMemo(() => parseMarkdown(previewContent), [previewContent])

  // Group derived artifacts by category for display
  const artifactsByCategory = useMemo(() => {
    const groups: { category: Category; artifacts: Artifact[] }[] = []
    for (const cat of CATEGORIES) {
      if (!selectedCategories.has(cat.id)) continue
      const items = derivedArtifacts.filter((a) => a.categories.includes(cat.id))
      if (items.length > 0) groups.push({ category: cat, artifacts: items })
    }
    return groups
  }, [derivedArtifacts, selectedCategories])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleCategory = (id: CategoryId): void => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFramework = (id: string): void => {
    setSelectedFrameworks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addCustomFramework = (): void => {
    const label = customFrameworkInput.trim()
    if (!label) return
    const id = `custom-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    const fw: Framework = { id, label, Icon: HelpCircle, custom: true }
    setCustomFrameworks((prev) => [...prev, fw])
    setSelectedFrameworks((prev) => new Set([...prev, id]))
    setCustomFrameworkInput('')
  }

  const removeCustomFramework = (id: string): void => {
    setCustomFrameworks((prev) => prev.filter((f) => f.id !== id))
    setSelectedFrameworks((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const goToStep3 = (): void => {
    // Auto-select all derived artifacts
    setSelectedArtifacts(new Set(derivedArtifacts.map((a) => a.id)))
    setStep(3)
  }

  const toggleArtifact = (id: string): void => {
    setSelectedArtifacts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSuggestion = (path: string): void => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const addCustom = (): void => {
    const p = customPath.trim()
    if (!p) return
    setCustomArtifacts((prev) => [...prev, { path: p, description: customDesc.trim() || `Custom: ${p}` }])
    setCustomPath('')
    setCustomDesc('')
    setShowCustomForm(false)
  }

  const suggest = async (): Promise<void> => {
    setSuggestError(null)
    setSuggesting(true)
    try {
      const frameworkLabels = Array.from(selectedFrameworks).map(
        (id) => allFrameworks.find((f) => f.id === id)?.label ?? id
      )
      const result = await aiApi.suggestArtifacts(
        spec.repoName,
        frameworkLabels,
        context,
        flatArtifacts,
        aiCfg
      )
      setSuggestions(result.suggestions)
      setSelectedSuggestions(new Set(result.suggestions.map((s) => s.path)))
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : String(e))
    } finally {
      setSuggesting(false)
    }
  }

  const generate = async (): Promise<void> => {
    setError(null)
    setGenerating(true)
    setGeneratedFiles(null)
    setPreviewFile(null)
    try {
      const customCtx = customFrameworks.length > 0
        ? `\n\nAdditional tools in use: ${customFrameworks.map((f) => f.label).join(', ')}.`
        : ''
      const result = await aiApi.generateConfig(spec.repoName, flatArtifacts, context + customCtx, aiCfg)
      setGeneratedFiles(result.files)
      if (result.files.length > 0) setPreviewFile(result.files[0].path)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  const writeFiles = async (): Promise<void> => {
    if (!generatedFiles) return
    setWriting(true)
    try {
      await shellApi.writeFiles(spec.repoPath, generatedFiles)
      closeModal()
      toast('success', `Wrote ${generatedFiles.length} file${generatedFiles.length !== 1 ? 's' : ''} to ${spec.repoName}`)
    } catch (e) {
      toast('error', e instanceof Error ? e.message : String(e))
      setWriting(false)
    }
  }

  // ── Step indicator ─────────────────────────────────────────────────────────

  const STEP_LABELS = ['What', 'Tools', 'Files', 'Preview']

  const StepBar = (): React.JSX.Element => (
    <div className="wizard-step-bar">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={n} className={`wizard-step-pip ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
            <span className="wizard-step-num">{done ? <Check size={10} /> : n}</span>
            <span className="wizard-step-label">{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="wizard-step-line" />}
          </div>
        )
      })}
    </div>
  )

  // ── Step 1: categories ─────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <>
        <h3 className="modal-title-row"><Wand2 size={17} /> Generate AI Config</h3>
        <StepBar />
        <p className="modal-message" style={{ marginBottom: 14 }}>
          What do you want to configure?
        </p>
        <div className="wizard-tool-grid wizard-category-grid">
          {CATEGORIES.map((cat) => {
            const Icon = cat.Icon
            const active = selectedCategories.has(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                className={`wizard-tool-card wizard-category-card ${active ? 'active' : ''}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="wizard-tool-card-icon"><Icon size={18} /></div>
                <span className="wizard-tool-card-label">{cat.label}</span>
                <span className="wizard-category-card-desc">{cat.description}</span>
                {active && <span className="wizard-tool-card-check"><Check size={10} /></span>}
              </button>
            )
          })}
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={closeModal} type="button">Cancel</button>
          <button
            className="btn primary"
            disabled={selectedCategories.size === 0}
            onClick={() => setStep(2)}
            type="button"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </>
    )
  }

  // ── Step 2: frameworks ─────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <>
        <h3 className="modal-title-row"><Wand2 size={17} /> Generate AI Config</h3>
        <StepBar />
        <p className="modal-message" style={{ marginBottom: 14 }}>
          Which AI tools do you use?
        </p>
        <div className="wizard-tool-grid">
          {BUILTIN_FRAMEWORKS.map((fw) => {
            const Icon = fw.Icon
            const active = selectedFrameworks.has(fw.id)
            return (
              <button
                key={fw.id}
                type="button"
                className={`wizard-tool-card ${active ? 'active' : ''}`}
                onClick={() => toggleFramework(fw.id)}
              >
                <div className="wizard-tool-card-icon"><Icon size={20} /></div>
                <span className="wizard-tool-card-label">{fw.label}</span>
                {active && <span className="wizard-tool-card-check"><Check size={10} /></span>}
              </button>
            )
          })}
          {customFrameworks.map((fw) => {
            const active = selectedFrameworks.has(fw.id)
            return (
              <button
                key={fw.id}
                type="button"
                className={`wizard-tool-card ${active ? 'active' : ''}`}
                onClick={() => toggleFramework(fw.id)}
              >
                <div className="wizard-tool-card-icon"><HelpCircle size={20} /></div>
                <span className="wizard-tool-card-label">{fw.label}</span>
                <span className="wizard-tool-card-check wizard-custom-fw-remove" onClick={(e) => { e.stopPropagation(); removeCustomFramework(fw.id) }}>
                  <X size={10} />
                </span>
              </button>
            )
          })}
        </div>

        <div className="wizard-custom-fw-row">
          <input
            className="modal-input wizard-custom-fw-input"
            placeholder="Using something else? Type its name…"
            value={customFrameworkInput}
            onChange={(e) => setCustomFrameworkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustomFramework() }}
          />
          <button
            type="button"
            className="btn ghost"
            disabled={!customFrameworkInput.trim()}
            onClick={addCustomFramework}
          >
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setStep(1)} type="button">
            <ChevronLeft size={14} /> Back
          </button>
          <button
            className="btn primary"
            disabled={selectedFrameworks.size === 0}
            onClick={goToStep3}
            type="button"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </>
    )
  }

  // ── Step 3: artifacts + context ────────────────────────────────────────────

  if (step === 3) {
    return (
      <>
        <h3 className="modal-title-row"><Wand2 size={17} /> Generate AI Config</h3>
        <StepBar />

        <div className="wizard-artifacts-list">
          {artifactsByCategory.map(({ category, artifacts }) => {
            const Icon = category.Icon
            return (
              <div key={category.id} className="wizard-artifact-group">
                <div className="wizard-artifact-group-header">
                  <Icon size={12} />
                  <span>{category.label}</span>
                </div>
                {artifacts.map((a) => {
                  const checked = selectedArtifacts.has(a.id)
                  return (
                    <label key={a.id} className="wizard-artifact-row">
                      <input type="checkbox" checked={checked} onChange={() => toggleArtifact(a.id)} />
                      {a.isFolder && <FolderOpen size={11} className="wizard-artifact-folder-icon" />}
                      <span className="wizard-artifact-path">{a.path}</span>
                      <span className="wizard-artifact-desc">{a.description}</span>
                    </label>
                  )
                })}
              </div>
            )
          })}

          {suggestions.length > 0 && (
            <div className="wizard-artifact-group">
              <div className="wizard-artifact-group-header">
                <Sparkles size={12} />
                <span>AI Suggested</span>
              </div>
              {suggestions.map((s) => (
                <label key={s.path} className="wizard-artifact-row">
                  <input type="checkbox" checked={selectedSuggestions.has(s.path)} onChange={() => toggleSuggestion(s.path)} />
                  <span className="wizard-artifact-path">{s.path}</span>
                  <span className="wizard-artifact-desc" title={s.reason}>{s.description}</span>
                </label>
              ))}
            </div>
          )}

          {customArtifacts.length > 0 && (
            <div className="wizard-artifact-group">
              <div className="wizard-artifact-group-header">
                <Plus size={12} />
                <span>Custom</span>
              </div>
              {customArtifacts.map((a) => (
                <div key={a.path} className="wizard-artifact-row wizard-artifact-custom">
                  <span className="wizard-artifact-path">{a.path}</span>
                  <span className="wizard-artifact-desc">{a.description}</span>
                  <button type="button" className="wizard-artifact-remove" onClick={() => setCustomArtifacts((p) => p.filter((x) => x.path !== a.path))}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="modal-label" style={{ marginTop: 12 }}>
          Project context — describe your stack, conventions, team preferences
        </label>
        <textarea
          className="modal-input wizard-context-area"
          placeholder={`e.g. "TypeScript monorepo with React frontend and Node API. Conventional commits, Jest + ESLint in CI."`}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
        />

        {suggestError && <div className="modal-hint danger" style={{ marginTop: 6 }}>{suggestError}</div>}

        <div className="wizard-action-row">
          <button type="button" className="btn ghost wizard-suggest-btn" disabled={suggesting} onClick={() => void suggest()}>
            {suggesting ? <><Loader2 size={13} className="spin" /> Thinking…</> : <><Sparkles size={13} /> AI suggest more</>}
          </button>
          <button type="button" className="btn ghost" onClick={() => setShowCustomForm((v) => !v)}>
            <Plus size={13} /> Add custom file
          </button>
        </div>

        {showCustomForm && (
          <div className="wizard-custom-form">
            <input className="modal-input" placeholder="File path (e.g. .vscode/settings.json)" value={customPath} onChange={(e) => setCustomPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }} />
            <input className="modal-input" placeholder="Description (optional)" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }} style={{ marginTop: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button type="button" className="btn primary" onClick={addCustom} disabled={!customPath.trim()}>Add</button>
              <button type="button" className="btn ghost" onClick={() => setShowCustomForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button className="btn ghost" onClick={() => setStep(2)} type="button">
            <ChevronLeft size={14} /> Back
          </button>
          <span className="wizard-count-label">{flatArtifacts.length} file{flatArtifacts.length !== 1 ? 's' : ''} selected</span>
          <button
            className="btn primary"
            disabled={flatArtifacts.length === 0}
            onClick={() => { setStep(4); void generate() }}
            type="button"
          >
            Generate <Wand2 size={14} />
          </button>
        </div>
      </>
    )
  }

  // ── Step 4: preview + write ────────────────────────────────────────────────

  const isMarkdown = previewFile?.endsWith('.md') || previewFile?.endsWith('.mdc')

  return (
    <>
      <h3 className="modal-title-row"><Wand2 size={17} /> Generate AI Config</h3>
      <StepBar />

      {generating && (
        <div className="wizard-generating">
          <Loader2 size={22} className="spin" />
          <span>Generating {flatArtifacts.length} file{flatArtifacts.length !== 1 ? 's' : ''}…</span>
        </div>
      )}

      {error && (
        <div className="modal-hint danger" style={{ marginBottom: 12 }}>
          {error}
          <button className="link-btn" type="button" style={{ marginLeft: 8 }} onClick={() => void generate()}>Retry</button>
        </div>
      )}

      {generatedFiles && generatedFiles.length > 0 && (
        <div className="wizard-preview">
          <div className="wizard-file-list">
            {generatedFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                className={`wizard-file-row ${previewFile === file.path ? 'active' : ''}`}
                onClick={() => setPreviewFile(file.path)}
              >
                <FileText size={11} />
                <span title={file.path}>{file.path}</span>
              </button>
            ))}
          </div>
          <div className="wizard-file-content">
            {isMarkdown && (
              <div className="wizard-preview-mode-toggle">
                <button
                  type="button"
                  className={`wizard-preview-mode-btn ${previewMode === 'rendered' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('rendered')}
                >Preview</button>
                <button
                  type="button"
                  className={`wizard-preview-mode-btn ${previewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('raw')}
                >Raw</button>
              </div>
            )}
            {isMarkdown && previewMode === 'rendered' ? (
              <div
                className="wizard-file-content-md"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <pre>{previewContent}</pre>
            )}
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button
          className="btn ghost"
          onClick={() => { setGeneratedFiles(null); setError(null); setStep(3) }}
          type="button"
          disabled={writing}
        >
          <ChevronLeft size={14} /> Back
        </button>
        <button
          className="btn primary"
          disabled={!generatedFiles || generatedFiles.length === 0 || writing || generating}
          onClick={() => void writeFiles()}
          type="button"
        >
          {writing
            ? <><Loader2 size={14} className="spin" /> Writing…</>
            : <><Check size={14} /> Write {generatedFiles?.length ?? 0} file{(generatedFiles?.length ?? 0) !== 1 ? 's' : ''}</>
          }
        </button>
      </div>
    </>
  )
}
