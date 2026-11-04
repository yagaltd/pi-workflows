/** piwboard in the browser: the plan-board shapes and the two actions the panel calls. Browser-safe. */
import { actionRef } from '@/sdk'

/** One task from scripts/plan-diagram.mjs: a SeeCode flowchart node on its grid cell. */
export type BoardNode = {
  id: string
  label: string
  sub?: string
  row: number
  col: number
  shape?: string
}
/** `[from, to]` or `[from, to, label]`, node ids as plan-diagram emits them. */
export type BoardEdge = [string, string] | [string, string, string]
/** `diagrams/pi-workflows.json` as plan-diagram.mjs writes it (SeeCode flowchart JSON). */
export type Board = {
  type: 'flowchart'
  title?: string
  nodes: BoardNode[]
  edges: BoardEdge[]
}
/** One board node as the panel edits it: free position in px plus its texts, keyed by node id. */
export type EditedNode = { label: string; sub: string; x: number; y: number }
/** The board state the panel diffs: positions and labels, plus the edge list as-is. */
export type BoardState = {
  nodes: Record<string, EditedNode>
  edges: BoardEdge[]
}
/** The structured diff sendBoardDiff returns; `count` gates the send button. */
export type BoardDiff = {
  count: number
  moved: { id: string; from: string; to: string }[]
  relabeled: { id: string; from: string; to: string }[]
  added: { id: string; at: string }[]
  removed: string[]
  edges: { added: string[]; removed: string[]; relabeled: string[] }
}
/** `{ original, edited }` → `{ text, summary, diff }`: board edits formatted for the agent. */
export const SendBoardDiffAction = actionRef<
  { original: BoardState; edited: BoardState },
  { text: string; summary: string; diff: BoardDiff }
>('piwboard', 'sendBoardDiff')
/** `null` → the plan board read from the project's `diagrams/pi-workflows.json`. */
export const GetBoardAction = actionRef<null, Board>('piwboard', 'getBoard')
