import { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import type { Session, RagSource } from '../lib/types'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'

const CHIPS = [
  '📝 Explain quantum computing',
  '💻 Write a Python script',
  '🌐 Translate to Portuguese',
  '🧮 Solve a math problem',
  '💡 Brainstorm product ideas',
]

interface ChatViewProps {
  session: Session | null
  generating: boolean
  streamingContent: string
  ragSources: RagSource[]
  onSend: (text: string, images: string[]) => void
  onStop: () => void
  selectedModel: string
}

export function ChatView({
  session,
  generating,
  streamingContent,
  ragSources,
  onSend,
  onStop,
  selectedModel,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [session?.messages.length, streamingContent])

  const messages = session?.messages ?? []
  const isEmpty = messages.length === 0

  const handleChip = (chip: string) => {
    // Strip emoji prefix
    const text = chip.replace(/^[^\s]+\s/, '').trim()
    onSend(text, [])
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto yk-scroll min-h-0">
        {isEmpty ? (
          /* Empty state */
          <div className="h-full flex items-center justify-center px-8">
            <div className="max-w-md text-center space-y-5">
              <div className="mx-auto w-12 h-12 rounded-lg bg-brand flex items-center justify-center shadow-[0_0_24px_rgba(255,214,0,0.25)]">
                <Sparkles size={20} className="text-brand-fg" strokeWidth={2.5} />
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  Local Workstation
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-fg">YellowKode Chat</h1>
                <p className="text-sm text-muted leading-relaxed">
                  Local AI chat powered by Ollama. Text, images, and audio.
                  No API keys. No cost. Nothing leaves your server.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                {CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleChip(chip)}
                    className="bg-panel border border-bdr rounded-full px-3 py-1.5 text-xs font-mono text-muted hover:border-brand/50 hover:text-brand transition"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
            {messages.map((msg, i) => {
              const isLastAssistant =
                msg.role === 'assistant' && i === messages.length - 1
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={generating && isLastAssistant}
                  streamingContent={
                    generating && isLastAssistant ? streamingContent : undefined
                  }
                />
              )
            })}
          </div>
        )}
      </div>

      <InputBar
        onSend={onSend}
        generating={generating}
        onStop={onStop}
        selectedModel={selectedModel}
      />
    </div>
  )
}
