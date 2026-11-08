/**
 * A small spreadsheet formula engine, shared by the browser (live values)
 * and the server (grading). It parses formulas itself, with no eval and no
 * JavaScript: a formula can only read cells of its own sheet and call the
 * functions listed here, and evaluating a sheet is bounded by its size. So
 * a formula is data the app interprets, like a calculator, not a program.
 *
 * Supported: numbers ("1,200", "25%", "$3,000"), text, TRUE/FALSE, cell
 * references (B2, $B$2), ranges inside functions (SUM(B2:D2)), + - * / ^ &,
 * comparisons, a trailing %, and SUM AVERAGE MIN MAX COUNT ROUND ABS IF AND
 * OR NOT IFERROR.
 */

export type CellErrorCode = '#DIV/0!' | '#REF!' | '#NAME?' | '#VALUE!' | '#CYCLE!' | '#ERROR!'

export interface CellError {
  error: CellErrorCode
}

export type CellValue = number | string | boolean | CellError | null

/** Columns A to L and rows 1 to 60: plenty for a task, small enough to bound every evaluation. */
export const MAX_COLUMNS = 12
export const MAX_ROWS = 60
export const MAX_FORMULA_LENGTH = 300

const COLUMN_LETTERS = 'ABCDEFGHIJKL'

export const isError = (value: unknown): value is CellError =>
  typeof value === 'object' && value !== null && 'error' in value

const err = (error: CellErrorCode): CellError => ({ error })

/** "B12" → { col: 1, row: 12 }, or null when it isn't a cell on this sheet. */
export function parseCellId(id: string): { col: number; row: number } | null {
  const m = /^\$?([A-Z])\$?(\d{1,2})$/.exec(id.toUpperCase())
  if (!m) return null
  const col = COLUMN_LETTERS.indexOf(m[1])
  const row = Number(m[2])
  if (col < 0 || row < 1 || row > MAX_ROWS) return null
  return { col, row }
}

export const cellId = (col: number, row: number) => `${COLUMN_LETTERS[col]}${row}`

export const isCellId = (id: string) => /^[A-L]\d{1,2}$/.test(id) && parseCellId(id) !== null

/** A typed number: "1,200", "$3,000", "-4.5", "(4,200)", "25%" (0.25). Null when it isn't one. */
export function parseCellNumber(raw: string): number | null {
  let s = raw
    .trim()
    .replace(/[−‒–—]/g, '-')
    .replace(/[$,\s]/g, '')
  let negative = false
  const paren = /^\((.*)\)$/.exec(s)
  if (paren) {
    negative = true
    s = paren[1]
  }
  const percent = s.endsWith('%')
  if (percent) s = s.slice(0, -1)
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null
  const value = Number(s) * (percent ? 0.01 : 1)
  return Number.isFinite(value) ? (negative ? -value : value) : null
}

// ─── Parsing ──────────────────────────────────────────────────────────────

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string }
  | { t: 'name'; v: string }
  | { t: 'op'; v: string }

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'ref'; id: string }
  | { k: 'range'; from: string; to: string }
  | { k: 'unary'; op: string; arg: Node }
  | { k: 'percent'; arg: Node }
  | { k: 'binary'; op: string; left: Node; right: Node }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'error'; code: CellErrorCode }

class ParseError extends Error {}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i))
      if (!m) throw new ParseError('number')
      tokens.push({ t: 'num', v: Number(m[0]) })
      i += m[0].length
      continue
    }
    if (c === '"') {
      let j = i + 1
      let text = ''
      for (;;) {
        if (j >= src.length) throw new ParseError('string')
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            text += '"'
            j += 2
            continue
          }
          break
        }
        text += src[j++]
      }
      tokens.push({ t: 'str', v: text })
      i = j + 1
      continue
    }
    const word = /^\$?[A-Za-z]+\$?\d*(\.[A-Za-z]+)?/.exec(src.slice(i))
    if (word) {
      const text = word[0]
      const ref = /^\$?[A-Za-z]\$?\d{1,2}$/.test(text)
      tokens.push(
        ref
          ? { t: 'ref', v: text.replace(/\$/g, '').toUpperCase() }
          : { t: 'name', v: text.toUpperCase() }
      )
      i += text.length
      continue
    }
    const two = src.slice(i, i + 2)
    if (two === '<=' || two === '>=' || two === '<>') {
      tokens.push({ t: 'op', v: two })
      i += 2
      continue
    }
    if ('+-*/^&=<>(),:%'.includes(c)) {
      tokens.push({ t: 'op', v: c })
      i++
      continue
    }
    throw new ParseError(`character ${c}`)
  }
  return tokens
}

