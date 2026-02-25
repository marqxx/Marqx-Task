"use client"

import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Trash2, CalendarIcon, Pencil, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Task } from "@/lib/types"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types"
import { cn } from "@/lib/utils"

import { DeleteTaskDialog } from "@/components/delete-task-dialog"
import { useTasksContext } from "@/components/tasks-provider"

interface TaskItemProps {
  task: Task
  onDelete: (id: string) => void
  onSelect: (task: Task) => void
}

export function TaskItem({ task, onDelete, onSelect }: TaskItemProps) {
  const isOverdue = task.status !== "done" && task.dueDate && task.dueDate < new Date()
  const { locale } = useTasksContext()
  const priority = PRIORITY_CONFIG[task.priority]
  const status = STATUS_CONFIG[task.status]

  const dotColor = {
    backlog: "bg-violet-400",
    todo: "bg-slate-400",
    inprogress: "bg-blue-500",
    test: "bg-amber-500",
    complete: "bg-teal-500",
    done: "bg-emerald-500",
  }[task.status]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(task)}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(task) }}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
    >
      <div className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotColor)} />

      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 border-transparent", status.bg, status.color)}
          >
            {status.label}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
            {priority.label}
          </Badge>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 dark:bg-secondary/40 text-muted-foreground border border-border/10">
            {task.category}
          </span>
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] text-muted-foreground",
                isOverdue && "text-red-500 font-medium",
              )}
            >
              <CalendarIcon className="size-3" />
              {format(task.dueDate, locale === "th" ? "d MMM" : "MMM d", { locale: locale === "th" ? th : undefined })}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Added by</span>
            <div className="flex items-center gap-1.5 opacity-90" title={task.createdBy?.name ?? "System / Admin"}>
              <Avatar className="size-4 border border-primary/20 bg-primary/5">
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
              <span className="text-[10px] font-medium truncate max-w-[100px]">{task.createdBy?.name ?? "System / Admin"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>Last activity</span>
            <span>{format(task.updatedAt, "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onSelect(task) }}
          className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border hover:border-border transition-all"
        >
          <Pencil className="size-3.5" />
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
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete task</span>
        </Button>
      </div>
    </div>
  )
}
