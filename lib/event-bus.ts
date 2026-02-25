import { EventEmitter } from "events"

// Use a global variable to ensure the emitter persists across hot reloads in development
// and multiple imports
const globalForEvents = global as unknown as { eventBus: EventEmitter }

export const eventBus = globalForEvents.eventBus || new EventEmitter()

if (process.env.NODE_ENV !== "production") globalForEvents.eventBus = eventBus

// Increase limit just in case
eventBus.setMaxListeners(100)
