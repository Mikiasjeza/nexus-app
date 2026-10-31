import { renderNexusIcon } from '@/lib/brand/icon-image'

// Browser tab icon plus the sizes the web app manifest asks for.
const SIZES = [32, 192, 512] as const

export function generateImageMetadata() {
  return SIZES.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: 'image/png',
  }))
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const size = Number(await id)
  return renderNexusIcon(SIZES.includes(size as (typeof SIZES)[number]) ? size : 32)
}
