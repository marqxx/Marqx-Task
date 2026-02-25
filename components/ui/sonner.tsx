'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import type React from 'react'
import { cn } from '@/lib/utils'

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(
            'rounded-lg border border-slate-800/80 bg-slate-950/95 text-slate-50 shadow-md px-3 py-2 text-xs gap-1',
            toastOptions?.classNames?.toast,
          ),
          title: cn('text-xs font-semibold tracking-tight', toastOptions?.classNames?.title),
          description: cn(
            'text-[11px] text-slate-200/80 leading-snug',
            toastOptions?.classNames?.description,
          ),
          icon: cn('text-emerald-400', toastOptions?.classNames?.icon),
          closeButton: cn(
            'text-slate-400 hover:text-slate-100 transition-colors',
            toastOptions?.classNames?.closeButton,
          ),
          actionButton: cn(
            'bg-emerald-500 text-white hover:bg-emerald-400',
            toastOptions?.classNames?.actionButton,
          ),
        },
      }}
      closeButton
      {...props}
    />
  )
}

export { Toaster }
