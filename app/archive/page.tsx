"use client"

import { useState } from "react"
import { useTasksContext } from "@/components/tasks-provider"
import { ArchiveList } from "@/components/archive-list"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { Archive, ArrowLeft, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Task } from "@/lib/types"
import { ListSkeleton } from "@/components/loading-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function ArchivePage() {
  const { archivedTasks, updateTask, deleteTask, loading } = useTasksContext()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showDeleteInDetail, setShowDeleteInDetail] = useState(false)

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task)
    setShowDeleteInDetail(false)
    setDetailOpen(true)
  }

  const handleRequestDelete = (taskId: string) => {
    deleteTask(taskId)
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-5" />
              <span className="sr-only">Back to board</span>
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary dark:bg-emerald-500/10 border border-border dark:border-emerald-500/20 shadow-sm transition-colors">
              <Archive className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-bold leading-none text-foreground tracking-tight">
                Archive
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mt-1">
                {loading ? <Skeleton className="h-2 w-20" /> : `${archivedTasks.length} Completed Task${archivedTasks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="ml-auto" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {loading ? <ListSkeleton /> : <ArchiveList tasks={archivedTasks} onSelect={handleSelectTask} onDelete={handleRequestDelete} />}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={updateTask}
        onDelete={deleteTask}
        readOnly
        showDeleteButton={showDeleteInDetail}
      />
    </main>
  )
}
