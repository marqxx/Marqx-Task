"use client"

import { useTasksContext } from "@/components/tasks-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function OnlineUsers() {
  const { onlineUsers } = useTasksContext()

  if (onlineUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2.5">
        <TooltipProvider>
          {onlineUsers.slice(0, 3).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative group">
                  <Avatar className="size-8 border-2 border-background ring-1 ring-black/[0.03] dark:ring-white/[0.03] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:z-10 cursor-pointer">
                    <AvatarImage src={user.image || ""} />
                    <AvatarFallback className="text-[10px] bg-muted font-bold">
                      {user.name?.slice(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 size-2 bg-emerald-500 rounded-full border-2 border-background animate-in fade-in zoom-in duration-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px] font-medium">
                {user.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {onlineUsers.length > 3 && (
          <div className="size-8 rounded-full bg-secondary flex items-center justify-center border-2 border-background text-[10px] font-bold text-muted-foreground">
            +{onlineUsers.length - 3}
          </div>
        )}
      </div>

      {onlineUsers.length > 0 && (
        <div className="hidden lg:flex flex-col">
          <span className="text-[10px] font-bold leading-none">{onlineUsers.length}</span>
          <p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mt-0.5">Online</p>
        </div>
      )}
    </div>
  )
}
