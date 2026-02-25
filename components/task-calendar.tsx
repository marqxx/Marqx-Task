"use client"

import React, { useState, useMemo, useCallback, useRef } from "react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AddEventDialog } from "@/components/add-event-dialog"
import type { Task, CalendarEvent, EventColor } from "@/lib/types"
import { STATUS_CONFIG, EVENT_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CalendarDays, Clock, X, Trash2, User, FileText } from "lucide-react"
import { DayButton } from "react-day-picker"
import { NoteDetailDialog } from "@/components/note-detail-dialog"

import { DeleteTaskDialog } from "@/components/delete-task-dialog"
import { useTasksContext } from "@/components/tasks-provider"

// Color map for event indicator dots - the actual Tailwind classes
const EVENT_DOT_BG: Record<string, string> = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
}

// On-today variants (need contrast against primary blue bg)
const EVENT_DOT_BG_TODAY: Record<string, string> = {
  blue: "bg-blue-200",
  red: "bg-red-400",
  green: "bg-emerald-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
}

interface TaskCalendarProps {
  tasks: Task[]
  getTasksForDate: (date: Date) => Task[]
  onSelect: (task: Task) => void
  events: CalendarEvent[]
  getEventsForDate: (date: Date) => CalendarEvent[]
  onDeleteEvent: (id: string) => void
  onEventSelect: (event: CalendarEvent) => void
}

