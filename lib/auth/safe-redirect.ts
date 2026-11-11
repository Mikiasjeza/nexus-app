/**
 * Where to send someone after they sign in. Only paths inside this site are
 * allowed, so a crafted "?next=" link can never bounce a person to another
 * site. Safe to use in the browser and on the server.
 */

const MAX_LENGTH = 512
const PLACEHOLDER_ORIGIN = 'https://nexus.invalid'

export function safeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || value.length > MAX_LENGTH) return fallback
  // One leading slash, never "//host" or "/\host", and no backslashes or
  // control characters anywhere (browsers read "\" as "/").
  if (!/^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/.test(value)) return fallback
  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
    const path = `${url.pathname}${url.search}${url.hash}`
    // "/..//host" normalises to "//host": check the result as well.
    return /^\/(?![/\\])/.test(path) ? path : fallback
  } catch {
    return fallback
  }
}
