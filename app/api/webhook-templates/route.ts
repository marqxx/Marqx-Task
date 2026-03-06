import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json([], { status: 200 })
  const templates = await prisma.webhookTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, name, url, payload } = body as { id?: string; name: string; url: string; payload: string }
  try {
    JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (id) {
    const updated = await prisma.webhookTemplate.update({
      where: { id },
      data: { name, url, payload },
    })
    return NextResponse.json(updated, { status: 200 })
  }
  const created = await prisma.webhookTemplate.create({
    data: { name, url, payload, userId: session.user.id },
  })
  return NextResponse.json(created, { status: 201 })
}
