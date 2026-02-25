"use client"

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import type { Task, Priority, Status, CalendarEvent, EventColor, Note } from "@/lib/types"

interface TasksContextValue {
  tasks: Task[]
  activeTasks: Task[]
  archivedTasks: Task[]
  deletedTasks: Task[]
  deletedEvents: CalendarEvent[]
  loading: boolean
  onlineUsers: { id: string; name: string | null; image: string | null }[]
  addTask: (
    title: string,
    priority: Priority,
    dueDate: Date | null,
    category: string,
    description: string,
    status?: Status,
    createdBy?: { name: string | null; image: string | null },
  ) => void
  updateTask: (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => void
  deleteTask: (id: string) => Promise<void>
  getTasksForDate: (date: Date) => Task[]
  events: CalendarEvent[]
  addEvent: (title: string, description: string, dates: Date[], startTime: string | undefined, endTime: string | undefined, color: EventColor, createdBy?: { name: string | null; image: string | null }) => Promise<void>
  updateEvent: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  getEventsForDate: (date: Date) => CalendarEvent[]
  // Notes
  notes: Note[]
  addNote: (title: string, content: string, date: Date, authorName?: string) => Promise<Note | null>
  deleteNote: (id: string) => Promise<void>
  getNotesForDate: (date: Date) => Note[]
  locale: "en" | "th"
  setLocale: (l: "en" | "th") => void
  stats: {
    total: number
    backlog: number
    todo: number
    inprogress: number
    test: number
    complete: number
    done: number
    overdue: number
  }
}

const TasksContext = createContext<TasksContextValue | null>(null)

function playNotificationSound() {
  if (typeof window === "undefined") return
  try {
    const AnyWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext }
    const AudioCtx = window.AudioContext || AnyWindow.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = "triangle"
    oscillator.frequency.value = 880
    gain.gain.value = 0.2
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      ctx.close()
    }, 200)
  } catch {
  }
}

// Helper: parse date strings from API into Date objects
function parseTask(raw: Record<string, unknown>): Task {
  return {
    ...raw,
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) || "",
    status: raw.status as Status,
    priority: raw.priority as Priority,
    dueDate: raw.dueDate ? new Date(raw.dueDate as string) : null,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
    completedAt: raw.completedAt ? new Date(raw.completedAt as string) : null,
    deletedAt: raw.deletedAt ? new Date(raw.deletedAt as string) : null,
    category: (raw.category as string) || "Work",
    createdBy: raw.user ? (raw.user as { name: string | null; image: string | null }) : undefined,
    updatedBy: raw.updatedBy ? (raw.updatedBy as { name: string | null; image: string | null }) : undefined,
  } as Task
}

function parseEvent(raw: Record<string, unknown>): CalendarEvent {
  return {
    ...raw,
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) || "",
    dates: ((raw.dates as string[] | Date[] | undefined) || [])
      .map((d) => new Date(d as string))
      .filter((d) => !isNaN(d.getTime())),
    startTime: (raw.startTime as string) || undefined,
    endTime: (raw.endTime as string) || undefined,
    color: (raw.color as EventColor) || "blue",
    createdBy: raw.user ? (raw.user as { name: string | null; image: string | null }) : undefined,
    deletedAt: raw.deletedAt ? new Date(raw.deletedAt as string) : null,
  } as CalendarEvent
}

