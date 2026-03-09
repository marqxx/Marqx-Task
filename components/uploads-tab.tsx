"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { DeleteTaskDialog } from "@/components/delete-task-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PreloadedImage } from "@/components/preloaded-image"

type ImageItem = {
  id: string
  url: string
  fileName?: string | null
  size?: number | null
  createdAt: string
  expiresAt: string
}

export function UploadsTab() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImageItem | null>(null)

  const load = async () => {
    try {
      const r = await fetch("/api/uploads/images")
      if (!r.ok) return setItems([])
      const data = await r.json()
      setItems(data || [])
    } catch {
      setItems([])
    }
  }

  useEffect(() => { load() }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const file = files[0]
      const form = new FormData()
      form.append("file", file)
      const r = await fetch("/api/uploads/images", { method: "POST", body: form })
      if (!r.ok) {
        const data = await r.json().catch(() => null)
        alert(data?.error || "Upload failed")
        return
      }
      await load()
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`border border-dashed rounded-lg p-6 text-center cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <div className="text-sm text-muted-foreground">
            ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            รูปจะถูกเก็บไว้ 30 วัน และสามารถลบได้ทันที
          </div>
          {uploading && <div className="mt-3 text-xs text-foreground">กำลังอัปโหลด...</div>}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded-md overflow-hidden">
              <PreloadedImage
                src={it.url}
                alt={it.fileName || it.id}
                className="w-full h-48 object-cover bg-muted cursor-zoom-in"
                onClick={() => setPreview(it)}
                priority={false}
                fadeIn={true}
                showLoading={true}
                loadingClassName="h-48"
              />
              <div className="p-3 text-xs flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.fileName || "image"}</div>
                  <div className="text-muted-foreground truncate">
                    อัปโหลด {new Date(it.createdAt).toLocaleString()}
                  </div>
                  <div className="text-muted-foreground truncate">
                    หมดอายุ {new Date(it.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <DeleteTaskDialog
                  trigger={<Button variant="outline" size="sm">ลบ</Button>}
                  title="Delete Image"
                  description="ยืนยันลบรูปนี้ทันที รูปจะถูกลบออกจาก ImgBB และรายการของคุณ"
                  onConfirm={async () => {
                    const r = await fetch(`/api/uploads/images/${it.id}`, { method: "DELETE" })
                    if (r.ok) {
                      setItems((prev) => prev.filter((x) => x.id !== it.id))
                    }
                  }}
                />
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground">ยังไม่มีรูปที่อัปโหลด</div>
          )}
        </div>
      </div>
      <div className="lg:col-span-1">
        {/* Reserved for future filters or info */}
      </div>
    </div>
    <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null) }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground text-sm">
            {preview?.fileName || "image"}
          </DialogTitle>
        </DialogHeader>
        {preview && (
          <div className="w-full flex items-center justify-center">
            <PreloadedImage
              src={preview.url}
              alt={preview.fileName || preview.id}
              className="max-h-[80vh] w-auto object-contain"
              priority={true}
              fadeIn={false}
              showLoading={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
