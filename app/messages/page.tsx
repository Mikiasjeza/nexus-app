'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import AppPageShell from '@/components/Layout/AppPageShell'
import PageHeader from '@/components/Layout/PageHeader'
import Button from '@/components/UI/Button'
import Loader from '@/components/UI/Loader'

type ConversationRow = {
  id: string
  side: 'company' | 'candidate'
  with: string
  preview: string
  lastMessageAt: string
  unread: boolean
}
type Thread = {
  id: string
  side: 'company' | 'candidate'
  with: { name: string; href: string }
  messages: { id: string; body: string; createdAt: string; mine: boolean }[]
}

const MAX_MESSAGE = 4000

function Messages() {
  const router = useRouter()
  const params = useSearchParams()
  const selected = params.get('c')
  // Employers starting a new conversation: /messages?to=<candidate id>&name=<their name>
  const newTo = params.get('to')
  const newName = params.get('name') ?? 'this candidate'

  const [list, setList] = useState<ConversationRow[] | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  const loadList = useCallback(async () => {
    const res = await fetch('/api/messages', { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    setList(res.ok ? data.conversations : [])
  }, [])

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}`, { credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setThread(data)
    else setError(data.error || 'Could not open this conversation')
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    setThread(null)
    setError('')
    if (selected) loadThread(selected).then(loadList)
  }, [selected, loadThread, loadList])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [thread?.messages.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          selected ? { conversationId: selected, body: draft } : { candidateId: newTo, body: draft }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send')
      setDraft('')
      if (selected) {
        await loadThread(selected)
        await loadList()
      } else {
        router.replace(`/messages?c=${data.conversationId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const composing = Boolean(selected || newTo)

  return (
    <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Conversations" className={composing ? 'hidden lg:block' : ''}>
        {!list ? (
          <Loader />
        ) : list.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No messages yet. Companies can message you after you apply, or if you&apos;re open to
            employers.
          </p>
        ) : (
          <ul className="ruled-list border-y border-line">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/messages?c=${c.id}`}
                  aria-current={c.id === selected ? 'page' : undefined}
                  className={`block py-3 pr-2 transition-colors hover:bg-raised ${c.id === selected ? 'bg-raised' : ''}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate ${c.unread ? 'font-semibold text-ink' : 'text-ink'}`}
                    >
                      {c.unread && <span className="sr-only">Unread: </span>}
                      {c.with}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {formatDistanceToNowStrict(new Date(c.lastMessageAt))}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-muted">{c.preview}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <section aria-label="Conversation" className={composing ? '' : 'hidden lg:block'}>
        {!composing ? (
          <p className="text-ink-muted">Choose a conversation.</p>
        ) : selected && !thread ? (
          error ? (
            <p className="text-critical">{error}</p>
          ) : (
            <Loader />
          )
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <h2 className="text-lg font-medium">
                {thread ? (
                  <Link href={thread.with.href} className="hover:underline">
                    {thread.with.name}
                  </Link>
                ) : (
                  `New message to ${newName}`
                )}
              </h2>
              <Link href="/messages" className="text-sm text-ink-faint hover:text-ink lg:hidden">
                All messages
              </Link>
            </div>

            <ol className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {thread?.messages.map((m) => (
                <li key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] whitespace-pre-line px-4 py-2.5 text-sm ${m.mine ? 'bg-ink text-ground' : 'border border-rule bg-raised text-ink'}`}
                  >
                    {m.body}
                    <span className="mt-1 block text-[0.7rem] opacity-60">
                      {formatDistanceToNowStrict(new Date(m.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
              <div ref={bottom} />
            </ol>

            <form onSubmit={send} className="mt-6 space-y-3">
              <label className="sr-only" htmlFor="message-draft">
                Message
              </label>
              <textarea
                id="message-draft"
                rows={3}
                maxLength={MAX_MESSAGE}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(e)
                }}
                placeholder="Write a message"
                className="metalab-input resize-y py-2"
              />
              {error && (
                <p role="alert" className="text-sm text-critical">
                  {error}
                </p>
              )}
              <Button type="submit" isLoading={sending} disabled={sending || !draft.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

/** Messages between companies and candidates. */
export default function MessagesPage() {
  return (
    <AppPageShell>
      <div className="page-shell">
        <PageHeader
          title="Messages"
          rule
          description="Private conversations between companies and candidates."
        />
        <Suspense fallback={<Loader />}>
          <Messages />
        </Suspense>
      </div>
    </AppPageShell>
  )
}
