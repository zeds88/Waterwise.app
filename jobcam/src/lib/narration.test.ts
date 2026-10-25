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

describe('most specific price-book entry wins', () => {
  const book = [
    { keywords: ['backflow'], description: 'Backflow 1 in', unit: 'ea', price: 950 },
    { keywords: ['3/4 inch backflow', '3/4" backflow'], description: 'Backflow 3/4 in', unit: 'ea', price: 875 },
    { keywords: ['rotor head', 'rotor'], description: 'Rotor head', unit: 'ea', price: 62.5 },
    { keywords: ['sprinkler head', 'head'], description: 'Spray head', unit: 'ea', price: 24 },
  ]
  it('does not double-count overlapping keywords', () => {
    const r = parseWalk('We need to replace the 3/4 inch backflow. The backflow needs service.', book)
    expect(r.lineItems.map((l) => [l.description, l.qty])).toEqual([['Backflow 3/4 in', 1], ['Backflow 1 in', 1]])
    const rotors = parseWalk('Replace two rotor heads.', book)
    expect(rotors.lineItems.map((l) => l.description)).toEqual(['Rotor head'])
    expect(rotors.lineItems[0].qty).toBe(2)
  })
  it('still matches the general entry when the specific one is absent', () => {
    expect(parseWalk('Replace three broken heads.', book).lineItems[0]).toMatchObject({ description: 'Spray head', qty: 3 })
  })
})

describe('quantities and phrasing', () => {
  const book = [{ keywords: ['adjust head', 'realign'], description: 'Adjust heads', unit: 'head', price: 10.5 }, { keywords: ['spring startup'], description: 'Spring startup', unit: 'system', price: 105 }]
  it('reads a count inside the keyword phrase', () => {
    expect(parseWalk('We should adjust 6 heads.', book).lineItems[0]).toMatchObject({ description: 'Adjust heads', qty: 6 })
    expect(parseWalk('Need to adjust twelve heads.', book).lineItems[0].qty).toBe(12)
    expect(parseWalk('Adjust heads in zone 3.', book).lineItems[0].qty).toBe(1)
  })
  it('never reads a zone/station label as a count, even inside a multi-word keyword', () => {
    const valves = [{ keywords: ['zone valve', 'valve'], description: 'Valve', unit: 'ea', price: 375 }]
    expect(parseWalk('Zone 4 valve is leaking.', valves).lineItems[0].qty).toBe(1)
    expect(parseWalk('Station 7 valve is stuck.', valves).lineItems[0].qty).toBe(1)
    expect(parseWalk('Replace 2 zone valves.', valves).lineItems[0].qty).toBe(2)
  })
  it('treats "is needed" / "is required" as work to do', () => {
    expect(parseWalk('Spring startup is needed.', book).lineItems.map((l) => l.description)).toEqual(['Spring startup'])
    expect(parseWalk('Spring startup is required before April.', book).tasks).toHaveLength(1)
  })
})

describe('quantityNear', () => {
  it('reads digits and number words', () => {
    expect(quantityNear('replace 12 sprinkler heads', 'sprinkler head')).toBe(12)
    expect(quantityNear('replace two sprinkler heads', 'sprinkler head')).toBe(2)
    expect(quantityNear('replace the sprinkler head', 'sprinkler head')).toBe(1)
  })
})
