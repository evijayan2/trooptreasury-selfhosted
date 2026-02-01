"use client"

import { removeAdultFromCampout, removeScoutFromCampout } from "@/app/actions"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface RemoveParticipantButtonProps {
    campoutId: string
    id: string
    type: 'ADULT' | 'SCOUT'
    name?: string
}

export function RemoveParticipantButton({ campoutId, id, type, name }: RemoveParticipantButtonProps) {

    const handleDelete = async () => {
        if (type === 'ADULT') {
            await removeAdultFromCampout(campoutId, id)
        } else {
            await removeScoutFromCampout(campoutId, id)
        }
    }

    return (
        <AlertDialog>
            <Tooltip>
                <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-red-500 ml-2"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Remove from campout</p>
                </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remove from Campout?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove {name || "this person"} from the campout?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