const FUNCTIONS = new Set([
  'SUM',
  'AVERAGE',
  'MIN',
  'MAX',
  'COUNT',
  'ROUND',
  'ABS',
  'IF',
  'AND',
  'OR',
  'NOT',
  'IFERROR',
])

function parse(src: string): Node {
  const tokens = tokenize(src)
  let pos = 0
  const opAt = (): string | null => {
    const tok = tokens[pos]
    return tok?.t === 'op' ? tok.v : null
  }
  const isOp = (v: string) => opAt() === v
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new ParseError(`expected ${v}`)
    pos++
  }
  let depth = 0

  const binary = (next: () => Node, ops: string[]) => (): Node => {
    let left = next()
    for (let op = opAt(); op !== null && ops.includes(op); op = opAt()) {
      pos++
      left = { k: 'binary', op, left, right: next() }
    }
    return left
  }

  const primary = (): Node => {
    if (++depth > 64) throw new ParseError('too deep')
    try {
      const tok = tokens[pos++]
      if (!tok) throw new ParseError('unexpected end')
      if (tok.t === 'num') return { k: 'num', v: tok.v }
      if (tok.t === 'str') return { k: 'str', v: tok.v }
      if (tok.t === 'ref') {
        if (!parseCellId(tok.v)) return { k: 'error', code: '#REF!' }
        if (isOp(':')) {
          pos++
          const end = tokens[pos++]
          if (end?.t !== 'ref' || !parseCellId(end.v)) return { k: 'error', code: '#REF!' }
          return { k: 'range', from: tok.v, to: end.v }
        }
        return { k: 'ref', id: tok.v }
      }
      if (tok.t === 'name') {
        if (isOp('(')) {
          pos++
          const args: Node[] = []
          if (!isOp(')')) {
            for (;;) {
              args.push(expression())
              if (isOp(',')) {
                pos++
                continue
              }
              break
            }
          }
          expectOp(')')
          if (!FUNCTIONS.has(tok.v)) return { k: 'error', code: '#NAME?' }
          return { k: 'call', name: tok.v, args }
        }
        if (tok.v === 'TRUE' || tok.v === 'FALSE') return { k: 'bool', v: tok.v === 'TRUE' }
        return { k: 'error', code: '#NAME?' }
      }
      if (tok.v === '(') {
        const inner = expression()
        expectOp(')')
        return inner
      }
      if (tok.v === '-' || tok.v === '+') return { k: 'unary', op: tok.v, arg: postfix() }
      throw new ParseError(`unexpected ${tok.v}`)
    } finally {
      depth--
    }
  }

  const postfix = (): Node => {
    let node = primary()
    while (isOp('%')) {
      pos++
      node = { k: 'percent', arg: node }
    }
    return node
  }

  const power = binary(postfix, ['^'])
  const product = binary(power, ['*', '/'])
  const sum = binary(product, ['+', '-'])
  const concat = binary(sum, ['&'])
  const comparison = binary(concat, ['=', '<>', '<', '>', '<=', '>='])
  function expression(): Node {
    return comparison()
  }

  const node = expression()
  if (pos < tokens.length) throw new ParseError('trailing input')
  return node
}

// ─── Evaluation ───────────────────────────────────────────────────────────

/** A cell's content: blank, a formula ("=..."), a number, or text. */
export function classify(raw: string | undefined): 'blank' | 'formula' | 'number' | 'text' {
  const s = (raw ?? '').trim()
  if (!s) return 'blank'
  if (s.startsWith('=')) return 'formula'
  return parseCellNumber(s) === null ? 'text' : 'number'
}

type Scalar = number | string | boolean | null

function toNumber(value: Scalar): number | CellError {
  if (value === null) return 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  const n = parseCellNumber(value)
  return n === null ? err('#VALUE!') : n
}

