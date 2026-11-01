import { renderNexusIcon } from '@/lib/brand/icon-image'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS rounds the corners itself, so the square stays square here.
export default function AppleIcon() {
  return renderNexusIcon(180, { rounded: false })
}
