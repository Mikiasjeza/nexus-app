import {
  classify,
  evaluateSheet,
  isCellId,
  parseCellId,
  parseCellNumber,
  referencesIn,
} from '@/lib/sheets/formula'

const value = (cells: Record<string, string>, id: string) => evaluateSheet(cells)[id]

describe('cell ids and typed numbers', () => {
  it('knows which cells exist', () => {
    expect(parseCellId('B12')).toEqual({ col: 1, row: 12 })
    expect(parseCellId('$B$12')).toEqual({ col: 1, row: 12 })
    expect(isCellId('L60')).toBe(true)
    expect(isCellId('M1')).toBe(false)
    expect(isCellId('A61')).toBe(false)
    expect(isCellId('A0')).toBe(false)
  })

  it('reads numbers the way people type them', () => {
    expect(parseCellNumber('1,200')).toBe(1200)
    expect(parseCellNumber('$3,000')).toBe(3000)
    expect(parseCellNumber('25%')).toBe(0.25)
    expect(parseCellNumber('(4,200)')).toBe(-4200)
    expect(parseCellNumber('−4.5')).toBe(-4.5)
    expect(parseCellNumber('1e3')).toBe(1000)
    expect(parseCellNumber('Revenue')).toBeNull()
    expect(classify('=B2*2')).toBe('formula')
    expect(classify(' 12 ')).toBe('number')
    expect(classify('Year 1')).toBe('text')
    expect(classify('')).toBe('blank')
  })
})

describe('formulas', () => {
  it('does arithmetic with the usual precedence', () => {
    expect(value({ A1: '=1+2*3' }, 'A1')).toBe(7)
    expect(value({ A1: '=(1+2)*3' }, 'A1')).toBe(9)
    expect(value({ A1: '=2^3^2' }, 'A1')).toBe(64) // left to right, like Excel
    expect(value({ A1: '=-2^2' }, 'A1')).toBe(4) // the minus binds first, like Excel
    expect(value({ A1: '=50%*200' }, 'A1')).toBe(100)
    expect(value({ A1: '="Year "&3' }, 'A1')).toBe('Year 3')
  })

  it('follows references, including through percentages and blanks', () => {
    const cells = { B2: '1,100,000', B3: '25%', C2: '=B2*(1+B3)', D2: '=C2+E9' }
    expect(value(cells, 'C2')).toBe(1_375_000)
    expect(value(cells, 'D2')).toBe(1_375_000)
    expect(value({ A1: '=$B$1*2', B1: '4' }, 'A1')).toBe(8)
  })

  it('runs the supported functions', () => {
    const cells = { A1: '1', A2: '2', A3: 'text', A4: '', A5: '4' }
    expect(value({ ...cells, B1: '=SUM(A1:A5)' }, 'B1')).toBe(7)
    expect(value({ ...cells, B1: '=AVERAGE(A1:A5)' }, 'B1')).toBeCloseTo(7 / 3)
    expect(value({ ...cells, B1: '=MIN(A1:A5)' }, 'B1')).toBe(1)
    expect(value({ ...cells, B1: '=MAX(A1:A5, 9)' }, 'B1')).toBe(9)
    expect(value({ ...cells, B1: '=COUNT(A1:A5)' }, 'B1')).toBe(3)
    expect(value({ B1: '=ROUND(2.675, 2)' }, 'B1')).toBe(2.68)
    expect(value({ B1: '=ROUND(-2.5, 0)' }, 'B1')).toBe(-3)
    expect(value({ B1: '=ROUND(1234.5, -2)' }, 'B1')).toBe(1200)
    expect(value({ B1: '=ABS(-3)' }, 'B1')).toBe(3)
    expect(value({ B1: '=IF(2>1, "yes", "no")' }, 'B1')).toBe('yes')
    expect(value({ B1: '=IF(0, 1)' }, 'B1')).toBe(false)
    expect(value({ B1: '=AND(1, TRUE, 2>1)' }, 'B1')).toBe(true)
    expect(value({ B1: '=OR(0, FALSE)' }, 'B1')).toBe(false)
    expect(value({ B1: '=NOT(0)' }, 'B1')).toBe(true)
    expect(value({ B1: '=IFERROR(1/0, -1)' }, 'B1')).toBe(-1)
    expect(value({ B1: '=sum(1, 2)' }, 'B1')).toBe(3)
  })

  it('returns error values instead of throwing', () => {
    expect(value({ A1: '=1/0' }, 'A1')).toEqual({ error: '#DIV/0!' })
    expect(value({ A1: '=FOO(1)' }, 'A1')).toEqual({ error: '#NAME?' })
    expect(value({ A1: '=Z9' }, 'A1')).toEqual({ error: '#REF!' })
    expect(value({ A1: '=A70' }, 'A1')).toEqual({ error: '#REF!' })
    expect(value({ A1: '="a"*2' }, 'A1')).toEqual({ error: '#VALUE!' })
    expect(value({ A1: '=1+' }, 'A1')).toEqual({ error: '#ERROR!' })
    expect(value({ A1: '=(1' }, 'A1')).toEqual({ error: '#ERROR!' })
    expect(value({ A1: '=A1:B2' }, 'A1')).toEqual({ error: '#VALUE!' })
    expect(value({ A1: '=1/0', B1: '=A1+1' }, 'B1')).toEqual({ error: '#DIV/0!' })
    expect(value({ A1: `=${'1+'.repeat(200)}1` }, 'A1')).toEqual({ error: '#ERROR!' })
  })

  it('marks every cell in a reference loop', () => {
    const values = evaluateSheet({ A1: '=B1+1', B1: '=C1+1', C1: '=A1+1', D1: '=A1', E1: '5' })
    expect(values.A1).toEqual({ error: '#CYCLE!' })
    expect(values.B1).toEqual({ error: '#CYCLE!' })
    expect(values.C1).toEqual({ error: '#CYCLE!' })
    expect(values.D1).toEqual({ error: '#CYCLE!' })
    expect(values.E1).toBe(5)
    expect(value({ A1: '=A1' }, 'A1')).toEqual({ error: '#CYCLE!' })
  })

  it('cannot reach anything outside the sheet', () => {
    for (const src of [
      '=constructor',
      '=process.exit(1)',
      '=globalThis',
      '=__proto__',
      '=require("fs")',
      '=eval("1")',
      '=[1,2]',
      '={1}',
      '=`x`',
    ]) {
      const result = value({ A1: src }, 'A1')
      expect(typeof result === 'object' && result !== null && 'error' in result).toBe(true)
    }
  })

  it('evaluates a long dependency chain', () => {
    const cells: Record<string, string> = { L1: '0' }
    for (let row = 2; row <= 60; row++) {
      for (const col of 'ABCDEFGHIJKL') {
        const prev =
          col === 'A' ? `L${row - 1}` : `${String.fromCharCode(col.charCodeAt(0) - 1)}${row}`
        cells[`${col}${row}`] = `=${prev}+1`
      }
    }
    expect(evaluateSheet(cells).L60).toBe(59 * 12)
  })

  it('lists the cells a formula reads', () => {
    expect(referencesIn('=SUM(B2:D2)+$E$5*F6')).toEqual(['B2', 'D2', 'E5', 'F6'])
  })
})
