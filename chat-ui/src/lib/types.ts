export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]   // base64 strings
  createdAt: number
  ragSources?: RagSource[]
}

export interface Session {
  id: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface RagDoc {
  id: string
  name: string
  type: 'url' | 'text' | 'pdf'
  chunks: number
  ingested_at: string
  url?: string
}

export interface RagSource {
  source_name: string
  text: string
  score?: number
}