function parseNote(raw: Record<string, unknown>): Note {
  return {
    id: raw.id as string,
    title: raw.title as string,
    content: (raw.content as string) || null,
    date: new Date(raw.date as string),
    authorName: (raw.authorName as string) || null,
    notionUrl: (raw.notionUrl as string) || null,
    userId: raw.userId as string | undefined,
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
    deletedAt: raw.deletedAt ? new Date(raw.deletedAt as string) : null,
    user: raw.user ? (raw.user as { name: string | null; image: string | null }) : undefined,
  }
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; name: string | null; image: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState<"en" | "th">("en")

  // =============================================
  // Fetch data from API on mount and setup polling
  // =============================================
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchData = async (background = false) => {
      if (!background) setLoading(true)
      try {
        const res = await fetch("/api/init")
        if (res.ok) {
          const data = await res.json()
          setTasks(data.tasks.map(parseTask))
          setEvents(data.events.map(parseEvent))
          // Initialize notes from init API
          if (Array.isArray(data.notes)) {
            setNotes(data.notes.map(parseNote))
          }
          setOnlineUsers(data.onlineUsers)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        if (!background) toast.error("Failed to load data")
      } finally {
        if (!background) setLoading(false)
      }
    }

    // Initial fetch
    fetchData()

    // Real-time updates via SSE
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      if (!session?.user?.id) return;

      try {
        if (eventSource) {
          eventSource.close();
        }

        eventSource = new EventSource("/api/stream");

        eventSource.onopen = () => {
          if (retryTimeout) clearTimeout(retryTimeout);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "connected" || data.type === "ping") {
              return;
            }

            // Unified handler for tasks
            if (data.type === "task-created" || data.type === "task-updated") {
              setTasks((prev) => {
                const incoming = parseTask(data.data)
                if (data.tempId) {
                  const tempExists = prev.some(t => t.id === data.tempId);
                  if (tempExists) {
                    return prev.map(t => t.id === data.tempId ? incoming : t);
                  }
                }
                const exists = prev.some((t) => t.id === incoming.id)
                if (exists) {
                  return prev.map((t) => (t.id === incoming.id ? incoming : t))
                }
                return [incoming, ...prev]
              })
            } else if (data.type === "task-deleted") {
              setTasks((prev) => {
                const incoming = parseTask(data.data)
                if (incoming.deletedAt) {
                  const exists = prev.some(t => t.id === incoming.id)
                  if (!exists) return [incoming, ...prev]
                  return prev.map(t => t.id === incoming.id ? incoming : t)
                }
                return prev.filter((t) => t.id !== data.data.id)
              })
            }
            // Unified handler for events
            else if (data.type === "event-created" || data.type === "event-updated") {
              setEvents((prev) => {
                const incoming = parseEvent(data.data)
                if (data.tempId) {
                  const tempExists = prev.some(e => e.id === data.tempId);
                  if (tempExists) {
                    return prev.map(e => e.id === data.tempId ? incoming : e);
                  }
                }
                const exists = prev.some((e) => e.id === incoming.id)
                if (exists) {
                  return prev.map((e) => (e.id === incoming.id ? incoming : e))
                }
                return [...prev, incoming]
              })
            } else if (data.type === "event-deleted") {
              setEvents((prev) => {
                const incoming = parseEvent(data.data)
                if (incoming.deletedAt) {
                  const exists = prev.some(e => e.id === incoming.id)
                  if (!exists) return [...prev, incoming]
                  return prev.map(e => e.id === incoming.id ? incoming : e)
                }
                return prev.filter((e) => e.id !== data.data.id)
              })
            }
            // Handler for notes
            else if (data.type === "note-created") {
              setNotes((prev) => {
                const incoming = parseNote(data.data)
                // Don't add if it already exists (from optimistic update)
                if (prev.some(n => n.id === incoming.id)) {
                  return prev.map(n => n.id === incoming.id ? incoming : n)
                }
                return [incoming, ...prev]
              })
            } else if (data.type === "note-deleted") {
              setNotes((prev) => {
                const noteId = data.data?.id
                if (!noteId) return prev
                return prev.filter(n => n.id !== noteId)
              })
            } else if (data.type === "users-updated") {
              // Trigger a quick fetch of online users
              fetch("/api/users/online")
                .then(res => res.json())
                .then(data => setOnlineUsers(data))
                .catch(() => { });
            } else {
              fetchData(true);
            }
          } catch (e) {
            console.error("SSE Parse Error", e);
          }
        };

        eventSource.onerror = (_err) => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          retryTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (e) {
        console.error("Failed to connect to SSE:", e);
        retryTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    // Dedicated fast polling for online users (every 5s for snappy feel)
    const fetchOnlineUsers = async () => {
      try {
        const res = await fetch("/api/users/online")
        if (res.ok) {
          const data = await res.json()
          setOnlineUsers(data)
        }
      } catch (e) { /* ignore */ }
    }
    const onlineInterval = setInterval(fetchOnlineUsers, 5000)

    // Fallback polling (every 30s) just in case SSE fails
    const fallbackInterval = setInterval(() => fetchData(true), 30000)

    // Send heartbeat every 5 seconds to stay "online" (snappy)
    const heartbeat = async () => {
      try {
        await fetch("/api/user/heartbeat", { method: "POST" })
      } catch (e) { /* ignore */ }
    }
    heartbeat()
    const heartbeatInterval = setInterval(heartbeat, 5000)

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
      clearInterval(onlineInterval)
      clearInterval(fallbackInterval)
      clearInterval(heartbeatInterval)
    }
  }, [session?.user?.id])


  // Auto-archive 'complete' tasks to 'done' if they were not completed today
  useEffect(() => {
    if (loading) return

    const today = new Date()
    tasks.forEach((t) => {
      if (t.status === "complete" && t.completedAt) {
        const compDate = new Date(t.completedAt)
        if (
          compDate.getDate() !== today.getDate() ||
          compDate.getMonth() !== today.getMonth() ||
          compDate.getFullYear() !== today.getFullYear()
        ) {
          // Auto-archive to 'done' via API
          updateTask(t.id, { status: "done" as Status })
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // =============================================
  // Task CRUD
  // =============================================
  const addTask = useCallback(
    async (
      title: string,
      priority: Priority,
      dueDate: Date | null,
      category: string,
      description: string,
      status: Status = "todo",
      createdBy?: { name: string | null; image: string | null },
    ) => {
      // Use a robust temp ID
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempTask: Task = {
        id: tempId,
        title,
        description,
        status,
        priority,
        dueDate: dueDate || null,
        category,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        createdBy: createdBy || undefined,
        updatedBy: undefined,
      }

      // Optimistic update
      setTasks((prev) => [tempTask, ...prev])

      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            status,
            priority,
            dueDate: dueDate?.toISOString() || null,
            category,
            tempId, // Send tempId for SSE correlation
          }),
        })

        if (!res.ok) throw new Error("Failed to create task")

        const newTask = parseTask(await res.json())

        // Robust merge: ensure we remove the temp ID and any potential duplicate of the real ID
        setTasks((prev) => {
          // If SSE already replaced tempId with real ID, `prev` has real ID.
          // If SSE hasn't arrived, `prev` has tempId.
          // In both cases, we want to ensure only ONE instance of the real ID exists.

          const withoutTemp = prev.filter(t => t.id !== tempId);
          const withoutDuplicate = withoutTemp.filter(t => t.id !== newTask.id);

          return [newTask, ...withoutDuplicate]
        })
      } catch (err) {
        console.error("Failed to add task:", err)
        toast.error("Failed to create task")
        // Rollback
        setTasks((prev) => prev.filter((t) => t.id !== tempId))
      }
    },
    [],
  )

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<Task, "id" | "createdAt">>) => {
      const originalTask = tasks.find((t) => t.id === id)
      if (!originalTask) return

      // Optimistic update
      const optimisticUpdate = { ...originalTask, ...updates, updatedAt: new Date() }
      setTasks((prev) => prev.map((t) => (t.id === id ? optimisticUpdate : t)))

      try {
        // Prepare body — convert Date objects to ISO strings
        const body: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(updates)) {
          if (key === "createdBy" || key === "updatedBy") continue // Skip non-DB fields
          if (value instanceof Date) {
            body[key] = value.toISOString()
          } else {
            body[key] = value
          }
        }

        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error("Failed to update task")

        const updated = parseTask(await res.json())
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? updated : t)),
        )
      } catch (err) {
        console.error("Failed to update task:", err)
        toast.error("Failed to update task")
        // Rollback
        setTasks((prev) => prev.map((t) => (t.id === id ? originalTask : t)))
      }
    },
    [tasks],
  )

  const deleteTask = useCallback(async (id: string) => {
    const originalTask = tasks.find((t) => t.id === id)
    if (!originalTask) return

    // Optimistic delete: mark as deleted instead of removing
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, deletedAt: new Date() } : t)))

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete task")
    } catch (err) {
      console.error("Failed to delete task:", err)
      toast.error("Failed to delete task")
      // Rollback
      setTasks((prev) => {
        // Prevent duplicate if it somehow reappeared
        if (prev.some(t => t.id === id)) return prev
        return [...prev, originalTask]
      })
    }
  }, [tasks])

  const getTasksForDate = useCallback(
    (date: Date) => {
      return tasks.filter(
        (task) =>
          !task.deletedAt &&
          task.status !== "complete" &&
          task.status !== "done" &&
          task.dueDate &&
          task.dueDate.getFullYear() === date.getFullYear() &&
          task.dueDate.getMonth() === date.getMonth() &&
          task.dueDate.getDate() === date.getDate(),
      )
    },
    [tasks],
  )

  // =============================================
  // Event CRUD
  // =============================================
  const addEvent = useCallback(
    async (
      title: string,
      description: string,
      dates: Date[],
      startTime: string | undefined,
      endTime: string | undefined,
      color: EventColor,
      createdBy?: { name: string | null; image: string | null },
    ) => {
      // Robust temp ID
      const tempId = `temp-evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const tempEvent: CalendarEvent = {
        id: tempId,
        title,
        description,
        dates,
        startTime,
        endTime,
        color,
        createdBy,
      }

      setEvents((prev) => [...prev, tempEvent])

      try {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            dates: dates.map(d => d.toISOString()),
            startTime: startTime || null,
            endTime: endTime || null,
            color,
            tempId, // Send tempId for SSE correlation
          }),
        })

        if (!res.ok) throw new Error("Failed to create event")

        const newEvent = parseEvent(await res.json())

        // Robust merge
        setEvents((prev) => {
          const withoutTemp = prev.filter(e => e.id !== tempId);
          const withoutDuplicate = withoutTemp.filter(e => e.id !== newEvent.id);
          return [...withoutDuplicate, newEvent]
        })
      } catch (err) {
        console.error("Failed to add event:", err)
        toast.error("Failed to create event")
        // Rollback
        setEvents((prev) => prev.filter((e) => e.id !== tempId))
      }
    },
    [],
  )

  const updateEvent = useCallback(
    async (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => {
      const originalEvent = events.find((e) => e.id === id)
      if (!originalEvent) return

      const optimisticUpdate = { ...originalEvent, ...updates }
      setEvents((prev) => prev.map((e) => (e.id === id ? optimisticUpdate : e)))

      try {
        const body: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(updates)) {
          if (key === "createdBy") continue
          if (value instanceof Date) {
            body[key] = value.toISOString()
          } else if (Array.isArray(value) && value.every(item => item instanceof Date)) {
            body[key] = value.map(item => item.toISOString());
          }
          else {
            body[key] = value
          }
        }

        const res = await fetch(`/api/events/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!res.ok) throw new Error("Failed to update event")

        const updated = parseEvent(await res.json())
        setEvents((prev) =>
          prev.map((evt) => (evt.id === id ? updated : evt)),
        )
      } catch (err) {
        console.error("Failed to update event:", err)
        toast.error("Failed to update event")
        // Rollback
        setEvents((prev) => prev.map((e) => (e.id === id ? originalEvent : e)))
      }
    },
    [events],
  )

  const deleteEvent = useCallback(async (id: string) => {
    const originalEvent = events.find((e) => e.id === id)
    if (!originalEvent) return

    // Optimistic delete: mark as deleted instead of removing
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, deletedAt: new Date() } : e)))

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Failed to delete event")
    } catch (err) {
      console.error("Failed to delete event:", err)
      toast.error("Failed to delete event")
      // Rollback
      setEvents((prev) => {
        if (prev.some(e => e.id === id)) return prev
        return [...prev, originalEvent]
      })
    }
  }, [events])

  const getEventsForDate = useCallback(
    (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return events.filter((e) => {
        if (e.deletedAt) return false
        return e.dates
          .map((dateVal) => new Date(dateVal))
          .filter((ed) => !isNaN(ed.getTime()))
          .some((ed) => {
            ed.setHours(0, 0, 0, 0)
            return ed.getTime() === d.getTime()
          })
      })
        .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))
    },
    [events],
  )

  // =============================================
  // Note CRUD
  // =============================================
  const addNote = useCallback(
    async (title: string, content: string, date: Date, authorName?: string): Promise<Note | null> => {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            date: date.toISOString(),
            authorName: authorName || null,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          toast.error("Failed to save note", { description: errData?.error })
          return null
        }

        const raw = await res.json()
        const newNote = parseNote(raw)

        // Optimistic: add to state if SSE hasn't done it yet
        setNotes((prev) => {
          if (prev.some(n => n.id === newNote.id)) return prev
          return [newNote, ...prev]
        })

        toast.success("Note saved")
        return newNote
      } catch (err: any) {
        console.error("Failed to add note:", err)
        toast.error("Error saving note", { description: err?.message || String(err) })
        return null
      }
    },
    [],
  )

  const deleteNote = useCallback(async (id: string) => {
    // Optimistic: remove from state immediately
    setNotes((prev) => prev.filter((n) => n.id !== id))

    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        throw new Error("Failed to delete note")
      }
      toast.success("Note deleted")
    } catch (err: any) {
      console.error("Failed to delete note:", err)
      toast.error("Delete error", { description: err?.message || String(err) })
      // Rollback: re-fetch notes to restore state
      try {
        const res = await fetch("/api/notes?limit=50")
        if (res.ok) {
          const data = await res.json()
          setNotes(data.items.map(parseNote))
        }
      } catch { }
    }
  }, [])

  const getNotesForDate = useCallback(
    (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return notes.filter((n) => {
        if (n.deletedAt) return false
        const nd = new Date(n.date)
        nd.setHours(0, 0, 0, 0)
        return nd.getTime() === d.getTime()
      })
    },
    [notes],
  )

  // =============================================
  // Computed values
  // =============================================
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "done" && !t.deletedAt), [tasks])
  const archivedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "done" && !t.deletedAt)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [tasks],
  )
  const deletedTasks = useMemo(() => tasks.filter((t) => t.deletedAt).sort((a, b) => (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0)), [tasks])
  const deletedEvents = useMemo(() => events.filter((e) => e.deletedAt).sort((a, b) => (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0)), [events])

  const stats = useMemo(
    () => {
      const today = new Date()
      return {
        total: tasks.filter((t) => !t.deletedAt).length,
        backlog: tasks.filter((t) => t.status === "backlog" && !t.deletedAt).length,
        todo: tasks.filter((t) => t.status === "todo" && !t.deletedAt).length,
        inprogress: tasks.filter((t) => t.status === "inprogress" && !t.deletedAt).length,
        test: tasks.filter((t) => t.status === "test" && !t.deletedAt).length,
        complete: tasks.filter((t) => t.status === "complete" && !t.deletedAt).length,
        done: tasks.filter((t) => t.status === "done" && !t.deletedAt).length,
        overdue: tasks.filter(
          (t) => !t.deletedAt && t.status !== "complete" && t.status !== "done" && t.status !== "backlog" && t.dueDate && t.dueDate < today,
        ).length,
      }
    },
    [tasks],
  )

  const value = useMemo(
    () => ({
      tasks,
      activeTasks,
      archivedTasks,
      deletedTasks,
      deletedEvents,
      loading,
      onlineUsers,
      addTask,
      updateTask,
      deleteTask,
      getTasksForDate,
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      getEventsForDate,
      notes,
      addNote,
      deleteNote,
      getNotesForDate,
      stats,
      locale,
      setLocale,
    }),
    [tasks, activeTasks, archivedTasks, deletedTasks, deletedEvents, loading, onlineUsers, addTask, updateTask, deleteTask, getTasksForDate, events, addEvent, updateEvent, deleteEvent, getEventsForDate, notes, addNote, deleteNote, getNotesForDate, stats, locale],
  )

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasksContext() {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error("useTasksContext must be used within TasksProvider")
  return ctx
}
