import { useState } from 'react'
import { Check, Copy, Database } from 'lucide-react'
import type { Message, RagSource } from '../lib/types'
import { Markdown } from './Markdown'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  streamingContent?: string
}

export function MessageBubble({ message, isStreaming, streamingContent }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copy = async () => {
    const text = isStreaming ? (streamingContent || '') : message.content
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  const displayContent = isStreaming ? streamingContent : message.content
  const sources: RagSource[] = message.ragSources || []

  return (
    <div className="flex gap-4 msg-appear">
      {/* Avatar */}
      <div
        className={`w-8 h-8 shrink-0 rounded flex items-center justify-center font-bold text-xs mt-0.5 ${
          isUser
            ? 'bg-white/10 text-white/60'
            : 'bg-brand text-brand-fg'
        }`}
      >
        {isUser ? 'U' : 'YK'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        {isUser ? (
          <>
            {/* Image thumbnails */}
            {message.images?.length ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((img, i) => (
                  <img
                    key={i}
                    src={`data:image/png;base64,${img}`}
                    alt={`attached-${i}`}
                    className="max-w-[200px] max-h-[160px] rounded-lg border border-bdr object-cover cursor-pointer hover:opacity-85 transition"
                    onClick={() => {
                      const w = window.open()
                      if (w) w.document.write(`<img src="data:image/png;base64,${img}" style="max-width:100%;"/>`)
                    }}
                  />
                ))}
              </div>
            ) : null}
            <div className="text-[14.5px] leading-relaxed text-fg whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </>
        ) : (
          <>
            {/* RAG badge */}
            {sources.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 rounded px-2 py-0.5 text-[11px] font-mono text-indigo-400 mb-3">
                <Database size={11} />
                {sources.length} source{sources.length > 1 ? 's' : ''} from knowledge base
              </div>
            )}

            {/* Thinking state */}
            {!displayContent ? (
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                Thinking…
              </div>
            ) : (
              <>
                <Markdown content={displayContent} />
                {isStreaming && <span className="stream-cursor" />}
              </>
            )}
          </>
        )}

        {/* Copy button for assistant messages */}
        {!isUser && displayContent && (
          <button
            onClick={copy}
            className="mt-2 flex items-center gap-1 text-[10px] font-mono text-muted hover:text-brand transition"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
