import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Session } from '../lib/types'

interface SidebarProps {
  sessions: Session[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete }: SidebarProps) {
  const [ollamaVersion, setOllamaVersion] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const r = await fetch('/api/version', { signal: AbortSignal.timeout(5000) })
        const d = await r.json()
        if (!cancelled) {
          setOnline(true)
          setOllamaVersion(d.version || 'ok')
        }
      } catch {
        if (!cancelled) {
          setOnline(false)
          setOllamaVersion(null)
        }
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-bdr bg-surface h-full">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-brand rounded flex items-center justify-center shrink-0">
          <div className="w-3.5 h-3.5 bg-black rounded-sm" />
        </div>
        <span className="font-bold tracking-tight text-fg uppercase text-sm">YellowKode</span>
      </div>

      {/* New Chat button */}
      <div className="px-3 pb-3 shrink-0">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand text-brand-fg text-[11px] font-bold uppercase tracking-wider hover:brightness-110 transition"
        >
          <Plus size={13} strokeWidth={2.5} />
          New Chat
        </button>
      </div>

      {/* Sessions label */}
      <div className="px-5 py-1.5 text-[10px] font-bold text-muted uppercase tracking-widest shrink-0">
        Conversations
      </div>

      {/* Sessions list */}
      <nav className="flex-1 overflow-y-auto yk-scroll px-2 py-1 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] font-mono text-muted/60">
            No chats yet
          </div>
        ) : (
          sessions.map(s => {
            const active = s.id === activeId
            return (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`group relative w-full rounded-lg cursor-pointer transition-colors ${
                  active
                    ? 'bg-white/5 border border-bdr'
                    : 'border border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="px-3 py-2 pr-8">
                  <div
                    className={`truncate text-sm ${
                      active ? 'text-fg font-medium' : 'text-muted'
                    }`}
                  >
                    {s.title || 'New Chat'}
                  </div>
                  <div className="text-[10px] text-muted/70 font-mono mt-0.5">
                    {formatRelative(s.updatedAt)} · {s.messages.length} msg{s.messages.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(s.id)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted hover:text-red-400 transition"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </nav>

      {/* Status footer */}
      <div className="p-4 border-t border-bdr shrink-0">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-brand">YK</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-fg truncate">Local Node</p>
            <p
              className={`text-[10px] font-mono truncate ${
                online === null
                  ? 'text-muted'
                  : online
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}
            >
              {online === null
                ? 'Checking Ollama…'
                : online
                ? `Ollama v${ollamaVersion}`
                : 'Ollama offline'}
            </p>
          </div>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              online === null
                ? 'bg-muted/50'
                : online
                ? 'bg-emerald-500 online-dot'
                : 'bg-red-500'
            }`}
          />
        </div>
      </div>
    </aside>
  )
}
