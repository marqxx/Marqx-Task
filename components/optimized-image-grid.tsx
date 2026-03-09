'use client'

import { useState, useEffect, useCallback } from 'react'
import { imagePreloader } from '@/lib/image-preloader'
import { PreloadedImage } from './preloaded-image'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

interface OptimizedImageGridProps {
  images: Array<{ id: string; url: string; fileName?: string }>
  className?: string
  itemClassName?: string
  onImageClick?: (image: { id: string; url: string; fileName?: string }) => void
  onImageDelete?: (imageId: string) => void
  maxPreload?: number
  priorityPreload?: number
  showDeleteButton?: boolean
  deleteButtonLabel?: string
  loadingStrategy?: 'immediate' | 'viewport' | 'lazy'
}

export function OptimizedImageGrid({
  images,
  className,
  itemClassName,
  onImageClick,
  onImageDelete,
  maxPreload = 12,
  priorityPreload = 3,
  showDeleteButton = false,
  deleteButtonLabel = 'ลบ',
  loadingStrategy = 'viewport'
}: OptimizedImageGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set())
  const [isPreloading, setIsPreloading] = useState(false)

  // Intersection Observer for viewport-based loading
  const [observer, setObserver] = useState<IntersectionObserver | null>(null)

  useEffect(() => {
    if (loadingStrategy === 'viewport') {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const imageId = entry.target.getAttribute('data-image-id')
              if (imageId) {
                setVisibleImages(prev => new Set(prev).add(imageId))
              }
            }
          })
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.1
        }
      )
      setObserver(obs)

      return () => obs.disconnect()
    }
  }, [loadingStrategy])

  // Preload priority images immediately
  useEffect(() => {
    const priorityImages = images.slice(0, priorityPreload)
    if (priorityImages.length > 0) {
      setIsPreloading(true)
      imagePreloader.preloadMultiple(priorityImages.map(img => img.url))
        .then(() => {
          setLoadedImages(prev => {
            const newSet = new Set(prev)
            priorityImages.forEach(img => newSet.add(img.id))
            return newSet
          })
          setIsPreloading(false)
        })
        .catch(() => setIsPreloading(false))
    }
  }, [images, priorityPreload])

  // Preload visible images
  useEffect(() => {
    if (loadingStrategy === 'viewport' && visibleImages.size > 0) {
      const visibleImageUrls = images
        .filter(img => visibleImages.has(img.id))
        .slice(0, maxPreload)
        .map(img => img.url)

      if (visibleImageUrls.length > 0) {
        imagePreloader.preloadMultiple(visibleImageUrls)
          .then(() => {
            setLoadedImages(prev => {
              const newSet = new Set(prev)
              visibleImages.forEach(id => newSet.add(id))
              return newSet
            })
          })
          .catch(() => {
            // Silently handle preloading errors
          })
      }
    }
  }, [visibleImages, images, maxPreload, loadingStrategy])

  // Batch preload remaining images with delay
  useEffect(() => {
    if (loadingStrategy === 'lazy' && images.length > priorityPreload) {
      const timer = setTimeout(() => {
        const remainingImages = images.slice(priorityPreload, maxPreload)
        if (remainingImages.length > 0) {
          imagePreloader.preloadMultiple(remainingImages.map(img => img.url))
            .then(() => {
              setLoadedImages(prev => {
                const newSet = new Set(prev)
                remainingImages.forEach(img => newSet.add(img.id))
                return newSet
              })
            })
            .catch(() => {
              // Silently handle preloading errors
            })
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [images, priorityPreload, maxPreload, loadingStrategy])

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId))
  }, [])

  if (images.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground text-center py-8", className)}>
        ยังไม่มีรูปภาพ
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {images.map((image) => (
        <div
          key={image.id}
          className={cn(
            "relative border rounded-md overflow-hidden cursor-pointer group",
            itemClassName
          )}
          onClick={() => onImageClick?.(image)}
          data-image-id={image.id}
          ref={(el) => {
            if (el && observer && loadingStrategy === 'viewport') {
              observer.observe(el)
            }
          }}
        >
          <PreloadedImage
            src={image.url}
            alt={image.fileName || image.id}
            className="w-full h-24 object-cover"
            priority={loadedImages.has(image.id)}
            fadeIn={true}
            showLoading={true}
            loadingClassName="h-24"
            onLoad={() => handleImageLoad(image.id)}
          />
          
          {showDeleteButton && onImageDelete && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] bg-white hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation()
                  onImageDelete(image.id)
                }}
              >
                {deleteButtonLabel}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default OptimizedImageGrid