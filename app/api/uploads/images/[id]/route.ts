import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const item = await prisma.imageUpload.findFirst({ where: { id, userId: session.user.id } })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    // Mark as deleted immediately for snappy UX
    await prisma.imageUpload.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    // Trigger remote deletion in background (don't await)
    if (item.deleteUrl) {
      fetch(item.deleteUrl, { method: "GET" }).catch(() => { /* ignore */ })
    }
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
