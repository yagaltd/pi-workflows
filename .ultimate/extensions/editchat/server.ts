/**
 * Editchat server facet: the `sendCorrection` and `forkWithEdit` actions behind the edit dialog.
 * Minimal-import discipline like ../piw: one bare runtime import (a package of the clone) plus the
 * local diff helper; every host capability is reached through the `ctx` the action receives.
 */
import { BACKGROUND_CONTEXT as context } from '@earendil-works/chord/context'
import { unifiedDiff } from './diff.tsx'

// ---- structural types for the host surface this facet uses (no runtime imports) -----------------

interface EntryRecord {
  readonly id: number
  readonly conversationId: number
  readonly kind: string
  readonly model?: readonly { readonly role: string; readonly content: unknown }[]
}

interface EntryDraft {
  readonly kind: string
  readonly model?: readonly Record<string, unknown>[]
}

interface Tx {
  entry(id: number): Promise<EntryRecord | undefined>
  scanEntries(query: Record<string, unknown>, limit: number): Promise<{ items: EntryRecord[] }>
  forkConversation(parent: number, at: number, options: { ownership: Record<string, unknown> }): Promise<{ id: number }>
  appendEntry(conversationId: number, value: EntryDraft): Promise<EntryRecord>
  doc(token: unknown, conversationId: number): Promise<Record<string, unknown> | undefined>
}

interface ConversationHandle {
  submit(draft: Record<string, unknown>, context: unknown): Promise<{ id?: number } | undefined>
}

interface Host {
  harness(): {
    commit<T>(change: (tx: Tx) => T | Promise<T>, context: unknown): Promise<T>
    resume(): void
    conversation(id: number, context: unknown): Promise<ConversationHandle | undefined>
  }
  metadata: unknown
}

interface Context {
  host?: Host
  conversationId?: number
  signal?: AbortSignal
}

// ---- argument helpers ---------------------------------------------------------------------------

function readArgs(args: unknown): Record<string, unknown> {
  return args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
}

function readEntryId(args: Record<string, unknown>): number {
  const id = args.entryId
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
    throw new Error('Expected { entryId } to be a positive entry number')
  return id
}

function readEditedText(args: Record<string, unknown>): string {
  const text = args.editedText
  if (typeof text !== 'string' || !text.trim()) throw new Error('Expected nonempty { editedText }')
  return text
}

function readConversationId(args: Record<string, unknown>, ctx: Context): number {
  const id = ctx?.conversationId ?? args.conversationId
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)
    throw new Error('Open editchat on the conversation you are correcting')
  return id
}

function excerpt(text: string, max = 500): string {
  const single = text.replace(/\s+\n/g, '\n').trim()
  return single.length > max ? `${single.slice(0, max)}… [${single.length - max} more characters]` : single
}

/** Editable message of an entry: its first model message, when it is a user or assistant turn. */
function readMessage(entry: EntryRecord): { role: 'user' | 'assistant' } | undefined {
  const role = entry.model?.[0]?.role
  return role === 'user' || role === 'assistant' ? { role } : undefined
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content
      .map((part) => (part && typeof part === 'object' && (part as { type?: string }).type === 'text' ? String((part as { text?: unknown }).text ?? '') : ''))
      .join('')
  return ''
}

// ---- actions ------------------------------------------------------------------------------------

/** The actions of `web.tsx`; each returns small JSON and throws with a message the UI can show. */
export const actions = {
  /**
   * `{ conversationId?, entryId, originalText, editedText }` → `{ queued, conversationId }`.
   * Composes the correction (entry, excerpt, unified diff) and submits it as an input into the
   * conversation, addressed to the agent; queues as a follow-up while it is busy.
   */
  async sendCorrection(args: unknown, ctx: Context) {
    const record = readArgs(args)
    const entryId = readEntryId(record)
    const editedText = readEditedText(record)
    const conversationId = readConversationId(record, ctx)
    const host = ctx?.host
    if (typeof host?.harness !== 'function') throw new Error('editchat needs a harness on this Ultimate build')
    const handle = await host.harness().conversation(conversationId, context)
    if (!handle) throw new Error(`Conversation #${conversationId} is not open`)
    const diff = unifiedDiff(String(record.originalText ?? ''), editedText, `entry-${entryId}`)
    const text = [
      `[editchat] Correction from the user for entry #${entryId} of this conversation.`,
      'Treat the edited text below as replacing the original for everything that follows.',
      '',
      `Original (entry #${entryId}, excerpt):`,
      excerpt(textOf(record.originalText)),
      '',
      'Edited:',
      editedText.trim(),
      ...(diff ? ['', 'Unified diff:', diff] : []),
    ].join('\n')
    const submission = await handle.submit({ type: 'input', content: text, whenBusy: 'followUp' }, context)
    return { queued: true, conversationId, submissionId: submission?.id ?? null }
  },

  /**
   * `{ conversationId?, entryId, editedText }` → `{ id, started }`, or `{ supported: false, reason }`
   * when this build cannot fork. Forks the conversation just before the edited entry and carries the
   * edit: a user message starts the fork's run with the corrected input; an assistant message is
   * appended as the fork's corrected reply, ready for the next input without starting a run.
   */
  async forkWithEdit(args: unknown, ctx: Context) {
    const record = readArgs(args)
    const entryId = readEntryId(record)
    const editedText = readEditedText(record)
    const conversationId = readConversationId(record, ctx)
    const host = ctx?.host
    const harness = typeof host?.harness === 'function' ? host.harness() : undefined
    if (!harness || typeof harness.commit !== 'function' || typeof harness.conversation !== 'function')
      return { supported: false as const, reason: 'This Ultimate build exposes no harness to fork with' }
    const metadataToken = host?.metadata
    const { forkId, role } = await harness.commit(async (tx) => {
      const entry = await tx.entry(entryId)
      if (!entry || entry.conversationId !== conversationId)
        throw new Error(`Entry #${entryId} is not in conversation #${conversationId}`)
      const message = readMessage(entry)
      if (!message) throw new Error(`Entry #${entryId} carries no editable user or assistant message`)
      const before = await tx.scanEntries({ conversationId, maxEntryId: entryId - 1, order: 'descending' }, 1)
      const at = before.items[0]?.id
      if (at === undefined)
        throw new Error('This is the conversation’s first entry; there is nothing to fork before it — use Send as correction')
      const fork = await tx.forkConversation(conversationId, at, { ownership: { kind: 'ownerless' } })
      const metadata = await tx.doc(metadataToken, fork.id)
      if (metadata) Object.assign(metadata, { title: 'Edit branch', label: 'editchat' })
      if (message.role === 'assistant') {
        // The corrected reply becomes the fork's last turn: ready for the next input, no run started.
        const original = entry.model?.[0] as Record<string, unknown> | undefined
        await tx.appendEntry(fork.id, {
          kind: 'pi.assistant',
          model: [
            {
              ...(original ?? {}),
              role: 'assistant',
              content: [{ type: 'text', text: editedText }],
              timestamp: Date.now(),
            },
          ],
        })
      }
      return { forkId: fork.id, role: message.role }
    }, context)
    harness.resume()
    if (role === 'user') {
      const handle = await harness.conversation(forkId, context)
      if (!handle) throw new Error(`Fork #${forkId} is not open to receive the edited message`)
      await handle.submit({ type: 'input', content: editedText }, context)
    }
    return { id: forkId, started: role === 'user' }
  },
}
