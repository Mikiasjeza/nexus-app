import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Spreadsheet from '@/components/Assessments/Spreadsheet'
import type { SheetTemplate } from '@/lib/sheets/sheet'

const TEMPLATE: SheetTemplate = {
  columns: 3,
  rows: 4,
  cells: {
    A1: { value: 'Price', role: 'label' },
    B1: { value: '100', role: 'input', format: 'money' },
    A2: { value: 'Tax', role: 'label' },
    B2: { value: '20%', role: 'input', format: 'percent' },
    A3: { value: 'Total', role: 'label' },
    B3: { value: '', role: 'answer', format: 'money' },
  },
}

function Harness({ readOnly = false }: { readOnly?: boolean }) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  return (
    <>
      <Spreadsheet
        template={TEMPLATE}
        edits={edits}
        onChange={readOnly ? undefined : (id, raw) => setEdits((e) => ({ ...e, [id]: raw }))}
        label="Test sheet"
      />
      <output data-testid="edits">{JSON.stringify(edits)}</output>
    </>
  )
}

const grid = () => screen.getByRole('grid', { name: 'Test sheet' })
const bar = () => screen.getByLabelText(/^Contents of cell/) as HTMLInputElement
const cell = (row: number, col: number) =>
  screen.getAllByRole('row')[row].querySelectorAll('td')[col] as HTMLElement
const edits = () => JSON.parse(screen.getByTestId('edits').textContent || '{}')

describe('Spreadsheet', () => {
  it('starts on the first cell to fill and shows formatted values', () => {
    render(<Harness />)
    expect(bar()).toHaveAttribute('aria-label', 'Contents of cell B3')
    expect(cell(1, 1)).toHaveTextContent('$100')
    expect(cell(2, 1)).toHaveTextContent('20.0%')
  })

  it('typing on the grid edits in the formula bar; Enter confirms and moves down', () => {
    render(<Harness />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: '=' })
    expect(document.activeElement).toBe(bar())
    expect(bar().value).toBe('=')
    fireEvent.change(bar(), { target: { value: '=B1*(1+B2)' } })
    // The cell shows what is being typed.
    expect(cell(3, 1)).toHaveTextContent('=B1*(1+B2)')
    fireEvent.keyDown(bar(), { key: 'Enter' })
    expect(edits()).toEqual({ B3: '=B1*(1+B2)' })
    expect(cell(3, 1)).toHaveTextContent('$120')
    expect(bar()).toHaveAttribute('aria-label', 'Contents of cell B4')
    expect(document.activeElement).toBe(grid())
  })

  it('keys that arrive before the formula bar has focus still count', () => {
    render(<Harness />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: '=' })
    // Keys delivered to the grid while editing (before focus moves) keep building the draft.
    fireEvent.keyDown(grid(), { key: '5' })
    fireEvent.keyDown(grid(), { key: '0' })
    fireEvent.keyDown(grid(), { key: 'Backspace' })
    fireEvent.keyDown(grid(), { key: '1' })
    fireEvent.keyDown(grid(), { key: 'Enter' })
    expect(edits()).toEqual({ B3: '=51' })
  })

  it('moves with the arrow keys, clears with Delete and cancels with Escape', () => {
    render(<Harness />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: 'ArrowUp' })
    expect(bar()).toHaveAttribute('aria-label', 'Contents of cell B2')
    fireEvent.keyDown(grid(), { key: 'Delete' })
    expect(edits()).toEqual({ B2: '' })
    fireEvent.keyDown(grid(), { key: '9' })
    fireEvent.keyDown(bar(), { key: 'Escape' })
    expect(edits()).toEqual({ B2: '' })
    expect(document.activeElement).toBe(grid())
  })

  it('confirms an edit when another cell is clicked', () => {
    render(<Harness />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: '7' })
    fireEvent.mouseDown(cell(1, 2))
    expect(edits()).toEqual({ B3: '7' })
    expect(bar()).toHaveAttribute('aria-label', 'Contents of cell C1')
  })

  it('never edits labels, and a read-only sheet never changes', () => {
    const { unmount } = render(<Harness />)
    fireEvent.mouseDown(cell(1, 0))
    fireEvent.keyDown(grid(), { key: 'x' })
    fireEvent.keyDown(grid(), { key: 'Delete' })
    expect(edits()).toEqual({})
    expect(bar()).toHaveAttribute('readonly')
    unmount()

    render(<Harness readOnly />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: '5' })
    fireEvent.keyDown(grid(), { key: 'Enter' })
    expect(edits()).toEqual({})
    expect(screen.getByText('Select a cell to see its formula.')).toBeInTheDocument()
  })

  it('shades the cells the selected formula reads', () => {
    render(<Harness />)
    grid().focus()
    fireEvent.keyDown(grid(), { key: '=' })
    fireEvent.change(bar(), { target: { value: '=B1+B2' } })
    expect(cell(1, 1).className).toContain('bg-verified-wash')
    expect(cell(2, 1).className).toContain('bg-verified-wash')
    expect(cell(1, 0).className).not.toContain('bg-verified-wash')
  })
})
