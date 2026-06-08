import { useEffect, useRef, useState } from 'react'
import { X, Globe, FileText, FileUp, Trash2, RotateCw, Upload } from 'lucide-react'
import type { RagDoc } from '../lib/types'

interface KBPanelProps {
  open: boolean
  onClose: () => void
  ragEnabled: boolean
  onRagToggle: (val: boolean) => void
}

type Tab = 'url' | 'text' | 'pdf'

function useToast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = (message: string) => {
    setMsg(message)
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 2800)
  }

  return { msg, visible, show }
}

export function KBPanel({ open, onClose, ragEnabled, onRagToggle }: KBPanelProps) {
  const [tab, setTab] = useState<Tab>('url')
  const [docs, setDocs] = useState<RagDoc[]>([])
  const [loading, setLoading] = useState(false)

  // URL tab
  const [urlVal, setUrlVal] = useState('')
  const [urlName, setUrlName] = useState('')
  const [urlBusy, setUrlBusy] = useState(false)

  // Text tab
  const [textName, setTextName] = useState('')
  const [textBody, setTextBody] = useState('')
  const [textBusy, setTextBusy] = useState(false)

  // PDF tab
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfDragging, setPdfDragging] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const toast = useToast()

  const loadDocs = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/rag/documents', { signal: AbortSignal.timeout(5000) })
      if (r.ok) setDocs(await r.json())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadDocs()
  }, [open])

  const deleteDoc = async (id: string) => {
    if (!confirm('Remove this document from the knowledge base?')) return
    try {
      await fetch(`/api/rag/documents/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000),
      })
      toast.show('Document removed')
      await loadDocs()
    } catch {
      toast.show('Could not remove document')
    }
  }

  const ingestUrl = async () => {
    if (!urlVal.trim()) { toast.show('Enter a URL'); return }
    setUrlBusy(true)
    try {
      const r = await fetch('/api/rag/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlVal.trim(), name: urlName.trim() || undefined }),
        signal: AbortSignal.timeout(60000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.show(`✓ ${d.name} — ${d.chunks} chunks`)
      setUrlVal('')
      setUrlName('')
      await loadDocs()
    } catch (e: any) {
      toast.show(`Error: ${e.message}`)
    } finally {
      setUrlBusy(false)
    }
  }

  const ingestText = async () => {
    if (!textName.trim() || !textBody.trim()) { toast.show('Name and text are required'); return }
    setTextBusy(true)
    try {
      const r = await fetch('/api/rag/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: textName.trim(), text: textBody.trim() }),
        signal: AbortSignal.timeout(60000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.show(`✓ ${d.name} — ${d.chunks} chunks`)
      setTextName('')
      setTextBody('')
      await loadDocs()
    } catch (e: any) {
      toast.show(`Error: ${e.message}`)
    } finally {
      setTextBusy(false)
    }
  }

  const ingestPdf = async () => {
    if (!selectedPdf) { toast.show('Select a PDF first'); return }
    setPdfBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedPdf, selectedPdf.name)
      const r = await fetch('/api/rag/ingest/pdf', {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(120000),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast.show(`✓ ${d.name} — ${d.chunks} chunks`)
      setSelectedPdf(null)
      await loadDocs()
    } catch (e: any) {
      toast.show(`Error: ${e.message}`)
    } finally {
      setPdfBusy(false)
    }
  }

  const docTypeIcon = (type: RagDoc['type']) => {
    if (type === 'url') return <Globe size={15} className="text-muted shrink-0" />
    if (type === 'pdf') return <FileUp size={15} className="text-muted shrink-0" />
    return <FileText size={15} className="text-muted shrink-0" />
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'url', label: '🌐 URL' },
    { key: 'text', label: '📝 Text' },
    { key: 'pdf', label: '📄 PDF' },
  ]

  return (
    <>
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 h-full w-[420px] bg-panel border-l border-bdr flex flex-col z-50 transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-bdr shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-0.5">
              Knowledge Base
            </div>
            <h2 className="text-sm font-semibold text-fg">RAG Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-bdr bg-accent text-muted hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto yk-scroll p-5 space-y-6">

          {/* Enable RAG toggle */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Settings</div>
            <div className="flex items-center justify-between bg-accent border border-bdr rounded-xl px-4 py-3">
              <div>
                <div className="text-sm font-medium text-fg">Enable RAG</div>
                <div className="text-[11px] font-mono text-muted mt-0.5">
                  Inject knowledge base context into answers
                </div>
              </div>
              {/* Toggle switch */}
              <label className="relative w-11 h-6 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={ragEnabled}
                  onChange={e => onRagToggle(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-full h-full rounded-full border transition-all duration-200 ${
                    ragEnabled
                      ? 'bg-indigo-500/25 border-indigo-500/60'
                      : 'bg-bdr border-bdr'
                  }`}
                />
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                    ragEnabled
                      ? 'left-[calc(100%-22px)] bg-indigo-400'
                      : 'left-0.5 bg-muted'
                  }`}
                />
              </label>
            </div>
          </div>

          {/* Add source */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">Add Source</div>

            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-accent border border-bdr rounded-lg mb-4">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-1.5 text-[11px] font-mono rounded-md transition-all ${
                    tab === t.key
                      ? 'bg-panel text-fg shadow-sm'
                      : 'text-muted hover:text-fg'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* URL tab */}
            {tab === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={urlVal}
                  onChange={e => setUrlVal(e.target.value)}
                  placeholder="https://example.com/page"
                  className="w-full bg-accent border border-bdr rounded-lg px-3 py-2 text-sm font-mono text-fg placeholder:text-muted outline-none focus:border-brand/40 transition"
                />
                <input
                  type="text"
                  value={urlName}
                  onChange={e => setUrlName(e.target.value)}
                  placeholder="Name (optional — defaults to hostname)"
                  className="w-full bg-accent border border-bdr rounded-lg px-3 py-2 text-sm font-mono text-fg placeholder:text-muted outline-none focus:border-brand/40 transition"
                />
                <button
                  onClick={ingestUrl}
                  disabled={urlBusy}
                  className="w-full bg-brand text-brand-fg font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                >
                  {urlBusy ? 'Ingesting…' : 'Add URL'}
                </button>
              </div>
            )}

            {/* Text tab */}
            {tab === 'text' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={textName}
                  onChange={e => setTextName(e.target.value)}
                  placeholder="Document name *"
                  className="w-full bg-accent border border-bdr rounded-lg px-3 py-2 text-sm font-mono text-fg placeholder:text-muted outline-none focus:border-brand/40 transition"
                />
                <textarea
                  value={textBody}
                  onChange={e => setTextBody(e.target.value)}
                  placeholder="Paste text content here…"
                  rows={5}
                  className="w-full bg-accent border border-bdr rounded-lg px-3 py-2 text-sm text-fg placeholder:text-muted outline-none focus:border-brand/40 transition resize-y min-h-[80px]"
                />
                <button
                  onClick={ingestText}
                  disabled={textBusy}
                  className="w-full bg-brand text-brand-fg font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                >
                  {textBusy ? 'Ingesting…' : 'Add Text'}
                </button>
              </div>
            )}

            {/* PDF tab */}
            {tab === 'pdf' && (
              <div className="space-y-2">
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setPdfDragging(true) }}
                  onDragLeave={() => setPdfDragging(false)}
                  onDrop={e => {
                    e.preventDefault()
                    setPdfDragging(false)
                    const f = e.dataTransfer.files[0]
                    if (f?.name.toLowerCase().endsWith('.pdf')) setSelectedPdf(f)
                    else toast.show('Please drop a PDF file')
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    pdfDragging
                      ? 'border-brand bg-brand/5'
                      : 'border-bdr hover:border-brand/50 bg-panel/30'
                  }`}
                >
                  <Upload size={20} className="text-brand" />
                  <div className="text-center">
                    <div className="text-sm font-medium text-fg">
                      Click to select PDF
                    </div>
                    <div className="text-[11px] font-mono text-muted mt-0.5">
                      or drag & drop · max 50 MB
                    </div>
                  </div>
                </div>
                {selectedPdf && (
                  <div className="text-[11px] font-mono text-muted bg-accent border border-bdr rounded-lg px-3 py-2">
                    📄 {selectedPdf.name} ({(selectedPdf.size / 1024 / 1024).toFixed(1)} MB)
                  </div>
                )}
                <button
                  onClick={ingestPdf}
                  disabled={pdfBusy || !selectedPdf}
                  className="w-full bg-brand text-brand-fg font-bold text-[11px] uppercase tracking-wider py-2.5 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                >
                  {pdfBusy ? 'Uploading…' : 'Upload PDF'}
                </button>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setSelectedPdf(f)
                    e.target.value = ''
                  }}
                />
              </div>
            )}
          </div>

          {/* Document list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Knowledge Base
                {docs.length > 0 && (
                  <span className="ml-2 font-mono normal-case text-muted/70">
                    {docs.length} source{docs.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {docs.length > 0 && (
                <button
                  onClick={loadDocs}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-brand transition"
                >
                  <RotateCw size={11} />
                  Refresh
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-[11px] font-mono text-muted text-center py-6">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="text-[11px] font-mono text-muted/60 text-center py-8 border border-dashed border-bdr rounded-lg">
                No documents yet.<br />Add a URL, text, or PDF above.
              </div>
            ) : (
              <ul className="space-y-2">
                {docs.map(doc => (
                  <li
                    key={doc.id}
                    className="bg-accent border border-bdr rounded-lg px-3 py-2.5 flex items-start gap-3"
                  >
                    {docTypeIcon(doc.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-fg truncate">{doc.name}</div>
                      <div className="text-[10px] font-mono text-muted mt-0.5">
                        {doc.chunks} chunk{doc.chunks !== 1 ? 's' : ''} · {new Date(doc.ingested_at).toLocaleDateString()}
                        {doc.url && (
                          <>
                            {' · '}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {(() => { try { return new URL(doc.url!).hostname } catch { return doc.url } })()}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="p-1 rounded hover:bg-white/5 text-muted hover:text-red-400 transition shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Toast inside panel */}
        {toast.visible && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-panel border border-bdr text-fg text-[12px] font-mono px-4 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 toast-show">
            {toast.msg}
          </div>
        )}
      </aside>
    </>
  )
}
