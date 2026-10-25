import type { PriceBookEntry, WalkResult } from './types'

/**
 * "Walk the job" parser. Takes free-form narration (dictated or typed while
 * walking a site) and sorts it into customer / address, issues found, tasks to
 * do, and priced line items from the user's price book. Runs fully on-device.
 */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
}

const ISSUE_RE = /\b(leak\w*|broken|cracked?|damag\w*|clogg\w*|missing|worn|rott\w*|fail\w*|stuck|stuc|burst|low pressure|not working|doesn'?t work|overgrown|mold\w*|rust\w*|bad|loose|sagging)\b/i
const TASK_RE = /\b(need(?:s)? to|needs?|should|must|have to|replace|install|repair|fix|clean(?:\s+(?:up|out|the|all))|add|remove|adjust|check|inspect|schedule|order|paint|patch|clear(?:\s+(?:the|out)))\b/i
const STREET = '(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Way|Court|Ct|Circle|Cir|Place|Pl|Parkway|Pkwy|Trail|Trl)'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+|;\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toNumber(token: string): number | null {
  const t = token.toLowerCase()
  if (/^\d+$/.test(t)) return parseInt(t, 10)
  return t in NUMBER_WORDS ? NUMBER_WORDS[t] : null
}

/** Quantity = a number within three words before the keyword, else 1. */
export function quantityNear(sentence: string, keyword: string): number {
  const m = new RegExp(`((?:\\S+\\s+){0,3})${escapeRe(keyword)}`, 'i').exec(sentence)
  if (!m) return 1
  const words = m[1].trim().split(/\s+/).filter(Boolean)
  for (let i = words.length - 1; i >= 0; i--) {
    const n = toNumber(words[i].replace(/[^\w]/g, ''))
    // "zone 4 valve" / "station 7" label a thing; they are not a count
    if (n !== null && n > 0 && !/^(zone|station|number|no|#)$/i.test(words[i - 1] ?? '')) return n
  }
  return 1
}

function cleanTask(s: string): string {
  const t = s
    .replace(/^(?:and|also|then|so|okay|ok)\s+/i, '')
    .replace(/^(?:we|i|you)\s+(?:will\s+|'ll\s+)?(?:need(?:s)? to|should|must|have to|gotta)\s+/i, '')
    .replace(/^(?:it|they|this|that)\s+(?:needs?|need)\s+(?:to\s+)?/i, '')
    .replace(/[.!?]+$/, '')
    .trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function parseWalk(text: string, priceBook: PriceBookEntry[] = []): WalkResult {
  const result: WalkResult = { notes: [], issues: [], tasks: [], lineItems: [] }

  const nameMatch =
    /(?:at\s+the|for\s+the)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:residence|house|home|property|place)/.exec(text) ??
    /(?:customer|client|homeowner)\s+(?:is\s+|name\s+is\s+)?(?:mr\.?|mrs\.?|ms\.?|miss)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/.exec(text) ??
    /\bfor\s+(?:mr\.?|mrs\.?|ms\.?|miss)\s+([A-Z][a-z]+)/i.exec(text)
  if (nameMatch) result.customer = nameMatch[1].trim()

  const addrMatch = new RegExp(`(\\d{1,6}\\s+(?:[NSEW]\\.?\\s+)?(?:[A-Z][a-z]+\\s+){1,3}${STREET}\\b)`).exec(text)
  if (addrMatch) result.address = addrMatch[1].trim()

  const seenItems = new Map<string, number>()

  for (const sentence of splitSentences(text)) {
    const isIssue = ISSUE_RE.test(sentence)
    const isTask = TASK_RE.test(sentence)

    for (const entry of priceBook) {
      const kw = entry.keywords.find((k) => sentence.toLowerCase().includes(k.toLowerCase()))
      if (!kw || !(isIssue || isTask)) continue
      const qty = quantityNear(sentence, kw)
      const key = entry.description
      if (seenItems.has(key)) {
        result.lineItems[seenItems.get(key)!].qty += qty
      } else {
        seenItems.set(key, result.lineItems.length)
        result.lineItems.push({ description: entry.description, qty, unit: entry.unit, unitPrice: entry.price })
      }
    }

    if (isIssue) result.issues.push(sentence.replace(/[.!?]+$/, ''))
    if (isTask) result.tasks.push(cleanTask(sentence))
    if (!isIssue && !isTask) result.notes.push(sentence.replace(/[.!?]+$/, ''))
  }

  return result
}
