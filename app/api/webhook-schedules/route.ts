import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json([], { status: 200 })

  try {
    const now = new Date()
    const items = await prisma.webhookSchedule.findMany({
      where: { userId: session.user.id, runAt: { gt: new Date(now.getTime() - 5 * 60 * 1000) } },
      orderBy: { runAt: "asc" },
    })
    return NextResponse.json(items, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { url, payload, runAt } = body as { url: string; payload: string; runAt: string }
  if (!url?.trim() || !payload?.trim() || !runAt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  try {
    JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const when = new Date(runAt)
  if (isNaN(when.getTime())) {
    return NextResponse.json({ error: "Invalid time" }, { status: 400 })
  }
  try {
    const created = await prisma.webhookSchedule.create({
      data: {
        userId: session.user.id,
        url: url.trim(),
        payload,
        runAt: when,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  let id = searchParams.get("id")
  if (!id) {
    try {
      const body = await req.json()
      id = body?.id
    } catch {}
  }
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  try {
    const existing = await prisma.webhookSchedule.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.webhookSchedule.delete({ where: { id } })
    return NextResponse.json({ success: true, id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
