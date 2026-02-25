import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // Get users active in the last 20 seconds
    const twentySecondsAgo = new Date(Date.now() - 20 * 1000)

    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActive: {
          gte: twentySecondsAgo,
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        lastActive: true,
      },
    })

    return NextResponse.json(onlineUsers)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
