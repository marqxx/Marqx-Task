"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DeleteTaskDialogProps {
  trigger?: React.ReactNode
  onConfirm: () => void
  title?: string
  description?: React.ReactNode
}

export function DeleteTaskDialog({
  trigger,
  onConfirm,
  title = "Delete Task",
  description = "Are you sure you want to delete this task? This action cannot be undone.",
}: DeleteTaskDialogProps) {
  return (
    <AlertDialog>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent className="max-w-[360px] p-0 gap-0 overflow-hidden border-border/60 shadow-2xl bg-card">
        <div className="flex flex-col items-center justify-center p-6 text-center pt-8 pb-6">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 mb-5 ring-1 ring-red-100 dark:ring-red-500/20">
            <Trash2 className="size-7 text-red-600 dark:text-red-400" strokeWidth={1.5} />
          </div>
          
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="grid grid-cols-2 gap-3 p-6 pt-2 bg-secondary/30 border-t border-border/40">
          <AlertDialogCancel className="w-full mt-0 border-border/60 bg-background hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors h-10 rounded-lg">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation()
              onConfirm()
            }}
            className={cn(buttonVariants({ variant: "destructive" }), "w-full h-10 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-sm border border-red-700/10")}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
