"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LayoutGrid } from "lucide-react"

export function LoginScreen() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
            {/* Background decorations */}
            <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute bottom-[10%] right-[15%] w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] -z-10 animate-pulse delay-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-background/50 backdrop-blur-3xl -z-20" />

            <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center relative z-10 transition-all hover:shadow-primary/5 hover:border-border">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20 mb-8 border border-primary/20">
                    <LayoutGrid className="size-10" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-3 font-sans">TaskFlow</h1>
                <p className="text-muted-foreground mb-10 text-pretty leading-relaxed">
                    Manage your workflow efficiently with our integrated task manager and calendar.
                    Please sign in to access your workspace.
                </p>

                <Button
                    size="lg"
                    onClick={() => signIn("discord")}
                    className="w-full h-14 text-base font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg hover:shadow-[#5865F2]/25 transition-all hover:-translate-y-0.5 rounded-xl border border-[#5865F2]/20"
                >
                    <svg className="mr-3 size-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0 a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                    Continue with Discord
                </Button>
            </div>
        </div>
    )
}
