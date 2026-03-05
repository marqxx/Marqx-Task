import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

import { eventBus } from "@/lib/event-bus"

type StatusPayload = { kind: "status"; title: string; oldStatus: string; newStatus: string; actorName?: string | null; actorImage?: string | null }
type DeletePayload = { kind: "delete"; title: string; hard: boolean; actorName?: string | null; actorImage?: string | null }

async function notifyDiscord(creatorUserId: string, payload: StatusPayload | DeletePayload) {
    try {
        const botToken = process.env.DISCORD_BOT_TOKEN
        if (!botToken) return

        const account = await prisma.account.findFirst({
            where: { userId: creatorUserId, provider: "discord" },
            select: { providerAccountId: true },
        })

        const discordId = account?.providerAccountId
        if (!discordId) return

        const dmResp = await fetch("https://discord.com/api/v10/users/@me/channels", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${botToken}`,
            },
            body: JSON.stringify({ recipient_id: discordId }),
        })
        if (!dmResp.ok) return
        const dm = await dmResp.json() as { id?: string }
        if (!dm?.id) return

        const now = new Date().toISOString()
        const COLORS = {
            violet: 0x39b289,
            slate: 0x39b289,
            blue: 0x39b289,
            amber: 0x39b289,
            emerald: 0x39b289,
            emeraldLight: 0x39b289,
            red: 0xbe3a51,
        }
        const VISUALS: Record<string, { emoji: string; color: number; label: string }> = {
            backlog: { emoji: "`🟣`", color: COLORS.violet, label: "Backlog" },
            todo: { emoji: "`⚫️`", color: COLORS.slate, label: "Todo" },
            inprogress: { emoji: "`🔵`", color: COLORS.blue, label: "In Progress" },
            test: { emoji: "`🟡`", color: COLORS.amber, label: "Test" },
            complete: { emoji: "`🟢`", color: COLORS.emeraldLight, label: "Complete" },
            done: { emoji: "`🟢`", color: COLORS.emerald, label: "Done" },
        }
        const title =
            payload.kind === "delete"
                ? "Task Deleted"
                : "Task Status Updated"
        const description =
            payload.kind === "delete"
                ? `Task: **${payload.title}**\nDelete Type: ${payload.hard ? "Hard Delete" : "Soft Delete"}`
                : `> Task: **${payload.title}**\n> ${VISUALS[payload.newStatus]?.emoji ?? ""} Status: ${VISUALS[payload.newStatus]?.label ?? payload.newStatus}`
        const footer = {
            text: payload.actorName ? `BY ${payload.actorName}` : "UPDATED",
            icon_url: payload.actorImage || undefined,
        }
        const color =
            payload.kind === "delete"
                ? COLORS.red
                : VISUALS[payload.newStatus]?.color ?? COLORS.blue
        const embed = { title, description, color, timestamp: now, footer }

        await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bot ${botToken}`,
            },
            body: JSON.stringify({ embeds: [embed] }),
        })
    } catch {
    }
}

async function logWebhookUpdate(embed: any) {
    try {
        const url = process.env.TASK_UPDATE_LOG_WEBHOOK_URL
        if (!url) return
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
        })
    } catch { }
}

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
    updates.updatedById = session.user.id

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

    if (typeof body.status === "string" && body.status !== existing.status) {
        const oldStatus = existing.status
        const newStatus = body.status
        
        // Skip notification if a Dev user is updating their own task
        const isDevUser = (session.user as any)?.role === "MEMBER" || (session.user as any)?.role === "ADMIN"
        const isUpdatingOwnTask = task.userId === session.user.id
        
        if (!(isDevUser && isUpdatingOwnTask)) {
            await notifyDiscord(task.userId, {
                kind: "status",
                title: task.title,
                oldStatus,
                newStatus,
                actorName: (session.user as any)?.name ?? null,
                actorImage: (session.user as any)?.image ?? null,
            })
        }
        {
            const now = new Date().toISOString()
            const COLORS = {
                violet: 0x39b289,
                slate: 0x39b289,
                blue: 0x39b289,
                amber: 0x39b289,
                emerald: 0x39b289,
                emeraldLight: 0x39b289,
                red: 0xbe3a51,
            }
            const VISUALS: Record<string, { emoji: string; color: number; label: string }> = {
                backlog: { emoji: "`🟣`", color: COLORS.violet, label: "Backlog" },
                todo: { emoji: "`⚫️`", color: COLORS.slate, label: "Todo" },
                inprogress: { emoji: "`🔵`", color: COLORS.blue, label: "In Progress" },
                test: { emoji: "`🟡`", color: COLORS.amber, label: "Test" },
                complete: { emoji: "`🟢`", color: COLORS.emeraldLight, label: "Complete" },
                done: { emoji: "`🟢`", color: COLORS.emerald, label: "Done" },
            }
            const visual = VISUALS[newStatus] || { emoji: "", color: 0x3b82f6, label: newStatus }
            const embed = {
                title: "Task Status Updated",
                description: `Task: **${task.title}**\nStatus: ${visual.emoji} ${visual.label}`,
                color: visual.color,
                timestamp: now,
                footer: {
                    text: (session.user as any)?.name ? `BY ${(session.user as any).name}` : "UPDATED",
                    icon_url: (session.user as any)?.image || undefined,
                },
            }
            
            // Only log webhook if not a Dev updating their own task
            if (!(isDevUser && isUpdatingOwnTask)) {
                logWebhookUpdate(embed)
            }
        }
    }

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
        await notifyDiscord(existing.userId, {
            kind: "delete",
            title: existing.title,
            hard: true,
            actorName: (session.user as any)?.name ?? null,
            actorImage: (session.user as any)?.image ?? null,
        })
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
        await notifyDiscord(task.userId, {
            kind: "delete",
            title: task.title,
            hard: false,
            actorName: (session.user as any)?.name ?? null,
            actorImage: (session.user as any)?.image ?? null,
        })
        eventBus.emit("update", { type: "task-deleted", data: task })
        return NextResponse.json({ success: true, softDelete: true })
    }
}
