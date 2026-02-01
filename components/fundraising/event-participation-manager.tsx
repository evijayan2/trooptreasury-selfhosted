"use client"

import { useTransition, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { toggleVolunteer } from "@/app/actions/fundraising"
import { recordTicketSale } from "@/app/actions/fundraising-scout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface OrderLog {
    id: string
    createdAt: Date | string
    customerName: string
    customerEmail?: string | null
    quantity: number
}

interface EventProps {
    campaign: any
    salesCount: number
    isVolunteering: boolean
    scoutId: string
    logs: OrderLog[]
    slug: string
}

export function EventParticipationManager({ campaign, salesCount, isVolunteering: initialVol, scoutId, logs, slug }: EventProps) {
    const [isVolunteering, setVolunteering] = useState(initialVol)
    const [isPending, startTransition] = useTransition()

    // New Ticket Form State
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [quantity, setQuantity] = useState("1")

    const handleAddTicket = () => {
        const qty = parseInt(quantity)
        if (!qty || qty <= 0) return toast.error("Invalid quantity")
        if (!customerName) return toast.error("Customer Name is required")

        startTransition(async () => {
            const res = await recordTicketSale(campaign.id, scoutId, {
                quantity: qty,
                customerName,
                customerEmail: customerEmail || undefined
            })
            if (res.error) toast.error(res.error)
            else {
                toast.success("Ticket sale recorded!")
                setCustomerName("")
                setCustomerEmail("")
                setQuantity("1")
            }
        })
    }

    const handleVolunteerToggle = (checked: boolean) => {
        setVolunteering(checked)
        startTransition(async () => {
            const res = await toggleVolunteer(campaign.id, scoutId, checked, slug)
            if (res.error) {
                toast.error(res.error)
                setVolunteering(!checked)
            } else {
                toast.success(checked ? "Signed up for volunteering!" : "Removed from volunteer list")
            }
        })
    }

    const totalRevenue = salesCount * (Number(campaign.ticketPrice) || 0)

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Log New Sale</CardTitle>
                    <CardDescription>
                        Price per ticket: {formatCurrency(campaign.ticketPrice)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Customer Name</Label>
                        <Input
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Customer Email (Optional)</Label>
                        <Input
                            type="email"
                            placeholder="john@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Used for sending event receipts and invites.
                        </p>
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="grid gap-2 flex-1">
                            <Label>Quantity</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAddTicket} disabled={isPending}>
                            {isPending ? "Saving..." : "Record Sale"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sales Audit Log</CardTitle>
                    <CardDescription>
                        Total Sold: {salesCount} ({formatCurrency(totalRevenue)})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[300px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs">
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div className="font-medium">{log.customerName}</div>
                                            <div className="text-xs text-muted-foreground text-ellipsis overflow-hidden max-w-[100px]">{log.customerEmail}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{log.quantity}</TableCell>
                                    </TableRow>
                                ))}
                                {logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            No sales recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Volunteering</CardTitle>
                    <CardDescription>
                        Earn a share of the volunteer pool ({campaign.volunteerPercentage}%).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 p-4 border rounded-md">
                        <Checkbox
                            id="volunteer"
                            checked={isVolunteering}
                            onCheckedChange={handleVolunteerToggle}
                            disabled={isPending}
                        />
                        <div className="grid gap-1.5 leading-none">
                            <Label htmlFor="volunteer" className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I volunteered for this event
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Check this box if you participated as a volunteer.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {campaign.description || "No description provided."}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
