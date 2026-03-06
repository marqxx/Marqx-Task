import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload"
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get("ids")
    const baseWhere: any = {
      userId: session.user.id,
      OR: [
        { deletedAt: null },
        { deletedAt: { isSet: false } as any },
      ],
    }
    const where = idsParam
      ? { ...baseWhere, id: { in: idsParam.split(",").map(s => s.trim()).filter(Boolean) } }
      : baseWhere
    const items = await prisma.imageUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(items)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const key = process.env.IMGBB_API_KEY
  if (!key) return NextResponse.json({ error: "IMGBB_API_KEY is not configured" }, { status: 500 })

  try {
    const formContentType = req.headers.get("content-type") || ""
    let fileBuffer: Buffer | null = null
    let fileBase64 = ""
    let originalFileName = ""
    let size: number | undefined

    if (formContentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const file = form.get("file") as File | null
      if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })
      const buf = Buffer.from(await file.arrayBuffer())
      fileBuffer = buf
      originalFileName = file.name
      size = buf.length
    } else {
      const body = await req.json().catch(() => null) as any
      if (body?.url && typeof body.url === "string") {
        const resp = await fetch(body.url)
        if (!resp.ok) return NextResponse.json({ error: "Failed to fetch image from URL" }, { status: 400 })
        const ct = resp.headers.get("content-type") || ""
        if (!ct.toLowerCase().startsWith("image/")) return NextResponse.json({ error: "URL is not an image" }, { status: 400 })
        const ab = await resp.arrayBuffer()
        const buf = Buffer.from(ab)
        fileBuffer = buf
        size = buf.length
        try {
          const u = new URL(body.url)
          const parts = u.pathname.split("/")
          originalFileName = parts[parts.length - 1] || "remote"
        } catch {
          originalFileName = "remote"
        }
      } else if (body?.imageBase64) {
        fileBase64 = body.imageBase64
        originalFileName = body.fileName || "upload"
        size = body.size
      } else {
        return NextResponse.json({ error: "file or url or imageBase64 is required" }, { status: 400 })
      }
    }

    // Generate display name: marqxx-YYYYMMDD-HHmmss
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, "0")
    const displayName = `marqxx-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

    const form = new FormData()
    form.set("key", key)
    form.set("expiration", String(THIRTY_DAYS_SECONDS))
    form.set("name", displayName)
    if (fileBuffer) {
      // Send binary directly for better performance and reliability
      const blob = new Blob([fileBuffer])
      form.append("image", blob, originalFileName || "upload")
    } else {
      // Fallback to base64
      form.set("image", fileBase64)
    }

    const r = await fetch(IMGBB_ENDPOINT, { method: "POST", body: form as any })
    let data: any = null
    try {
      data = await r.json()
    } catch {
      // If not JSON, try text
      const txt = await r.text().catch(() => "")
      return NextResponse.json({ error: txt || "Upload failed" }, { status: r.status || 500 })
    }
    if (!r.ok || !data?.data?.url) {
      const msg = data?.error?.message || data?.message || "Upload failed"
      return NextResponse.json({ error: msg }, { status: r.status || 500 })
    }
    const url: string = data.data.url
    const deleteUrl: string | undefined = data.data.delete_url
    const expiresAt = new Date(Date.now() + THIRTY_DAYS_SECONDS * 1000)

    const saved = await prisma.imageUpload.create({
      data: {
        userId: session.user.id,
        url,
        deleteUrl: deleteUrl || "",
        fileName: displayName,
        size: size ?? null as any,
        expiresAt,
      },
    })
    return NextResponse.json(saved, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}
