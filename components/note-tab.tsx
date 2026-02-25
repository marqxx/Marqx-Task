"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { FileText, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NoteDetailDialog } from "@/components/note-detail-dialog"
import { useTasksContext } from "@/components/tasks-provider"
import type { Note } from "@/lib/types"

export function NoteTab() {
  const { notes, deleteNote } = useTasksContext()
  const [selected, setSelected] = useState<Note | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20
  const currentLocale = enUS

  // Filter notes by search query (client-side since all notes are in context)
  const filtered = useMemo(() => {
    if (!q.trim()) return notes.filter(n => !n.deletedAt)
    const lower = q.toLowerCase()
    return notes.filter(n =>
      !n.deletedAt && (
        n.title.toLowerCase().includes(lower) ||
        (n.content || "").toLowerCase().includes(lower) ||
        (n.authorName || "").toLowerCase().includes(lower)
      )
    )
  }, [notes, q])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    // If the deleted note was selected, close detail
    if (selected?.id === id) {
      setDetailOpen(false)
      setSelected(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Saved Notes</h2>
              <p className="text-xs text-muted-foreground">
                {filtered.length} note{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Input
            placeholder="Search notes..."
            value={q}
            onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }}
            className="h-8 w-48 bg-background border-border text-xs"
          />
        </div>

        {paginated.length === 0 ? (
          <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-border bg-background">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="size-4" />
              <span className="text-sm">{q ? "No notes found" : "No notes yet"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {paginated.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className="group/item rounded-lg bg-background border border-border p-3 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => {
                  setSelected(n)
                  setDetailOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelected(n)
                    setDetailOpen(true)
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{n.title}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {format(new Date(n.date), "d MMM yyyy", { locale: currentLocale })}
                  {n.authorName ? ` • by ${n.authorName}` : ""}
                </div>
                {n.content && n.content.trim() && (
                  <div className="text-xs text-foreground/80 mt-1 line-clamp-3">
                    {n.content}
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:pointer-events-auto group-focus-within/item:opacity-100 group-focus-within/item:pointer-events-auto transition-opacity"
                    aria-label="Delete note"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(n.id)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {hasMore && (
              <Button
                variant="outline"
                className="h-8 text-xs mt-2"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
      <NoteDetailDialog
        note={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
