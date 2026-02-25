"use client"

import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CalendarIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Note } from "@/lib/types"

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
            <Input value={note.title} readOnly className="bg-secondary border-border" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Content</label>
            <Textarea value={note.content || ""} readOnly className="min-h-[140px] resize-y bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="size-4" />
              {format(new Date(note.date), "d MMMM yyyy", { locale: currentLocale })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
              <Avatar className="size-7">
                <AvatarImage src={note.user?.image ?? ""} alt={(note.authorName || note.user?.name || "User") || "User"} />
                <AvatarFallback>{((note.authorName || note.user?.name || "U") as string).split(" ").map(s => s[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {note.authorName || note.user?.name || "Unknown"}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
