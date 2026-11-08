/**
 * Spreadsheets in tasks: the template a task sets (labels, assumption
 * inputs, answer cells), how a candidate's edits combine with it, and how
 * values are shown. Client-safe; shared by the workspace and grading.
 */

import { evaluateSheet, isCellId, isError, MAX_COLUMNS, MAX_ROWS, type CellValue } from './formula'

export type CellFormat = 'money' | 'percent' | 'ratio' | 'number'

/** A cell the task sets: a label, an assumption the candidate may change, or an answer to fill. */
export interface TemplateCell {
  value: string
  role: 'heading' | 'label' | 'input' | 'answer'
  format?: CellFormat
}

export interface SheetTemplate {
  columns: number
  rows: number
  cells: Record<string, TemplateCell>
}

export const MAX_CELL_LENGTH = 300

/** Labels and headings are fixed; everything else can be typed into. */
export const isLocked = (template: SheetTemplate, id: string) => {
  const role = template.cells[id]?.role
  return role === 'heading' || role === 'label'
}

export const inBounds = (template: SheetTemplate, id: string) => {
  if (!isCellId(id)) return false
  const col = id.charCodeAt(0) - 65
  const row = Number(id.slice(1))
  return col < Math.min(template.columns, MAX_COLUMNS) && row <= Math.min(template.rows, MAX_ROWS)
}

/**
 * What the sheet holds: the template, the candidate's edits on top (never
 * over a label), then any overrides (grading resets the assumptions).
 */
export function mergeSheet(
  template: SheetTemplate,
  edits: Record<string, string> = {},
  overrides: Record<string, string> = {}
): Record<string, string> {
  const cells: Record<string, string> = {}
  for (const [id, cell] of Object.entries(template.cells)) cells[id] = cell.value
  for (const [id, raw] of Object.entries(edits)) {
    if (inBounds(template, id) && !isLocked(template, id)) cells[id] = raw
  }
  return { ...cells, ...overrides }
}

export function sheetValues(
  template: SheetTemplate,
  edits?: Record<string, string>,
  overrides?: Record<string, string>
): Record<string, CellValue> {
  return evaluateSheet(mergeSheet(template, edits, overrides))
}

/** A cell's value as a number, or null when it isn't one. */
export function numberAt(values: Record<string, CellValue>, id: string): number | null {
  const v = values[id]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

const money = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

/** How a value reads in a cell: "$1,375,000", "25.0%", "4.2x", or as typed. */
export function formatValue(value: CellValue, format?: CellFormat): string {
  if (value === null) return ''
  if (isError(value)) return value.error
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'string') return value
  switch (format) {
    case 'money':
      return `${value < 0 ? '-' : ''}$${money.format(Math.abs(value))}`
    case 'percent':
      return `${(value * 100).toFixed(1)}%`
    case 'ratio':
      return `${value.toFixed(1)}x`
    default:
      return plain.format(value)
  }
}

/** A format for cells the template doesn't describe, from what was typed. */
export function inferredFormat(raw: string | undefined): CellFormat | undefined {
  const s = (raw ?? '').trim()
  if (s.startsWith('=')) return undefined
  if (s.endsWith('%')) return 'percent'
  if (s.startsWith('$')) return 'money'
  return undefined
}

/** The edited cells as lines for a reviewer or the AI grader: "D20: =D16-D17 → $139,000". */
export function describeSheet(
  template: SheetTemplate,
  edits: Record<string, string> = {},
  limit = 80
): string[] {
  const values = sheetValues(template, edits)
  const ids = Object.keys(edits)
    .filter((id) => inBounds(template, id) && !isLocked(template, id) && edits[id].trim())
    .sort((a, b) => {
      const row = Number(a.slice(1)) - Number(b.slice(1))
      return row !== 0 ? row : a.charCodeAt(0) - b.charCodeAt(0)
    })
  return ids.slice(0, limit).map((id) => {
    const raw = edits[id].trim()
    const label = template.cells[`A${id.slice(1)}`]?.value
    const shown = formatValue(values[id] ?? null, template.cells[id]?.format)
    const where = label && id[0] !== 'A' ? `${id} (${label})` : id
    return raw.startsWith('=') ? `${where}: ${raw} → ${shown}` : `${where}: ${shown}`
  })
}
