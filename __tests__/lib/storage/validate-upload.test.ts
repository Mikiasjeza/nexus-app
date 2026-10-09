import { MAX_UPLOAD_BYTES, validateUpload } from '@/lib/storage/validate-upload'

const bytes = (...parts: Array<string | number[]>) =>
  Buffer.concat(
    parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'binary') : Buffer.from(p)))
  )

const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'rest of image')
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0], 'rest of image')

describe('validateUpload', () => {
  it('accepts files whose contents match their extension', () => {
    expect(validateUpload('photo.png', PNG)).toEqual({ ok: true, mimeType: 'image/png' })
    expect(validateUpload('photo.JPG', JPEG)).toEqual({ ok: true, mimeType: 'image/jpeg' })
    expect(validateUpload('doc.pdf', bytes('%PDF-1.7 ...'))).toEqual({
      ok: true,
      mimeType: 'application/pdf',
    })
    expect(validateUpload('clip.mp4', bytes([0, 0, 0, 0x20], 'ftypisom'))).toEqual({
      ok: true,
      mimeType: 'video/mp4',
    })
    expect(validateUpload('notes.md', bytes('# Notes\n'))).toEqual({
      ok: true,
      mimeType: 'text/markdown',
    })
    expect(validateUpload('data.json', bytes('{"a":1}'))).toEqual({
      ok: true,
      mimeType: 'application/json',
    })
  })

  it('rejects an HTML page renamed to an image', () => {
    const result = validateUpload('cat.png', bytes('<html><script>alert(1)</script></html>'))
    expect(result.ok).toBe(false)
  })

  it('rejects a real image with the wrong extension', () => {
    expect(validateUpload('photo.pdf', PNG).ok).toBe(false)
    expect(validateUpload('photo.jpg', PNG).ok).toBe(false)
  })

  it('rejects extensions outside the allowlist, including html and svg', () => {
    for (const name of ['page.html', 'logo.svg', 'run.exe', 'script.js', 'noextension']) {
      expect(validateUpload(name, bytes('hello')).ok).toBe(false)
    }
  })

  it('rejects binary content posing as text', () => {
    expect(validateUpload('notes.txt', bytes('MZ', [0x90, 0x00, 0x03])).ok).toBe(false)
    expect(validateUpload('notes.txt', bytes([0xc3, 0x28])).ok).toBe(false) // invalid UTF-8
  })

  it('rejects .json that does not parse', () => {
    expect(validateUpload('data.json', bytes('{not json')).ok).toBe(false)
  })

  it('rejects empty and oversized files', () => {
    expect(validateUpload('empty.txt', Buffer.alloc(0)).ok).toBe(false)
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_UPLOAD_BYTES)])
    expect(validateUpload('big.png', big).ok).toBe(false)
  })

  it('rejects overly long file names', () => {
    expect(validateUpload(`${'a'.repeat(300)}.png`, PNG).ok).toBe(false)
  })
})
