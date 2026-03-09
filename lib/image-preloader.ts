interface ImagePreloaderOptions {
  timeout?: number
  crossOrigin?: 'anonymous' | 'use-credentials'
}

interface PreloadedImage {
  url: string
  loaded: boolean
  error?: string
}

class ImagePreloader {
  private cache = new Map<string, HTMLImageElement>()
  private loading = new Map<string, Promise<HTMLImageElement>>()
  private options: ImagePreloaderOptions

  constructor(options: ImagePreloaderOptions = {}) {
    this.options = {
      timeout: 10000,
      crossOrigin: 'anonymous',
      ...options
    }
  }

  /**
   * Preload a single image
   */
  async preload(url: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!
    }

    // Return existing loading promise if already loading
    if (this.loading.has(url)) {
      return this.loading.get(url)!
    }

    // Create new loading promise
    const loadingPromise = this.loadImage(url)
    this.loading.set(url, loadingPromise)

    try {
      const img = await loadingPromise
      this.cache.set(url, img)
      this.loading.delete(url)
      return img
    } catch (error) {
      this.loading.delete(url)
      throw error
    }
  }

  /**
   * Preload multiple images in parallel
   */
  async preloadMultiple(urls: string[]): Promise<PreloadedImage[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.preload(url).then(() => ({ url, loaded: true })))
    )

    return results.map((result, index) => {
      const url = urls[index]
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return { url, loaded: false, error: result.reason?.message || 'Failed to load image' }
      }
    })
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(url: string): boolean {
    return this.cache.has(url)
  }

  /**
   * Get preloaded image element
   */
  getImage(url: string): HTMLImageElement | undefined {
    return this.cache.get(url)
  }

  /**
   * Clear cache for specific URLs or all
   */
  clear(urls?: string[]): void {
    if (urls) {
      urls.forEach(url => {
        this.cache.delete(url)
        this.loading.delete(url)
      })
    } else {
      this.cache.clear()
      this.loading.clear()
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      if (this.options.crossOrigin) {
        img.crossOrigin = this.options.crossOrigin
      }

      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout after ${this.options.timeout}ms`))
      }, this.options.timeout)

      img.onload = () => {
        clearTimeout(timeoutId)
        resolve(img)
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        reject(new Error(`Failed to load image: ${url}`))
      }

      img.src = url
    })
  }
}

// Create singleton instance
const imagePreloader = new ImagePreloader()

// Export singleton and class for custom instances
export { imagePreloader, ImagePreloader }
export type { ImagePreloaderOptions, PreloadedImage }