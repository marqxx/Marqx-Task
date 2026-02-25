"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarIcon, Pencil, Trash2, ArrowUpDown, User } from "lucide-react"
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

interface KanbanColumnProps {
  status: Status
  tasks: Task[]
  onSelect: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: Status) => void
}

export function KanbanColumn({ status, tasks, onSelect, onEdit, onDelete, onUpdateStatus }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status]
  const [sortMode, setSortMode] = useState<SortMode>("priority")
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter((prev) => prev + 1)
    setIsDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    setDragCounter((prev) => {
      const next = prev - 1
      if (next === 0) setIsDragOver(false)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragCounter(0)
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData("text/plain")
    if (taskId) {
      onUpdateStatus(taskId, status)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId)
  }

  const sorted = useMemo(() => {
    const arr = [...tasks]
    switch (sortMode) {
      case "priority":
        arr.sort(
          (a, b) =>
            PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder ||
            b.updatedAt.getTime() - a.updatedAt.getTime(),
        )
        break
      case "date-asc":
        arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.getTime() - b.dueDate.getTime()
        })
        break
      case "date-desc":
        arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return b.dueDate.getTime() - a.dueDate.getTime()
        })
        break
      case "updated":
        arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        break
    }
    return arr
  }, [tasks, sortMode])

  const dotColor = {
    backlog: "bg-violet-400",
    todo: "bg-slate-400",
    inprogress: "bg-blue-500",
    test: "bg-amber-500",
    complete: "bg-emerald-400",
    done: "bg-emerald-500",
  }[status]

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card shadow-sm min-w-0 transition-colors",
        isDragOver ? "border-primary bg-secondary/30 ring-1 ring-primary" : "border-border"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 select-none">
        <div className={cn("size-2.5 rounded-full", dotColor)} />
        <h3 className={cn("text-sm font-semibold", config.color)}>{config.label}</h3>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-mono bg-secondary rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                <ArrowUpDown className="size-3.5" />
                <span className="sr-only">Sort tasks</span>
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
        </span>
      </div>

      {/* Task cards with custom scrollbar */}
      <div
        className={cn(
          "flex-1 custom-scrollbar flex flex-col gap-2 p-3 min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto"
        )}
      >
        {sorted.length === 0 ? (
          <div className="flex h-full items-center justify-center py-10 text-muted-foreground/40 pointer-events-none border-2 border-transparent border-dashed rounded-lg">
            <p className="text-xs">No tasks. Drop here.</p>
          </div>
        ) : (
          sorted.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority]
            const isOverdue = task.dueDate && task.dueDate < new Date()

            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => onSelect(task)}
                onKeyDown={(e) => { if (e.key === "Enter") onSelect(task) }}
                className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 active:cursor-grabbing cursor-grab"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                    {task.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                      className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border hover:border-border transition-all"
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
                      className="size-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:border hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">Delete task</span>
                    </Button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 w-[52px] justify-center", priority.className)}>
                    {priority.label}
                  </Badge>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 dark:bg-secondary/40 text-muted-foreground border border-border/10">
                    {task.category}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                  {task.dueDate ? (
                    <span className={cn("flex items-center gap-1", isOverdue && "text-red-500 font-medium")}>
                      <CalendarIcon className="size-3" />
                      {format(task.dueDate, "MMM d")}
                      {isOverdue && " (overdue)"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/30">No due date</span>
                  )}

                  <div className="flex items-center gap-1.5" title={task.createdBy ? `Added by ${task.createdBy.name}` : "System / Admin"}>
                    <Avatar className="size-5 border border-background shadow-sm bg-primary/5">
                      {task.createdBy ? (
                        <>
                          <AvatarImage src={task.createdBy.image ?? ""} alt={task.createdBy.name ?? ""} />
                          <AvatarFallback className="text-[8px] font-medium text-primary">
                            {task.createdBy.name?.[0]?.toUpperCase() ?? "U"}
                          </AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="text-[8px] font-medium text-primary">
                          <User className="size-2.5" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