export function TaskCalendar({
  tasks,
  getTasksForDate,
  onSelect,
  events,
  getEventsForDate,
  onDeleteEvent,
  onEventSelect,
}: TaskCalendarProps) {
  const { locale, deleteTask, updateEvent, getNotesForDate, deleteNote, notes } = useTasksContext()
  const currentLocale = locale === "th" ? th : undefined
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [noteOpen, setNoteOpen] = useState(false)

  const selectedTasks = getTasksForDate(selectedDate)
  const selectedEvents = getEventsForDate(selectedDate)

  // Use all notes sorted by date (newest first), limit to a reasonable number or let user scroll
  const allNotesSorted = useMemo(() => {
    return [...notes]
      .filter(n => !n.deletedAt)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [notes])

  // Build a lookup: dateString -> { hasTask, eventColors[] }
  const dateIndicatorMap = useMemo(() => {
    const map = new Map<string, { hasTask: boolean; eventColors: string[] }>()

    // Add tasks (skip deleted and completed/done)
    tasks.forEach((t) => {
      if (!t.dueDate || t.deletedAt || t.status === "complete" || t.status === "done") return
      const key = new Date(t.dueDate).toDateString()
      if (!map.has(key)) map.set(key, { hasTask: false, eventColors: [] })
      map.get(key)!.hasTask = true
    })

    // Add events with unique colors per date
    events.forEach((e) => {
      if (e.deletedAt) return

      e.dates.forEach(d => {
        const key = new Date(d).toDateString()
        if (!map.has(key)) map.set(key, { hasTask: false, eventColors: [] })
        const entry = map.get(key)!
        if (!entry.eventColors.includes(e.color)) {
          entry.eventColors.push(e.color)
        }
      })
    })

    return map
  }, [tasks, events])

  // Custom DayButton that renders real DOM dots instead of pseudo-elements
  const CustomDayButton = useCallback(
    ({ className, day, modifiers, children, ...props }: React.ComponentProps<typeof DayButton>) => {

      const ref = useRef<HTMLButtonElement>(null)

      const dateKey = day.date.toDateString()
      const indicators = dateIndicatorMap.get(dateKey)
      const isToday = modifiers.today

      return (
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          data-day={`${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`}
          data-selected-single={
            modifiers.selected &&
            !modifiers.range_start &&
            !modifiers.range_end &&
            !modifiers.range_middle
          }
          data-range-start={modifiers.range_start}
          data-range-end={modifiers.range_end}
          data-range-middle={modifiers.range_middle}
          data-today={modifiers.today}
          className={cn(
            "relative flex flex-col aspect-square size-auto w-full min-w-(--cell-size) items-center justify-center rounded-lg p-0 font-normal transition-all duration-200 select-none outline-none border border-transparent !shadow-none",
            // Default Hover
            "hover:bg-secondary dark:hover:bg-muted hover:text-foreground",
            // Today styling
            "data-[today=true]:bg-primary data-[today=true]:text-primary-foreground data-[today=true]:border-primary data-[today=true]:shadow-md data-[today=true]:shadow-primary/25",
            "data-[today=true]:hover:bg-primary/90 data-[today=true]:hover:text-primary-foreground dark:data-[today=true]:hover:bg-primary/90 dark:data-[today=true]:hover:text-primary-foreground",
            // Selected styling
            "data-[selected-single=true]:border-dashed data-[selected-single=true]:border-primary data-[selected-single=true]:bg-primary/10 data-[selected-single=true]:text-primary data-[selected-single=true]:font-bold",
            "data-[selected-single=true]:hover:bg-primary/20 dark:data-[selected-single=true]:hover:bg-primary/30",
            // Today + Selected
            "data-[today=true]:data-[selected-single=true]:border-dashed data-[today=true]:data-[selected-single=true]:border-primary-foreground/50",
            // Focus
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className,
          )}
          {...props}
        >
          {/* Day number */}
          <span className="leading-none">{children}</span>

          {/* Indicator dots row */}
          {indicators && (indicators.hasTask || indicators.eventColors.length > 0) && (
            <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex items-center justify-center gap-[3px]">
              {/* Task dot - circle */}
              {indicators.hasTask && (
                <span
                  className={cn(
                    "size-1 rounded-full shrink-0",
                    isToday ? "bg-white" : "bg-primary"
                  )}
                />
              )}
              {/* Event dots - diamonds, one per unique color */}
              {indicators.eventColors.map((color) => (
                <span
                  key={color}
                  className={cn(
                    "size-1 rotate-45 shrink-0",
                    isToday
                      ? (EVENT_DOT_BG_TODAY[color] || "bg-white")
                      : (EVENT_DOT_BG[color] || "bg-orange-500")
                  )}
                />
              ))}
            </span>
          )}
        </Button>
      )
    },
    [dateIndicatorMap],
  )

  const hasContent = selectedTasks.length > 0 || selectedEvents.length > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-2 shadow-sm">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          className="w-full"
          locale={currentLocale}
          components={{
            DayButton: CustomDayButton,
          }}
        />
      </div>

      {/* Add Event button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="size-4 text-primary" />
          {format(selectedDate, locale === "th" ? "d MMMM yyyy" : "MMMM d, yyyy", { locale: currentLocale })}
        </h3>
      </div>

      {/* Notes Section - Always visible */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="size-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</span>
          <Badge variant="outline" className="text-[10px] ml-auto bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
            {allNotesSorted.length} note{allNotesSorted.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {allNotesSorted.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No notes yet</p>
        ) : (
          <div className="custom-scrollbar flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
            {allNotesSorted.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note)
                  setNoteOpen(true)
                }}
                className="group flex items-center gap-3 rounded-lg bg-secondary/50 p-2 cursor-pointer hover:bg-secondary transition-all"
              >
                <div className="size-2 shrink-0 rounded-full bg-amber-400" />
                <span className="text-sm font-medium text-foreground truncate flex-1">{note.title}</span>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNote(note.id)
                  }}
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Events for selected date */}
      {selectedEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Events</span>
            <Badge variant="outline" className="text-[10px] ml-auto bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="flex flex-col gap-2">
            {selectedEvents.map((event) => {
              const colorConf = EVENT_COLORS[event.color]
              return (
                <div
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg p-2 transition-all cursor-pointer hover:bg-secondary/80",
                    colorConf.bg,
                  )}
                >
                  <div className={cn("size-2 shrink-0 rounded-full", colorConf.dot)} />
                  <span className={cn("text-sm font-medium truncate flex-1", colorConf.text)}>
                    {event.title}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      const d = new Date(selectedDate)
                      d.setHours(0, 0, 0, 0)
                      const updatedDates = event.dates.filter((dateVal) => {
                        const ed = new Date(dateVal)
                        ed.setHours(0, 0, 0, 0)
                        return ed.getTime() !== d.getTime()
                      })
                      if (updatedDates.length === 0) {
                        onDeleteEvent(event.id)
                      } else {
                        updateEvent(event.id, { dates: updatedDates })
                      }
                    }}
                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks for selected date */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="size-3.5 text-blue-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</span>
          {selectedTasks.length > 0 && (
            <Badge variant="outline" className="text-[10px] ml-auto bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              {selectedTasks.length} task{selectedTasks.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {selectedTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            No tasks scheduled
          </p>
        ) : (
          <div className="custom-scrollbar flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {selectedTasks.map((task) => {
              const statusConf = STATUS_CONFIG[task.status]
              const dotColor = {
                backlog: "bg-violet-400",
                todo: "bg-slate-400",
                inprogress: "bg-blue-500",
                test: "bg-amber-500",
                complete: "bg-emerald-400",
                done: "bg-emerald-500",
              }[task.status]
              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(task)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSelect(task) }}
                  className="flex items-center gap-3 rounded-lg bg-secondary p-2.5 cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  <div className={cn("size-2 shrink-0 rounded-full", dotColor)} />
                  <span
                    className={cn(
                      "text-sm text-foreground truncate",
                      task.status === "done" && "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </span>
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 ml-auto shrink-0 border-transparent", statusConf.bg, statusConf.color)}>
                    {statusConf.label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTask(task.id)
                    }}
                    className="size-5 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <NoteDetailDialog
        note={selectedNote}
        open={noteOpen}
        onOpenChange={setNoteOpen}
      />
    </div >
  )
}
