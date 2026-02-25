"use client"

import { Circle, CheckCircle2, AlertTriangle, PlayCircle, FlaskConical, Inbox, Archive } from "lucide-react"

interface StatsCardsProps {
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

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    {
      label: "Storage",
      value: stats.backlog,
      icon: Inbox,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/50",
    },
    {
      label: "Todo",
      value: stats.todo,
      icon: Circle,
      color: "text-slate-500",
      bg: "bg-slate-50 dark:bg-slate-800/50",
    },
    {
      label: "In Progress",
      value: stats.inprogress,
      icon: PlayCircle,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Test",
      value: stats.test,
      icon: FlaskConical,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/50",
    },
    {
      label: "Complete",
      value: stats.complete,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/50",
    },
  ]

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 select-none">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 lg:p-4 shadow-sm"
        >
          <div className={cn("flex size-9 lg:size-10 shrink-0 items-center justify-center rounded-lg", item.bg)}>
            <item.icon className={cn("size-4 lg:size-5", item.color)} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <p className="text-xl lg:text-2xl font-bold text-foreground tabular-nums">{item.value}</p>
            </div>
            <p className="text-[10px] lg:text-xs text-muted-foreground">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
