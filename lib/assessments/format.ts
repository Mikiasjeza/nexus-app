/**
 * Shows example inputs and results the way the candidate's language writes
 * them: Python gets True, False and None instead of JSON's true, false and
 * null. Safe for the browser.
 */

/** Pretty JSON with JSON's literals swapped for Python's, leaving strings alone. */
export function toPythonLiteral(json: string): string {
  let out = ''
  let inString = false
  for (let i = 0; i < json.length; i++) {
    const c = json[i]
    if (inString) {
      out += c
      if (c === '\\') {
        out += json[++i] ?? ''
      } else if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      out += c
      continue
    }
    const rest = json.slice(i)
    const word = /^(true|false|null)\b/.exec(rest)?.[1]
    if (word) {
      out += word === 'true' ? 'True' : word === 'false' ? 'False' : 'None'
      i += word.length - 1
      continue
    }
    out += c
  }
  return out
}

export function formatValue(value: unknown, language: string | undefined): string {
  const json = JSON.stringify(value, null, 2) ?? 'undefined'
  return language === 'python' ? toPythonLiteral(json) : json
}
