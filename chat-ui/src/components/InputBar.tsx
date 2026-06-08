import { useRef, useState, useEffect } from 'react'
import { ArrowUp, Square, Image, Mic, MicOff, X } from 'lucide-react'

interface InputBarProps {
  onSend: (text: string, images: string[]) => void
  generating: boolean
  onStop: () => void
  disabled?: boolean
  selectedModel?: string
}

interface ImageItem {
  b64: string
  mime: string
  name: string
}

export function InputBar({ onSend, generating, onStop, disabled, selectedModel }: InputBarProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecRef = useRef<MediaRecorder | null>(null)

  // Auto-resize textarea
  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  useEffect(() => {
    resize()
  }, [text])

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      let found = false
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue
          const b64 = await toB64(file)
          setImages(prev => [...prev, { b64, mime: file.type, name: 'pasted-image.png' }])
          found = true
        }
      }
      if (found) showToast('Image pasted')
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const toB64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res((reader.result as string).split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(f)
    })

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    for (const f of arr) {
      const b64 = await toB64(f)
      setImages(prev => [...prev, { b64, mime: f.type, name: f.name }])
    }
    if (arr.length) showToast(`${arr.length} image${arr.length > 1 ? 's' : ''} added`)
  }

  const handleSend = () => {
    if (generating) return
    if (!text.trim() && !images.length) return
    onSend(text.trim(), images.map(i => i.b64))
    setText('')
    setImages([])
    setAudioBlob(null)
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const toggleRec = async () => {
    if (isRecording) {
      mediaRecRef.current?.stop()
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const chunks: BlobPart[] = []
        const rec = new MediaRecorder(stream)
        rec.ondataavailable = e => chunks.push(e.data)
        rec.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
          setAudioBlob(new Blob(chunks, { type: 'audio/webm' }))
          showToast('Audio recorded')
        }
        rec.start()
        mediaRecRef.current = rec
        setIsRecording(true)
        showToast('Recording… click mic to stop')
      } catch {
        showToast('Microphone access denied')
      }
    }
  }

  const showToast = (msg: string) => {
    const existing = document.getElementById('yk-toast')
    if (existing) {
      existing.textContent = msg
      existing.classList.remove('toast-hide')
      existing.classList.add('toast-show')
      clearTimeout((existing as any)._t)
      ;(existing as any)._t = setTimeout(() => {
        existing.classList.remove('toast-show')
        existing.classList.add('toast-hide')
      }, 2500)
    }
  }

  return (
    <div className="px-6 pb-5 pt-2 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Preview bar */}
        {(images.length > 0 || audioBlob) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 bg-panel border border-bdr rounded-lg px-2 py-1 text-[11px] font-mono"
              >
                <img
                  src={`data:${img.mime};base64,${img.b64}`}
                  alt=""
                  className="w-8 h-8 rounded object-cover"
                />
                <span className="text-muted max-w-[100px] truncate">{img.name}</span>
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="text-muted hover:text-red-400 transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {audioBlob && (
              <div className="inline-flex items-center gap-2 bg-panel border border-bdr rounded-lg px-2 py-1.5 text-[11px] font-mono text-brand">
                🎙 Audio
                <button
                  onClick={() => setAudioBlob(null)}
                  className="text-muted hover:text-red-400 transition"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input wrapper with glow */}
        <div
          className={`relative rounded-xl transition-all duration-300 ${isDragging ? 'ring-2 ring-brand' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
          onDrop={async e => {
            e.preventDefault()
            setIsDragging(false)
            await handleFiles(e.dataTransfer.files)
          }}
        >
          {/* Glow layer */}
          <div className="absolute -inset-0.5 bg-brand/15 rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />

          <div className="relative bg-panel border border-bdr rounded-xl flex flex-col group focus-within:border-brand/40 transition-colors">
            <textarea
              ref={taRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={`Message ${selectedModel || 'Ollama'}… (Enter to send · Shift+Enter for newline · Ctrl+V to paste image)`}
              rows={2}
              className="w-full bg-transparent border-none outline-none text-sm p-4 pb-2 resize-none placeholder:text-muted/60 text-fg"
              style={{ minHeight: '44px', maxHeight: '160px' }}
            />

            <div className="flex items-center justify-between px-3 pb-2">
              {/* Left actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileRef.current?.click()}
                  title="Attach image (or Ctrl+V to paste, drag & drop)"
                  className="w-8 h-8 rounded-lg border border-bdr bg-accent text-muted hover:border-brand/50 hover:text-brand flex items-center justify-center transition"
                >
                  <Image size={14} />
                </button>
                <button
                  onClick={toggleRec}
                  title="Record audio"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
                    isRecording
                      ? 'border-red-500 text-red-400 bg-red-500/10 rec-pulse'
                      : 'border-bdr bg-accent text-muted hover:border-brand/50 hover:text-brand'
                  }`}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
                <span className="text-[10px] font-mono text-muted/60 ml-1 hidden sm:inline">
                  {generating ? 'Streaming…' : 'Attach · Paste · Drop · Record · 100% local'}
                </span>
              </div>

              {/* Send / Stop button */}
              {generating ? (
                <button
                  onClick={onStop}
                  className="flex items-center gap-2 bg-red-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-red-600 transition"
                >
                  <Square size={11} />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={disabled || (!text.trim() && !images.length)}
                  className={`flex items-center gap-2 font-bold text-[10px] px-4 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                    text.trim() || images.length
                      ? 'bg-brand text-brand-fg hover:brightness-110 shadow-[0_0_12px_rgba(255,214,0,0.25)]'
                      : 'bg-white/5 text-muted cursor-not-allowed'
                  }`}
                >
                  Send
                  <ArrowUp size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
