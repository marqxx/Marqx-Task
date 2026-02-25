"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 mb-8 mt-2 px-1">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl border border-border bg-card/40 p-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-10" />
                </div>
            ))}
        </div>
    )
}

export function KanbanSkeleton() {
    return (
        <div className="flex gap-6 overflow-x-auto pb-4 px-1 min-h-[500px]">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="w-80 shrink-0 flex flex-col gap-4">
                    <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </div>
                    {[...Array(3)].map((_, j) => (
                        <div key={j} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                            <div className="flex gap-2">
                                <Skeleton className="h-4 w-12 rounded-full" />
                                <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

export function ListSkeleton() {
    return (
        <div className="flex flex-col gap-3 px-1">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
            ))}
        </div>
    )
}

export function CalendarSkeleton() {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}
