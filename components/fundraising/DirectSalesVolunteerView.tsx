"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { Edit, Package, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { recordVolunteerSales } from "@/app/actions/volunteer-sales-actions"

type DirectSalesVolunteerViewProps = {
    groups: any[]
    slug: string
}

export function DirectSalesVolunteerView({ groups, slug }: DirectSalesVolunteerViewProps) {
    if (groups.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Direct Sales</CardTitle>
                    <CardDescription>You are not assigned to any direct sales groups yet</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No direct sales assignments</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Contact your troop leadership to be assigned to a volunteer group.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold">Your Direct Sales Groups</h3>
                <p className="text-sm text-muted-foreground">Record your sales for the products you're selling</p>
            </div>

            {groups.map((group) => (
                <VolunteerGroupCard key={group.id} group={group} slug={slug} />
            ))}
        </div>
    )
}

function VolunteerGroupCard({ group, slug }: { group: any, slug: string }) {
    const scoutVolunteers = group.volunteers?.filter((v: any) => v.scoutId) || []
    const adultVolunteers = group.volunteers?.filter((v: any) => v.userId) || []

    return (
        <Card>
            <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                    Manage sales for your assigned products.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Items List */}
                <div className="space-y-4">
                    {group.items?.map((item: any) => (
                        <VolunteerItemRow key={item.id} item={item} slug={slug} scoutCount={scoutVolunteers.length} />
                    ))}
                </div>

                {/* Volunteer List */}
                <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">Group Members</span>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                            Scout Volunteers ({scoutVolunteers.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {scoutVolunteers.length === 0 ? (
                                <Badge variant="outline" className="text-xs">No scouts</Badge>
                            ) : (
                                scoutVolunteers.map((v: any) => (
                                    <Badge key={v.id} variant="default" className="text-xs">
                                        {v.scout?.name || "Unknown"}
                                    </Badge>
                                ))
                            )}
                        </div>
                    </div>

                    {adultVolunteers.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                                Adult Volunteers ({adultVolunteers.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {adultVolunteers.map((v: any) => (
                                    <Badge key={v.id} variant="secondary" className="text-xs">
                                        {v.user?.name || "Unknown"}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function VolunteerItemRow({ item, slug, scoutCount }: { item: any, slug: string, scoutCount: number }) {
    const [isEditingSales, setIsEditingSales] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const product = item.product
    const progress = item.quantity > 0 ? (item.soldCount / item.quantity) * 100 : 0

    const handleUpdateSales = (formData: FormData) => {
        startTransition(async () => {
            // Call recordVolunteerSales with itemId
            const res = await recordVolunteerSales(item.id, slug, null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Sales updated successfully")
                setIsEditingSales(false)
                router.refresh()
            }
        })
    }

    return (
        <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold">{product?.name || "Unknown Product"}</h4>
                    <p className="text-xs text-muted-foreground">
                        Profit: {formatCurrency(product?.ibaAmount || 0)}/unit
                    </p>
                </div>
                <Button
                    size="sm"
                    variant={isEditingSales ? "outline" : "secondary"}
                    onClick={() => setIsEditingSales(!isEditingSales)}
                >
                    <Edit className="w-3 h-3 mr-1.5" />
                    {isEditingSales ? "Cancel" : "Record Sales"}
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                    <p className="text-xs text-muted-foreground">Allocated</p>
                    <p className="font-bold">{item.quantity}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Sold</p>
                    <p className="font-bold text-green-600">{item.soldCount}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-bold">{item.quantity - item.soldCount}</p>
                </div>
            </div>

            <div className="space-y-1">
                <Progress value={progress} className="h-2" />
            </div>

            {isEditingSales && (
                <form action={handleUpdateSales} className="flex gap-2 items-end pt-2 border-t">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor={`soldCount-${item.id}`} className="text-xs">Units Sold</Label>
                        <Input
                            id={`soldCount-${item.id}`}
                            name="soldCount"
                            type="number"
                            min="0"
                            max={item.quantity}
                            defaultValue={item.soldCount}
                            required
                            placeholder="Sold count"
                        />
                    </div>
                    <Button type="submit" disabled={isPending} size="sm">
                        {isPending ? "Saving..." : "Save"}
                    </Button>
                </form>
            )}

            {/* Profit Info for Scouts */}
            {scoutCount > 0 && item.soldCount > 0 && (
                <div className="pt-2 border-t text-xs text-green-700 dark:text-green-400">
                    <span className="font-bold">{formatCurrency((product?.ibaAmount || 0) * item.soldCount / scoutCount)}</span> profit per scout
                </div>
            )}
        </div>
    )
}
