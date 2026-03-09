'use client'

import { useState, useEffect, useCallback } from 'react'
import { imagePreloader, PreloadedImage } from '@/lib/image-preloader'

interface UseImagePreloaderOptions {
  priority?: boolean
  timeout?: number
}

interface UseImagePreloaderReturn {
  isLoading: boolean
  isError: boolean
  isPreloaded: boolean
  retry: () => void
}

/**
 * React hook for preloading a single image
 */
export function useImagePreloader(
  src: string,
  options: UseImagePreloaderOptions = {}
): UseImagePreloaderReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isPreloaded, setIsPreloaded] = useState(false)

  const { priority = false, timeout } = options

  const preload = useCallback(async () => {
    if (!src) {
      setIsLoading(false)
      setIsError(true)
      return
    }

    setIsLoading(true)
    setIsError(false)

    try {
      // Check if already preloaded
      if (imagePreloader.isPreloaded(src)) {
        setIsLoading(false)
        setIsPreloaded(true)
        return
      }

      // Preload the image
      await imagePreloader.preload(src)
      setIsLoading(false)
      setIsPreloaded(true)
    } catch (error) {
      setIsLoading(false)
      setIsError(true)
    }
  }, [src, priority, timeout])

  useEffect(() => {
    preload()
  }, [preload])

  const retry = useCallback(() => {
    preload()
  }, [preload])

  return {
    isLoading,
    isError,
    isPreloaded,
    retry
  }
}

interface UseBatchImagePreloaderReturn {
  isLoading: boolean
  isError: boolean
  progress: number
  results: PreloadedImage[]
  retry: () => void
}

/**
 * React hook for preloading multiple images with progress tracking
 */
export function useBatchImagePreloader(
  urls: string[],
  options: UseImagePreloaderOptions = {}
): UseBatchImagePreloaderReturn {
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<PreloadedImage[]>([])

  const { priority = false } = options

  const preloadBatch = useCallback(async () => {
    if (!urls || urls.length === 0) {
      setIsLoading(false)
      setProgress(1)
      setResults([])
      return
    }

    setIsLoading(true)
    setIsError(false)
    setProgress(0)

    try {
      // For priority images, preload all at once
      if (priority) {
        const results = await imagePreloader.preloadMultiple(urls)
        const loadedCount = results.filter(r => r.loaded).length
        setProgress(loadedCount / urls.length)
        setResults(results)
      } else {
        // For non-priority, preload in chunks for better UX
        const chunkSize = 3
        const chunks = []
        for (let i = 0; i < urls.length; i += chunkSize) {
          chunks.push(urls.slice(i, i + chunkSize))
        }

        let loadedCount = 0
        const allResults: PreloadedImage[] = []

        for (const chunk of chunks) {
          const chunkResults = await imagePreloader.preloadMultiple(chunk)
          allResults.push(...chunkResults)
          loadedCount += chunkResults.filter(r => r.loaded).length
          setProgress(loadedCount / urls.length)
        }

        setResults(allResults)
      }

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      setIsError(true)
    }
  }, [urls, priority])

  useEffect(() => {
    preloadBatch()
  }, [preloadBatch])

  const retry = useCallback(() => {
    preloadBatch()
  }, [preloadBatch])

  return {
    isLoading,
    isError,
    progress,
    results,
    retry
  }
}

/**
 * Preload images for a specific component on mount
 */
export function useComponentImagePreloader(
  imageUrls: string[],
  options: UseImagePreloaderOptions = {}
) {
  const { isLoading, isError, progress, results } = useBatchImagePreloader(
    imageUrls,
    options
  )

  return {
    imagesReady: !isLoading && !isError,
    isLoading,
    isError,
    progress,
    results
  }
}