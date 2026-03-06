"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

type Template = { id: string; name: string; url: string; payload: string }

interface SendHookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPayloadChange?: (payload: string) => void
}

export default function SendHookDialog({ open, onOpenChange, onPayloadChange }: SendHookDialogProps) {
  const { data } = useSession()
  const [url, setUrl] = useState("")
  const [payload, setPayload] = useState("{\n  \"hello\": \"world\"\n}")
  const [mode, setMode] = useState<"builder" | "json">("builder")
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [templateName, setTemplateName] = useState("")
  const [content, setContent] = useState("")
  const [embedsState, setEmbedsState] = useState<any[]>([])
  const canUse = (data?.user as any)?.role === "MEMBER" || (data?.user as any)?.role === "ADMIN"
  const embeds = useMemo(() => {
    try {
      const obj = typeof payload === "string" ? JSON.parse(payload) : payload
      if (Array.isArray(obj?.embeds)) return obj.embeds
      return []
    } catch {
      return []
    }
  }, [payload])

  useEffect(() => {
    try {
      const obj = JSON.parse(payload)
      setContent(obj.content || "")
      setEmbedsState(Array.isArray(obj.embeds) ? obj.embeds : [])
    } catch {
      setContent("")
      setEmbedsState([])
    }
  }, [open])

  const syncPayload = (nextContent: string, nextEmbeds: any[]) => {
    const obj: any = {}
    if (nextContent?.trim()) obj.content = nextContent
    if (nextEmbeds?.length) obj.embeds = nextEmbeds
    const s = JSON.stringify(obj, null, 2)
    setPayload(s)
    onPayloadChange?.(s)
  }

  useEffect(() => {
    if (!open || !canUse) return
    fetch("/api/webhook-templates")
      .then((r) => r.json())
      .then((list) => setTemplates(list || []))
      .catch(() => setTemplates([]))
  }, [open, canUse])

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === selectedTemplateId), [templates, selectedTemplateId])

  const onLoadTemplate = () => {
    if (!selectedTemplate) return
    setUrl(selectedTemplate.url)
    setPayload(selectedTemplate.payload)
    onPayloadChange?.(selectedTemplate.payload)
    setTemplateName(selectedTemplate.name)
    try {
      const obj = JSON.parse(selectedTemplate.payload)
      setContent(obj.content || "")
      setEmbedsState(Array.isArray(obj.embeds) ? obj.embeds : [])
    } catch {
      setContent("")
      setEmbedsState([])
    }
  }

  const onSaveTemplate = async () => {
    if (!templateName.trim() || !url.trim() || !payload.trim()) {
      toast.error("กรอกชื่อ, URL และ Payload")
      return
    }
    try {
      JSON.parse(payload)
    } catch {
      toast.error("Payload ไม่ใช่ JSON")
      return
    }
    const r = await fetch("/api/webhook-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName.trim(), url: url.trim(), payload }),
    })
    if (!r.ok) {
      toast.error("บันทึกไม่สำเร็จ")
      return
    }
    const saved = await r.json()
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === saved.id)
      if (exists) return prev.map((t) => (t.id === saved.id ? saved : t))
      return [saved, ...prev]
    })
    setSelectedTemplateId(saved.id)
    toast.success("บันทึกแล้ว")
  }

  const onSend = async () => {
    if (!url.trim()) {
      toast.error("กรอก URL")
      return
    }
    let parsed: any
    try {
      parsed = JSON.parse(payload)
    } catch {
      toast.error("Payload ไม่ใช่ JSON")
      return
    }
    const r = await fetch("/api/webhooks/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), payload: parsed }),
    })
    const data = await r.json()
    if (r.ok) {
      toast.success(`ส่งแล้ว: ${data.status}`)
      onOpenChange(false)
    } else {
      toast.error(data?.error || "ส่งไม่สำเร็จ")
    }
  }

  const addEmbed = () => {
    const e = { title: "", description: "", color: 0x2b2d31 }
    const next = [...embedsState, e]
    setEmbedsState(next)
    syncPayload(content, next)
  }

  const removeEmbed = (idx: number) => {
    const next = embedsState.filter((_, i) => i !== idx)
    setEmbedsState(next)
    syncPayload(content, next)
  }

  const updateEmbed = (idx: number, key: string, value: any) => {
    const next = embedsState.map((e, i) => (i === idx ? { ...e, [key]: value } : e))
    setEmbedsState(next)
    syncPayload(content, next)
  }

  const addField = (idx: number) => {
    const cur = embedsState[idx] || {}
    const fields = Array.isArray(cur.fields) ? cur.fields : []
    const next = embedsState.map((e, i) => (i === idx ? { ...e, fields: [...fields, { name: "", value: "" }] } : e))
    setEmbedsState(next)
    syncPayload(content, next)
  }

  const updateField = (embedIdx: number, fieldIdx: number, key: "name" | "value", value: string) => {
    const cur = embedsState[embedIdx] || {}
    const fields = Array.isArray(cur.fields) ? cur.fields.slice() : []
    if (!fields[fieldIdx]) fields[fieldIdx] = { name: "", value: "" }
    fields[fieldIdx] = { ...fields[fieldIdx], [key]: value }
    const next = embedsState.map((e, i) => (i === embedIdx ? { ...e, fields } : e))
    setEmbedsState(next)
    syncPayload(content, next)
  }

  const removeField = (embedIdx: number, fieldIdx: number) => {
    const cur = embedsState[embedIdx] || {}
    const fields = Array.isArray(cur.fields) ? cur.fields.filter((_f: any, i: number) => i !== fieldIdx) : []
    const next = embedsState.map((e, i) => (i === embedIdx ? { ...e, fields } : e))
    setEmbedsState(next)
    syncPayload(content, next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-7xl xl:max-w-[1280px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Send Hook</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[520px_minmax(0,1fr)] gap-4 py-1">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button variant={mode === "builder" ? "default" : "outline"} onClick={() => setMode("builder")}>Builder</Button>
              <Button variant={mode === "json" ? "default" : "outline"} onClick={() => setMode("json")}>JSON</Button>
              <div className="ml-auto" />
              <Button variant="outline" onClick={() => { setContent(""); setEmbedsState([]); setPayload("{}") }}>Clear</Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Template</label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full bg-secondary text-foreground">
                  <SelectValue placeholder="เลือก template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={onLoadTemplate} disabled={!selectedTemplateId} className="self-start">
                Load
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Template Name</label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="bg-secondary text-foreground" placeholder="เช่น: Task Update" />
              <Button onClick={onSaveTemplate} className="self-start">Save</Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Webhook URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="bg-secondary text-foreground" placeholder="https://discord.com/api/webhooks/..." />
            </div>
            {mode === "json" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Payload JSON</label>
                <textarea
                  value={payload}
                  onChange={(e) => { setPayload(e.target.value); onPayloadChange?.(e.target.value) }}
                  rows={12}
                  className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y max-h-60 overflow-auto"
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); syncPayload(e.target.value, embedsState) }}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Embeds</div>
                  <Button onClick={addEmbed}>Add Embed</Button>
                </div>
                <div className="flex flex-col gap-3">
                  {embedsState.map((e, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Embed {i + 1}</div>
                        <Button variant="outline" onClick={() => removeEmbed(i)}>Remove</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Title</label>
                          <Input value={e.title || ""} onChange={(ev) => updateEmbed(i, "title", ev.target.value)} className="bg-secondary text-foreground" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Color</label>
                          <Input
                            value={typeof e.color === "number" ? `#${e.color.toString(16).padStart(6, "0")}` : e.color || ""}
                            onChange={(ev) => {
                              const v = ev.target.value
                              const n = v.startsWith("#") ? parseInt(v.slice(1), 16) : Number(v)
                              updateEmbed(i, "color", Number.isFinite(n) ? n : 0x2b2d31)
                            }}
                            className="bg-secondary text-foreground"
                            placeholder="#39b289"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Description</label>
                        <textarea
                          value={e.description || ""}
                          onChange={(ev) => updateEmbed(i, "description", ev.target.value)}
                          rows={4}
                          className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Author Name</label>
                          <Input value={e.author?.name || ""} onChange={(ev) => updateEmbed(i, "author", { ...(e.author || {}), name: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Author Icon URL</label>
                          <Input value={e.author?.icon_url || ""} onChange={(ev) => updateEmbed(i, "author", { ...(e.author || {}), icon_url: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Thumbnail URL</label>
                          <Input value={e.thumbnail?.url || ""} onChange={(ev) => updateEmbed(i, "thumbnail", { url: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Image URL</label>
                          <Input value={e.image?.url || ""} onChange={(ev) => updateEmbed(i, "image", { url: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Footer Text</label>
                          <Input value={e.footer?.text || ""} onChange={(ev) => updateEmbed(i, "footer", { ...(e.footer || {}), text: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-muted-foreground">Footer Icon URL</label>
                          <Input value={e.footer?.icon_url || ""} onChange={(ev) => updateEmbed(i, "footer", { ...(e.footer || {}), icon_url: ev.target.value })} className="bg-secondary text-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => updateEmbed(i, "timestamp", new Date().toISOString())}>Insert Timestamp</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">Fields</div>
                        <Button variant="outline" onClick={() => addField(i)}>Add Field</Button>
                      </div>
                      {Array.isArray(e.fields) && e.fields.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {e.fields.map((f: any, fi: number) => (
                            <div key={fi} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                              <Input value={f.name || ""} onChange={(ev) => updateField(i, fi, "name", ev.target.value)} className="bg-secondary text-foreground" placeholder="Name" />
                              <Input value={f.value || ""} onChange={(ev) => updateField(i, fi, "value", ev.target.value)} className="bg-secondary text-foreground" placeholder="Value" />
                              <Button variant="outline" onClick={() => removeField(i, fi)}>Remove</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Preview</div>
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm h-[70vh] overflow-auto">
              <div className="text-[11px] text-muted-foreground mb-2">{url ? `POST ${url}` : "POST <url>"}</div>
              {(() => {
                try {
                  const obj = JSON.parse(payload)
                  if (obj?.content) {
                    return <div className="mb-3 text-sm whitespace-pre-wrap text-foreground/90">{obj.content}</div>
                  }
                } catch {}
                return null
              })()}
              {embeds.length > 0 ? (
                <div className="space-y-3">
                  {embeds.map((embed: any, idx: number) => {
                    const colorHex = typeof embed?.color === "number" ? `#${embed.color.toString(16).padStart(6, "0")}` : "#2b2d31"
                    const ts = embed?.timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(embed.timestamp)) : null
                    return (
                      <div key={idx} className="relative rounded-md border border-border bg-[#2b2d31] text-white">
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ backgroundColor: colorHex }} />
                        <div className="p-3 pl-4 space-y-2">
                          {(embed.author?.name || embed.author?.icon_url) && (
                            <div className="flex items-center gap-2">
                              {embed.author?.icon_url && <img src={embed.author.icon_url} alt="" className="size-5 rounded-full" />}
                              {embed.author?.name && <div className="text-sm font-semibold">{embed.author.name}</div>}
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              {embed.title && <div className="font-semibold">{embed.title}</div>}
                              {embed.description && <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-90">{embed.description}</div>}
                            </div>
                            {embed.thumbnail?.url && <img src={embed.thumbnail.url} alt="" className="w-16 h-16 object-cover rounded" />}
                          </div>
                          {Array.isArray(embed.fields) && embed.fields.length > 0 && (
                            <div className="mt-2 grid grid-cols-1 gap-2">
                              {embed.fields.map((f: any, i: number) => (
                                <div key={i} className="bg-white/5 rounded p-2">
                                  {f.name && <div className="text-[11px] uppercase tracking-wide opacity-70">{f.name}</div>}
                                  {f.value && <div className="text-sm whitespace-pre-wrap">{f.value}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                          {embed.image?.url && <img src={embed.image.url} alt="" className="rounded max-h-80 w-auto" />}
                          {(embed.footer?.text || ts) && (
                            <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-2">
                              {embed.footer?.icon_url && <img src={embed.footer.icon_url} alt="" className="size-4 rounded-full" />}
                              <div className="text-[11px] opacity-70">
                                {embed.footer?.text}{ts ? ` • ${ts}` : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <pre className="text-xs whitespace-pre-wrap break-all text-foreground/90">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(payload), null, 2)
                    } catch {
                      return "Invalid JSON"
                    }
                  })()}
                </pre>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-foreground">
            Cancel
          </Button>
          <Button onClick={onSend} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
