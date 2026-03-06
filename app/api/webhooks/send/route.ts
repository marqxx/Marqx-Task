import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = (session.user as any).role
  if (role !== "MEMBER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { url, payload } = body as { url: string; payload: string | object }
  let jsonBody: any
  try {
    jsonBody = typeof payload === "string" ? JSON.parse(payload) : payload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    })
    const text = await resp.text()
    return NextResponse.json({ status: resp.status, ok: resp.ok, body: text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to send" }, { status: 500 })
  }
}
