/**
 * Editchat web facet: an Edit affordance on stored user and assistant messages that opens a dialog
 * with the text in a textarea, a diff preview of the edit, and two ways to apply it — send the
 * correction into the conversation, or fork the conversation just before the message with the edit.
 */
import { GitForkIcon, PencilIcon, SendIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import {
  actionRef,
  api,
  cn,
  defineWebExtension,
  errorMessage,
  useExtensionUiState,
  useUltimate,
} from '@/sdk'
import type { EntryRecord } from '@/sdk'
import { Button } from '@/components/ui/button'
import { countChanges, diffRows } from './diff.tsx'
import type { DiffRow } from './diff.tsx'

/** Rows of a text diff, as the edit dialog previews them: kept lines with numbers, gaps between hunks. */
function Diff({ rows }: { rows: readonly DiffRow[] }) {
  const numbered = rows.some((row) => row.old !== undefined || row.new !== undefined)
  const tone = {
    add: 'bg-diff-add/10',
    del: 'bg-diff-del/10',
    context: '',
    gap: 'text-muted-foreground/60',
  } as const
  const sign = { add: '+', del: '−', context: ' ', gap: '' } as const
  return (
    <div className="overflow-auto bg-terminal py-1 font-mono text-[12px] leading-[1.6]">
      <div className="grid min-w-max grid-cols-[auto_auto_auto_1fr]">
        {rows.map((row, index) =>
          row.type === 'gap' ? (
            <div className={cn('col-span-4 px-3', tone[row.type])} key={index}>⋯</div>
          ) : (
            <div className={cn('col-span-4 grid grid-cols-subgrid', tone[row.type])} key={index}>
              <span className="pl-3 text-right text-muted-foreground/50 select-none">
                {numbered ? (row.old ?? '') : ''}
              </span>
              <span className="pl-2 text-right text-muted-foreground/50 select-none">
                {numbered ? (row.new ?? '') : ''}
              </span>
              <span className="pr-1 text-muted-foreground/50 select-none">{sign[row.type]}</span>
              <span className="whitespace-pre-wrap pr-3">{row.text}</span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

// ---- refs (a project extension keeps them here; see extensions/README.md) -----------------------

/** `{ conversationId, entryId, originalText, editedText }` → `{ queued, conversationId }`. */
const SendCorrectionAction = actionRef<
  { conversationId: number; entryId: number; originalText: string; editedText: string },
  { queued: boolean; conversationId: number }
>('editchat', 'sendCorrection')
/** `{ conversationId, entryId, editedText }` → `{ id, started }` or `{ supported: false, reason }`. */
const ForkWithEditAction = actionRef<
  { conversationId: number; entryId: number; editedText: string },
  { id: number; started: boolean } | { supported: false; reason: string }
>('editchat', 'forkWithEdit')

// ---- the message being edited, passed from the hover row to the overlay dialog -------------------

type EditTarget = {
  conversationId: number
  entryId: number
  original: string
  role: 'user' | 'assistant'
}

/** Text of a stored user or assistant message: only its text blocks, never thinking or tool calls. */
function entryText(entry: EntryRecord): string {
  const message = entry.model?.[0]
  if (!message || (message.role !== 'user' && message.role !== 'assistant')) return ''
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) =>
      part && typeof part === 'object' && (part as { type?: string }).type === 'text'
        ? String((part as { text?: unknown }).text ?? '')
        : '',
    )
    .join('')
}

/** The hover-row Edit button; `null` for entries it does not act on. */
function EditButton({ entry }: { entry: EntryRecord }) {
  const [target, setTarget] = useExtensionUiState<EditTarget | null>('edit', null)
  const role = entry.kind === 'pi.user' ? ('user' as const) : entry.kind === 'pi.assistant' ? ('assistant' as const) : null
  const text = role ? entryText(entry) : ''
  if (!role || !text.trim()) return null
  return (
    <button
      aria-label="Edit message"
      title="Edit message"
      type="button"
      onClick={() =>
        setTarget({
          conversationId: Number(entry.conversationId),
          entryId: Number(entry.id),
          original: text,
          role,
        })
      }
    >
      <PencilIcon className="size-3" />
    </button>
  )
}

// ---- the edit dialog ----------------------------------------------------------------------------

function EditDialog() {
  const [target, setTarget] = useExtensionUiState<EditTarget | null>('edit', null)
  const [forkSupported, setForkSupported] = useExtensionUiState<boolean>('forkSupported', true)
  if (!target) return null
  return (
    <div
      aria-label="Edit message"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-6"
      role="dialog"
    >
      <Editor
        forkSupported={forkSupported}
        key={`${target.conversationId}-${target.entryId}`}
        onClose={() => setTarget(null)}
        onForkUnsupported={() => setForkSupported(false)}
        target={target}
      />
    </div>
  )
}

function Editor({
  target,
  onClose,
  forkSupported,
  onForkUnsupported,
}: {
  target: EditTarget
  onClose: () => void
  forkSupported: boolean
  onForkUnsupported: () => void
}) {
  const ultimate = useUltimate()
  const [draft, setDraft] = useState(target.original)
  const [busy, setBusy] = useState<'correct' | 'fork' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dirty = draft !== target.original && draft.trim().length > 0
  const rows = dirty ? diffRows(target.original, draft) : []
  const changes = countChanges(rows)

  async function sendCorrection() {
    setBusy('correct')
    setError(null)
    try {
      await api.action(SendCorrectionAction, {
        conversationId: target.conversationId,
        entryId: target.entryId,
        originalText: target.original,
        editedText: draft,
      })
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  async function forkWithEdit() {
    setBusy('fork')
    setError(null)
    try {
      const result = await api.action(ForkWithEditAction, {
        conversationId: target.conversationId,
        entryId: target.entryId,
        editedText: draft,
      })
      if ('supported' in result) {
        onForkUnsupported()
        setError(result.reason)
        return
      }
      onClose()
      ultimate.switchConversation(result.id, { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg border border-border bg-background p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-[13px]">
          Edit {target.role} message{' '}
          <span className="font-mono text-[11px] text-muted-foreground">
            #{target.entryId} · conversation {target.conversationId}
          </span>
        </span>
        <Button aria-label="Close" className="ml-auto" onClick={onClose} size="icon" variant="ghost">
          <XIcon />
        </Button>
      </div>
      <textarea
        aria-label="Edited message text"
        className="min-h-40 w-full resize-y rounded border border-border bg-terminal p-2 font-mono text-[12px] leading-[1.6] text-foreground outline-none focus:border-brand"
        onChange={(event) => setDraft(event.target.value)}
        value={draft}
      />
      {dirty && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">
            {changes.added} added · {changes.removed} removed
          </span>
          <button
            className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setDraft(target.original)}
            type="button"
          >
            reset to original
          </button>
        </div>
      )}
      {dirty && (
        <div className="max-h-64 overflow-auto rounded border border-border/70">
          <Diff rows={rows} />
        </div>
      )}
      {error && <p className="text-[12px] text-error">{error}</p>}
      <div className="flex items-center gap-2">
        <Button disabled={!dirty || busy !== null} onClick={() => void sendCorrection()} size="sm">
          <SendIcon />
          Send as correction
        </Button>
        {forkSupported && (
          <Button
            disabled={!dirty || busy !== null}
            onClick={() => void forkWithEdit()}
            size="sm"
            variant="outline"
          >
            <GitForkIcon />
            Fork with edit
          </Button>
        )}
        <span className={cn('ml-auto font-mono text-[11px] text-muted-foreground')}>
          {busy === 'correct' && 'sending…'}
          {busy === 'fork' && 'forking…'}
        </span>
      </div>
    </div>
  )
}

export default defineWebExtension({
  messageActions: [EditButton],
  slots: { overlay: [EditDialog] },
})
