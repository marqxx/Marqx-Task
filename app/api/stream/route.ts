import { auth } from "@/auth"
import { eventBus } from "@/lib/event-bus"
import { NextResponse } from "next/server"

// SSE Stream
export async function GET(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const sendEvent = (data: any) => {
        const text = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(text))
      }

      // Initial connection established
      sendEvent({ type: "connected" })

      // Listen for updates
      const onUpdate = (payload: any) => {
        try {
            // If payload is just a string (legacy), wrap it
            if (typeof payload === 'string') {
                sendEvent({ type: payload })
            } else {
                // Otherwise send the full payload
                sendEvent(payload)
            }
        } catch (error) {
            // Ignore stream errors
        }
      }

      eventBus.on("update", onUpdate)

      // Keep alive interval
      const interval = setInterval(() => {
        try {
            sendEvent({ type: "ping" })
        } catch (error) {
            // Stream closed
            clearInterval(interval)
        }
      }, 30000)

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        eventBus.off("update", onUpdate)
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
