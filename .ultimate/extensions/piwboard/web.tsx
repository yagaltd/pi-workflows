/** piwboard web panel: the plan board as a dragology board — drag tasks, edit labels, refresh, send the diff. */
import { RefreshCwIcon, SendIcon, WorkflowIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, cn, defineWebExtension, errorMessage, useAction, useUltimate } from '@/sdk'
import { DraggableRenderer, param, translate } from './dragology.js'
import type { Draggable } from './dragology.js'
import { GetBoardAction, SendBoardDiffAction } from './refs.ts'
import type { Board, BoardEdge, BoardState } from './refs.ts'

/** Grid geometry; server.ts derives col/row for the diff with the same numbers. */
const GRID = { colW: 260, rowH: 120, padX: 40, padY: 40 } as const
const NODE_W = 220
const NODE_H = 64

/** scripts/plan-diagram.mjs output → the panel's editable state (grid cell → px). */
function toState(board: Board): BoardState {
  const nodes: BoardState['nodes'] = {}
  for (const node of board.nodes)
    nodes[node.id] = {
      label: node.label,
      sub: node.sub ?? '',
      x: GRID.padX + node.col * GRID.colW,
      y: GRID.padY + node.row * GRID.rowH,
    }
  return { nodes, edges: board.edges.map((edge) => [...edge] as BoardEdge) }
}

function canvasSize(state: BoardState): { width: number; height: number } {
  let width = 420
  let height = 240
  for (const node of Object.values(state.nodes)) {
    width = Math.max(width, node.x + NODE_W + GRID.padX)
    height = Math.max(height, node.y + NODE_H + GRID.padY)
  }
  return { width: Math.ceil(width), height: Math.ceil(height) }
}

const trunc = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** True when the edited board differs from the loaded one (positions, labels, edges). */
function isDirty(before: BoardState, after: BoardState): boolean {
  const ids = new Set([...Object.keys(before.nodes), ...Object.keys(after.nodes)])
  for (const id of ids) {
    const was = before.nodes[id]
    const now = after.nodes[id]
    if (!was || !now) return true
    if (was.label !== now.label || was.sub !== now.sub) return true
    if (Math.abs(was.x - now.x) > 0.5 || Math.abs(was.y - now.y) > 0.5) return true
  }
  const key = (edge: BoardEdge) => `${edge[0]}->${edge[1]}:${edge.length > 2 ? edge[2] : ''}`
  const beforeEdges = before.edges.map(key).sort().join('|')
  const afterEdges = after.edges.map(key).sort().join('|')
  return beforeEdges !== afterEdges
}

/** The node's corner pencil; while editing, an inline contenteditable over the label. React owns it, dragology doesn't. */
function EditDot({
  label,
  editing,
  onEdit,
  onCommit,
  onCancel,
}: {
  label: string
  editing: boolean
  onEdit: () => void
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!editing || !el) return
    el.textContent = label
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, [editing, label])
  if (!editing)
    return (
      <div
        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onEdit}
        onPointerDown={(event) => event.stopPropagation()}
        title="Edit label"
      >
        ✎
      </div>
    )
  const commit = () => {
    const text = (ref.current?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text && text !== label) onCommit(text)
    else onCancel()
  }
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="rounded border border-ring bg-background px-1 text-[12px] leading-snug outline-none"
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
        if (event.key === 'Escape') onCancel()
      }}
      onPointerDown={(event) => event.stopPropagation()}
    />
  )
}

