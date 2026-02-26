"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Clock, Tag, Flag, Layers, User, X, Pencil, Trash2, Trash, Link as LinkIcon } from "lucide-react"
import { useTasksContext } from "@/components/tasks-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DeleteTaskDialog } from "@/components/delete-task-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Task, Priority, Status } from "@/lib/types"
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void
  onDelete: (id: string) => void
  initialEditing?: boolean
  readOnly?: boolean
  showDeleteButton?: boolean
}

const CATEGORIES = ["Work", "Bug", "Update"]

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  initialEditing = false,
  readOnly = false,
  showDeleteButton = false,
}: TaskDetailDialogProps) {
  const { data: session } = useSession()
  const { updateTask, deleteTask, locale } = useTasksContext()
  const currentLocale = locale === "th" ? th : undefined
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<Status>("todo")
  const [priority, setPriority] = useState<Priority>("medium")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [category, setCategory] = useState("Work")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description)
      setStatus(task.status)
      setPriority(task.priority)
      setDueDate(task.dueDate ?? undefined)
      setCategory(task.category)
      setIsEditing(initialEditing)
    }
  }, [task, initialEditing])

  if (!task) return null

  const handleSave = () => {
    onUpdate(task.id, {
      title: title.trim() || task.title,
      description,
      status,
      priority,
      dueDate: dueDate ?? null,
      category,
      updatedBy: session?.user ? { name: session.user.name ?? null, image: session.user.image ?? null } : task.updatedBy,
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    onDelete(task.id)
    onOpenChange(false)
  }

  const statusConf = STATUS_CONFIG[task.status]
  const priorityConf = PRIORITY_CONFIG[task.priority]

  const renderLinkified = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g)
    return parts.map((part, idx) => {
      if (/^https?:\/\//.test(part)) {
        let domain = ""
        try {
          domain = new URL(part).hostname.replace(/^www\./, "")
        } catch {
          domain = ""
        }
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            title={part}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold bg-blue-500/10 border-blue-500/25 text-blue-700 transition"
          >
            <LinkIcon className="size-3.5" />
            <span>ลิงก์</span>
            {domain && <span className="text-[10px] opacity-60">• {domain}</span>}
          </a>
        )
      }
      return part
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? "Edit Task" : "Task Details"}
          </DialogTitle>
        </DialogHeader>

        {!isEditing ? (
          <div className="flex flex-col gap-6 py-2">
            {task.deletedAt && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 select-none">
                <Trash2 className="size-4 text-red-500" />
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Recycle Bin</p>
                  <p className="text-[10px] text-red-500/80 font-medium mt-0.5">
                    This task will be permanently deleted 24 hours after deletion.
                  </p>
                </div>
              </div>
            )}
            {/* Title & Description Card */}
            <div className="relative overflow-hidden rounded-[24px] border border-border/40 bg-secondary/30 p-7 dark:bg-secondary/10">
              {/* Subtle Floating Background Icon */}
              <div className="absolute -right-6 -bottom-6 opacity-[0.04]">
                <Layers className="size-40" />
              </div>

              <div className="relative">
                <h3 className="text-2xl font-black tracking-tight text-foreground leading-tight">
                  {task.title}
                </h3>

                <div className="mt-5 mb-5 h-[2px] w-10 rounded-full bg-border/60" />

                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Details</p>
                  {task.description ? (
                    <div className="text-[15px] leading-normal text-muted-foreground/90 whitespace-pre-wrap font-medium">
                      {renderLinkified(task.description)}
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground/20 font-medium">No additional description...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 px-1 py-2">
              <div className="flex items-start gap-3">
                <Layers className="size-4 text-muted-foreground/40 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Status</p>
                  <p className={cn("text-sm font-semibold opacity-80", statusConf.color)}>{statusConf.label}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Flag className="size-4 text-muted-foreground/40 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Priority</p>
                  <p className={cn("text-sm font-semibold", priorityConf.className.includes("text-") && priorityConf.className.split(" ").find(c => c.startsWith("text-")))}>
                    {priorityConf.label}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="size-4 text-muted-foreground/40 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Category</p>
                  <p className="text-sm font-semibold text-foreground/90">{task.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarIcon className="size-4 text-muted-foreground/40 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">Due Date</p>
                  <p className="text-sm font-semibold text-foreground/90">
                    {task.dueDate ? format(task.dueDate, locale === "th" ? "d MMM yyyy" : "MMM d, yyyy", { locale: currentLocale }) : "Not set"}
                  </p>
                </div>
              </div>
            </div>

            {/* Avatars Section */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
              {task.createdBy ? (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/20 p-3 border border-border/10">
                  <Avatar className="size-9 border-2 border-background shadow-sm">
                    <AvatarImage src={task.createdBy.image ?? ""} alt={task.createdBy.name ?? ""} />
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {task.createdBy.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Creator</p>
                    <p className="truncate text-xs font-bold text-foreground">
                      {task.createdBy.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/20 p-3 border border-border/10">
                  <Avatar className="size-9 border-2 border-background shadow-sm">
                    <AvatarFallback className="text-xs font-bold bg-secondary text-muted-foreground">
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Creator</p>
                    <p className="text-xs font-bold text-foreground">System / Admin</p>
                  </div>
                </div>
              )}

              {task.updatedBy ? (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/20 p-3 border border-border/10">
                  <Avatar className="size-9 border-2 border-background shadow-sm">
                    <AvatarImage src={task.updatedBy.image ?? ""} alt={task.updatedBy.name ?? ""} />
                    <AvatarFallback className="text-xs font-bold bg-emerald-500/10 text-emerald-600">
                      {task.updatedBy.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Last Update</p>
                    <p className="truncate text-xs font-bold text-foreground">
                      {task.updatedBy.name}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-3 rounded-xl bg-secondary/10 p-3 border border-border/10 opacity-60">
                  <Avatar className="size-9 border-2 border-background shadow-sm">
                    <AvatarFallback className="text-xs font-bold bg-secondary text-muted-foreground">
                      <Clock className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Last Update</p>
                    <p className="text-xs font-bold text-muted-foreground italic">No updates</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar flex flex-col gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="task-title">Title</label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary text-foreground"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none max-h-[50vh] overflow-y-auto no-scrollbar"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Storage</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">Due Date</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start gap-2 bg-secondary text-foreground border-border text-sm">
                        <CalendarIcon className="size-4 text-muted-foreground" />
                        {dueDate ? format(dueDate, "MMM d") : "No date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                    </PopoverContent>
                  </Popover>
                  {dueDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDueDate(undefined)}
                      className="shrink-0 size-9 text-muted-foreground/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/30 transition-all"
                      title="Clear date"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {!isEditing ? (
            <>
              <div /> {/* Spacer */}
            </>
          ) : (
            <div className="flex w-full justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-foreground">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog >
  )
}
