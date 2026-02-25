// src/lib/prisma.ts
import { PrismaClient } from './generated/prisma'

// ฟังก์ชันสร้าง PrismaClient พร้อม error handling
function createPrismaClient() {
    try {
        return new PrismaClient({
            datasourceUrl: process.env.DATABASE_URL!,
            log: ['query', 'info', 'warn', 'error'],
        })
    } catch (error) {
        console.error('Failed to create PrismaClient:', error)
        throw error
    }
}
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// ถ้ายังไม่มี prisma client ใน global ให้สร้างใหม่
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// ตรวจสอบว่าสร้างสำเร็จไหม
if (!prisma) {
    throw new Error('PrismaClient initialization failed. Please run "npx prisma generate" first.')
}

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma