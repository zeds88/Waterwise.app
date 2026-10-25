import { describe, expect, it } from 'vitest'
import { mergePriceBooks, parseCsv, parsePriceBook, priceBookToCsv, PriceBookError } from './pricebook'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded commas/newlines, CRLF and BOM', () => {
    expect(parseCsv('﻿a,"b,c","say ""hi"""\r\nx,"line1\nline2",z\n\n')).toEqual([['a', 'b,c', 'say "hi"'], ['x', 'line1\nline2', 'z']])
  })
})

describe('inch marks in unquoted cells', () => {
  it('stay literal instead of swallowing the rest of the file', () => {
    expect(parseCsv('a,Valve 1" electric,c\nd,"Quoted ""x"" cell",f')).toEqual([['a', 'Valve 1" electric', 'c'], ['d', 'Quoted "x" cell', 'f']])
    expect(parsePriceBook('keywords,description,unit,price\nvalve,Replace valve 1" electric,valve,375\nhead,Spray head,head,24').map((e) => e.description)).toEqual(['Replace valve 1" electric', 'Spray head'])
  })
})

describe('parsePriceBook', () => {
  const csv = 'keywords,description,unit,price\nspray head|pop-up,"Replace spray head (parts + labor)",head,$24.00\n,Service call,visit,"1,085.5"\n'
  it('reads CSV with $ and thousands separators and defaults missing keywords', () => {
    expect(parsePriceBook(csv)).toEqual([
      { keywords: ['spray head', 'pop-up'], description: 'Replace spray head (parts + labor)', unit: 'head', price: 24 },
      { keywords: ['service call'], description: 'Service call', unit: 'visit', price: 1085.5 },
    ])
  })
  it('reads JSON arrays', () => {
    expect(parsePriceBook('[{"keywords":["valve"],"description":"Valve","unit":"ea","price":"375"}]')[0].price).toBe(375)
  })
  it('gives clear errors with row numbers', () => {
    expect(() => parsePriceBook('')).toThrow(PriceBookError)
    expect(() => parsePriceBook('a,b\n1,2')).toThrow(/header/)
    expect(() => parsePriceBook('keywords,description,unit,price\nx,Thing,ea,abc')).toThrow(/Row 2.*Thing.*price/)
    expect(() => parsePriceBook('keywords,description,unit,price\nx,,ea,5')).toThrow(/Row 2.*description/)
    expect(() => parsePriceBook('[{"description":"X","price":-1}]')).toThrow(/Item 1/)
    expect(() => parsePriceBook('keywords,description,unit,price')).toThrow(/No items/)
  })
  it('round-trips through CSV export', () => {
    const book = parsePriceBook(csv)
    expect(parsePriceBook(priceBookToCsv(book))).toEqual(book)
  })
})

describe('mergePriceBooks', () => {
  it('updates same-named items and appends new ones', () => {
    const a = [{ keywords: ['x'], description: 'Valve', unit: 'ea', price: 100 }, { keywords: ['y'], description: 'Keep', unit: 'ea', price: 1 }]
    const b = [{ keywords: ['v'], description: 'valve', unit: 'ea', price: 375 }, { keywords: ['n'], description: 'New', unit: 'ea', price: 5 }]
    expect(mergePriceBooks(a, b).map((e) => [e.description, e.price])).toEqual([['valve', 375], ['Keep', 1], ['New', 5]])
  })
})
