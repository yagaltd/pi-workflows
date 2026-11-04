/** pi-workflows project extension — the plan board: read diagrams/pi-workflows.json and diff board edits for the agent. */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Board, BoardState } from './refs.ts'

/**
 * Grid geometry on the board panel; web.tsx lays nodes out with the same numbers
 * (`x = PAD_X + col * COL_W`, `y = PAD_Y + row * ROW_H`). Kept in sync by hand.
 */
const GRID = { colW: 260, rowH: 120, padX: 40, padY: 40 } as const

/** Best-effort grid cell for a free-dragged px position (the board, not the canvas, is the contract). */
function cell(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.round((x - GRID.padX) / GRID.colW),
    row: Math.round((y - GRID.padY) / GRID.rowH),
  }
}

const spot = (x: number, y: number) => {
  const { col, row } = cell(x, y)
  return `col ${col},row ${row} (${Math.round(x)},${Math.round(y)}px)`
}

/** Parse an action argument into a board state; throws a readable error when it is not one. */
function asBoardState(value: unknown, side: string): BoardState {
  if (typeof value !== 'object' || value === null) throw new Error(`${side} must be a board state`)
  const { nodes, edges } = value as Record<string, unknown>
  if (typeof nodes !== 'object' || nodes === null) throw new Error(`${side}.nodes must be an object`)
  if (!Array.isArray(edges)) throw new Error(`${side}.edges must be an array`)
  for (const node of Object.values(nodes)) {
    const n = node as Record<string, unknown>
    if (
      typeof n !== 'object' ||
      n === null ||
      typeof n.label !== 'string' ||
      typeof n.sub !== 'string' ||
      typeof n.x !== 'number' ||
      typeof n.y !== 'number'
    )
      throw new Error(`${side}.nodes entries need { label, sub, x, y }`)
  }
  return { nodes: nodes as BoardState['nodes'], edges: edges as BoardState['edges'] }
}

const edgeKey = (edge: readonly [string, string] | readonly [string, string, string]) =>
  `${edge[0]}->${edge[1]}`
const edgeText = (edge: readonly [string, string] | readonly [string, string, string]) =>
  edge.length > 2 && edge[2] ? edge[2] : ''

export const actions = {
  /** `null` → the plan board (SeeCode flowchart JSON) from the project's `diagrams/pi-workflows.json`. */
  getBoard: async (_args: unknown, ctx: { host: { projectRoot: string } }) => {
    const file = path.join(ctx.host.projectRoot, 'diagrams', 'pi-workflows.json')
    let raw: string
    try {
      raw = await readFile(file, 'utf8')
    } catch {
      throw new Error(`No plan board at diagrams/pi-workflows.json — run scripts/plan-diagram.mjs first`)
    }
    const board = JSON.parse(raw) as Board
    if (board?.type !== 'flowchart' || !Array.isArray(board.nodes) || !Array.isArray(board.edges))
      throw new Error('diagrams/pi-workflows.json is not a flowchart board')
    return board
  },

  /**
   * `{ original, edited }` → `{ text, summary, diff }`: what changed between the board the panel loaded and the
   * board as edited (nodes moved, relabeled, added, removed; edges added, removed, relabeled). `text` is
   * agent-ready markdown (empty when `count` is 0) that the panel submits into the conversation.
   */
  sendBoardDiff: async (args: unknown) => {
    const { original, edited } = (args ?? {}) as Record<string, unknown>
    const before = asBoardState(original, 'original')
    const after = asBoardState(edited, 'edited')

    const moved: BoardDiffMove[] = []
    const relabeled: BoardDiffRelabel[] = []
    const added: BoardDiffAdd[] = []
    const removed: string[] = []
    for (const [id, node] of Object.entries(after.nodes)) {
      const was = before.nodes[id]
      if (!was) {
        added.push({ id, at: spot(node.x, node.y) })
        continue
      }
      if (was.label !== node.label || was.sub !== node.sub) {
        const label =
          was.sub === node.sub
            ? `${JSON.stringify(was.label)} → ${JSON.stringify(node.label)}`
            : `${JSON.stringify(`${was.label} / ${was.sub}`)} → ${JSON.stringify(`${node.label} / ${node.sub}`)}`
        relabeled.push({ id, from: was.label, to: node.label, text: label })
      }
      if (Math.abs(was.x - node.x) > 0.5 || Math.abs(was.y - node.y) > 0.5)
        moved.push({ id, from: spot(was.x, was.y), to: spot(node.x, node.y) })
    }
    for (const id of Object.keys(before.nodes)) if (!after.nodes[id]) removed.push(id)

    const beforeEdges = new Map(before.edges.map((e) => [edgeKey(e), edgeText(e)]))
    const afterEdges = new Map(after.edges.map((e) => [edgeKey(e), edgeText(e)]))
    const edgesAdded = [...afterEdges.keys()].filter((k) => !beforeEdges.has(k))
    const edgesRemoved = [...beforeEdges.keys()].filter((k) => !afterEdges.has(k))
    const edgesRelabeled = [...afterEdges].filter(
      ([k, label]) => beforeEdges.has(k) && beforeEdges.get(k) !== label,
    )

    const count =
      moved.length +
      relabeled.length +
      added.length +
      removed.length +
      edgesAdded.length +
      edgesRemoved.length +
      edgesRelabeled.length
    if (count === 0) return { text: '', summary: 'no changes', diff: { count, moved: [], relabeled: [], added: [], removed: [], edges: { added: [], removed: [], relabeled: [] } } }

    const lines: string[] = []
    for (const m of moved) lines.push(`- move ${m.id}: ${m.from} → ${m.to}`)
    for (const r of relabeled) lines.push(`- relabel ${r.id}: ${r.text}`)
    for (const a of added) lines.push(`- add ${a.id} at ${a.at}`)
    for (const id of removed) lines.push(`- remove ${id}`)
    for (const k of edgesAdded) lines.push(`- edge add ${k}`)
    for (const k of edgesRemoved) lines.push(`- edge remove ${k}`)
    for (const [k, label] of edgesRelabeled)
      lines.push(`- edge relabel ${k}: ${JSON.stringify(beforeEdges.get(k) ?? '')} → ${JSON.stringify(label)}`)
    lines.sort()

    const title = `Plan board edits (${count} change${count === 1 ? '' : 's'})`
    const text = `## ${title}\n\n${lines.join('\n')}\n\n(Edit made on the piwboard panel; coordinates are col/row grid cells of the board layout, px positions in parentheses. Edges reference node ids.)`
    return {
      text,
      summary: title,
      diff: {
        count,
        moved,
        relabeled: relabeled.map(({ id, from, to }) => ({ id, from, to })),
        added,
        removed,
        edges: { added: edgesAdded, removed: edgesRemoved, relabeled: edgesRelabeled.map(([k]) => k) },
      },
    }
  },
}

type BoardDiffMove = { id: string; from: string; to: string }
type BoardDiffRelabel = { id: string; from: string; to: string; text: string }
type BoardDiffAdd = { id: string; at: string }
