'use client'

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react'
import { cellId, evaluateSheet, isError, referencesIn } from '@/lib/sheets/formula'
import {
  formatValue,
  inferredFormat,
  isLocked,
  mergeSheet,
  MAX_CELL_LENGTH,
  type SheetTemplate,
} from '@/lib/sheets/sheet'

interface SpreadsheetProps {
  template: SheetTemplate
  /** What the candidate typed, by cell id. */
  edits: Record<string, string>
  /** Omit for a read-only sheet. */
  onChange?: (id: string, raw: string) => void
  onPaste?: (chars: number) => void
  label: string
}

const COLUMN_LETTERS = 'ABCDEFGHIJKL'

/**
 * A small spreadsheet. Select a cell by clicking or with the arrow keys;
 * type, press Enter or double-click to edit it in the formula bar; Enter
 * confirms and moves down, Tab moves right, Escape cancels, Delete clears.
 * Values come from the shared formula engine, so they match grading.
 */
export default function Spreadsheet({
  template,
  edits,
  onChange,
  onPaste,
  label,
}: SpreadsheetProps) {
  const readOnly = !onChange
  const cells = useMemo(() => mergeSheet(template, edits), [template, edits])
  const values = useMemo(() => evaluateSheet(cells), [cells])
  const firstAnswer =
    Object.keys(template.cells).find((id) => template.cells[id].role === 'answer') ?? 'B2'
  const [selected, setSelected] = useState(firstAnswer)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  // A ref as well as state, so a blur that lands after a commit can't commit twice.
  const editingRef = useRef(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLInputElement>(null)

  const columns = Array.from({ length: template.columns }, (_, i) => COLUMN_LETTERS[i])
  const rows = Array.from({ length: template.rows }, (_, i) => i + 1)
  const locked = (id: string) => readOnly || isLocked(template, id)
  const raw = (id: string) => cells[id] ?? ''

  // Cells the selected formula reads, shaded so the model is easy to follow.
  const selectedRaw = editing ? draft : (cells[selected] ?? '')
  const precedents = useMemo(
    () => new Set(selectedRaw.startsWith('=') ? referencesIn(selectedRaw) : []),
    [selectedRaw]
  )

  // Editing happens in the formula bar: move the caret there, at the end, before
  // the next key arrives (a layout effect runs straight after the update).
  useLayoutEffect(() => {
    const bar = barRef.current
    if (!editing || !bar) return
    bar.focus()
    bar.setSelectionRange(bar.value.length, bar.value.length)
  }, [editing])

  const startEditing = (initial?: string) => {
    if (locked(selected)) return
    setDraft(initial ?? raw(selected))
    editingRef.current = true
    setEditing(true)
  }

  const stopEditing = () => {
    editingRef.current = false
    setEditing(false)
  }

  const move = (dCol: number, dRow: number) => {
    const col = Math.min(template.columns - 1, Math.max(0, selected.charCodeAt(0) - 65 + dCol))
    const row = Math.min(template.rows, Math.max(1, Number(selected.slice(1)) + dRow))
    setSelected(cellId(col, row))
  }

  const commit = () => {
    if (!editingRef.current) return
    const next = draft.slice(0, MAX_CELL_LENGTH)
    if (!locked(selected) && next !== raw(selected)) onChange?.(selected, next)
    stopEditing()
  }

  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    // Keys typed in the instant before the formula bar takes focus still count.
    if (editingRef.current) {
      if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
        onBarKey(e as unknown as KeyboardEvent<HTMLInputElement>)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        setDraft((d) => d.slice(0, -1))
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setDraft((d) => d + e.key)
      }
      return
    }
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }
    if (arrows[e.key]) {
      e.preventDefault()
      move(...arrows[e.key])
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      startEditing()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !locked(selected)) {
      e.preventDefault()
      if (raw(selected) !== '') onChange?.(selected, '')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      startEditing(e.key)
    }
  }

  const onBarKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commit()
      if (e.key === 'Enter') move(0, e.shiftKey ? -1 : 1)
      else move(e.shiftKey ? -1 : 1, 0)
      gridRef.current?.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      stopEditing()
      gridRef.current?.focus()
    }
  }

  const onGridPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (locked(selected)) return
    e.preventDefault()
    const text = e.clipboardData.getData('text').split(/\r?\n/)[0].split('\t')[0]
    onPaste?.(text.length)
    onChange?.(selected, text.slice(0, MAX_CELL_LENGTH))
  }

  const shown = (id: string) => {
    const format = template.cells[id]?.format ?? inferredFormat(raw(id))
    return formatValue(values[id] ?? null, format)
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 font-mono text-sm text-ink-muted" aria-hidden>
          {selected}
        </span>
        <input
          ref={barRef}
          aria-label={`Contents of cell ${selected}`}
          value={editing ? draft : raw(selected)}
          readOnly={locked(selected)}
          spellCheck={false}
          autoComplete="off"
          onFocus={() => {
            if (!editingRef.current) startEditing()
          }}
          onChange={(e) => {
            if (!editingRef.current) startEditing(e.target.value)
            else setDraft(e.target.value)
          }}
          onKeyDown={onBarKey}
          onBlur={commit}
          onPaste={(e) => onPaste?.(e.clipboardData.getData('text').length)}
          className="metalab-input min-w-0 flex-1 py-2 font-mono text-sm"
          placeholder={locked(selected) ? '' : 'A number, or a formula such as =B2*(1+B3)'}
        />
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={label}
        aria-readonly={readOnly || undefined}
        aria-rowcount={template.rows + 1}
        aria-colcount={template.columns + 1}
        tabIndex={0}
        onKeyDown={onGridKey}
        onPaste={onGridPaste}
        className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-verified/60"
      >
        <table className="w-max border-collapse text-sm" role="presentation">
          <thead className="sticky top-0 z-10 bg-ground">
            <tr role="row">
              <th className="w-10 border-b border-line" aria-hidden />
              {columns.map((col) => (
                <th
                  key={col}
                  role="columnheader"
                  scope="col"
                  className="border-b border-l border-line px-2 py-1 text-center text-xs font-normal text-ink-faint"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row} role="row">
                <th
                  role="rowheader"
                  scope="row"
                  className="border-t border-line px-2 text-right text-xs font-normal tabular-nums text-ink-faint"
                >
                  {row}
                </th>
                {columns.map((col) => {
                  const id = `${col}${row}`
                  const cell = template.cells[id]
                  const value = values[id] ?? null
                  const isSelected = id === selected
                  const live = isSelected && editing
                  const tone =
                    cell?.role === 'heading'
                      ? 'font-medium text-ink'
                      : cell?.role === 'label'
                        ? 'text-ink-muted'
                        : cell?.role === 'input'
                          ? 'bg-pill text-ink'
                          : isError(value) && !live
                            ? 'text-caution'
                            : 'text-ink'
                  const toFill =
                    cell?.role === 'answer' && raw(id).trim() === '' && !live
                      ? 'outline-dashed outline-1 -outline-offset-4 outline-line-strong'
                      : ''
                  const numeric = typeof value === 'number' && !live
                  return (
                    <td
                      key={id}
                      role="gridcell"
                      aria-selected={isSelected}
                      aria-readonly={locked(id) || undefined}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        if (editingRef.current) commit()
                        setSelected(id)
                        gridRef.current?.focus()
                      }}
                      onDoubleClick={() => {
                        if (locked(id)) return
                        setDraft(raw(id))
                        editingRef.current = true
                        setEditing(true)
                      }}
                      className={[
                        'h-8 border-l border-t border-line px-2',
                        col === 'A' ? 'min-w-[15rem]' : 'min-w-[8.5rem]',
                        numeric ? 'text-right tabular-nums' : 'text-left',
                        live ? 'bg-raised font-mono text-ink' : tone,
                        toFill,
                        precedents.has(id) && !isSelected ? 'bg-verified-wash' : '',
                        isSelected ? 'outline outline-2 -outline-offset-2 outline-verified' : '',
                      ].join(' ')}
                    >
                      <span className="block truncate">{live ? draft : shown(id)}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        {readOnly
          ? 'Select a cell to see its formula.'
          : 'Arrow keys move. Type, press Enter or double-click to edit; Enter confirms, Escape cancels. Formulas start with =. Shaded cells are the assumptions; dashed cells are yours to fill.'}
      </p>
    </div>
  )
}
