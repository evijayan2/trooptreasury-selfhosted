"use client"

import { useActionState, useState } from "react"
import { registerScoutForCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { RemoveParticipantButton } from "./remove-participant-button"
import { RefundButton } from "./refund-button"
import { IBAPayment } from "./iba-payment"
import { PaymentRecorder } from "./payment-recorder"
import { formatCurrency, cn } from "@/lib/utils"
import { toast } from "sonner"
import { PromoteButton, DemoteButton } from "./roster-controls"

export function CampoutRoster({
    campoutId,
    registeredScouts,
    allScouts,
    canEdit = false,
    costPerPerson = 0,
    campoutStatus = "OPEN",
    slug,
    scoutLimit,
    userRole,
    currentUserId,
    allLinkedScoutIds = [],
    minimalMode = false
}: {
    campoutId: string,
    registeredScouts: any[],
    allScouts: any[],
    canEdit?: boolean,
    costPerPerson?: number,
    campoutStatus?: string,
    slug?: string,
    scoutLimit?: number | null,
    userRole?: string,
    currentUserId?: string,
    allLinkedScoutIds?: string[],
    minimalMode?: boolean
}) {
    const [selectedScout, setSelectedScout] = useState<string>("")
    const [open, setOpen] = useState(false)

    // Filter out scouts already registered (regardless of status)
    const availableScouts = allScouts.filter(s => !registeredScouts.some(rs => rs.scoutId === s.id))

    // Split into Reserved and Waitlisted
    const reservedScouts = registeredScouts.filter(s => s.status === "RESERVED" || !s.status)
    const waitlistedScouts = registeredScouts.filter(s => s.status === "WAITLISTED")


    const handleRegister = async () => {
        if (!selectedScout) return
        const result = await registerScoutForCampout(campoutId, selectedScout, slug)
        if ("error" in result) {
            toast.error(result.error)
        } else {
            setOpen(false)
            setSelectedScout("")
            toast.success(result.message)
        }
    }

    const canModifyRoster = canEdit && (campoutStatus === "OPEN" || campoutStatus === "READY_FOR_PAYMENT")

    if (minimalMode) {
        return (
            <div className="flex items-center gap-2">
                {canModifyRoster && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 px-3 border-dashed hover:border-primary hover:text-primary transition-all">
                                <Plus className="w-4 h-4 mr-2" /> Add Scout
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Register Scout</DialogTitle>
                                <DialogDescription>
                                    Add a scout to this campout roster.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Select onValueChange={setSelectedScout} value={selectedScout}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableScouts.map(scout => (
                                            <SelectItem key={scout.id} value={scout.id}>{scout.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleRegister} disabled={!selectedScout} className="w-full">
                                    Register
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        )
    }

    // Financial Privacy Check
    const canSeeFinances = (entityId: string) => {
        if (["ADMIN", "LEADER", "FINANCIER"].includes(userRole || "")) return true

        // Can see if it's their own scout profile or a linked scout
        if (allLinkedScoutIds.includes(entityId)) return true

        return false
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Scouts</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {reservedScouts.length} / {scoutLimit || "∞"}
                    </span>
                    {waitlistedScouts.length > 0 && (
                        <span className="text-sm text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            {waitlistedScouts.length} Waitlisted
                        </span>
                    )}
                </div>
                {canModifyRoster && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Scout</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Register Scout</DialogTitle>
                                <DialogDescription>
                                    Add a scout to this campout roster.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <Select onValueChange={setSelectedScout} value={selectedScout}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableScouts.map(scout => (
                                            <SelectItem key={scout.id} value={scout.id}>{scout.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleRegister} disabled={!selectedScout} className="w-full">
                                    Register
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>


            {registeredScouts.length === 0 ? (
                <p className="text-sm text-gray-500">No scouts registered yet.</p>
            ) : (
                <div className="space-y-6">
                    {/* Reserved List */}
                    <ul className="space-y-2">
                        {reservedScouts.map(({ scout, isPaid, remainingDue = costPerPerson, overpaidAmount = 0 }) => (
                            <li key={scout.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-muted rounded text-sm group">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{scout.name}</span>
                                    {canModifyRoster && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                                            <DemoteButton campoutId={campoutId} id={scout.id} type="SCOUT" name={scout.name} />
                                            <RemoveParticipantButton campoutId={campoutId} id={scout.id} type="SCOUT" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {canSeeFinances(scout.id) ? (
                                        <>
                                            {overpaidAmount > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-amber-600 font-semibold">Refund Due: {formatCurrency(overpaidAmount)}</span>
                                                    {canEdit && (
                                                        <RefundButton
                                                            campoutId={campoutId}
                                                            entityId={scout.id}
                                                            entityType="SCOUT"
                                                            refundAmount={overpaidAmount}
                                                            entityName={scout.name}
                                                            hasIbaAccount={true}
                                                        />
                                                    )}
                                                </div>
                                            ) : isPaid ? (
                                                <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-bold">PAID</span>
                                            ) : (
                                                <span className="text-xs text-red-500 font-semibold">{formatCurrency(remainingDue)} Due</span>
                                            )}
                                        </>
                                    ) : (
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                            isPaid ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                        )}>
                                            {isPaid ? "Reserved" : "Confirmed"}
                                        </span>
                                    )}
                                    {canEdit && !isPaid && campoutStatus !== "OPEN" && (
                                        <>
                                            <IBAPayment
                                                campoutId={campoutId}
                                                linkedScouts={[scout]}
                                                defaultAmount={remainingDue}
                                                disabled={Number(scout.ibaBalance) <= 0}
                                                label="Pay IBA"
                                                className="w-auto h-7 px-2 text-xs"
                                            />
                                            <PaymentRecorder
                                                campoutId={campoutId}
                                                scoutId={scout.id}
                                                adultName={scout.name}
                                                defaultAmount={remainingDue}
                                                label="Record Pay"
                                                className="h-7 px-2 text-xs"
                                                variant="outline"
                                            />
                                        </>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Waitlist Section */}
                    {waitlistedScouts.length > 0 && (
                        <div className="border-t pt-4">
                            <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                                <span>Waitlist</span>
                                <span className="text-[10px] font-normal text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">{waitlistedScouts.length}</span>
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">
                                Participants are added to the waitlist when the roster is full. They will be automatically promoted if a spot opens up, or you can manually promote them.
                            </p>
                            <ul className="space-y-2">
                                {waitlistedScouts.map(({ scout }, index) => (
                                    <li key={scout.id} className="flex justify-between items-center p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded text-sm group">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">{scout.name}</span>
                                        </div>
                                        {canModifyRoster && (
                                            <div className="flex items-center gap-1 opacity-100">
                                                <PromoteButton campoutId={campoutId} id={scout.id} type="SCOUT" name={scout.name} />
                                                <RemoveParticipantButton campoutId={campoutId} id={scout.id} type="SCOUT" />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

        </div>
    )
}
