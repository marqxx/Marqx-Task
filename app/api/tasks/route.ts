import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tasks — fetch all tasks for the logged-in user
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

    // Auto-purge tasks deleted more than 24 hours ago (Run in background)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    prisma.task.deleteMany({
        where: { deletedAt: { lt: twentyFourHoursAgo } }
    }).catch(err => console.error("Purge Error:", err))

    const { searchParams } = new URL(req.url)
    const isTrash = searchParams.get("trash") === "true"

    const tasks = await prisma.task.findMany({
        where: isTrash ? { deletedAt: { not: null } } : { deletedAt: null } as any,
        orderBy: isTrash ? { updatedAt: "desc" } : { createdAt: "desc" },
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

    return NextResponse.json(tasks)
}

import { eventBus } from "@/lib/event-bus"

// POST /api/tasks — create a new task
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
    const { title, description, status, priority, dueDate, category, tempId } = body

    const task = await prisma.task.create({
        data: {
            title,
            description: description || "",
            status: status || "todo",
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : null,
            category: category || "Work",
            completedAt: (status === "complete" || status === "done") ? new Date() : null,
            userId: session.user.id,
        },
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

    // Emit update event with data and optional tempId for client deduplication
    eventBus.emit("update", { type: "task-created", data: task, tempId })

    return NextResponse.json(task, { status: 201 })
}
