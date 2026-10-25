import type { Estimate } from './types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function totals(e: Pick<Estimate, 'items' | 'taxRate'>) {
  const subtotal = round2(e.items.reduce((s, i) => s + i.qty * i.unitPrice, 0))
  const tax = round2(subtotal * (e.taxRate / 100))
  return { subtotal, tax, total: round2(subtotal + tax) }
}

export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
