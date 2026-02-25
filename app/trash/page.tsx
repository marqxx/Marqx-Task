"use client"

import { useState } from "react"
import { useTasksContext } from "@/components/tasks-provider"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { EventDetailDialog } from "@/components/event-detail-dialog"
import { Trash2, ArrowLeft, RotateCcw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from "date-fns"
import type { Task, CalendarEvent } from "@/lib/types"
import { PRIORITY_CONFIG } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ListSkeleton } from "@/components/loading-skeleton"

export default function TrashPage() {
    const { deletedTasks, deletedEvents, updateTask, updateEvent, loading } = useTasksContext()
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
    const [eventDetailOpen, setEventDetailOpen] = useState(false)

    const handleRestoreTask = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        await updateTask(id, { deletedAt: null } as any)
    }

    const handleRestoreEvent = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        await updateEvent(id, { deletedAt: null } as any)
    }

    const handleHardDeleteTask = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        try {
            await fetch(`/api/tasks/${id}?hard=true`, { method: "DELETE" })
        } catch {}
    }

    const handleHardDeleteEvent = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        try {
            await fetch(`/api/events/${id}?hard=true`, { method: "DELETE" })
        } catch {}
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md select-none">
                <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="size-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 shadow-sm">
                            <Trash2 className="size-5 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-base font-bold leading-none text-foreground tracking-tight">Trash</h1>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mt-1">
                                Deleted items are purged after 24 hours
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-12">
                {/* Deleted Tasks */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                            Tasks <span className="size-5 flex items-center justify-center bg-secondary text-[10px] rounded-full">{deletedTasks.length}</span>
                        </h2>
                    </div>

                    {loading ? (
                        <ListSkeleton />
                    ) : deletedTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border/60 bg-secondary/5">
                            <p className="text-xs text-muted-foreground font-medium">No deleted tasks</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {deletedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                                    className="group flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer"
                                >
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", PRIORITY_CONFIG[task.priority].className)}>
                                                {PRIORITY_CONFIG[task.priority].label}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">Deleted {task.deletedAt ? format(new Date(task.deletedAt), "HH:mm") : ""}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleRestoreTask(e, task.id)}
                                            className="size-8 text-primary hover:bg-primary/10"
                                            aria-label="Restore"
                                        >
                                            <RotateCcw className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleHardDeleteTask(e, task.id)}
                                            className="size-8 text-red-500 hover:bg-red-500/10"
                                            aria-label="Delete permanently"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Deleted Events */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        Events <span className="size-5 flex items-center justify-center bg-secondary text-[10px] rounded-full">{deletedEvents.length}</span>
                    </h2>

                    {loading ? (
                        <ListSkeleton />
                    ) : deletedEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border/60 bg-secondary/5">
                            <p className="text-xs text-muted-foreground font-medium">No deleted events</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {deletedEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card cursor-pointer"
                                    onClick={() => { setSelectedEvent(event); setEventDetailOpen(true) }}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                                            <Calendar className="size-4" />
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {(() => {
                                                    const firstValid = (event.dates || [])
                                                        .map((d) => new Date(d as any))
                                                        .find((d) => !isNaN(d.getTime()))
                                                    return firstValid ? format(firstValid, "MMM d, yyyy") : "-"
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleRestoreEvent(e, event.id)}
                                            className="size-8 text-primary hover:bg-primary/10"
                                            aria-label="Restore"
                                        >
                                            <RotateCcw className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleHardDeleteEvent(e, event.id)}
                                            className="size-8 text-red-500 hover:bg-red-500/10"
                                            aria-label="Delete permanently"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <TaskDetailDialog
                task={selectedTask}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onUpdate={updateTask}
                onDelete={() => { }}
                readOnly
            />
            <EventDetailDialog
                event={selectedEvent}
                open={eventDetailOpen}
                onOpenChange={setEventDetailOpen}
                onUpdate={updateEvent}
                onDelete={() => {}}
                showDeleteButton={false}
            />
        </main>
    )
}
