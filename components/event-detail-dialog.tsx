"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon, Clock, Trash2, Pencil, User, Trash, X } from "lucide-react"
import { useTasksContext } from "@/components/tasks-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
} from "@/components/ui/dialog"
import type { CalendarEvent, EventColor } from "@/lib/types"
import { EVENT_COLORS } from "@/lib/types"
import { cn } from "@/lib/utils"

import { DeleteTaskDialog } from "@/components/delete-task-dialog"

interface EventDetailDialogProps {
    event: CalendarEvent | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: (id: string, updates: Partial<Omit<CalendarEvent, "id">>) => void
    onDelete: (id: string) => void
    showDeleteButton?: boolean
    onDeleteDate?: (eventId: string, dateToDelete: Date) => void
}

export function EventDetailDialog({
    event,
    open,
    onOpenChange,
    onUpdate,
    onDelete,
    showDeleteButton = false,
    onDeleteDate,
}: EventDetailDialogProps) {
    const [isEditing, setIsEditing] = useState(false)
    const { updateEvent, deleteEvent, locale } = useTasksContext()
    const currentLocale = locale === "th" ? th : undefined
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [dates, setDates] = useState<Date[] | undefined>()
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [color, setColor] = useState<EventColor>("blue")

    useEffect(() => {
        if (event) {
            setTitle(event.title)
            setDescription(event.description || "")
            setDates(event.dates && event.dates.length > 0 ? event.dates : [])
            setStartTime(event.startTime || "")
            setEndTime(event.endTime || "")
            setColor(event.color)
            setIsEditing(false)
        }
    }, [event, open])

    if (!event) return null

    const handleSave = () => {
        if (!title.trim() || !dates?.length) return
        onUpdate(event.id, {
            title: title.trim(),
            description: description.trim(),
            dates,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            color,
        })
        setIsEditing(false)
    }

    const handleDeleteDate = (dateToDelete: Date) => {
        if (!event.dates || event.dates.length <= 1) {
            // If only one date left, delete the entire event
            onDelete(event.id)
            onOpenChange(false)
        } else {
            // Remove only this date from the event
            const updatedDates = event.dates.filter(d => d.getTime() !== dateToDelete.getTime())
            onUpdate(event.id, { dates: updatedDates })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-foreground">
                        {isEditing ? "Edit Event" : "Event Details"}
                    </DialogTitle>
                </DialogHeader>

                {!isEditing ? (
                    <div className="flex flex-col gap-6 py-2">
                        {/* Title & Description Card */}
                        <div className="relative overflow-hidden rounded-[24px] border border-border/40 bg-secondary/30 p-7 dark:bg-secondary/10">
                            {/* Subtle Floating Background Icon */}
                            <div className="absolute -right-6 -bottom-6 opacity-[0.04]">
                                <CalendarIcon className="size-40" />
                            </div>

                            <div className="relative">
                                <h3 className="text-2xl font-black tracking-tight text-foreground leading-tight">
                                    {event.title}
                                </h3>

                                <div className="mt-5 mb-5 h-[2px] w-10 rounded-full bg-border/60" />

                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Details</p>
                                    {event.description ? (
                                        <p className="text-[15px] leading-relaxed text-muted-foreground/90 whitespace-pre-wrap font-medium">
                                            {event.description}
                                        </p>
                                    ) : (
                                        <p className="text-sm italic text-muted-foreground/20 font-medium">No additional descriptions provided...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3.5 border border-border/20">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-background shadow-inner text-muted-foreground">
                                    <CalendarIcon className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date{event.dates?.length > 1 ? "s" : ""}</p>
                                    {event.dates && event.dates.length > 0 ? (
                                        event.dates.length === 1 ? (
                                            <p className="text-xs font-semibold mt-0.5 text-foreground truncate">
                                                {(!isNaN(new Date(event.dates[0]).getTime())) ? format(new Date(event.dates[0]), locale === "th" ? "eeee d MMMM yyyy" : "EEEE, MMMM d, yyyy", { locale: currentLocale }) : "Invalid date"}
                                            </p>
                                        ) : (
                                            <div className="mt-1.5 space-y-1">
                                                {event.dates.map((date, index) => (
                                                    <div key={index} className="flex items-center gap-2 group">
                                                        <span className="text-xs font-semibold text-foreground flex-1">
                                                            {(!isNaN(new Date(date).getTime())) ? format(new Date(date), locale === "th" ? "eeee d MMMM yyyy" : "EEEE, MMMM d, yyyy", { locale: currentLocale }) : "Invalid date"}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteDate(date)}
                                                            className="size-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                        >
                                                            <X className="size-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <p className="text-sm italic text-muted-foreground/60">No dates selected</p>
                                    )}
                                </div>
                            </div>

                            {(event.startTime || event.endTime) && (
                                <div className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3.5 border border-border/20">
                                    <div className="flex size-9 items-center justify-center rounded-lg bg-background shadow-inner text-muted-foreground">
                                        <Clock className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time</p>
                                        <p className="text-xs font-semibold mt-0.5 text-foreground">
                                            {event.startTime || "..."} - {event.endTime || "..."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Organizer Section */}
                        <div className="mt-4 pt-4 border-t border-border/40">
                            <div className="flex items-center gap-3 rounded-xl bg-secondary/20 p-3 border border-border/10">
                                <Avatar className="size-9 border-2 border-background shadow-sm">
                                    {event.createdBy ? (
                                        <>
                                            <AvatarImage src={event.createdBy.image ?? ""} alt={event.createdBy.name ?? ""} />
                                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                                {event.createdBy.name?.[0]?.toUpperCase() ?? "U"}
                                            </AvatarFallback>
                                        </>
                                    ) : (
                                        <AvatarFallback className="text-xs font-bold bg-secondary text-muted-foreground">
                                            <User className="size-4" />
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground/60">Organized By</p>
                                    <p className="truncate text-xs font-bold text-foreground">
                                        {event.createdBy?.name ?? "System / Admin"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Title</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Event title"
                                className="bg-secondary border-border"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Description</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Event details..."
                                className="resize-none min-h-[100px] bg-secondary border-border"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Select Dates</label>
                            <Calendar
                                mode="multiple"
                                selected={dates}
                                onSelect={setDates}
                                className="border rounded-xl bg-secondary/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-muted-foreground">Start Time (optional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Clock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="bg-secondary border-border pl-9"
                                        />
                                    </div>
                                    {startTime && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            type="button"
                                            onClick={() => setStartTime("")}
                                            className="shrink-0 size-9 text-muted-foreground hover:text-red-500"
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-muted-foreground">End Time (optional)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Clock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                                        <Input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="bg-secondary border-border pl-9"
                                        />
                                    </div>
                                    {endTime && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            type="button"
                                            onClick={() => setEndTime("")}
                                            className="shrink-0 size-9 text-muted-foreground hover:text-red-500"
                                        >
                                            ✕
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Color</label>
                            <Select value={color} onValueChange={(val: EventColor) => setColor(val)}>
                                <SelectTrigger className="bg-secondary border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(EVENT_COLORS) as EventColor[]).map((c) => (
                                        <SelectItem key={c} value={c}>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("size-3 rounded-full", EVENT_COLORS[c])} />
                                                <span className="capitalize">{c}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-between">
                    {!isEditing ? (
                        <div className="flex w-full items-center justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="h-8 gap-2 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            >
                                <Pencil className="size-4" />
                                <span>Edit</span>
                            </Button>
                            {showDeleteButton && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 px-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                    onClick={() => {
                                        onDelete(event.id)
                                        onOpenChange(false)
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                    <span>Delete</span>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="text-foreground">
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={!title.trim() || !dates?.length} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                Save
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
