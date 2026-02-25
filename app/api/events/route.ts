import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/events — fetch all events for the logged-in user
export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const role = (session.user as any).role
    if (role !== "MEMBER" && role !== "ADMIN") {
        return NextResponse.json([]) // Return empty list for GUEST
    }

    // Auto-purge events deleted more than 24 hours ago (Run in background)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    prisma.calendarEvent.deleteMany({
        where: { deletedAt: { lt: twentyFourHoursAgo } }
    }).catch(err => console.error("Purge Error:", err))

    const { searchParams } = new URL(req.url)
    const isTrash = searchParams.get("trash") === "true"

    const events = await prisma.calendarEvent.findMany({
        where: isTrash ? { deletedAt: { not: null } } : { deletedAt: null } as any,
        orderBy: isTrash ? { updatedAt: "desc" } : { createdAt: "asc" },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    })

    return NextResponse.json(events)
}

import { eventBus } from "@/lib/event-bus"

// POST /api/events — create a new event
export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const role = (session.user as any).role
    if (role !== "MEMBER" && role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, dates, startTime, endTime, color, tempId } = body

    const event = await (prisma.calendarEvent as any).create({
        data: {
            title,
            description: description || "",
            dates: dates && Array.isArray(dates) ? dates.map((d: string) => new Date(d)) : [],
            startTime: startTime || null,
            endTime: endTime || null,
            color: color || "blue",
            userId: session.user.id,
        },
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    })

    // Emit update event
    eventBus.emit("update", { type: "event-created", data: event, tempId })

    return NextResponse.json(event, { status: 201 })
}
