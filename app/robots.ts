import { MetadataRoute } from 'next'
import { getAppUrl } from '@/lib/config/env'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl()
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/settings/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
