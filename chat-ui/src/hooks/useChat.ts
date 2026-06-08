import { useRef, useState } from 'react'
import type { Message, RagSource, Session } from '../lib/types'

const uid = () => Math.random().toString(36).slice(2, 10)

interface UseChatOptions {
  ragEnabled: boolean
  onSessionUpdate: (updater: (prev: Session[]) => Session[]) => void
  sessions: Session[]
  activeId: string | null
}

export function useChat({ ragEnabled, onSessionUpdate, sessions, activeId }: UseChatOptions) {
  const [generating, setGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [ragSources, setRagSources] = useState<RagSource[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const stop = () => {
    abortRef.current?.abort()
  }

  const send = async (text: string, images: string[], selectedModel: string) => {
    if (generating || (!text.trim() && !images.length)) return
    if (!activeId) return

    const session = sessions.find(s => s.id === activeId)
    if (!session) return

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: text,
      images: images.length ? images : undefined,
      createdAt: Date.now(),
    }

    // Auto-title: use first 45 chars of first user message
    const isFirstMessage = session.messages.length === 0
    const newTitle = isFirstMessage && text
      ? (text.length > 45 ? text.slice(0, 45) + '…' : text)
      : session.title

    const assistantId = uid()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    }

    onSessionUpdate(prev =>
      prev.map(s =>
        s.id === activeId
          ? {
              ...s,
              title: newTitle,
              updatedAt: Date.now(),
              messages: [...s.messages, userMsg, assistantMsg],
            }
          : s
      )
    )

    setGenerating(true)
    setStreamingContent('')
    setRagSources([])

    const ctrl = new AbortController()
    abortRef.current = ctrl

    // Build messages history (before the new user msg was appended to state)
    const historyMessages = session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      ...(m.images?.length ? { images: m.images } : {}),
    }))

    const newUserEntry = {
      role: 'user' as const,
      content: text,
      ...(images.length ? { images } : {}),
    }

    let msgs: { role: string; content: string; images?: string[] }[] = [
      ...historyMessages,
      newUserEntry,
    ]

    let sources: RagSource[] = []
    if (ragEnabled && text.trim()) {
      try {
        const r = await fetch('/api/rag/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, limit: 5 }),
          signal: AbortSignal.timeout(30000),
        })
        if (r.ok) {
          sources = await r.json()
          setRagSources(sources)
          if (sources.length) {
            const ctx = sources
              .map((s, i) => `[${i + 1}] Source: "${s.source_name}"\n${s.text}`)
              .join('\n\n---\n\n')
            msgs = [
              {
                role: 'system',
                content: `You have access to the following context from the knowledge base. Use it to answer accurately. If it's not relevant, use your own knowledge.\n\n${ctx}`,
              },
              ...msgs,
            ]
          }
        }
      } catch {
        // RAG failure is non-fatal
      }
    }

    let accumulated = ''
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: msgs,
          stream: true,
          options: { temperature: 0.7 },
        }),
        signal: ctrl.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const obj = JSON.parse(line)
            if (obj.message?.content) {
              accumulated += obj.message.content
              setStreamingContent(accumulated)
            }
          } catch {
            // skip bad JSON lines
          }
        }
      }

      // Finalize the assistant message
      onSessionUpdate(prev =>
        prev.map(s =>
          s.id === activeId
            ? {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map(m =>
                  m.id === assistantId
                    ? { ...m, content: accumulated, ragSources: sources.length ? sources : undefined }
                    : m
                ),
              }
            : s
        )
      )
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        // Keep partial content on stop
        if (accumulated) {
          onSessionUpdate(prev =>
            prev.map(s =>
              s.id === activeId
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: s.messages.map(m =>
                      m.id === assistantId ? { ...m, content: accumulated } : m
                    ),
                  }
                : s
            )
          )
        }
      } else {
        const is404 = e?.message?.includes('404')
        const errorContent = is404
          ? `⚠ Model is still downloading. Please wait a few minutes and try again.`
          : `⚠ Failed to reach Ollama: ${e?.message ?? 'Unknown error'}\n\nCheck: \`docker compose logs ykchat_ollama\``
        onSessionUpdate(prev =>
          prev.map(s =>
            s.id === activeId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantId ? { ...m, content: errorContent } : m
                  ),
                }
              : s
          )
        )
      }
    } finally {
      setGenerating(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }

  return { generating, streamingContent, ragSources, send, stop }
}
