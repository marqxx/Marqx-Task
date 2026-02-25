"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

export function AuthButton() {
    const { data: session } = useSession()

    if (!session?.user) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full size-9 relative ring-2 ring-primary/20 hover:ring-primary/50 transition-all ml-1">
                    <Avatar className="size-9 bg-primary/10">
                        <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? ""} />
                        <AvatarFallback className="text-primary font-medium">
                            {session.user.name?.[0]?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel className="flex flex-col gap-1.5 p-2">
                    <p className="text-sm font-semibold leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground font-medium">
                        {session.user.email}
                    </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50 py-2.5"
                    onClick={() => signOut()}
                >
                    <LogOut className="mr-2 size-4" />
                    <span className="font-medium">Sign Out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
