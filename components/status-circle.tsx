"use client"

import type { Status } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Linear-style SVG circle indicator for task status.
 * - storage (backlog): dashed circle (gray)
 * - todo:       empty circle (slate)
 * - inprogress: half-filled animated circle (blue)
 * - test:       three-quarter circle (amber)
 * - done:       filled circle with check (green)
 */
export function StatusCircle({ status, className }: { status: Status; className?: string }) {
    const size = 18

    switch (status) {
        case "backlog":
            return (
                <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)}>
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        strokeDasharray="3 2" className="text-slate-400" />
                </svg>
            )
        case "todo":
            return (
                <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)}>
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-slate-400" />
                </svg>
            )
        case "inprogress":
            return (
                <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)}>
                    {/* Background circle */}
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-blue-200 dark:text-blue-900" />
                    {/* Animated progress arc — half circle */}
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        strokeDasharray="22 44" strokeDashoffset="0" strokeLinecap="round"
                        className="text-blue-500"
                        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }} />
                    {/* Center dot */}
                    <circle cx="9" cy="9" r="2" fill="currentColor" className="text-blue-500" />
                </svg>
            )
        case "test":
            return (
                <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)}>
                    {/* Background circle */}
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        className="text-amber-200 dark:text-amber-900" />
                    {/* Three-quarter arc */}
                    <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"
                        strokeDasharray="33 44" strokeDashoffset="0" strokeLinecap="round"
                        className="text-amber-500"
                        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }} />
                </svg>
            )
        case "complete":
        case "done":
            return (
                <svg width={size} height={size} viewBox="0 0 18 18" className={cn("shrink-0", className)}>
                    <circle cx="9" cy="9" r="7.5" fill="currentColor" className="text-emerald-500" />
                    <path d="M5.5 9.5L7.5 11.5L12.5 6.5" fill="none" stroke="white" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
    }
}
