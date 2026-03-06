"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

type Template = { id: string; name: string; url: string; payload: string }
type ScheduledJob = {
  id: string
  url: string
  payload: string
  runAt: string
}

interface SendHookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPayloadChange?: (payload: string) => void
}

export default function SendHookDialog({ open, onOpenChange, onPayloadChange }: SendHookDialogProps) {
  const { data } = useSession()
  const [url, setUrl] = useState("")
  const [payload, setPayload] = useState("{\n  \"hello\": \"world\"\n}")
  const [mode, setMode] = useState<"builder" | "json" | "scheduled">("builder")
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [templateName, setTemplateName] = useState("")
  const [content, setContent] = useState("")
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [embedsState, setEmbedsState] = useState<any[]>([])
  const [embedEditorOpen, setEmbedEditorOpen] = useState(false)
  const [editingEmbedIndex, setEditingEmbedIndex] = useState<number | null>(null)
  const [embedDraft, setEmbedDraft] = useState<any>(null)
  const [scheduleAt, setScheduleAt] = useState("")
  const [scheduled, setScheduled] = useState<ScheduledJob[]>([])
  const [viewJob, setViewJob] = useState<ScheduledJob | null>(null)
  const [viewJobOpen, setViewJobOpen] = useState(false)
  const timersRef = useRef<Record<string, any>>({})
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

  // Clear all state every time dialog opens and load scheduled jobs from server
  useEffect(() => {
    if (!open) return
    setUrl("")
    setMode("builder")
    setSelectedTemplateId("")
    setTemplateName("")
    setContent("")
    setUsername("")
    setAvatarUrl("")
    setEmbedsState([])
    setPayload("{}")
    onPayloadChange?.("{}")

    Object.values(timersRef.current).forEach((h) => clearTimeout(h))
    timersRef.current = {}
    setScheduled([])

    if (!canUse) return
    fetch("/api/webhook-schedules")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ScheduledJob[]) => {
        const safe = (list || []).filter((j) => Number.isFinite(new Date(j.runAt).getTime()))
        setScheduled(safe)
        safe.forEach((job) => {
          const delay = new Date(job.runAt).getTime() - Date.now()
          if (delay <= 0) {
            sendScheduled(job)
          } else {
            timersRef.current[job.id] = setTimeout(() => {
              sendScheduled(job)
            }, delay)
          }
        })
      })
      .catch(() => {
        setScheduled([])
      })
  }, [open, canUse])

  useEffect(() => {
    if (mode === "builder") return
    try {
      const obj = JSON.parse(payload)
      setContent(obj.content || "")
      setUsername(obj.username || "")
      setAvatarUrl(obj.avatar_url || "")
      setEmbedsState(Array.isArray(obj.embeds) ? obj.embeds : [])
    } catch {}
  }, [payload, mode])

  const syncPayload = (nextContent: string, nextEmbeds: any[], nextUsername?: string, nextAvatarUrl?: string) => {
    const obj: any = {}
    const c = nextContent !== undefined ? nextContent : content
    const u = nextUsername !== undefined ? nextUsername : username
    const a = nextAvatarUrl !== undefined ? nextAvatarUrl : avatarUrl
    const e = nextEmbeds !== undefined ? nextEmbeds : embedsState

    if (c?.trim()) obj.content = c
    if (u?.trim()) obj.username = u
    if (a?.trim()) obj.avatar_url = a
    if (e?.length) obj.embeds = e
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
      setUsername(obj.username || "")
      setAvatarUrl(obj.avatar_url || "")
      setEmbedsState(Array.isArray(obj.embeds) ? obj.embeds : [])
    } catch {
      setContent("")
      setUsername("")
      setAvatarUrl("")
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

  const scheduleSend = async () => {
    if (!canUse) {
      toast.error("บัญชีของคุณไม่มีสิทธิ์ใช้งานฟีเจอร์นี้")
      return
    }
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
    if (!scheduleAt) {
      toast.error("กรุณาเลือกเวลา")
      return
    }
    const when = new Date(scheduleAt)
    if (isNaN(when.getTime())) {
      toast.error("เวลาไม่ถูกต้อง")
      return
    }
    const delay = when.getTime() - Date.now()
    const body = {
      url: url.trim(),
      payload: JSON.stringify(parsed, null, 2),
      runAt: when.toISOString(),
    }
    const resp = await fetch("/api/webhook-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const data = await resp.json().catch(() => null)
      toast.error(data?.error || "ตั้งเวลาไม่สำเร็จ")
      return
    }
    const job = (await resp.json()) as ScheduledJob
    setScheduled((prev) => {
      const next = [...prev, job].sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
      return next
    })
    if (delay <= 0) {
      sendScheduled(job)
    } else {
      timersRef.current[job.id] = setTimeout(() => sendScheduled(job), delay)
    }
    toast.success("ตั้งเวลาสำเร็จ")
    setScheduleAt("")
  }

  const sendScheduled = async (job: ScheduledJob) => {
    try {
      const r = await fetch("/api/webhooks/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: job.url, payload: JSON.parse(job.payload) }),
      })
      const data = await r.json()
      if (r.ok) {
        toast.success(`ส่งแล้ว: ${data.status}`)
      } else {
        toast.error(data?.error || "ส่งไม่สำเร็จ")
      }
    } catch (e: any) {
      toast.error(e?.message || "ส่งไม่สำเร็จ")
    } finally {
      if (timersRef.current[job.id]) {
        clearTimeout(timersRef.current[job.id])
        delete timersRef.current[job.id]
      }
      try {
        await fetch(`/api/webhook-schedules?id=${job.id}`, { method: "DELETE" })
      } catch { }
      setScheduled((prev) => {
        const next = prev.filter((j) => j.id !== job.id)
        return next
      })
    }
  }

  const cancelScheduled = async (id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id])
      delete timersRef.current[id]
    }
    let ok = true
    try {
      const resp = await fetch(`/api/webhook-schedules?id=${id}`, { method: "DELETE" })
      ok = resp.ok
    } catch {
      ok = false
    }
    if (!ok) {
      toast.error("ยกเลิกไม่สำเร็จ")
      return
    }
    setScheduled((prev) => {
      const next = prev.filter((j) => j.id !== id)
      return next
    })
    toast.success("ยกเลิกแล้ว")
  }

  const loadScheduledJob = (job: ScheduledJob) => {
    setUrl(job.url)
    setPayload(job.payload)
    onPayloadChange?.(job.payload)
    try {
      const obj = JSON.parse(job.payload)
      setContent(obj.content || "")
      setUsername(obj.username || "")
      setAvatarUrl(obj.avatar_url || "")
      setEmbedsState(Array.isArray(obj.embeds) ? obj.embeds : [])
    } catch {
      setContent("")
      setUsername("")
      setAvatarUrl("")
      setEmbedsState([])
    }
    setMode("builder")
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

  const toLocalInputValue = (iso?: string) => {
    if (!iso) return ""
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ""
    const pad = (n: number) => String(n).padStart(2, "0")
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const openEmbedEditor = (idx: number) => {
    setEditingEmbedIndex(idx)
    const cur = embedsState[idx] ?? {}
    setEmbedDraft(JSON.parse(JSON.stringify(cur)))
    setEmbedEditorOpen(true)
  }

  const closeEmbedEditor = () => {
    setEmbedEditorOpen(false)
    setEditingEmbedIndex(null)
    setEmbedDraft(null)
  }

  const applyEmbedDraft = (nextDraft: any) => {
    setEmbedDraft(nextDraft)
    if (editingEmbedIndex === null) return
    const next = embedsState.map((e, i) => (i === editingEmbedIndex ? nextDraft : e))
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
              <Button variant={mode === "scheduled" ? "default" : "outline"} onClick={() => setMode("scheduled")}>Scheduled</Button>
              <div className="ml-auto" />
              <Button variant="outline" onClick={() => { setContent(""); setEmbedsState([]); setPayload("{}") }}>Clear</Button>
            </div>
            {mode !== "scheduled" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Template</label>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
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
                    <Button variant="outline" onClick={onLoadTemplate} disabled={!selectedTemplateId} className="h-9 px-3">
                      Load
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!selectedTemplateId) return
                        const r = await fetch(`/api/webhook-templates?id=${selectedTemplateId}`, { method: "DELETE" })
                        if (!r.ok) {
                          toast.error("ลบไม่สำเร็จ")
                          return
                        }
                        setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplateId))
                        setSelectedTemplateId("")
                        toast.success("ลบแล้ว")
                      }}
                      disabled={!selectedTemplateId}
                      className="h-9 px-3"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Template Name</label>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="bg-secondary text-foreground"
                      placeholder="เช่น: Task Update"
                    />
                    <Button onClick={onSaveTemplate} className="h-9 px-3">Save</Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Webhook URL</label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} className="bg-secondary text-foreground" placeholder="https://discord.com/api/webhooks/..." />
                </div>
              </>
            )}
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
            ) : mode === "scheduled" ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground">รายการรอส่ง</div>
                {scheduled.length === 0 ? (
                  <div className="text-xs text-muted-foreground/70">ไม่มีรายการที่รอส่ง</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {scheduled.map((j) => (
                      <div key={j.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{new Date(j.runAt).toLocaleString()}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{j.url}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="h-8 px-3"
                            onClick={() => {
                              setViewJob(j)
                              setViewJobOpen(true)
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 px-3"
                            onClick={() => {
                              loadScheduledJob(j)
                              cancelScheduled(j.id)
                            }}
                          >
                            Edit
                          </Button>
                          <Button variant="outline" className="h-8 px-3" onClick={() => sendScheduled(j)}>Send Now</Button>
                          <Button variant="outline" className="h-8 px-3" onClick={() => cancelScheduled(j.id)}>Cancel</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Username</label>
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        syncPayload(content, embedsState, e.target.value)
                      }}
                      className="bg-secondary text-foreground"
                      placeholder="Webhook Name"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">Avatar URL</label>
                    <Input
                      value={avatarUrl}
                      onChange={(e) => {
                        setAvatarUrl(e.target.value)
                        syncPayload(content, embedsState, undefined, e.target.value)
                      }}
                      className="bg-secondary text-foreground"
                      placeholder="https://..."
                    />
                  </div>
                </div>
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
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{e.title || `Embed ${i + 1}`}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {(e.description || "").toString().replace(/\s+/g, " ").slice(0, 120) || "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" onClick={() => openEmbedEditor(i)} className="h-8 px-3">
                            Edit
                          </Button>
                          <Button variant="outline" onClick={() => removeEmbed(i)} className="h-8 px-3">
                            Remove
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {Array.isArray(e.fields) ? `${e.fields.length} field` + (e.fields.length === 1 ? "" : "s") : "0 fields"}
                        {e.timestamp ? " • timestamp" : ""}
                      </div>
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
        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-foreground">
            Cancel
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="bg-secondary text-foreground"
            />
            <Button variant="outline" onClick={scheduleSend}>Schedule</Button>
          </div>
          <Button onClick={onSend} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
      <Dialog open={embedEditorOpen} onOpenChange={(v) => (v ? setEmbedEditorOpen(true) : closeEmbedEditor())}>
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Embed</DialogTitle>
          </DialogHeader>
          {embedDraft && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input value={embedDraft.title || ""} onChange={(ev) => applyEmbedDraft({ ...embedDraft, title: ev.target.value })} className="bg-secondary text-foreground" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Color</label>
                  <Input
                    value={typeof embedDraft.color === "number" ? `#${embedDraft.color.toString(16).padStart(6, "0")}` : embedDraft.color || ""}
                    onChange={(ev) => {
                      const v = ev.target.value
                      const n = v.startsWith("#") ? parseInt(v.slice(1), 16) : Number(v)
                      applyEmbedDraft({ ...embedDraft, color: Number.isFinite(n) ? n : 0x2b2d31 })
                    }}
                    className="bg-secondary text-foreground"
                    placeholder="#39b289"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Description</label>
                <textarea
                  value={embedDraft.description || ""}
                  onChange={(ev) => applyEmbedDraft({ ...embedDraft, description: ev.target.value })}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Author Name</label>
                  <Input
                    value={embedDraft.author?.name || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, author: { ...(embedDraft.author || {}), name: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Author Icon URL</label>
                  <Input
                    value={embedDraft.author?.icon_url || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, author: { ...(embedDraft.author || {}), icon_url: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Thumbnail URL</label>
                  <Input
                    value={embedDraft.thumbnail?.url || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, thumbnail: { url: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Image URL</label>
                  <Input
                    value={embedDraft.image?.url || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, image: { url: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Footer Text</label>
                  <Input
                    value={embedDraft.footer?.text || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, footer: { ...(embedDraft.footer || {}), text: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Footer Icon URL</label>
                  <Input
                    value={embedDraft.footer?.icon_url || ""}
                    onChange={(ev) => applyEmbedDraft({ ...embedDraft, footer: { ...(embedDraft.footer || {}), icon_url: ev.target.value } })}
                    className="bg-secondary text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Timestamp</label>
                  <Input
                    type="datetime-local"
                    value={toLocalInputValue(embedDraft.timestamp)}
                    onChange={(ev) => {
                      const raw = ev.target.value
                      if (!raw) {
                        const next = { ...embedDraft }
                        delete next.timestamp
                        applyEmbedDraft(next)
                        return
                      }
                      const d = new Date(raw)
                      if (isNaN(d.getTime())) {
                        const next = { ...embedDraft }
                        delete next.timestamp
                        applyEmbedDraft(next)
                        return
                      }
                      applyEmbedDraft({ ...embedDraft, timestamp: d.toISOString() })
                    }}
                    className="bg-secondary text-foreground"
                  />
                </div>
                <Button variant="outline" onClick={() => applyEmbedDraft({ ...embedDraft, timestamp: new Date().toISOString() })} className="self-end h-9">
                  Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = { ...embedDraft }
                    delete next.timestamp
                    applyEmbedDraft(next)
                  }}
                  className="self-end h-9"
                >
                  Clear
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Fields</div>
                <Button
                  variant="outline"
                  onClick={() => applyEmbedDraft({ ...embedDraft, fields: [...(Array.isArray(embedDraft.fields) ? embedDraft.fields : []), { name: "", value: "" }] })}
                >
                  Add Field
                </Button>
              </div>
              {Array.isArray(embedDraft.fields) && embedDraft.fields.length > 0 && (
                <div className="flex flex-col gap-2">
                  {embedDraft.fields.map((f: any, fi: number) => (
                    <div key={fi} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        value={f.name || ""}
                        onChange={(ev) => {
                          const fields = (embedDraft.fields || []).slice()
                          fields[fi] = { ...(fields[fi] || {}), name: ev.target.value }
                          applyEmbedDraft({ ...embedDraft, fields })
                        }}
                        className="bg-secondary text-foreground"
                        placeholder="Name"
                      />
                      <Input
                        value={f.value || ""}
                        onChange={(ev) => {
                          const fields = (embedDraft.fields || []).slice()
                          fields[fi] = { ...(fields[fi] || {}), value: ev.target.value }
                          applyEmbedDraft({ ...embedDraft, fields })
                        }}
                        className="bg-secondary text-foreground"
                        placeholder="Value"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const fields = Array.isArray(embedDraft.fields) ? embedDraft.fields.filter((_ff: any, j: number) => j !== fi) : []
                          applyEmbedDraft({ ...embedDraft, fields })
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEmbedEditor} className="text-foreground">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={viewJobOpen} onOpenChange={(v) => (v ? setViewJobOpen(true) : setViewJobOpen(false))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">View Scheduled Webhook</DialogTitle>
          </DialogHeader>
          {viewJob && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Webhook URL</label>
                <Input value={viewJob.url} readOnly className="bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Scheduled At</label>
                <Input value={new Date(viewJob.runAt).toLocaleString()} readOnly className="bg-secondary text-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Payload JSON</label>
                <textarea
                  value={viewJob.payload}
                  readOnly
                  rows={10}
                  className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 resize-y max-h-80 overflow-auto"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewJobOpen(false)} className="text-foreground">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
