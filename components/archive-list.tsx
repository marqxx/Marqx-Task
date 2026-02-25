"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { Search, Archive, CalendarIcon, Clock, ArrowUpDown, Trash2 } from "lucide-react"
import { useTasksContext } from "@/components/tasks-provider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Task } from "@/lib/types"
import { PRIORITY_CONFIG } from "@/lib/types"
import { cn } from "@/lib/utils"

type SortMode = "updated" | "priority" | "date"

interface ArchiveListProps {
  tasks: Task[]
  onSelect: (task: Task) => void
  onDelete: (id: string) => void
}

export function ArchiveList({ tasks, onSelect, onDelete }: ArchiveListProps) {
  const [search, setSearch] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("updated")

  const filtered = useMemo(() => {
    let result = tasks
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.category.toLowerCase().includes(q),
      )
    }
    const arr = [...result]
    switch (sortMode) {
      case "updated":
        arr.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        break
      case "priority":
        arr.sort((a, b) => PRIORITY_CONFIG[a.priority].sortOrder - PRIORITY_CONFIG[b.priority].sortOrder)
        break
      case "date":
        arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return b.dueDate.getTime() - a.dueDate.getTime()
        })
        break
    }
    return arr
  }, [tasks, search, sortMode])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search archived tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-foreground placeholder:text-muted-foreground shadow-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground shadow-sm">
              <ArrowUpDown className="size-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortMode("updated")} className={cn(sortMode === "updated" && "bg-secondary font-medium")}>
              Recently completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("priority")} className={cn(sortMode === "priority" && "bg-secondary font-medium")}>
              Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortMode("date")} className={cn(sortMode === "date" && "bg-secondary font-medium")}>
              Due date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary mb-4">
            <Archive className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">{search ? "No matching tasks" : "No archived tasks yet"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tasks marked as Done will appear here
          </p>
        </div>
      ) : (
        <div className="custom-scrollbar flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filtered.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority]
            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(task)}
                onKeyDown={(e) => { if (e.key === "Enter") onSelect(task) }}
                className="group/item flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer"
              >
                <div className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <p className="text-sm font-medium text-foreground line-through decoration-muted-foreground/40 truncate">
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
                      className="text-[10px] px-1.5 py-0 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                    >
                      Done
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.className)}>
                      {priority.label}
                    </Badge>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 dark:bg-secondary/40 text-muted-foreground border border-border/10">
                      {task.category}
                    </span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <CalendarIcon className="size-3" />
                        {format(task.dueDate, "MMM d")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      Completed {format(task.updatedAt, "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(task.id)
                  }}
                  className="size-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover/item:opacity-100"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
