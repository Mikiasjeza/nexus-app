'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { sql, SQLite } from '@codemirror/lang-sql'

export type EditorLanguage = 'javascript' | 'typescript' | 'python' | 'sql'

/** The night theme, in the editor: raised ground, cream ink, orange cursor. */
const nightTheme = EditorView.theme(
  {
    '&': {
      color: '#e9e4da',
      backgroundColor: '#151412',
      fontSize: '13.5px',
      borderRadius: '0.75rem',
    },
    '&.cm-focused': { outline: '1px solid rgba(233, 118, 43, 0.6)' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      lineHeight: '1.6',
    },
    '.cm-content': { caretColor: '#e9762b', padding: '12px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#e9762b' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
      { backgroundColor: 'rgba(233, 118, 43, 0.22)' },
    '.cm-gutters': {
      backgroundColor: '#151412',
      color: '#5f5a52',
      border: 'none',
      borderTopLeftRadius: '0.75rem',
      borderBottomLeftRadius: '0.75rem',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(233, 228, 218, 0.035)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#a39d92' },
    '.cm-matchingBracket': { backgroundColor: 'rgba(233, 228, 218, 0.1)', outline: 'none' },
    '.cm-tooltip': { backgroundColor: '#1d1b18', border: 'none', color: '#e9e4da' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'rgba(233, 118, 43, 0.25)',
    },
  },
  { dark: true }
)

const nightHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword], color: '#f3a066' },
  { tag: [t.string, t.special(t.string), t.regexp], color: '#cfc39a' },
  { tag: [t.number, t.bool, t.null, t.atom], color: '#d9c46b' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#7a746a', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#f4f0e8' },
  { tag: [t.typeName, t.className, t.namespace], color: '#c8bfb0' },
  { tag: [t.propertyName, t.attributeName], color: '#d6cfc2' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: '#a39d92' },
  { tag: t.invalid, color: '#ff8a8a' },
])

function languageExtension(language: EditorLanguage) {
  if (language === 'python') return python()
  if (language === 'sql') return sql({ dialect: SQLite, upperCaseKeywords: true })
  return javascript({ typescript: language === 'typescript' })
}

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: EditorLanguage
  readOnly?: boolean
  /** Called with the pasted length, for the integrity record. */
  onPaste?: (chars: number) => void
  minHeight?: string
  maxHeight?: string
  ariaLabel: string
}

export default function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  onPaste,
  minHeight = '18rem',
  maxHeight,
  ariaLabel,
}: CodeEditorProps) {
  const extensions = useMemo(
    () => [
      languageExtension(language),
      syntaxHighlighting(nightHighlight),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
      EditorView.domEventHandlers({
        paste(event) {
          const text = event.clipboardData?.getData('text') ?? ''
          if (text && onPaste) onPaste(text.length)
          return false
        },
      }),
    ],
    [language, ariaLabel, onPaste]
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={nightTheme}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      minHeight={minHeight}
      maxHeight={maxHeight}
      basicSetup={{
        foldGutter: false,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        autocompletion: !readOnly,
        searchKeymap: false,
      }}
    />
  )
}
