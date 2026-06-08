import { Download, Trash2, Database } from 'lucide-react'
import type { Session } from '../lib/types'

interface HeaderProps {
  session: Session | null
  selectedModel: string
  models: string[]
  onModelChange: (model: string) => void
  onToggleKB: () => void
  ragEnabled: boolean
  onExport: () => void
  onClear: () => void
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString()
}

export function Header({
  session,
  selectedModel,
  models,
  onModelChange,
  onToggleKB,
  ragEnabled,
  onExport,
  onClear,
}: HeaderProps) {
  const msgCount = session?.messages.length ?? 0

  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-bdr shrink-0 bg-surface/80 backdrop-blur">
      {/* Left: session info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-fg truncate">
          {session?.title || 'YellowKode Chat'}
        </span>
        {session && (
          <span className="text-[10px] font-mono text-muted">
            #{session.id.slice(0, 8)} · {formatDate(session.createdAt)} · {msgCount} message{msgCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {/* Model select */}
        <select
          value={selectedModel}
          onChange={e => onModelChange(e.target.value)}
          className="bg-accent border border-bdr text-brand text-[11px] font-mono px-2 py-1 rounded-lg outline-none focus:border-brand/50 transition cursor-pointer"
        >
          {models.length === 0 && (
            <option value={selectedModel}>{selectedModel}</option>
          )}
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* KB / RAG toggle button */}
        <button
          onClick={onToggleKB}
          title="Knowledge Base · RAG"
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
            ragEnabled
              ? 'border-indigo-500/60 text-indigo-400 bg-indigo-500/10'
              : 'border-bdr text-muted bg-accent hover:border-brand/50 hover:text-brand'
          }`}
        >
          <Database size={14} />
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          title="Export chat as JSON"
          className="w-8 h-8 rounded-lg border border-bdr bg-accent text-muted hover:border-brand/50 hover:text-brand flex items-center justify-center transition"
        >
          <Download size={14} />
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          title="Clear conversation"
          className="w-8 h-8 rounded-lg border border-bdr bg-accent text-muted hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </header>
  )
}
