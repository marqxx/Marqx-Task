"use client"

import { useState, useMemo } from "react"
import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import { useTasksContext } from "@/components/tasks-provider"
import { StatsCards } from "@/components/stats-cards"
import { AddTaskDialog } from "@/components/add-task-dialog"
import { KanbanBoard } from "@/components/kanban-board"
import { TaskList } from "@/components/task-list"
import { TaskCalendar } from "@/components/task-calendar"
import { TaskDetailDialog } from "@/components/task-detail-dialog"
import { EventDetailDialog } from "@/components/event-detail-dialog"
import { AddEventDialog } from "@/components/add-event-dialog"
import { LayoutGrid, Archive, Columns3, List, Search, Sun, Moon, Trash2, ChevronDown, Plus, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import type { Task, CalendarEvent } from "@/lib/types"
import { AuthButton } from "@/components/auth-button"
import { OnlineUsers } from "@/components/online-users"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { StatsSkeleton, ListSkeleton, KanbanSkeleton, CalendarSkeleton } from "@/components/loading-skeleton"
import { NoteTab } from "@/components/note-tab"
import { AddNoteDialog } from "@/components/add-note-dialog"

export default function Home() {
  const {
    activeTasks,
    archivedTasks,
    deletedTasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    getTasksForDate,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    stats,
    tasks,
    locale,
    setLocale,
  } = useTasksContext()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [initialEditing, setInitialEditing] = useState(false)
  const [showDeleteInDetail, setShowDeleteInDetail] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [showDeleteInEventDetail, setShowDeleteInEventDetail] = useState(false)

  const { theme, setTheme } = useTheme()
  const { data: session, status } = useSession()
  const role = (session?.user as any)?.role

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task)
    setInitialEditing(false)
    setShowDeleteInDetail(false)
    setDetailOpen(true)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowDeleteInEventDetail(false)
    setEventDetailOpen(true)
  }

  const handleRequestDeleteEvent = (eventId: string) => {
    deleteEvent(eventId)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setInitialEditing(true)
    setShowDeleteInDetail(false)
    setDetailOpen(true)
  }

  const handleRequestDelete = (taskId: string) => {
    deleteTask(taskId)
  }

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return activeTasks
    const q = searchQuery.toLowerCase()
    return activeTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q) ||
        task.category.toLowerCase().includes(q),
    )
  }, [activeTasks, searchQuery])

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (status === "authenticated" && (!role || role === "GUEST")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex max-w-md flex-col items-center text-center p-6 border rounded-lg shadow-lg bg-card">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
            <List className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Waiting for Approval</h1>
          <p className="mb-6 text-muted-foreground">
            please contact an admin
          </p>
          <AuthButton />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b] text-foreground pb-20">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-50 w-full px-4 py-4 select-none">
        <div className="max-w-[1400px] mx-auto backdrop-blur-md bg-white/70 dark:bg-card/70 border border-black/[0.08] dark:border-white/[0.08] rounded-2xl px-6 h-14 flex items-center justify-between gap-4 transition-all duration-300">
          <div className="flex items-center gap-3 shrink-0">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <LayoutGrid className="size-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Shiba
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-none">
                Workflow Manager
              </p>
            </div>
          </div>

          {/* Search — centered in header */}
          <div className="hidden lg:block relative w-full max-w-md mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tasks or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full bg-secondary md:bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 transition-all rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden md:flex items-center h-10 px-3 bg-secondary/20 dark:bg-secondary/10 hover:bg-secondary/40 dark:hover:bg-secondary/20 transition-colors rounded-xl border border-black/[0.04] dark:border-white/[0.04]">
              <OnlineUsers />
            </div>

            <div className="h-6 w-px bg-border/40 mx-0.5 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Link href="/archive">
                <Button variant="ghost" size="icon" className="size-9 rounded-lg relative">
                  <Archive className="size-4 text-foreground/70" />
                  {archivedTasks.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-background">
                      {archivedTasks.length}
                    </span>
                  )}
                </Button>
              </Link>

              <Link href="/trash">
                <Button variant="ghost" size="icon" className="size-9 rounded-lg relative">
                  <Trash2 className="size-4 text-foreground/70" />
                  {deletedTasks.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-background">
                      {deletedTasks.length}
                    </span>
                  )}
                </Button>
              </Link>
            </div>

            <div className="h-6 w-px bg-border/40 mx-1" />

            {/* Combined Add Button - Refined */}
            <div className="flex items-center group">
              <ButtonGroup className="border border-black/5 dark:border-white/5 overflow-hidden rounded-xl">
                <Button
                  className="h-10 px-4 gap-2 bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 transition-all border-none rounded-l-xl"
                  onClick={() => setAddTaskOpen(true)}
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline font-semibold">New Task</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="h-10 w-9 p-0 bg-primary/95 hover:bg-primary border-none border-l border-white/10 rounded-r-xl"
                    >
                      <ChevronDown className="size-4 text-primary-foreground/70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 p-1 backdrop-blur-xl bg-popover/95 border border-black/[0.08] dark:border-white/[0.08]">
                    <DropdownMenuItem onClick={() => setAddEventOpen(true)} className="gap-2 h-10 rounded-md cursor-pointer">
                      <Plus className="size-4" />
                      <span className="font-semibold text-sm">Add Event</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddNoteOpen(true)} className="gap-2 h-10 rounded-md cursor-pointer">
                      <FileText className="size-4" />
                      <span className="font-semibold text-sm">Add Note</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>

            <AddTaskDialog onAdd={addTask} open={addTaskOpen} onOpenChange={setAddTaskOpen} />
            <AddEventDialog onAdd={addEvent} open={addEventOpen} onOpenChange={setAddEventOpen} />
            <AddNoteDialog open={addNoteOpen} onOpenChange={setAddNoteOpen} />

            <div className="pl-1">
              <AuthButton />
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="lg:hidden px-4 pb-3 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tasks or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full bg-secondary/30 border-transparent focus:bg-secondary/50 focus:border-primary/20 transition-all rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {loading ? <StatsSkeleton /> : <StatsCards stats={stats} />}

        <div className="mt-6">
          <Tabs defaultValue="list" className="select-none">
            <TabsList className="bg-secondary mb-4">
              <TabsTrigger value="list" className="gap-1.5" disabled={loading}>
                <List className="size-4" />
                Task
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1.5" disabled={loading}>
                <LayoutGrid className="size-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5" disabled={loading}>
                <FileText className="size-4" />
                Notes
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <ListSkeleton />
                </div>
                <div className="lg:col-span-1">
                  <CalendarSkeleton />
                </div>
              </div>
            ) : (
              <>
                {/* Tasklist Tab */}
                <TabsContent value="list">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <TaskList
                        tasks={filteredTasks}
                        onSelect={handleSelectTask}
                        onEdit={handleEditTask}
                        onDelete={handleRequestDelete}
                        onUpdateStatus={(id, status) => updateTask(id, { status })}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <div className="lg:sticky lg:top-20">
                        <TaskCalendar
                          tasks={tasks}
                          getTasksForDate={getTasksForDate}
                          onSelect={handleSelectTask}
                          events={events}
                          getEventsForDate={getEventsForDate}
                          onDeleteEvent={handleRequestDeleteEvent}
                          onEventSelect={handleSelectEvent}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Board Tab */}
                <TabsContent value="board">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <KanbanBoard
                        tasks={filteredTasks}
                        onSelect={handleSelectTask}
                        onEdit={handleEditTask}
                        onDelete={handleRequestDelete}
                        onUpdateStatus={(id, status) => updateTask(id, { status })}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <div className="lg:sticky lg:top-20">
                        <TaskCalendar
                          tasks={tasks}
                          getTasksForDate={getTasksForDate}
                          onSelect={handleSelectTask}
                          events={events}
                          getEventsForDate={getEventsForDate}
                          onDeleteEvent={handleRequestDeleteEvent}
                          onEventSelect={handleSelectEvent}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Notes Tab */}
                <TabsContent value="notes">
                  <NoteTab />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={updateTask}
        onDelete={deleteTask}
        initialEditing={initialEditing}
        showDeleteButton={showDeleteInDetail}
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        onUpdate={updateEvent}
        onDelete={deleteEvent}
        showDeleteButton={showDeleteInEventDetail}
        onDeleteDate={(eventId, dateToDelete) => {
          // Find the event and update its dates
          const event = events.find(e => e.id === eventId)
          if (event) {
            const updatedDates = event.dates.filter(d => d.getTime() !== dateToDelete.getTime())
            if (updatedDates.length === 0) {
              // If no dates left, delete the entire event
              deleteEvent(eventId)
            } else {
              // Update the event with the remaining dates
              updateEvent(eventId, { dates: updatedDates })
            }
          }
        }}
      />
    </main>
  )
}