/** The board panel: load, drag, edit, refresh, send the diff into the conversation. */
function BoardPanel() {
  const ultimate = useUltimate()
  const loaded = useAction(GetBoardAction, null, { onError: () => {} })
  const [original, setOriginal] = useState<BoardState>({ nodes: {}, edges: [] })
  const [board, setBoard] = useState<BoardState>({ nodes: {}, edges: [] })
  const [editId, setEditId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | undefined>()
  const [sending, setSending] = useState(false)
  const applied = useRef(false)

  // First load only: refetch applies its result itself (an explicit refresh resets the board on purpose).
  useEffect(() => {
    if (!loaded.data || applied.current) return
    applied.current = true
    const state = toState(loaded.data)
    setOriginal(state)
    setBoard(state)
  }, [loaded.data])

  const dirty = useMemo(() => isDirty(original, board), [original, board])
  const { width, height } = canvasSize(board)

  const applyBoard = (next: Board) => {
    applied.current = true
    const state = toState(next)
    setOriginal(state)
    setBoard(state)
    setEditId(null)
  }

  const refresh = async () => {
    setStatus(undefined)
    const next = await loaded.refetch()
    if (next) {
      applyBoard(next)
      setStatus(`Loaded ${next.nodes.length} nodes, ${next.edges.length} edges`)
    } else if (loaded.error) setStatus(errorMessage(loaded.error))
    else setStatus('Refresh failed')
  }

  const sendDiff = async () => {
    if (!dirty || sending) return
    setSending(true)
    setStatus(undefined)
    try {
      const result = await api.action(SendBoardDiffAction, { original, edited: board })
      if (!result) throw new Error('sendBoardDiff failed')
      if (result.diff.count === 0) {
        setStatus('No changes to send')
        return
      }
      const conversationId = ultimate.conversationId
      if (conversationId === undefined) throw new Error('Open a conversation first, then send the diff')
      await api.submit(result.text, undefined, conversationId)
      setOriginal(board)
      setStatus(`Sent ${result.diff.count} change${result.diff.count === 1 ? '' : 's'} to the agent`)
    } catch (error) {
      setStatus(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const commitLabel = (id: string, text: string) => {
    setBoard((prev) => ({ ...prev, nodes: { ...prev.nodes, [id]: { ...prev.nodes[id], label: text } } }))
    setEditId(null)
  }

  /** The dragology board: pure state → SVG. Nodes drag freely (d.vary on their x/y); edges follow. */
  const boardDraggable: Draggable<BoardState> = ({ state, d }) => (
    <g>
      <defs>
        <marker
          id="piwboard-arrow"
          markerHeight="7"
          markerWidth="7"
          orient="auto-start-reverse"
          refX="9"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path className="fill-muted-foreground/70" d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      <g id="piwboard-edges" dragologyZIndex={-1}>
        {state.edges.map((edge, index) => {
          const from = state.nodes[edge[0]]
          const to = state.nodes[edge[1]]
          if (!from || !to) return null
          const x1 = from.x + NODE_W
          const y1 = from.y + NODE_H / 2
          const x2 = to.x
          const y2 = to.y + NODE_H / 2
          return (
            <g id={`piwboard-edge-${index}-${edge[0]}-${edge[1]}`}>
              <line
                className="stroke-muted-foreground/70"
                markerEnd="url(#piwboard-arrow)"
                strokeWidth={1.5}
                x1={x1}
                x2={x2}
                y1={y1}
                y2={y2}
              />
              {edge.length > 2 && edge[2] && (
                <text
                  className="fill-muted-foreground"
                  fontSize={10}
                  paintOrder="stroke"
                  stroke="var(--background, white)"
                  strokeWidth={3}
                  textAnchor="middle"
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 5}
                >
                  {trunc(edge[2], 24)}
                </text>
              )}
            </g>
          )
        })}
      </g>
      {Object.entries(state.nodes).map(([id, node]) => (
        <g
          className="cursor-grab"
          dragologyOnDrag={() => d.vary(state, [param('nodes', id, 'x'), param('nodes', id, 'y')])}
          dragologyZIndex={editId === id ? '/1' : false}
          id={`piwboard-node-${id}`}
          onDoubleClick={() => setEditId(id)}
          transform={translate(node.x, node.y)}
        >
          <rect
            className="fill-background stroke-border"
            height={NODE_H}
            rx={10}
            strokeWidth={1.5}
            width={NODE_W}
          />
          <text className="fill-foreground" fontSize={13} fontWeight={600} x={12} y={27}>
            {trunc(node.label, 26)}
          </text>
          {node.sub && (
            <text className="fill-muted-foreground" fontSize={11} x={12} y={47}>
              {trunc(node.sub, 38)}
            </text>
          )}
          <foreignObject height={20} width={20} x={NODE_W - 26} y={6}>
            <EditDot
              editing={editId === id}
              label={node.label}
              onCancel={() => setEditId(null)}
              onCommit={(text) => commitLabel(id, text)}
              onEdit={() => setEditId(id)}
            />
          </foreignObject>
        </g>
      ))}
    </g>
  )

  const button =
    'flex h-6 cursor-pointer items-center gap-1 rounded-md px-2 font-mono text-[10.5px] transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex min-h-0 flex-col py-2" data-piwboard-panel>
      <div className="flex items-center gap-1 px-3 pb-1.5 section-label">
        Board
        <span className="ml-auto flex items-center gap-1">
          <button
            className={cn(button, 'text-muted-foreground hover:bg-accent/60 hover:text-foreground')}
            disabled={loaded.loading}
            onClick={() => void refresh()}
            title="Reload diagrams/pi-workflows.json"
            type="button"
          >
            <RefreshCwIcon className={cn('h-3.5 w-3.5', loaded.loading && 'animate-spin')} />
          </button>
          <button
            className={cn(
              button,
              dirty && !sending ? 'bg-accent text-foreground hover:bg-accent/70' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
            disabled={!dirty || sending}
            onClick={() => void sendDiff()}
            title="Send the board edits into the conversation"
            type="button"
          >
            <SendIcon className="h-3.5 w-3.5" />
            Send
          </button>
        </span>
      </div>
      {(status || loaded.error) && (
        <div
          className={cn(
            'px-3 pb-1 text-[10.5px]',
            loaded.error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {loaded.error ? errorMessage(loaded.error) : status}
        </div>
      )}
      {Object.keys(board.nodes).length === 0 ? (
        <div className="px-3 py-4 text-[11px] text-muted-foreground">
          No plan board yet — run <code>scripts/plan-diagram.mjs</code> to generate{' '}
          <code>diagrams/pi-workflows.json</code>, then Refresh.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-1">
          <DraggableRenderer
            draggable={boardDraggable}
            height={height}
            state={board}
            width={width}
            onDropState={setBoard}
          />
        </div>
      )}
    </div>
  )
}

export default defineWebExtension({
  panels: [{ id: 'piwboard', title: 'Board', icon: WorkflowIcon, component: BoardPanel, order: 6 }],
  commands: [
    {
      id: 'piwboard.open',
      title: 'Show plan board',
      run: (context) => context.openPanel('piwboard'),
    },
  ],
})
