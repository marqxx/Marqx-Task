import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { eventBus } from "@/lib/event-bus"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const isTrash = searchParams.get("trash") === "true"
  const q = searchParams.get("q") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "10", 10)))
  const skip = (page - 1) * limit

  const where = isTrash
    ? { deletedAt: { not: null } }
    : ({
      AND: [
        {
          OR: [
            { deletedAt: null },
            { deletedAt: { isSet: false } }
          ]
        },
        q ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } as any },
            { content: { contains: q, mode: "insensitive" } as any },
            { authorName: { contains: q, mode: "insensitive" } as any },
          ]
        } : {}
      ]
    } as any)

  const notes = await prisma.note.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  })

  const total = await prisma.note.count({ where })
  return NextResponse.json(
    { items: notes, page, limit, total },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  // Allow all authenticated users to create notes

  const body = await req.json()
  const { title, content, date, authorName, notionUrl } = body

  if (!title && !content) {
    return NextResponse.json({ error: "Title or content is required" }, { status: 400 })
  }

  const note = await prisma.note.create({
    data: {
      title: title || "Untitled",
      content: content || "",
      date: date ? new Date(date) : new Date(),
      authorName: authorName || session.user.name || null,
      notionUrl: notionUrl || null,
      userId: session.user.id,
      deletedAt: null,
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

  eventBus.emit("update", { type: "note-created", data: note })
  return NextResponse.json(note, { status: 201, headers: { "Cache-Control": "no-store" } })
}
