# Marqx-Task

โปรเจกต์นี้เป็นแอปจัดการงานและปฏิทิน สร้างด้วย Next.js 16 + React 19, Tailwind v4 และ Prisma (MongoDB) พร้อมระบบล็อกอินผ่าน Discord (NextAuth)

## ความต้องการระบบ
- Node.js 18 ขึ้นไป
- MongoDB connection string (DATABASE_URL)
- Discord OAuth credentials (Client ID, Client Secret)
- NEXTAUTH_SECRET สำหรับเซสชัน

## การติดตั้งและตั้งค่า
1) ติดตั้งแพ็กเกจ
```bash
npm install
```
หมายเหตุ: ระบบจะรัน `prisma generate` อัตโนมัติหลังติดตั้ง (postinstall)

2) สร้างไฟล์ .env ที่รากโปรเจกต์ และใส่ค่าต่อไปนี้
```env
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<สุ่มค่าอย่างน้อย 32 ตัวอักษร>"

DISCORD_CLIENT_ID="<จาก Discord Developer Portal>"
DISCORD_CLIENT_SECRET="<จาก Discord Developer Portal>"
```
วิธีสร้าง NEXTAUTH_SECRET ตัวอย่าง:
```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

3) สร้าง Schema ในฐานข้อมูล MongoDB
```bash
npx prisma db push
```
โดย Prisma client จะถูกสร้างไว้ที่ `lib/generated/prisma` และถูกใช้งานใน `lib/prisma.ts`

## การรันโหมดพัฒนา
```bash
npm run dev
```
เปิดใช้งานที่ http://localhost:3000

## การ build และรันโหมด production
```bash
npm run build
npm run start
```

## คำสั่งเพิ่มเติม
- ตรวจสอบโค้ด: `npm run lint`
- สร้าง Prisma client ใหม่ (หากจำเป็น): `npx prisma generate`

## การยืนยันตัวตนและสิทธิ์ผู้ใช้
- ระบบล็อกอินด้วย Discord (NextAuth) ผ่าน `auth.ts`
- ผู้ใช้ใหม่จะมี role เริ่มต้นเป็น `GUEST`
- หากต้องการใช้งานเต็มระบบ ให้ปรับ `role` ของผู้ใช้เป็น `MEMBER` หรือ `ADMIN` ใน collection `User` ของ MongoDB

- ตรวจสอบว่า `.env` มี `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` ถูกต้อง
