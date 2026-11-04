/**
 * Line diff for message corrections, shared by both facets: `diffRows` feeds the edit dialog's
 * preview and `unifiedDiff` composes the patch the correction carries. Pure functions, no imports.
 */

export interface DiffRow {
  type: 'add' | 'del' | 'context' | 'gap'
  text: string
  old?: number
  new?: number
}

type Op = { type: 'context' | 'del' | 'add'; text: string; a?: number; b?: number }

/**
 * Longest-common-subsequence line diff of two texts. `cap` bounds the DP table; past it the
 * texts are shown as one whole replace instead of a diff (message-sized texts never get there).
 */
function lineOps(oldText: string, newText: string, cap = 400_000): Op[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  if (a.length * b.length > cap)
    return [
      ...a.map((text, index) => ({ type: 'del' as const, text, a: index + 1 })),
      ...b.map((text, index) => ({ type: 'add' as const, text, b: index + 1 })),
    ]
  const n = a.length
  const m = b.length
  const table: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'context', text: a[i], a: i + 1, b: j + 1 })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ type: 'del', text: a[i], a: i + 1 })
      i++
    } else {
      ops.push({ type: 'add', text: b[j], b: j + 1 })
      j++
    }
  }
  while (i < n) {
    ops.push({ type: 'del', text: a[i], a: i + 1 })
    i++
  }
  while (j < m) {
    ops.push({ type: 'add', text: b[j], b: j + 1 })
    j++
  }
  return ops
}

/** Which ops a hunk keeps: every change plus `context` unchanged lines around it. */
function keepMask(ops: readonly Op[], context: number): boolean[] {
  const keep = new Array<boolean>(ops.length).fill(false)
  ops.forEach((op, index) => {
    if (op.type === 'context') return
    for (let around = index - context; around <= index + context; around++)
      if (around >= 0 && around < ops.length) keep[around] = true
  })
  return keep
}

/**
 * Rows for the diff preview: kept lines with their old and new numbers, runs of dropped
 * unchanged lines folding into one `gap` row.
 */
export function diffRows(oldText: string, newText: string, context = 3): DiffRow[] {
  const ops = lineOps(oldText, newText)
  const keep = keepMask(ops, context)
  const rows: DiffRow[] = []
  let gap = false
  ops.forEach((op, index) => {
    if (!keep[index]) {
      gap = rows.length > 0
      return
    }
    if (gap) rows.push({ type: 'gap', text: '' })
    gap = false
    if (op.type === 'del') rows.push({ type: 'del', text: op.text, old: op.a })
    else if (op.type === 'add') rows.push({ type: 'add', text: op.text, new: op.b })
    else rows.push({ type: 'context', text: op.text, old: op.a, new: op.b })
  })
  return rows
}

/** Added and removed line counts of a preview. */
export function countChanges(rows: readonly DiffRow[]) {
  return {
    added: rows.filter((row) => row.type === 'add').length,
    removed: rows.filter((row) => row.type === 'del').length,
  }
}

/** Standard unified diff of two texts; '' when they are identical. */
export function unifiedDiff(oldText: string, newText: string, label = 'message', context = 3): string {
  const ops = lineOps(oldText, newText)
  if (!ops.some((op) => op.type !== 'context')) return ''
  const changed = ops
    .map((op, index) => (op.type !== 'context' ? index : -1))
    .filter((index) => index >= 0)
  // One hunk per group of changes whose gap stays under 2·context; a wider gap starts the next.
  const groups: Array<[number, number]> = []
  for (const index of changed) {
    const last = groups[groups.length - 1]
    if (last && index - last[1] <= 2 * context) last[1] = index
    else groups.push([index, index])
  }
  const out: string[] = [`--- a/${label}`, `+++ b/${label}`]
  for (const [first, last] of groups) {
    const from = Math.max(0, first - context)
    const to = Math.min(ops.length - 1, last + context)
    const slice = ops.slice(from, to + 1)
    const aCount = slice.filter((op) => op.type !== 'add').length
    const bCount = slice.filter((op) => op.type !== 'del').length
    const aStart = slice.find((op) => op.type !== 'add')?.a ?? 0
    const bStart = slice.find((op) => op.type !== 'del')?.b ?? 0
    out.push(`@@ -${aStart},${aCount} +${bStart},${bCount} @@`)
    for (const op of slice) {
      if (op.type === 'context') out.push(` ${op.text}`)
      else if (op.type === 'del') out.push(`-${op.text}`)
      else out.push(`+${op.text}`)
    }
  }
  return out.join('\n')
}
