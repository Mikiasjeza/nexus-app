import { renderNexusIcon } from '@/lib/brand/icon-image'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// A plain square: iOS rounds the corners itself.
export default function AppleIcon() {
  return renderNexusIcon(180)
}
