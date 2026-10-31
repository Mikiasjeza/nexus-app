import { formatValue, toPythonLiteral } from '@/lib/assessments/format'

describe('formatValue', () => {
  it('writes Python literals for Python', () => {
    expect(formatValue({ ok: true, top: null, list: [false] }, 'python')).toBe(
      '{\n  "ok": True,\n  "top": None,\n  "list": [\n    False\n  ]\n}'
    )
  })

  it('leaves strings that contain the words alone', () => {
    expect(toPythonLiteral('["true", "null \\"false\\"", true]')).toBe(
      '["true", "null \\"false\\"", True]'
    )
  })

  it('keeps JSON for other languages', () => {
    expect(formatValue({ top: null }, 'javascript')).toBe('{\n  "top": null\n}')
  })
})
