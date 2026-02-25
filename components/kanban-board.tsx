"use client"

import { useMemo } from "react"
import { KanbanColumn } from "@/components/kanban-column"
import type { Task, Status } from "@/lib/types"

const WORKFLOW_STATUSES: Status[] = ["todo", "inprogress", "test", "complete"]

interface KanbanBoardProps {
  tasks: Task[]
  onSelect: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onUpdateStatus: (id: string, status: Status) => void
}

export function KanbanBoard({ tasks, onSelect, onEdit, onDelete, onUpdateStatus }: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const map: Record<Status, Task[]> = {
      backlog: [],
      todo: [],
      inprogress: [],
      test: [],
      complete: [],
      done: [],
    }
    for (const task of tasks) {
      map[task.status]?.push(task)
    }
    return map
  }, [tasks])

  return (
    <div className="flex flex-col gap-6">
      {/* Main workflow columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {WORKFLOW_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateStatus={onUpdateStatus}
          />
        ))}
      </div>

      {/* Storage - collapsed horizontal section at bottom */}
      {grouped.backlog.length > 0 && (
        <div>
          <KanbanColumn
            status="backlog"
            tasks={grouped.backlog}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateStatus={onUpdateStatus}
          />
        </div>
      )}
    </div>
  )
}
