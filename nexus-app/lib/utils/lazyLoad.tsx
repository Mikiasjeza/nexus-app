'use client'

import { lazy, Suspense, ComponentType } from 'react'
import Loader from '@/components/UI/Loader'

// Generic lazy loading wrapper with loading state
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): ComponentType<P> {
  const LazyComponent = lazy(importFn)
  
  function LazyWrapper(props: P) {
    return (
      <Suspense fallback={<Loader />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    )
  }
  
  LazyWrapper.displayName = 'LazyWrapper'
  
  return LazyWrapper as ComponentType<P>
}
