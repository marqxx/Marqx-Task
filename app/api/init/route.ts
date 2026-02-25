import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role
    if (role !== "MEMBER" && role !== "ADMIN") {
        return NextResponse.json({
            tasks: [],
            events: [],
            notes: [],
            onlineUsers: []
        })
    }

    // Run purge in background
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    prisma.task.deleteMany({ where: { deletedAt: { lt: twentyFourHoursAgo } } }).catch(() => { })
    prisma.calendarEvent.deleteMany({ where: { deletedAt: { lt: twentyFourHoursAgo } } }).catch(() => { })

    const [tasks, events, notes, onlineUsers] = await Promise.all([
        prisma.task.findMany({
            include: {
                user: { select: { name: true, image: true } },
                updatedBy: { select: { name: true, image: true } },
            },
        }),
        prisma.calendarEvent.findMany({
            include: {
                user: { select: { name: true, image: true } },
            },
        }),
        prisma.note.findMany({
            where: {
                OR: [
                    { deletedAt: null },
                    { deletedAt: { isSet: false } }
                ]
            } as any,
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { name: true, image: true } },
            },
        }),
        prisma.user.findMany({
            where: {
                lastActive: {
                    gt: new Date(Date.now() - 10000)
                }
            },
            select: { id: true, name: true, image: true }
        })
    ])

    return NextResponse.json({
        tasks,
        events,
        notes,
        onlineUsers
    })
}
