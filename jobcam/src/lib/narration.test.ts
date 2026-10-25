import { describe, expect, it } from 'vitest'
import { parseWalk, quantityNear } from './narration'
import { DEFAULT_SETTINGS } from './db'

const book = DEFAULT_SETTINGS.priceBook

describe('parseWalk', () => {
  const text =
    'Walking the job at the Johnson residence, 4821 Oak Ridge Drive. ' +
    'Front yard has three broken sprinkler heads. Zone 4 valve is leaking. ' +
    'We need to replace the controller. The back fence looks fine.'
  const r = parseWalk(text, book)

  it('extracts customer and address', () => {
    expect(r.customer).toBe('Johnson')
    expect(r.address).toBe('4821 Oak Ridge Drive')
  })
  it('collects issues, tasks and plain notes', () => {
    expect(r.issues).toHaveLength(2)
    expect(r.tasks).toContain('Replace the controller')
    expect(r.notes).toContain('The back fence looks fine')
  })
  it('prices line items from the price book with quantities', () => {
    const heads = r.lineItems.find((l) => l.description === 'Replace sprinkler head')
    expect(heads).toMatchObject({ qty: 3, unitPrice: 35 })
    expect(r.lineItems.find((l) => l.description === 'Replace zone valve')?.qty).toBe(1)
    expect(r.lineItems.find((l) => l.description === 'Install smart controller')).toBeTruthy()
  })
  it('merges repeated mentions of the same item', () => {
    const merged = parseWalk('Two broken sprinkler heads. Also one more broken sprinkler head.', book)
    expect(merged.lineItems).toHaveLength(1)
    expect(merged.lineItems[0].qty).toBe(3)
  })
  it('does not price things that are only notes', () => {
    expect(parseWalk('The valve box is clean and tidy.', book).lineItems).toHaveLength(0)
  })
  it('treats "clean the ..." as a task but "is clean" as a note', () => {
    expect(parseWalk('Clean the gutters.', book).tasks).toEqual(['Clean the gutters'])
  })
  it('handles empty input', () => {
    expect(parseWalk('', book)).toEqual({ notes: [], issues: [], tasks: [], lineItems: [] })
  })
})

describe('quantityNear', () => {
  it('reads digits and number words', () => {
    expect(quantityNear('replace 12 sprinkler heads', 'sprinkler head')).toBe(12)
    expect(quantityNear('replace two sprinkler heads', 'sprinkler head')).toBe(2)
    expect(quantityNear('replace the sprinkler head', 'sprinkler head')).toBe(1)
  })
})
