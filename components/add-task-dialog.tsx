"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Plus, ImageUp } from "lucide-react"
import { useTasksContext } from "@/components/tasks-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Priority, Status } from "@/lib/types"

interface AddTaskDialogProps {
  onAdd: (title: string, priority: Priority, dueDate: Date | null, category: string, description: string, status?: Status, createdBy?: { name: string | null; image: string | null }, imageIds?: string[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CATEGORIES = ["Work", "Bug", "Update"]

export function AddTaskDialog({ onAdd, open: controlledOpen, onOpenChange: setControlledOpen }: AddTaskDialogProps) {
  const { data: session } = useSession()
  const { locale } = useTasksContext()
  const [internalOpen, setInternalOpen] = useState(false)

  const open = controlledOpen ?? internalOpen
  const setOpen = (val: boolean) => {
    setInternalOpen(val)
    setControlledOpen?.(val)
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Priority>("low")
  const [status, setStatus] = useState<Status>("todo")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [category, setCategory] = useState("Work")
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<Array<{ id: string; url: string; fileName?: string | null }>>([])
  const [preview, setPreview] = useState<{ id: string; url: string; fileName?: string | null } | null>(null)
  const [pasteHint, setPasteHint] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [pasteActive, setPasteActive] = useState(false)

  const uploadViaFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const r = await fetch("/api/uploads/images", { method: "POST", body: form })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        alert(data?.error || "Upload failed")
      } else if (data?.id && data?.url) {
        setImages((prev) => [{ id: data.id, url: data.url, fileName: data.fileName }, ...prev])
      }
    } finally {
      setUploading(false)
    }
  }

  const uploadViaUrl = async (url: string) => {
    setUploading(true)
    try {
      const r = await fetch("/api/uploads/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) {
        alert(data?.error || "Upload failed")
      } else if (data?.id && data?.url) {
        setImages((prev) => [{ id: data.id, url: data.url, fileName: data.fileName }, ...prev])
      }
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!pasteActive) return
    const handler = async (e: ClipboardEvent) => {
      if (!pasteActive) return
      if (!e.clipboardData) return
      const items = Array.from(e.clipboardData.items || [])
      const fileItem = items.find(it => it.kind === "file" && it.type.startsWith("image/"))
      if (fileItem) {
        e.preventDefault()
        const file = (fileItem as DataTransferItem).getAsFile()
        if (file) await uploadViaFile(file)
        return
      }
      const text = e.clipboardData.getData("text")
      if (text && /^https?:\/\//.test(text)) {
        e.preventDefault()
        await uploadViaUrl(text)
      }
    }
    window.addEventListener("paste", handler as any)
    return () => window.removeEventListener("paste", handler as any)
  }, [pasteActive])

  const handleSubmit = () => {
    if (!title.trim()) return
    onAdd(
      title.trim(),
      priority,
      dueDate ?? null,
      category,
      description.trim(),
      status,
      session?.user ? { name: session.user.name ?? null, image: session.user.image ?? null } : undefined,
      images.map(i => i.id),
    )
    setTitle("")
    setDescription("")
    setPriority("low")
    setStatus("todo")
    setDueDate(undefined)
    setCategory("Work")
    setImages([])
    setPreview(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <Input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="bg-secondary text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <textarea
            placeholder="Add a description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none max-h-[40vh] overflow-y-auto no-scrollbar"
          />
          {/* Images (separate section) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">Images</label>
            <div
            className={`rounded-md border border-dashed px-3 py-3 text-xs select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
            tabIndex={0}
            role="button"
            onFocus={() => setPasteActive(true)}
            onBlur={() => setPasteActive(false)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); inputRef.current?.click() } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={async (e) => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files?.[0]
              if (!file) return
              await uploadViaFile(file)
            }}
            title="ลากรูปวางที่นี่เพื่ออัปโหลด (จะถูกเก็บ 30 วัน)"
            >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                await uploadViaFile(file)
                e.currentTarget.value = ""
              }}
            />
            <div className="flex items-center gap-3">
              <div className={`rounded-md p-2 ${dragOver ? "bg-primary/10 text-primary" : "bg-secondary/60 text-muted-foreground"}`}>
                <ImageUp className="size-5" />
              </div>
              <div className="flex flex-col">
                <div className="text-foreground text-sm font-medium">ลากรูปวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</div>
                <div className="text-[11px] text-muted-foreground">
                  วางลิงก์รูปหรือรูปจากคลิปบอร์ดได้ด้วย • รูปจะถูกเก็บไว้ 30 วัน
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto h-7 text-[11px]"
                onClick={() => inputRef.current?.click()}
                title="เลือกไฟล์จากเครื่อง"
              >
                เลือกไฟล์
              </Button>
            </div>
            {uploading && <div className="mt-2 text-xs text-foreground">กำลังอัปโหลด...</div>}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="วางลิงก์รูป (https://...)"
                className="bg-secondary text-foreground"
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!/^https?:\/\//.test(imageUrl.trim())) return
                  setUploading(true)
                  try {
                    const r = await fetch("/api/uploads/images", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: imageUrl.trim() }),
                    })
                    const data = await r.json().catch(() => null)
                    if (!r.ok) {
                      alert(data?.error || "Upload failed")
                    } else if (data?.id && data?.url) {
                      setImages((prev) => [{ id: data.id, url: data.url, fileName: data.fileName }, ...prev])
                      setImageUrl("")
                    }
                  } finally {
                    setUploading(false)
                  }
                }}
                className="h-9"
              >
                นำเข้าจากลิงก์
              </Button>
            </div>

            {/* Thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-1">
                {images.map((img) => (
                  <div key={img.id} className="relative group border rounded-md overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.fileName || img.id}
                      className="w-full h-24 object-cover cursor-zoom-in"
                      onClick={() => setPreview(img)}
                    />
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                      <DeleteTaskDialog
                        trigger={<Button size="sm" variant="outline" className="h-7 text-xs">ลบ</Button>}
                        title="Delete Image"
                        description="ยืนยันลบรูปนี้ทันที รูปจะถูกลบออกจาก ImgBB และรายการของคุณ"
                        onConfirm={async () => {
                          const r = await fetch(`/api/uploads/images/${img.id}`, { method: "DELETE" })
                          if (r.ok) setImages((prev) => prev.filter((x) => x.id !== img.id))
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="w-full bg-secondary text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Storage</SelectItem>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="inprogress">In Progress</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="w-full bg-secondary text-foreground">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full bg-secondary text-foreground">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-secondary text-foreground border-border text-sm"
                  >
                    <CalendarIcon className="size-4 text-muted-foreground" />
                    {dueDate ? format(dueDate, locale === "th" ? "d MMM" : "MMM d", { locale: locale === "th" ? th : undefined }) : "Set date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={locale === "th" ? th : undefined} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="text-foreground">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
      {/* Preview dialog for images inside New Task */}
      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null) }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-sm">
              {preview?.fileName || "image"}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="w-full flex items-center justify-center">
              <img src={preview.url} alt={preview.fileName || preview.id} className="max-h-[80vh] w-auto object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
