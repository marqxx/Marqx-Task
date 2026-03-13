'use client'

import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react'
import { imagePreloader } from '@/lib/image-preloader'
import { cn } from '@/lib/utils'
import { Spinner } from './ui/spinner'

type PreloadedImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "className" | "width" | "height" | "onLoad" | "onError"
> & {
  src: string
  alt?: string
  className?: string
  width?: number | string
  height?: number | string
  onLoad?: () => void
  onError?: () => void
  showLoading?: boolean
  loadingClassName?: string
  fadeIn?: boolean
  priority?: boolean
}

export function PreloadedImage({
  src,
  alt = '',
  className,
  width,
  height,
  onLoad,
  onError,
  showLoading = true,
  loadingClassName,
  fadeIn = true,
  priority = false,
  ...imgProps
}: PreloadedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(!fadeIn)
  const imgRef = useRef<HTMLImageElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!src) {
      setIsLoading(false)
      setHasError(true)
      return
    }

    setIsLoading(true)
    setHasError(false)
    setIsVisible(!fadeIn)

    const loadImage = async () => {
      try {
        // Check if already preloaded
        const preloadedImg = imagePreloader.getImage(src)
        if (preloadedImg) {
          if (mountedRef.current) {
            setIsLoading(false)
            setIsVisible(true)
            if (imgRef.current) {
              imgRef.current.src = src
            }
            onLoad?.()
          }
          return
        }

        // For priority images, preload immediately
        if (priority) {
          await imagePreloader.preload(src)
          if (mountedRef.current) {
            setIsLoading(false)
            setIsVisible(true)
            if (imgRef.current) {
              imgRef.current.src = src
            }
            onLoad?.()
          }
          return
        }

        // For non-priority images, use native loading with preloading in background
        if (imgRef.current) {
          imgRef.current.onload = () => {
            if (mountedRef.current) {
              setIsLoading(false)
              setIsVisible(true)
              onLoad?.()
            }
          }

          imgRef.current.onerror = () => {
            if (mountedRef.current) {
              setIsLoading(false)
              setHasError(true)
              onError?.()
            }
          }

          imgRef.current.src = src

          // Preload in background for future use
          imagePreloader.preload(src).catch(() => {
            // Silently handle preloading errors
          })
        }
      } catch (error) {
        if (mountedRef.current) {
          setIsLoading(false)
          setHasError(true)
          onError?.()
        }
      }
    }

    loadImage()

    return () => {
      if (imgRef.current) {
        imgRef.current.onload = null
        imgRef.current.onerror = null
      }
    }
  }, [src, priority, fadeIn, onLoad, onError])

  if (hasError) {
    return (
      <div 
        className={cn(
          "image-error",
          className
        )}
        style={{ width, height }}
      >
        <span className="text-xs">Failed to load image</span>
      </div>
    )
  }

  return (
    <div className="relative" style={{ width, height }}>
      {showLoading && isLoading && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center image-loading-skeleton",
          loadingClassName
        )}>
          <Spinner className="size-6" />
        </div>
      )}
      <img
        ref={imgRef}
        {...imgProps}
        src={priority ? undefined : src}
        alt={alt}
        className={cn(
          "image-transition",
          isVisible ? "image-loaded" : (fadeIn ? "image-loading" : ""),
          className
        )}
        style={{
          ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
          ...(height && { height: typeof height === 'number' ? `${height}px` : height })
        }}
      />
    </div>
  )
}

interface PreloadedImageGridProps {
  images: Array<{ id: string; url: string; fileName?: string | null }>
  className?: string
  itemClassName?: string
  onImageClick?: (image: { id: string; url: string; fileName?: string | null }) => void
  priority?: boolean
}

export function PreloadedImageGrid({
  images,
  className,
  itemClassName,
  onImageClick,
  priority = false
}: PreloadedImageGridProps) {
  const [preloadedCount, setPreloadedCount] = useState(0)

  useEffect(() => {
    // Preload images in batches for better performance
    const preloadImages = async () => {
      if (images.length === 0) return

      // Preload first 3 images immediately if priority
      const immediateCount = priority ? Math.min(3, images.length) : 0
      const immediateImages = images.slice(0, immediateCount)
      
      if (immediateImages.length > 0) {
        await imagePreloader.preloadMultiple(immediateImages.map(img => img.url))
        setPreloadedCount(immediateCount)
      }

      // Preload remaining images with delay
      if (images.length > immediateCount) {
        const remainingImages = images.slice(immediateCount)
        setTimeout(() => {
          imagePreloader.preloadMultiple(remainingImages.map(img => img.url))
            .then(() => setPreloadedCount(images.length))
            .catch(() => {
              // Silently handle preloading errors
            })
        }, 1000)
      }
    }

    preloadImages()
  }, [images, priority])

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {images.map((img, index) => (
        <div
          key={img.id}
          className={cn(
            "relative border rounded-md overflow-hidden cursor-pointer",
            itemClassName
          )}
          onClick={() => onImageClick?.(img)}
        >
          <PreloadedImage
            src={img.url}
            alt={img.fileName || img.id}
            className="w-full h-24 object-cover"
            priority={priority || index < 3}
            fadeIn={true}
            showLoading={true}
            loadingClassName="h-24"
          />
        </div>
      ))}
    </div>
  )
}
