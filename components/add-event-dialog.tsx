"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Plus, Clock, X } from "lucide-react"
import { useTasksContext } from "@/components/tasks-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import type { EventColor } from "@/lib/types"
import { EVENT_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AddEventDialogProps {
    onAdd: (title: string, description: string, dates: Date[], startTime: string | undefined, endTime: string | undefined, color: EventColor, createdBy?: { name: string | null; image: string | null }) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function AddEventDialog({ onAdd, open: controlledOpen, onOpenChange: setControlledOpen }: AddEventDialogProps) {
    const { data: session } = useSession()
    const { locale } = useTasksContext()
    const currentLocale = locale === "th" ? th : undefined
    const [internalOpen, setInternalOpen] = useState(false)

    const open = controlledOpen ?? internalOpen
    const setOpen = (val: boolean) => {
        setInternalOpen(val)
        setControlledOpen?.(val)
    }
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dates, setDates] = useState<Date[] | undefined>([])
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [color, setColor] = useState<EventColor>("blue")

    const handleSubmit = () => {
        if (!title.trim() || !dates?.length) return
        onAdd(
            title.trim(),
            description.trim(),
            dates,
            startTime || undefined,
            endTime || undefined,
            color,
            session?.user ? { name: session.user.name ?? null, image: session.user.image ?? null } : undefined
        )
        setTitle("")
        setDescription("")
        setDates([])
        setStartTime("")
        setEndTime("")
        setColor("blue")
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs shadow-sm">
                        <Plus className="size-3.5" />
                        Add Event
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <Clock className="size-5 text-primary" />
                        New Event
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2">
                    <Input
                        placeholder="Event title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        className="bg-secondary text-foreground placeholder:text-muted-foreground"
                        autoFocus
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Select Dates</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 bg-secondary text-foreground border-border text-sm"
                                >
                                    <CalendarIcon className="size-4 text-muted-foreground" />
                                    {dates && dates.length > 0 ? (
                                        dates.length === 1 ? (
                                            format(dates[0], "MMMM d, yyyy")
                                        ) : (
                                            `${dates.length} dates selected`
                                        )
                                    ) : (
                                        "Select dates"
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="multiple"
                                    selected={dates}
                                    onSelect={setDates}
                                    locale={currentLocale}
                                    numberOfMonths={1}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time (optional) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">Start Time <span className="opacity-50">(optional)</span></label>
                            <div className="flex gap-1.5">
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="bg-secondary text-foreground flex-1"
                                />
                                {startTime && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => setStartTime("")}
                                        className="shrink-0 size-9 text-muted-foreground/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/30 transition-all"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">End Time <span className="opacity-50">(optional)</span></label>
                            <div className="flex gap-1.5">
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="bg-secondary text-foreground flex-1"
                                />
                                {endTime && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        type="button"
                                        onClick={() => setEndTime("")}
                                        className="shrink-0 size-9 text-muted-foreground/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 border border-transparent hover:border-red-200 dark:hover:border-red-500/30 transition-all"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Color */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">Color</label>
                        <div className="flex items-center gap-2">
                            {(Object.keys(EVENT_COLORS) as EventColor[]).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "size-7 rounded-full transition-all flex items-center justify-center",
                                        EVENT_COLORS[c].dot,
                                        color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "opacity-60 hover:opacity-100",
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} className="text-foreground">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !dates?.length}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Add Event
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
