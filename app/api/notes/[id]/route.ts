import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { eventBus } from "@/lib/event-bus"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const note = await prisma.note.findFirst({
    where: { id },
    include: {
      user: { select: { name: true, image: true } },
    },
  })
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(note)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  const existing = await prisma.note.findFirst({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const url = new URL(req.url)
  const hard = url.searchParams.get("hard") === "true"

  if (hard) {
    await prisma.note.delete({ where: { id } })
    eventBus.emit("update", { type: "note-deleted", data: { id } })
    return NextResponse.json({ success: true, hardDelete: true })
  } else {
    const note = await prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { user: { select: { name: true, image: true } } },
    })
    eventBus.emit("update", { type: "note-deleted", data: note })
    return NextResponse.json({ success: true, softDelete: true })
  }
}
