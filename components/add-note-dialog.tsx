"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarIcon, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTasksContext } from "@/components/tasks-provider"

interface AddNoteDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddNoteDialog({ open, onOpenChange }: AddNoteDialogProps) {
  const { data: session } = useSession()
  const { addNote } = useTasksContext()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [submitting, setSubmitting] = useState(false)

  const author = session?.user?.name ?? ""

  const handleAdd = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Please fill title or content at least")
      return
    }
    setSubmitting(true)
    try {
      const result = await addNote(title, content, date, author)
      if (result) {
        setTitle("")
        setContent("")
        setDate(new Date())
        onOpenChange?.(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Add Note
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Note details..."
              className="min-h-[120px] resize-y bg-secondary border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-secondary text-foreground border-border text-sm"
                  >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {format(date, "d MMMM yyyy", { locale: enUS })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Author</label>
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage src={session?.user?.image ?? ""} alt={author || "User"} />
                  <AvatarFallback>{(author || "U").split(" ").map(s => s[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{author}</span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAdd}
            disabled={submitting}
            className={cn("gap-2", submitting ? "opacity-80 cursor-not-allowed" : "")}
          >
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
