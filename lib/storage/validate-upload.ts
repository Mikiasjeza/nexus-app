/**
 * Evidence upload validation.
 *
 * The browser-supplied MIME type is never trusted: the extension picks the
 * expected format, the file's leading bytes must match it, and the MIME type
 * we store is derived here. This blocks e.g. an HTML page renamed to .png or
 * declared as text/html from being served back out of the bucket.
 */

import { TextDecoder } from 'util'
import { MAX_UPLOAD_BYTES } from './upload-limits'

export { MAX_UPLOAD_BYTES }
const MAX_FILE_NAME_LENGTH = 255

type Format = {
  mime: string
  matches: (bytes: Uint8Array) => boolean
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0))

function isUtf8Text(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return true
  } catch {
    return false
  }
}

const jpeg: Format = { mime: 'image/jpeg', matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) }

const FORMATS: Record<string, Format> = {
  jpg: jpeg,
  jpeg,
  png: {
    mime: 'image/png',
    matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  gif: {
    mime: 'image/gif',
    matches: (b) => startsWith(b, ascii('GIF87a')) || startsWith(b, ascii('GIF89a')),
  },
  webp: {
    mime: 'image/webp',
    matches: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
  },
  pdf: { mime: 'application/pdf', matches: (b) => startsWith(b, ascii('%PDF-')) },
  mp4: { mime: 'video/mp4', matches: (b) => startsWith(b, ascii('ftyp'), 4) },
  webm: { mime: 'video/webm', matches: (b) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]) },
  txt: { mime: 'text/plain', matches: isUtf8Text },
  md: { mime: 'text/markdown', matches: isUtf8Text },
  json: {
    mime: 'application/json',
    matches: (b) => {
      if (!isUtf8Text(b)) return false
      try {
        JSON.parse(new TextDecoder('utf-8').decode(b))
        return true
      } catch {
        return false
      }
    },
  },
}

export const ALLOWED_EXTENSIONS = Object.keys(FORMATS)

/**
 * Extensions a server or browser might execute. They are never allowed, and
 * are refused anywhere in the name too ("shell.php.png", "page.html.txt"), so
 * a misconfigured server down the line can't be tricked into running them.
 */
const DANGEROUS_EXTENSIONS = new Set([
  'php',
  'php3',
  'php4',
  'php5',
  'php7',
  'phtml',
  'phar',
  'jsp',
  'jspx',
  'jsf',
  'asp',
  'aspx',
  'ashx',
  'asmx',
  'cer',
  'cgi',
  'pl',
  'py',
  'rb',
  'exe',
  'dll',
  'com',
  'msi',
  'scr',
  'bat',
  'cmd',
  'ps1',
  'sh',
  'bash',
  'vbs',
  'jar',
  'war',
  'js',
  'mjs',
  'html',
  'htm',
  'xhtml',
  'shtml',
  'svg',
  'xml',
  'hta',
  'htaccess',
  'swf',
])

/** Control and bidirectional-override characters used to disguise file names. */
const DECEPTIVE_CHARACTERS = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/

export type UploadCheck = { ok: true; mimeType: string } | { ok: false; error: string }

export function validateUpload(fileName: string, bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) {
    return { ok: false, error: 'File is empty' }
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File too large. Max size: ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` }
  }
  if (!fileName || fileName.length > MAX_FILE_NAME_LENGTH || DECEPTIVE_CHARACTERS.test(fileName)) {
    return { ok: false, error: 'Invalid file name' }
  }

  const nameParts = fileName.toLowerCase().split('.').slice(1)
  if (nameParts.some((part) => DANGEROUS_EXTENSIONS.has(part.trim()))) {
    return { ok: false, error: 'This kind of file is not allowed' }
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  const format = fileName.includes('.') ? FORMATS[extension] : undefined
  if (!format) {
    return {
      ok: false,
      error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')}`,
    }
  }

  if (!format.matches(bytes)) {
    return { ok: false, error: `File contents don't match a .${extension} file` }
  }

  return { ok: true, mimeType: format.mime }
}
