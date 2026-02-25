"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { CalendarIcon, Pencil, Trash2, ArrowUpDown, CheckCircle2, ChevronDown, ChevronRight, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusCircle } from "@/components/status-circle"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Task, Status } from "@/lib/types"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types"
import { cn } from "@/lib/utils"
import { DeleteTaskDialog } from "@/components/delete-task-dialog"
import { useTasksContext } from "@/components/tasks-provider"

type SortMode = "priority" | "date-asc" | "date-desc" | "updated"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: "priority", label: "Priority" },
    { value: "date-asc", label: "Due date (earliest)" },
    { value: "date-desc", label: "Due date (latest)" },
    { value: "updated", label: "Recently updated" },
]

const STATUS_ORDER: Status[] = ["todo", "inprogress", "test", "complete", "backlog"]

const DOT_COLOR: Record<Status, string> = {
    backlog: "bg-violet-400",
    todo: "bg-slate-400",
    inprogress: "bg-blue-500",
    test: "bg-amber-500",
    complete: "bg-emerald-400",
    done: "bg-emerald-500",
}

interface TaskListProps {
    tasks: Task[]
    onSelect: (task: Task) => void
    onEdit: (task: Task) => void
    onDelete: (id: string) => void
    onUpdateStatus?: (id: string, status: Status) => void
}

interface TaskItemProps {
    task: Task
    onSelect: (task: Task) => void
    onEdit: (task: Task) => void
    onDelete: (id: string) => void
    onUpdateStatus?: (id: string, status: Status) => void
}

export function TaskItem({ task, onSelect, onEdit, onDelete, onUpdateStatus }: TaskItemProps) {
    const priority = PRIORITY_CONFIG[task.priority]
    const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== "done"
    const statusConfig = STATUS_CONFIG[task.status]

    return (
        <div
            key={task.id}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
            onClick={() => onSelect(task)}
            onKeyDown={(e) => { if (e.key === "Enter") onSelect(task) }}
            className="group flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-secondary/50 active:cursor-grabbing cursor-grab"
        >
            {/* Status icon — clickable dropdown */}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "shrink-0 rounded-md p-1 -m-1 transition-colors hover:bg-secondary",
                            statusConfig.color,
                        )}
                        title="Change status"
                    >
                        <StatusCircle status={task.status} />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start" side="bottom">
                    {STATUS_ORDER.map((s) => {
                        const sConf = STATUS_CONFIG[s]
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onUpdateStatus?.(task.id, s)
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary",
                                    task.status === s && "bg-secondary font-medium",
                                )}
                            >
                                <StatusCircle status={s} />
                                <span className="text-foreground">
                                    {sConf.label}
                                </span>
                                {task.status === s && (
                                    <CheckCircle2 className="size-3 ml-auto text-primary" />
                                )}
                            </button>
                        )
                    })}
                </PopoverContent>
            </Popover>

            {/* Task info */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium text-foreground truncate",
                    task.status === "done" && "line-through text-muted-foreground",
                )}>
                    {task.title}
                </p>
                {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {task.description}
                    </p>
                )}
            </div>

            {/* Badges */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 w-[52px] justify-center", priority.className)}>
                    {priority.label}
                </Badge>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 dark:bg-secondary/40 text-muted-foreground w-[64px] text-center truncate border border-border/10">
                    {task.category}
                </span>
            </div>

            {/* Due date */}
            <div className="hidden md:flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground w-[70px]">
                {task.dueDate ? (
                    <span className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                        <CalendarIcon className="size-3" />
                        {format(task.dueDate, "MMM d")}
                    </span>
                ) : (
                    <span className="text-muted-foreground/30">—</span>
                )}
            </div>

            {/* Avatars */}
            <div className="hidden sm:flex items-center shrink-0 justify-end w-auto">
                {/* Creator Avatar - only show added by in list view */}
                <Avatar className="size-6 border border-background bg-primary/10 ring-1 ring-border shadow-sm z-10" title={task.createdBy ? `Added by ${task.createdBy.name}` : "System / Admin"}>
                    {task.createdBy ? (
                        <>
                            <AvatarImage src={task.createdBy.image ?? ""} alt={task.createdBy.name ?? ""} />
                            <AvatarFallback className="text-[9px] font-medium text-primary">
                                {task.createdBy.name?.[0]?.toUpperCase() ?? "U"}
                            </AvatarFallback>
                        </>
                    ) : (
                        <AvatarFallback className="text-[9px] font-medium text-primary">
                            <User className="size-3" />
                        </AvatarFallback>
                    )}
                </Avatar>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                    className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border hover:border-border transition-all"
                >
                    <Pencil className="size-3" />
                    <span className="sr-only">Edit task</span>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(task.id)
                    }}
                    className="size-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:border hover:border-red-500/20 transition-all"
                >
                    <Trash2 className="size-3" />
                    <span className="sr-only">Delete task</span>
                </Button>
            </div>
        </div>
    )
}

