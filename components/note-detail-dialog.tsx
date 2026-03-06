"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarIcon, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Note } from "@/lib/types"
import { useTasksContext } from "@/components/tasks-provider"
import { toast } from "sonner"

export function NoteDetailDialog({
  note,
  open,
  onOpenChange,
}: {
  note: Note | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const currentLocale = enUS
  const { updateNote } = useTasksContext()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open || !note) {
      setEditing(false)
      return
    }
    if (editing) return
    setTitle(note.title || "")
    setContent(note.content || "")
    setDate(new Date(note.date))
  }, [open, note, editing])

  const onSave = async () => {
    if (!note) return
    const t = title.trim()
    const c = content.trim()
    if (!t && !c) {
      toast.error("กรอก Title หรือ Content อย่างน้อย 1 อย่าง")
      return
    }
    setSaving(true)
    try {
      const nextTitle = t || "Untitled"
      const nextContent = content
      const res = await updateNote(note.id, { title: nextTitle, content: nextContent, date })
      if (res) setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const onCancelEdit = () => {
    if (!note) return
    setEditing(false)
    setTitle(note.title || "")
    setContent(note.content || "")
    setDate(new Date(note.date))
  }

  if (!note) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Note Details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={editing ? title : note.title} readOnly={!editing} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea value={editing ? content : (note.content || "")} readOnly={!editing} onChange={(e) => setContent(e.target.value)} className="min-h-[140px] resize-y bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 bg-secondary text-foreground border-border text-sm"
                    >
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      {format(date, "d MMMM yyyy", { locale: currentLocale })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="size-4" />
                {format(new Date(note.date), "d MMMM yyyy", { locale: currentLocale })}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
              <Avatar className="size-7">
                <AvatarImage src={note.user?.image ?? ""} alt={(note.authorName || note.user?.name || "User") || "User"} />
                <AvatarFallback>{((note.authorName || note.user?.name || "U") as string).split(" ").map(s => s[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {note.authorName || note.user?.name || "Unknown"}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={onCancelEdit} disabled={saving}>Cancel</Button>
              <Button onClick={onSave} disabled={saving}>Save</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
