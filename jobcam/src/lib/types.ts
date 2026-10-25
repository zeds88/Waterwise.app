export type ProjectStatus = 'active' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  address: string
  customer: string
  phone: string
  email: string
  status: ProjectStatus
  notes: string
  coverPhotoId?: string
  review?: ProjectReview
  createdAt: number
  updatedAt: number
}

export type ShapeKind = 'arrow' | 'rect' | 'ellipse' | 'pen' | 'text'

/** All coordinates are normalised 0..1 so annotations survive any resize. */
export interface Shape {
  kind: ShapeKind
  color: string
  points: [number, number][]
  text?: string
}

export type Severity = 'low' | 'medium' | 'high'
export interface AiIssue {
  title: string
  severity: Severity
  evidence: string
  recommendation: string
}
export interface TranscriptChunk {
  start: number
  end: number
  text: string
}
export interface Transcript {
  at: number
  engine: 'local' | 'api'
  model: string
  text: string
  chunks: TranscriptChunk[]
}

export interface AiAnalysis {
  at: number
  /** What the speaker said that matters, and whether the visuals agree. */
  narration?: string
  model: string
  summary: string
  caption: string
  tags: string[]
  observations: string[]
  issues: AiIssue[]
  materials: string[]
  safety: string[]
  reasoning: string
  confidence: 'low' | 'medium' | 'high'
}
export interface ProjectReview {
  at: number
  model: string
  summary: string
  progress: string
  risks: string[]
  nextSteps: string[]
  suggestedItems: { description: string; qty: number; unit: string }[]
  reasoning: string
}

export interface Photo {
  id: string
  /** Absent for legacy rows = photo. For videos, `blob` is the video and `thumb` its poster frame. */
  kind?: 'photo' | 'video'
  duration?: number
  transcript?: Transcript
  ai?: AiAnalysis
  projectId: string
  blob: Blob
  thumb: Blob
  width: number
  height: number
  takenAt: number
  lat?: number
  lng?: number
  accuracy?: number
  tags: string[]
  caption: string
  annotations: Shape[]
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}
export interface Checklist {
  id: string
  projectId: string
  title: string
  items: ChecklistItem[]
  createdAt: number
}

export interface Comment {
  id: string
  projectId: string
  author: string
  text: string
  createdAt: number
}

export interface LineItem {
  id: string
  description: string
  qty: number
  unit: string
  unitPrice: number
}
export interface Estimate {
  id: string
  /** false = internal draft (e.g. AI- or narration-generated): kept out of customer documents until included */
  proposal?: boolean
  projectId: string
  title: string
  items: LineItem[]
  taxRate: number
  createdAt: number
}

export interface PriceBookEntry {
  keywords: string[]
  description: string
  unit: string
  price: number
}

export interface AiSettings {
  provider: 'openai' | 'anthropic'
  endpoint: string
  apiKey: string
  model: string
}

export interface TranscriptionSettings {
  engine: 'local' | 'api' | 'off'
  /** Hugging Face model id for on-device Whisper */
  localModel: string
  endpoint: string
  apiKey: string
  apiModel: string
}

export interface Branding {
  /** data URL (PNG/JPEG) of the logo, already downscaled */
  logo: string
  /** hex like #2563eb */
  color: string
  tagline: string
  phone: string
  email: string
  website: string
  address: string
  license: string
  /** payment / general terms printed on proposals */
  terms: string
  footer: string
}

export type FieldType = 'text' | 'longtext' | 'number' | 'money' | 'date' | 'select'
export interface ScopeField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  default?: string
}
/** Text fields may contain {{key|Label|type|default}} blanks. See lib/scope.ts. */
export interface ScopeTemplate {
  id: string
  trade: string
  title: string
  summary: string
  scope: string[]
  included: string[]
  excluded: string[]
  assumptions: string[]
  warranty: string
  custom?: boolean
}
export interface ScopeDoc {
  id: string
  projectId: string
  title: string
  /** snapshot, so later edits to the library never change a signed document */
  template: ScopeTemplate
  values: Record<string, string>
  createdAt: number
}

export interface Settings {
  branding: Branding
  customTemplates: ScopeTemplate[]
  companyName: string
  author: string
  priceBook: PriceBookEntry[]
  taxRate: number
  ai: AiSettings
  transcription: TranscriptionSettings
}

export interface WalkResult {
  customer?: string
  address?: string
  notes: string[]
  issues: string[]
  tasks: string[]
  lineItems: Omit<LineItem, 'id'>[]
}
