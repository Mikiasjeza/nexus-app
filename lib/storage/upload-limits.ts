/**
 * Evidence upload limits, shared by the upload form (for instant feedback)
 * and the server validator in ./validate-upload.ts (which is authoritative).
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB

export const UPLOAD_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'mp4',
  'webm',
  'txt',
  'md',
  'json',
] as const

/** Formats the AI can read directly; the rest are judged by name and description. */
export const TEXT_UPLOAD_EXTENSIONS = ['txt', 'md', 'json'] as const

export function fileExtension(fileName: string): string {
  return fileName.includes('.') ? (fileName.split('.').pop() ?? '').toLowerCase() : ''
}
