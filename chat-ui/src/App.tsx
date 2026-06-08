import { useEffect, useRef, useState } from 'react'
import type { Session } from './lib/types'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { ChatView } from './components/ChatView'
import { KBPanel } from './components/KBPanel'
import { useChat } from './hooks/useChat'

const LS_KEY = 'yk_chat_sessions'
const uid = () => Math.random().toString(36).slice(2, 10)
const DEFAULT_MODEL = 'gemma4:e4b'

function migrateSession(s: any): Session {
  const toTs = (v: any) => {
    if (typeof v === 'number') return v
    if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? Date.now() : t }
    return Date.now()
  }
  return {
    id: s.id || Math.random().toString(36).slice(2),
    title: s.title || 'Chat',
    model: s.model || DEFAULT_MODEL,
    createdAt: toTs(s.createdAt ?? s.created_at),
    updatedAt: toTs(s.updatedAt ?? s.updated_at),
    messages: (s.messages || []).map((m: any) => ({
      id: m.id || Math.random().toString(36).slice(2),
      role: m.role,
      content: m.content || '',
      images: m.images || [],
      createdAt: toTs(m.createdAt ?? m.created_at),
    })),
  }
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(migrateSession) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: Session[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sessions))
}

function createSession(model: string): Session {
  return {
    id: uid(),
    title: 'New Chat',
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  }
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const loaded = loadSessions()
    if (loaded.length === 0) {
      const s = createSession(DEFAULT_MODEL)
      return [s]
    }
    return loaded
  })

  const [activeId, setActiveId] = useState<string>(() => {
    const loaded = loadSessions()
    return loaded.length > 0 ? loaded[0].id : ''
  })

  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [ragEnabled, setRagEnabled] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)

  // Initialize activeId if empty
  useEffect(() => {
    if (!activeId && sessions.length > 0) {
      setActiveId(sessions[0].id)
    }
  }, [])

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  // Fetch models from Ollama
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const r = await fetch('/api/tags', { signal: AbortSignal.timeout(5000) })
        if (!r.ok) return
        const d = await r.json()
        const names: string[] = (d.models || []).map((m: any) => m.name || m.model || '').filter(Boolean)
        if (names.length) {
          setModels(names)
          // Keep selected model if it exists, otherwise pick first
          setSelectedModel(prev => names.includes(prev) ? prev : names[0])
        }
      } catch {
        // Ollama not reachable — use defaults
      }
    }
    fetchModels()
  }, [])

  // Fetch RAG settings
  useEffect(() => {
    const fetchRagSettings = async () => {
      try {
        const r = await fetch('/api/rag/settings', { signal: AbortSignal.timeout(5000) })
        if (!r.ok) return
        const d = await r.json()
        setRagEnabled(!!d.rag_enabled)
      } catch {
        // RAG not available
      }
    }
    fetchRagSettings()
  }, [])

  const updateSessions = (updater: (prev: Session[]) => Session[]) => {
    setSessions(prev => {
      const next = updater(prev)
      saveSessions(next)
      return next
    })
  }

  const { generating, streamingContent, ragSources, send, stop } = useChat({
    ragEnabled,
    onSessionUpdate: updateSessions,
    sessions,
    activeId,
  })

  const activeSession = sessions.find(s => s.id === activeId) ?? null

  const handleNew = () => {
    const s = createSession(selectedModel)
    setSessions(prev => {
      const next = [s, ...prev]
      saveSessions(next)
      return next
    })
    setActiveId(s.id)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this conversation?')) return
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (next.length === 0) {
        const fresh = createSession(selectedModel)
        saveSessions([fresh])
        setActiveId(fresh.id)
        return [fresh]
      }
      saveSessions(next)
      if (activeId === id) setActiveId(next[0].id)
      return next
    })
  }

  const handleSelect = (id: string) => {
    setActiveId(id)
  }

  const handleSend = (text: string, images: string[]) => {
    if (!activeId) return
    send(text, images, selectedModel)
  }

  const handleExport = () => {
    if (!activeSession) { showGlobalToast('No session selected'); return }
    const blob = new Blob([JSON.stringify(activeSession, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yk-chat-${activeSession.id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showGlobalToast('Session exported')
  }

  const handleClear = () => {
    if (!activeSession) return
    if (!confirm('Clear this conversation?')) return
    updateSessions(prev =>
      prev.map(s => s.id === activeId ? { ...s, messages: [], updatedAt: Date.now() } : s)
    )
    showGlobalToast('Cleared')
  }

  const handleRagToggle = async (val: boolean) => {
    try {
      await fetch('/api/rag/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rag_enabled: val }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Ignore, update UI anyway
    }
    setRagEnabled(val)
    showGlobalToast(val ? '📚 RAG enabled' : 'RAG disabled')
  }

  const showGlobalToast = (msg: string) => {
    const el = document.getElementById('yk-toast')
    if (!el) return
    el.textContent = msg
    el.classList.remove('toast-hide')
    el.classList.add('toast-show')
    clearTimeout((el as any)._t)
    ;(el as any)._t = setTimeout(() => {
      el.classList.remove('toast-show')
      el.classList.add('toast-hide')
    }, 2500)
  }

  return (
    <div className="flex h-screen bg-surface text-fg overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
        <Header
          session={activeSession}
          selectedModel={selectedModel}
          models={models}
          onModelChange={setSelectedModel}
          onToggleKB={() => setKbOpen(o => !o)}
          ragEnabled={ragEnabled}
          onExport={handleExport}
          onClear={handleClear}
        />
        <div className="flex-1 min-h-0">
          <ChatView
            session={activeSession}
            generating={generating}
            streamingContent={streamingContent}
            ragSources={ragSources}
            onSend={handleSend}
            onStop={stop}
            selectedModel={selectedModel}
          />
        </div>
      </main>

      {/* KB Panel overlay */}
      {kbOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-40"
          onClick={() => setKbOpen(false)}
        />
      )}

      {/* KB Panel */}
      <KBPanel
        open={kbOpen}
        onClose={() => setKbOpen(false)}
        ragEnabled={ragEnabled}
        onRagToggle={handleRagToggle}
      />

      {/* Global toast */}
      <div
        id="yk-toast"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-panel border border-bdr text-fg text-[12px] font-mono px-4 py-2 rounded-lg shadow-xl pointer-events-none z-[100] opacity-0 whitespace-nowrap"
        style={{ transition: 'opacity 0.2s, transform 0.2s' }}
      />
    </div>
  )
}
