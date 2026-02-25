export type Priority = "low" | "medium" | "high"

export type UserRole = "GUEST" | "MEMBER" | "ADMIN"

export type Status = "backlog" | "todo" | "inprogress" | "test" | "complete" | "done"

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
  deletedAt?: Date | null
  category: string
  createdBy?: {
    name: string | null
    image: string | null
  }
  updatedBy?: {
    name: string | null
    image: string | null
  }
}

export interface CalendarEvent {
  id: string
  title: string
  description: string
  dates: Date[]
  startTime?: string // "HH:mm" — optional
  endTime?: string   // "HH:mm" — optional
  color: EventColor
  userId?: string
  createdBy?: {
    name: string | null
    image: string | null
  }
  deletedAt?: Date | null
}

export type EventColor = "blue" | "red" | "green" | "purple" | "orange"

export interface Note {
  id: string
  title: string
  content?: string | null
  date: Date
  authorName?: string | null
  notionUrl?: string | null
  userId?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  user?: {
    name: string | null
    image: string | null
  }
}

export const EVENT_COLORS: Record<EventColor, { label: string; dot: string; bg: string; text: string }> = {
  blue: { label: "Blue", dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/50", text: "text-blue-700 dark:text-blue-300" },
  red: { label: "Red", dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950/50", text: "text-red-700 dark:text-red-300" },
  green: { label: "Green", dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/50", text: "text-emerald-700 dark:text-emerald-300" },
  purple: { label: "Purple", dot: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-950/50", text: "text-purple-700 dark:text-purple-300" },
  orange: { label: "Orange", dot: "bg-orange-500", bg: "bg-orange-50 dark:bg-orange-950/50", text: "text-orange-700 dark:text-orange-300" },
}

export const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  backlog: { label: "Storage", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/50" },
  todo: { label: "Todo", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800/50" },
  inprogress: { label: "In Progress", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50" },
  test: { label: "Test", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50" },
  complete: { label: "Complete", color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
  done: { label: "Done", color: "text-emerald-600 dark:text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/50" },
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; className: string; sortOrder: number }> = {
  high: { label: "High", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800", sortOrder: 0 },
  medium: { label: "Medium", className: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800", sortOrder: 1 },
  low: { label: "Low", className: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700", sortOrder: 2 },
}
