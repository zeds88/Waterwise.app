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
export interface AiAnalysis {
  at: number
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

export interface Settings {
  companyName: string
  author: string
  priceBook: PriceBookEntry[]
  taxRate: number
  ai: AiSettings
}

export interface WalkResult {
  customer?: string
  address?: string
  notes: string[]
  issues: string[]
  tasks: string[]
  lineItems: Omit<LineItem, 'id'>[]
}
