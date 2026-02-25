import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        lastActive: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