const toText = (value: Scalar) =>
  value === null ? '' : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : String(value)

function toBool(value: Scalar): boolean | CellError {
  if (typeof value === 'boolean') return value
  const n = toNumber(value)
  return isError(n) ? n : n !== 0
}

/** Excel's ROUND: halves away from zero, without binary float surprises. */
function roundTo(value: number, digits: number): number {
  const d = Math.max(-10, Math.min(10, Math.trunc(digits)))
  const factor = 10 ** d
  const shifted = Math.abs(value) * factor
  const rounded = Math.round(Number(shifted.toPrecision(15)))
  return (Math.sign(value) * rounded) / factor
}

/**
 * Every cell's value. `cells` holds what was typed, by cell id. Cells in a
 * reference loop get #CYCLE!; anything that can't be computed gets an error
 * value rather than throwing.
 */
export function evaluateSheet(cells: Record<string, string>): Record<string, CellValue> {
  const values: Record<string, CellValue> = {}
  const parsed = new Map<string, Node>()
  const visiting = new Set<string>()

  const nodeFor = (id: string, src: string): Node => {
    let node = parsed.get(id)
    if (!node) {
      try {
        node = src.length > MAX_FORMULA_LENGTH ? { k: 'error', code: '#ERROR!' } : parse(src)
      } catch {
        node = { k: 'error', code: '#ERROR!' }
      }
      parsed.set(id, node)
    }
    return node
  }

  const valueOf = (id: string): CellValue => {
    if (id in values) return values[id]
    const raw = (cells[id] ?? '').trim()
    const kind = classify(raw)
    if (kind === 'blank') return (values[id] = null)
    if (kind === 'number') return (values[id] = parseCellNumber(raw))
    if (kind === 'text') return (values[id] = raw)
    if (visiting.has(id)) return err('#CYCLE!')
    visiting.add(id)
    let result = evaluate(nodeFor(id, raw.slice(1)))
    visiting.delete(id)
    // Every cell in a loop shows the loop, not just the one that closed it.
    if (isError(result) && result.error === '#CYCLE!') result = err('#CYCLE!')
    if (typeof result === 'number' && !Number.isFinite(result)) result = err('#DIV/0!')
    return (values[id] = result)
  }

  const rangeValues = (from: string, to: string): CellValue[] => {
    const a = parseCellId(from)!
    const b = parseCellId(to)!
    const out: CellValue[] = []
    for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row++) {
      for (let col = Math.min(a.col, b.col); col <= Math.max(a.col, b.col); col++) {
        out.push(valueOf(cellId(col, row)))
      }
    }
    return out
  }

  /** A function's arguments, with ranges spread out and errors kept in place. */
  type Spread = { value: CellValue; fromRange: boolean }
  const spread = (args: Node[]): Spread[] =>
    args.flatMap((arg): Spread[] =>
      arg.k === 'range'
        ? rangeValues(arg.from, arg.to).map((value) => ({ value, fromRange: true }))
        : [{ value: evaluate(arg), fromRange: false }]
    )

  /** The numbers for SUM-like functions: text and blanks in ranges are skipped. */
  const numbersOf = (args: Node[]): number[] | CellError => {
    const out: number[] = []
    for (const { value, fromRange } of spread(args)) {
      if (isError(value)) return value
      if (fromRange) {
        if (typeof value === 'number') out.push(value)
        continue
      }
      const n = toNumber(value)
      if (isError(n)) return n
      out.push(n)
    }
    return out
  }

  const scalar = (node: Node): Scalar | CellError => {
    const value = evaluate(node)
    return value
  }

  function evaluate(node: Node): CellValue {
    switch (node.k) {
      case 'num':
        return node.v
      case 'str':
        return node.v
      case 'bool':
        return node.v
      case 'error':
        return err(node.code)
      case 'ref':
        return valueOf(node.id)
      case 'range':
        return err('#VALUE!')
      case 'percent': {
        const v = scalar(node.arg)
        if (isError(v)) return v
        const n = toNumber(v)
        return isError(n) ? n : n / 100
      }
      case 'unary': {
        const v = scalar(node.arg)
        if (isError(v)) return v
        const n = toNumber(v)
        if (isError(n)) return n
        return node.op === '-' ? -n : n
      }
      case 'binary': {
        const left = scalar(node.left)
        if (isError(left)) return left
        const right = scalar(node.right)
        if (isError(right)) return right
        if (node.op === '&') return toText(left) + toText(right)
        if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) {
          const bothNumbers = typeof left !== 'string' && typeof right !== 'string'
          const a = bothNumbers ? toNumber(left) : toText(left).toLowerCase()
          const b = bothNumbers ? toNumber(right) : toText(right).toLowerCase()
          if (isError(a)) return a
          if (isError(b)) return b
          switch (node.op) {
            case '=':
              return a === b
            case '<>':
              return a !== b
            case '<':
              return a < b
            case '>':
              return a > b
            case '<=':
              return a <= b
            default:
              return a >= b
          }
        }
        const a = toNumber(left)
        if (isError(a)) return a
        const b = toNumber(right)
        if (isError(b)) return b
        switch (node.op) {
          case '+':
            return a + b
          case '-':
            return a - b
          case '*':
            return a * b
          case '/':
            return b === 0 ? err('#DIV/0!') : a / b
          default: {
            const p = a ** b
            return Number.isFinite(p) ? p : err('#VALUE!')
          }
        }
      }
      case 'call':
        return call(node.name, node.args)
    }
  }

  function call(name: string, args: Node[]): CellValue {
    switch (name) {
      case 'SUM':
      case 'AVERAGE':
      case 'MIN':
      case 'MAX':
      case 'COUNT': {
        if (name === 'COUNT') {
          return spread(args).filter(({ value }) => typeof value === 'number').length
        }
        const nums = numbersOf(args)
        if (isError(nums)) return nums
        if (name === 'SUM') return nums.reduce((s, n) => s + n, 0)
        if (name === 'AVERAGE') {
          return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : err('#DIV/0!')
        }
        if (!nums.length) return 0
        return name === 'MIN' ? Math.min(...nums) : Math.max(...nums)
      }
      case 'ROUND': {
        if (args.length < 1 || args.length > 2) return err('#VALUE!')
        const v = scalar(args[0])
        if (isError(v)) return v
        const n = toNumber(v)
        if (isError(n)) return n
        const d = args[1] ? scalar(args[1]) : 0
        if (isError(d)) return d
        const digits = toNumber(d)
        return isError(digits) ? digits : roundTo(n, digits)
      }
      case 'ABS': {
        if (args.length !== 1) return err('#VALUE!')
        const v = scalar(args[0])
        if (isError(v)) return v
        const n = toNumber(v)
        return isError(n) ? n : Math.abs(n)
      }
      case 'IF': {
        if (args.length < 2 || args.length > 3) return err('#VALUE!')
        const c = scalar(args[0])
        if (isError(c)) return c
        const test = toBool(c)
        if (isError(test)) return test
        if (test) return evaluate(args[1])
        return args[2] ? evaluate(args[2]) : false
      }
      case 'AND':
      case 'OR': {
        const values = spread(args)
        if (!values.length) return err('#VALUE!')
        let result = name === 'AND'
        for (const { value } of values) {
          if (isError(value)) return value
          const b = toBool(value)
          if (isError(b)) return b
          result = name === 'AND' ? result && b : result || b
        }
        return result
      }
      case 'NOT': {
        if (args.length !== 1) return err('#VALUE!')
        const v = scalar(args[0])
        if (isError(v)) return v
        const b = toBool(v)
        return isError(b) ? b : !b
      }
      case 'IFERROR': {
        if (args.length !== 2) return err('#VALUE!')
        const v = evaluate(args[0])
        return isError(v) ? evaluate(args[1]) : v
      }
      default:
        return err('#NAME?')
    }
  }

  for (const id of Object.keys(cells)) if (isCellId(id)) valueOf(id)
  return values
}

/** The cells a formula reads, for showing a cell's precedents. */
export function referencesIn(formula: string): string[] {
  try {
    return tokenize(formula.replace(/^=/, ''))
      .filter((t): t is Extract<Token, { t: 'ref' }> => t.t === 'ref')
      .map((t) => t.v)
  } catch {
    return []
  }
}
