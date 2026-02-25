import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

import { eventBus } from "@/lib/event-bus"

// PATCH /api/events/[id] — update an event
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const role = (session.user as any).role
    if (role !== "MEMBER" && role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    // Verify existence
    const existing = await prisma.calendarEvent.findFirst({
        where: { id },
    })
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { title, description, dates, startTime, endTime, color, deletedAt } = body;

    const updates: any = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;
    if (color !== undefined) updates.color = color;
    
    if (dates !== undefined) {
        if (Array.isArray(dates)) {
            updates.dates = dates
                .map((d: any) => {
                    const date = new Date(d);
                    return isNaN(date.getTime()) ? null : date;
                })
                .filter((d: Date | null): d is Date => d !== null);
        } else {
            return NextResponse.json({ error: "Invalid 'dates' format. Expected an array." }, { status: 400 });
        }
    }

    if (deletedAt !== undefined) {
        updates.deletedAt = deletedAt === null ? null : new Date(deletedAt);
    }

    const event = await prisma.calendarEvent.update({
        where: { id },
        data: updates,
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    })

    eventBus.emit("update", { type: "event-updated", data: event })
    return NextResponse.json(event)
}

// DELETE /api/events/[id] — delete an event
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const role = (session.user as any).role
    if (role !== "MEMBER" && role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Verify existence (removed ownership check for collaboration)
    const existing = await prisma.calendarEvent.findFirst({
        where: { id },
    })
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const url = new URL(req.url)
    const hard = url.searchParams.get("hard") === "true"

    if (hard) {
        await prisma.calendarEvent.delete({ where: { id } })
        eventBus.emit("update", { type: "event-deleted", data: { id } })
        return NextResponse.json({ success: true, hardDelete: true })
    } else {
        const event = await prisma.calendarEvent.update({
            where: { id },
            data: { deletedAt: new Date() } as any,
            include: {
                user: { select: { name: true, image: true } }
            }
        })
        eventBus.emit("update", { type: "event-deleted", data: event })
        return NextResponse.json({ success: true, softDelete: true })
    }
}