export function TaskList({ tasks, onSelect, onEdit, onDelete, onUpdateStatus }: TaskListProps) {
    const [sortMode, setSortMode] = useState<SortMode>("priority")
    const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set())
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
    const [dragCounters, setDragCounters] = useState<Record<string, number>>({})

    const handleDragEnter = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        setDragCounters(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
        setDragOverStatus(id)
    }

    const handleDragLeave = (e: React.DragEvent, id: string) => {
        setDragCounters(prev => {
            const next = (prev[id] || 0) - 1
            if (next <= 0) setDragOverStatus(null)
            return { ...prev, [id]: next }
        })
    }

    const handleDrop = (e: React.DragEvent, id: string, targetStatus: Status) => {
        e.preventDefault()
        setDragCounters(prev => ({ ...prev, [id]: 0 }))
        setDragOverStatus(null)
        const taskId = e.dataTransfer.getData("text/plain")
        if (taskId && onUpdateStatus) {
            onUpdateStatus(taskId, targetStatus)
        }
    }

    const toggleCollapse = (id: string) => {
        setCollapsedStatuses((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const groupedAndSorted = useMemo(() => {
        type GroupDef = { id: string; status: Status; label: string; dot: string; color: string; bg: string; tasks: Task[] }
        const groups: GroupDef[] = []

        const sortTasks = (taskList: Task[]) => {
            const sorted = [...taskList]
            switch (sortMode) {
                case "priority":
                    sorted.sort(
                        (a, b) =>
                            PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder ||
                            b.updatedAt.getTime() - a.updatedAt.getTime(),
                    )
                    break
                case "date-asc":
                    sorted.sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0
                        if (!a.dueDate) return 1
                        if (!b.dueDate) return -1
                        return a.dueDate.getTime() - b.dueDate.getTime()
                    })
                    break
                case "date-desc":
                    sorted.sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0
                        if (!a.dueDate) return 1
                        if (!b.dueDate) return -1
                        return b.dueDate.getTime() - a.dueDate.getTime()
                    })
                    break
                case "updated":
                    sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                    break
            }
            return sorted
        }

        for (const status of STATUS_ORDER) {
            const statusTasks = tasks.filter((t) => t.status === status)

            groups.push({
                id: status,
                status,
                label: STATUS_CONFIG[status].label,
                dot: DOT_COLOR[status],
                color: STATUS_CONFIG[status].color,
                bg: STATUS_CONFIG[status].bg,
                tasks: sortTasks(statusTasks)
            })
        }

        return groups
    }, [tasks, sortMode])

    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">All Tasks</h3>
                    <span className="text-xs text-muted-foreground font-mono bg-secondary rounded-full px-2 py-0.5">
                        {tasks.length}
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs text-muted-foreground h-7">
                            <ArrowUpDown className="size-3" />
                            {SORT_OPTIONS.find((o) => o.value === sortMode)?.label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        {SORT_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                onClick={() => setSortMode(opt.value)}
                                className={cn(sortMode === opt.value && "bg-secondary font-medium")}
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Grouped task sections */}
            {tasks.length === 0 ? (
                <div className="rounded-xl border border-border bg-card shadow-sm flex items-center justify-center py-16 text-muted-foreground/40 text-center flex-col gap-2">
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs">Create a new task to get started.</p>
                </div>
            ) : (
                groupedAndSorted.map((group) => {
                    const { id, status, tasks: statusTasks, label, color, dot } = group
                    const isCollapsed = collapsedStatuses.has(id)

                    return (
                        <div
                            key={id}
                            className={cn(
                                "rounded-xl border bg-card shadow-sm overflow-hidden transition-colors",
                                dragOverStatus === id ? "border-primary bg-secondary/30 ring-1 ring-primary" : "border-border"
                            )}
                            onDragEnter={(e) => handleDragEnter(e, id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragLeave={(e) => handleDragLeave(e, id)}
                            onDrop={(e) => handleDrop(e, id, status)}
                        >
                            {/* Status section header */}
                            <button
                                type="button"
                                onClick={() => toggleCollapse(id)}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-secondary/50 transition-colors"
                            >
                                <div className={cn("shrink-0 transition-transform", isCollapsed ? "" : "")}>
                                    {isCollapsed ? (
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="size-4 text-muted-foreground" />
                                    )}
                                </div>
                                <div className={cn("size-2.5 rounded-full shrink-0", dot)} />
                                <span className={cn("text-sm font-semibold", color)}>
                                    {label}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono bg-secondary rounded-full px-2 py-0.5 ml-1">
                                    {statusTasks.length}
                                </span>
                            </button>

                            {/* Task rows */}
                            {!isCollapsed && (
                                <div className="border-t border-border divide-y divide-border min-h-6">
                                    {statusTasks.length === 0 ? (
                                        <div className="flex items-center justify-center py-5 text-muted-foreground/40 pointer-events-none">
                                            <p className="text-xs">No tasks. Drop here.</p>
                                        </div>
                                    ) : (
                                        statusTasks.map((task) => (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                onSelect={onSelect}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                                onUpdateStatus={onUpdateStatus}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    )
}
