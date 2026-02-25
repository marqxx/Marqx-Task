import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import { eventBus } from "@/lib/event-bus"

// PATCH /api/tasks/[id] — update a task
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

    // Verify existence (removed ownership check for collaboration)
    const existing = await prisma.task.findFirst({
        where: { id },
    })
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Handle completedAt logic
    const updates: Record<string, unknown> = { ...body }

    if (body.dueDate !== undefined) {
        updates.dueDate = body.dueDate ? new Date(body.dueDate) : null
    }

    if (body.status) {
        if (
            (body.status === "complete" || body.status === "done") &&
            existing.status !== "complete" &&
            existing.status !== "done"
        ) {
            updates.completedAt = new Date()
        } else if (body.status !== "complete" && body.status !== "done") {
            updates.completedAt = null
        }
    }

    if (body.deletedAt === null) {
        updates.deletedAt = null
    }

    // Set updatedBy to current user

    const task = await prisma.task.update({
        where: { id },
        data: updates as any,
        include: {
            user: {
                select: {
                    name: true,
                    image: true,
                },
            },
            updatedBy: {
                select: {
                    name: true,
                    image: true,
                },
            },
        },
    })

    eventBus.emit("update", { type: "task-updated", data: task })
    return NextResponse.json(task)
}

// DELETE /api/tasks/[id] — delete a task
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
    const existing = await prisma.task.findFirst({
        where: { id },
    })
    if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const url = new URL(req.url)
    const hard = url.searchParams.get("hard") === "true"

    if (hard) {
        await prisma.task.delete({ where: { id } })
        eventBus.emit("update", { type: "task-deleted", data: { id } })
        return NextResponse.json({ success: true, hardDelete: true })
    } else {
        const task = await prisma.task.update({
            where: { id },
            data: { deletedAt: new Date() } as any,
            include: {
                user: { select: { name: true, image: true } },
                updatedBy: { select: { name: true, image: true } }
            }
        })
        eventBus.emit("update", { type: "task-deleted", data: task })
        return NextResponse.json({ success: true, softDelete: true })
    }
}
