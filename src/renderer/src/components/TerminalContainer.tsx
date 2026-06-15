import { useEffect, useRef } from 'react'
import {
  Plus,
  SquareSplitHorizontal,
  Trash2,
  SquareTerminal,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react'
import { TerminalPanel } from './TerminalPanel'
import { ResizeHandle } from './ResizeHandle'
import { useTerminalsStore, type TermGroup } from '../stores/terminals'
import { useUIStore } from '../stores/ui'

const MIN_PANEL_PX = 80

/** One terminal group: its panels laid out horizontally with draggable splits. */
function TerminalGroupView({
  cwd,
  group,
  active
}: {
  cwd: string
  group: TermGroup
  active: boolean
}): React.JSX.Element {
  const setActivePanel = useTerminalsStore((s) => s.setActivePanel)
  const resizePanels = useTerminalsStore((s) => s.resizePanels)
  const ref = useRef<HTMLDivElement>(null)

  const startSplitDrag = (i: number, e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    const total = el.clientWidth
    const startX = e.clientX
    const a = group.panels[i]
    const b = group.panels[i + 1]
    const sum = a.flex + b.flex
    const totalFlex = group.panels.reduce((acc, p) => acc + p.flex, 0)
    const minFlex = Math.min((MIN_PANEL_PX / total) * totalFlex, sum / 2)

    const move = (ev: MouseEvent): void => {
      const deltaFlex = ((ev.clientX - startX) / total) * totalFlex
      const na = Math.max(minFlex, Math.min(sum - minFlex, a.flex + deltaFlex))
      resizePanels(cwd, group.id, a.id, na, b.id, sum - na)
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.cursor = ''
    }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={ref}
      className="terminal-group"
      style={{ display: active ? 'flex' : 'none' }}
    >
      {group.panels.map((panel, i) => (
        <div key={panel.id} className="terminal-split-wrap" style={{ flex: panel.flex }}>
          <div
            className={`terminal-split${
              group.panels.length > 1 && panel.id === group.activePanelId ? ' focused' : ''
            }`}
            onMouseDown={() => setActivePanel(cwd, group.id, panel.id)}
          >
            <TerminalPanel
              panelId={panel.id}
              cwd={panel.cwd}
              active={active && panel.id === group.activePanelId}
            />
          </div>
          {i < group.panels.length - 1 && (
            <div
              className="resize-handle rh-x term-split-rh"
              onMouseDown={(e) => startSplitDrag(i, e)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function TerminalContainer({ cwd }: { cwd: string }): React.JSX.Element {
  const repo = useTerminalsStore((s) => s.byRepo[cwd])
  const ensureRepo = useTerminalsStore((s) => s.ensureRepo)
  const addGroup = useTerminalsStore((s) => s.addGroup)
  const removeGroup = useTerminalsStore((s) => s.removeGroup)
  const setActiveGroup = useTerminalsStore((s) => s.setActiveGroup)
  const splitGroup = useTerminalsStore((s) => s.splitGroup)
  const removePanel = useTerminalsStore((s) => s.removePanel)
  const setActivePanel = useTerminalsStore((s) => s.setActivePanel)
  const toggleTerminal = useUIStore((s) => s.toggleTerminal)
  const layout = useUIStore((s) => s.layout)
  const setLayout = useUIStore((s) => s.setLayout)

  const collapsed = layout.terminalListCollapsed
  const listWidth = layout.terminalListWidth

  // First open for this repo creates an initial terminal.
  useEffect(() => {
    ensureRepo(cwd, cwd)
  }, [cwd, ensureRepo])

  const groups = repo?.groups ?? []
  const activeGroupId = repo?.activeGroupId ?? null

  // Closing the last terminal closes the whole bottom pane.
  useEffect(() => {
    if (repo && groups.length === 0) toggleTerminal()
  }, [repo, groups.length, toggleTerminal])

  return (
    <div className="terminal-container">
      <div className="terminal-main">
        {groups.map((group) => (
          <TerminalGroupView
            key={group.id}
            cwd={cwd}
            group={group}
            active={group.id === activeGroupId}
          />
        ))}
        {groups.length === 0 && <div className="terminal-empty" />}
      </div>

      {collapsed ? (
        <div className="terminal-list-collapsed">
          <button
            className="icon-btn"
            title="Show terminals"
            onClick={() => setLayout({ terminalListCollapsed: false })}
          >
            <PanelRightOpen size={15} />
          </button>
        </div>
      ) : (
        <>
          <ResizeHandle
            axis="x"
            value={listWidth}
            min={160}
            max={460}
            invert
            onChange={(v) => setLayout({ terminalListWidth: v })}
          />
          <div className="terminal-list" style={{ width: listWidth }}>
            <div className="terminal-list-head">
              <span>Terminals</span>
              <span className="terminal-list-head-actions">
                <button className="icon-btn" onClick={() => addGroup(cwd, cwd)} title="New terminal">
                  <Plus size={14} />
                </button>
                <button
                  className="icon-btn"
                  title="Hide list"
                  onClick={() => setLayout({ terminalListCollapsed: true })}
                >
                  <PanelRightClose size={14} />
                </button>
              </span>
            </div>
            <div className="terminal-list-body">
              {groups.map((group) => {
                const split = group.panels.length > 1
                return (
                  <div key={group.id} className="terminal-list-group">
                    <div
                      className={`terminal-list-row${group.id === activeGroupId ? ' active' : ''}`}
                      onClick={() => setActiveGroup(cwd, group.id)}
                    >
                      <SquareTerminal size={13} className="row-icon" />
                      <span className="row-label">{group.title}</span>
                      <span className="row-actions">
                        <button
                          className="icon-btn"
                          title="Split terminal"
                          onClick={(e) => {
                            e.stopPropagation()
                            splitGroup(cwd, group.id, cwd)
                          }}
                        >
                          <SquareSplitHorizontal size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Kill terminal"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeGroup(cwd, group.id)
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                    {split &&
                      group.panels.map((panel, i) => (
                        <div
                          key={panel.id}
                          className={`terminal-list-row child${
                            group.id === activeGroupId && panel.id === group.activePanelId
                              ? ' active'
                              : ''
                          }`}
                          onClick={() => {
                            setActiveGroup(cwd, group.id)
                            setActivePanel(cwd, group.id, panel.id)
                          }}
                        >
                          <span className="tree-connector">
                            {i === group.panels.length - 1 ? '└' : '├'}
                          </span>
                          <SquareTerminal size={12} className="row-icon" />
                          <span className="row-label">{group.title}</span>
                          <span className="row-actions">
                            <button
                              className="icon-btn"
                              title="Kill panel"
                              onClick={(e) => {
                                e.stopPropagation()
                                removePanel(cwd, group.id, panel.id)
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        </div>
                      ))}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
