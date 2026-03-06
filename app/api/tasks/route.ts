import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type CreatePayload = { title: string; status: string; priority: string; actorName?: string | null; actorImage?: string | null }
const COLORS = { violet: 0x8b5cf6, slate: 0x6b7280, blue: 0x3b82f6, amber: 0xf59e0b, emerald: 0x10b981, emeraldLight: 0x34d399, red: 0xef4444 }
const VISUALS: Record<string, { emoji: string; color: number; label: string }> = {
  backlog: { emoji: "🟣", color: COLORS.violet, label: "Backlog" },
  todo: { emoji: "⚫️", color: COLORS.slate, label: "Todo" },
  inprogress: { emoji: "🔵", color: COLORS.blue, label: "In Progress" },
  test: { emoji: "🟡", color: COLORS.amber, label: "Test" },
  complete: { emoji: "🟢", color: COLORS.emeraldLight, label: "Complete" },
  done: { emoji: "🟢", color: COLORS.emerald, label: "Done" },
}

async function notifyDevs(payload: CreatePayload) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    const devIds = (process.env.DISCORD_DEV_IDS || "").split(",").map((s) => s.trim()).filter(Boolean)
    if (!botToken || devIds.length === 0) return

    const now = new Date().toISOString()
    const embed = {
      title: "New Task Created",
      description: `> Task: **${payload.title}**\n> Priority: ${payload.priority}`,
      color: 0x39b289,
      timestamp: now,
      footer: {
        text: payload.actorName ? `BY ${payload.actorName}` : "CREATED",
        icon_url: payload.actorImage || undefined,
      },
    }

    for (const id of devIds) {
      const dmResp = await fetch("https://discord.com/api/v10/users/@me/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bot ${botToken}`,
        },
        body: JSON.stringify({ recipient_id: id }),
      })
      if (!dmResp.ok) continue
      const dm = await dmResp.json() as { id?: string }
      if (!dm?.id) continue
      await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bot ${botToken}`,
        },
        body: JSON.stringify({ embeds: [embed] }),
      })
    }
  } catch { }
}

async function logWebhook(kind: "create" | "update", embed: any) {
  try {
    const url = kind === "create" ? process.env.TASK_CREATE_LOG_WEBHOOK_URL : process.env.TASK_UPDATE_LOG_WEBHOOK_URL
    if (!url) return
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch { }
}

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
    const { title, description, status, priority, dueDate, category, imageIds, tempId } = body

    const task = await prisma.task.create({
        data: {
            title,
            description: description || "",
            status: status || "todo",
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : null,
            category: category || "Work",
            imageIds: Array.isArray(imageIds) ? imageIds : [],
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

    const now = new Date().toISOString()
    const embed = {
      title: "New Task Created",
      description: `Task: **${task.title}**\nPriority: ${task.priority}`,
      color: 0x39b289,
      timestamp: now,
      footer: {
        text: task.user?.name ? `By ${task.user.name}` : "Task Created",
        icon_url: task.user?.image || undefined,
      },
    }
    notifyDevs({
      title: task.title,
      status: task.status,
      priority: task.priority,
      actorName: task.user?.name ?? null,
      actorImage: task.user?.image ?? null,
    })
    logWebhook("create", embed)

    // Emit update event with data and optional tempId for client deduplication
    eventBus.emit("update", { type: "task-created", data: task, tempId })

    return NextResponse.json(task, { status: 201 })
}
