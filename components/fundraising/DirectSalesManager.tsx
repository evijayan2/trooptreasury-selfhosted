"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Users, Package, Edit } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import {
    createDirectSalesInventory,
    createVolunteerGroup,
    updateGroupSales,
    deleteVolunteerGroup,
    deleteDirectSalesInventory
} from "@/app/actions/direct-sales"
import { Checkbox } from "@/components/ui/checkbox"

type DirectSalesManagerProps = {
    campaign: any
    scouts: Array<{ id: string, name: string }>
    adults: Array<{ id: string, name: string }>
}

export function DirectSalesManager({ campaign, scouts, adults }: DirectSalesManagerProps) {
    const isClosed = campaign.status === 'CLOSED'

    return (
        <div className="space-y-6">
            <InventoryOverview campaign={campaign} isClosed={isClosed} />
            {!isClosed && <AddInventoryForm campaign={campaign} />}
            <VolunteerGroupsTable campaign={campaign} scouts={scouts} adults={adults} isClosed={isClosed} />
        </div>
    )
}

function InventoryOverview({ campaign, isClosed }: { campaign: any, isClosed: boolean }) {
    const inventories = campaign.directSalesInventory || []

    if (inventories.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Direct Sales Inventory</CardTitle>
                    <CardDescription>Extra products ordered for direct sales at storefronts, markets, and events.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No direct sales inventory yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Order extra products below to enable direct sales with volunteer groups.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Direct Sales Inventory</CardTitle>
                <CardDescription>Extra products ordered for direct sales</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-center">Total Ordered</TableHead>
                            <TableHead className="text-center">Allocated to Groups</TableHead>
                            <TableHead className="text-center">Total Sold</TableHead>
                            <TableHead className="text-right">Profit/Unit</TableHead>
                            {!isClosed && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inventories.map((inv: any) => {
                            const allocated = inv.groupItems?.reduce((sum: number, g: any) => sum + g.quantity, 0) || 0
                            const sold = inv.groupItems?.reduce((sum: number, g: any) => sum + g.soldCount, 0) || 0
                            const available = inv.quantity - allocated

                            return (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.product?.name || "Unknown"}</TableCell>
                                    <TableCell className="text-center">{inv.quantity}</TableCell>
                                    <TableCell className="text-center">
                                        {allocated}
                                        {available > 0 && <Badge variant="outline" className="ml-2">{available} available</Badge>}
                                    </TableCell>
                                    <TableCell className="text-center font-bold">{sold}</TableCell>
                                    <TableCell className="text-right text-green-600 font-medium">
                                        {formatCurrency(inv.product?.ibaAmount || 0)}
                                    </TableCell>
                                    <TableCell>
                                        {!isClosed && <DeleteInventoryButton inventoryId={inv.id} campaignId={campaign.id} hasGroups={inv.groupItems?.length > 0} />}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export function AddInventoryForm({ campaign }: { campaign: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string
    const router = useRouter()

    const products = campaign.products || []

    const handleSubmit = (formData: FormData) => {
        formData.append("slug", slug)
        startTransition(async () => {
            const res = await createDirectSalesInventory(campaign.id, null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Inventory added successfully")
                setIsOpen(false)
                router.refresh()
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Extra Inventory
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Direct Sales Inventory</DialogTitle>
                    <DialogDescription>
                        Order extra products for direct sales. These will be sold by volunteer groups at storefronts, markets, or events.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="productId">Product</Label>
                        <Select name="productId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} - {formatCurrency(p.price)} (Profit: {formatCurrency(p.ibaAmount)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="1"
                            required
                            placeholder="e.g., 100"
                        />
                        <p className="text-xs text-muted-foreground">
                            Total number of extra units to order for direct sales
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Adding..." : "Add Inventory"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function VolunteerGroupsTable({ campaign, scouts, adults, isClosed }: DirectSalesManagerProps & { isClosed: boolean }) {
    const groups = campaign.directSalesGroups || []

    if (groups.length === 0 && (campaign.directSalesInventory || []).length === 0) {
        return null
    }

    if (groups.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Volunteer Groups</CardTitle>
                            <CardDescription>Create groups and assign volunteers to sell products</CardDescription>
                        </div>
                        {!isClosed && <CreateGroupDialog campaign={campaign} scouts={scouts} adults={adults} />}
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No volunteer groups yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Create groups above to split inventory and assign volunteers.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Volunteer Groups</CardTitle>
                        <CardDescription>Manage volunteer groups and track their sales progress</CardDescription>
                    </div>
                    {!isClosed && <CreateGroupDialog campaign={campaign} scouts={scouts} adults={adults} />}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {groups.map((group: any) => (
                        <GroupCard key={group.id} group={group} campaign={campaign} isClosed={isClosed} />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function GroupCard({ group, campaign, isClosed }: { group: any, campaign: any, isClosed: boolean }) {
    const [isEditingSales, setIsEditingSales] = useState(false)
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string
    const router = useRouter()

    const scoutVolunteers = group.volunteers?.filter((v: any) => v.scoutId) || []
    const adultVolunteers = group.volunteers?.filter((v: any) => v.userId) || []

    const items = group.items || []
    const totalAllocated = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const totalSold = items.reduce((sum: number, item: any) => sum + item.soldCount, 0)
    const totalCollected = items.reduce((sum: number, item: any) => sum + (Number(item.amountCollected) || 0), 0)
    const progress = totalAllocated > 0 ? (totalSold / totalAllocated) * 100 : 0

    // State for multi-item updates
    const [itemUpdates, setItemUpdates] = useState<Record<string, { soldCount: number, amountCollected: number }>>({})

    const handleUpdateSales = (formData: FormData) => {
        formData.append("slug", slug)

        const updates = Object.entries(itemUpdates).map(([itemId, data]) => ({
            itemId,
            ...data
        }))
        formData.append("updates", JSON.stringify(updates))

        startTransition(async () => {
            const res = await updateGroupSales(campaign.id, group.id, null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Sales updated successfully")
                setIsEditingSales(false)
                router.refresh()
            }
        })
    }

    const handleDelete = () => {
        if (!confirm("Delete this group? This cannot be undone.")) return

        startTransition(async () => {
            const res = await deleteVolunteerGroup(campaign.id, group.id, slug)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Group deleted")
                router.refresh()
            }
        })
    }

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-semibold text-lg">{group.name}</h4>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {items.map((item: any) => (
                            <span key={item.id} className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                {item.inventory?.product?.name || "Unknown"} ({item.quantity})
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isClosed && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                // Initialize updates from current state
                                const initial: Record<string, { soldCount: number, amountCollected: number }> = {}
                                items.forEach((item: any) => {
                                    initial[item.id] = {
                                        soldCount: item.soldCount,
                                        amountCollected: Number(item.amountCollected) || 0
                                    }
                                })
                                setItemUpdates(initial)
                                setIsEditingSales(!isEditingSales)
                            }}
                        >
                            <Edit className="w-4 h-4 mr-1" />
                            {isEditingSales ? "Cancel" : "Record Sales"}
                        </Button>
                    )}
                    {totalSold === 0 && !isClosed && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-md">
                <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Allocated</p>
                    <p className="text-lg font-bold">{totalAllocated}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Sold</p>
                    <p className="text-lg font-bold text-green-600">{totalSold}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Collected</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(totalCollected)}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Remaining</p>
                    <p className="text-lg font-bold">{totalAllocated - totalSold}</p>
                </div>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {isEditingSales && (
                <form action={handleUpdateSales} className="space-y-4 pt-2 border-t">
                    <div className="grid gap-4">
                        {items.map((item: any) => {
                            const price = Number(item.inventory?.product?.price || 0)
                            const current = itemUpdates[item.id] || { soldCount: 0, amountCollected: 0 }
                            const maxExpected = current.soldCount * price
                            const isOver = current.amountCollected > maxExpected

                            return (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                                    <div className="md:col-span-1">
                                        <p className="text-sm font-medium">{item.inventory?.product?.name}</p>
                                        <p className="text-[10px] text-muted-foreground">Max {item.quantity} units</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`sold-${item.id}`} className="text-[10px] uppercase">Units Sold</Label>
                                        <Input
                                            id={`sold-${item.id}`}
                                            type="number"
                                            min="0"
                                            max={item.quantity}
                                            value={current.soldCount}
                                            onChange={(e) => {
                                                const val = Math.min(Number(e.target.value), item.quantity)
                                                setItemUpdates(prev => ({
                                                    ...prev,
                                                    [item.id]: {
                                                        ...prev[item.id],
                                                        soldCount: val,
                                                        amountCollected: val * price // Auto-calculate
                                                    }
                                                }))
                                            }}
                                            className="h-8"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`coll-${item.id}`} className="text-[10px] uppercase">
                                            Money Collected
                                            {isOver && <span className="text-destructive ml-1">(! Too much)</span>}
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">$</span>
                                            <Input
                                                id={`coll-${item.id}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={current.amountCollected}
                                                onChange={(e) => {
                                                    setItemUpdates(prev => ({
                                                        ...prev,
                                                        [item.id]: {
                                                            ...prev[item.id],
                                                            amountCollected: Number(e.target.value)
                                                        }
                                                    }))
                                                }}
                                                className={`h-8 pl-5 ${isOver ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingSales(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || Object.entries(itemUpdates).some(([itemId, u]) => {
                                const item = items.find((i: any) => i.id === itemId)
                                const price = Number(item?.inventory?.product?.price || 0)
                                return u.amountCollected > u.soldCount * price || u.soldCount > (item?.quantity || 0)
                            })}
                            size="sm"
                        >
                            {isPending ? "Saving..." : "Save All Updates"}
                        </Button>
                    </div>
                </form>
            )}

            <div className="pt-2 border-t space-y-2">
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scout Volunteers ({scoutVolunteers.length})</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {scoutVolunteers.length === 0 ? (
                            <Badge variant="outline" className="text-[10px] h-5">No scouts assigned</Badge>
                        ) : (
                            scoutVolunteers.map((v: any) => (
                                <Badge key={v.id} variant="default" className="text-[10px] h-5">
                                    {v.scout?.name || "Unknown"}
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
                {adultVolunteers.length > 0 && (
                    <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Adult Volunteers ({adultVolunteers.length})</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {adultVolunteers.map((v: any) => (
                                <Badge key={v.id} variant="secondary" className="text-[10px] h-5">
                                    {v.user?.name || "Unknown"}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


function CreateGroupDialog({ campaign, scouts, adults }: DirectSalesManagerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [selectedScouts, setSelectedScouts] = useState<string[]>([])
    const [selectedAdults, setSelectedAdults] = useState<string[]>([])
    const [selectedInventory, setSelectedInventory] = useState<Record<string, number>>({})
    const params = useParams()
    const slug = params.slug as string
    const router = useRouter()

    const inventories = campaign.directSalesInventory || []

    if (inventories.length === 0) {
        return null
    }

    const handleSubmit = (formData: FormData) => {
        formData.append("slug", slug)
        formData.append("scoutIds", selectedScouts.join(","))
        formData.append("adultIds", selectedAdults.join(","))

        // Convert selectedInventory to items array
        const items = Object.entries(selectedInventory).map(([inventoryId, quantity]) => ({
            inventoryId,
            quantity: Number(quantity)
        }))
        formData.append("items", JSON.stringify(items))

        startTransition(async () => {
            const res = await createVolunteerGroup(campaign.id, null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Group created successfully")
                setIsOpen(false)
                setSelectedScouts([])
                setSelectedAdults([])
                setSelectedInventory({})
                router.refresh()
            }
        })
    }

    const toggleInventory = (inventoryId: string, checked: boolean) => {
        if (checked) {
            setSelectedInventory(prev => ({ ...prev, [inventoryId]: 1 })) // Default to 1
        } else {
            setSelectedInventory(prev => {
                const next = { ...prev }
                delete next[inventoryId]
                return next
            })
        }
    }

    const updateQuantity = (inventoryId: string, quantity: number) => {
        setSelectedInventory(prev => ({ ...prev, [inventoryId]: quantity }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Volunteer Group</DialogTitle>
                    <DialogDescription>
                        Select products and assign volunteers. You can select multiple products for one group.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Group Name</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="e.g., Group A - Farmer's Market"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Select Products & Quantities</Label>
                        <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                            {inventories.map((inv: any) => {
                                // Calculate available using groupItems
                                const allocated = inv.groupItems?.reduce((sum: number, g: any) => sum + g.quantity, 0) || 0
                                const available = inv.quantity - allocated
                                const isSelected = !!selectedInventory[inv.id]

                                return (
                                    <div key={inv.id} className="p-3 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <Checkbox
                                                id={`inv-${inv.id}`}
                                                disabled={available === 0 && !isSelected}
                                                checked={isSelected}
                                                onCheckedChange={(c) => toggleInventory(inv.id, !!c)}
                                            />
                                            <div className="grid gap-0.5">
                                                <Label
                                                    htmlFor={`inv-${inv.id}`}
                                                    className={`cursor-pointer ${available === 0 ? "text-muted-foreground" : ""}`}
                                                >
                                                    {inv.product?.name || "Unknown Product"}
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    {available} / {inv.quantity} available
                                                </span>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`qty-${inv.id}`} className="text-xs whitespace-nowrap">Qty:</Label>
                                                <Input
                                                    id={`qty-${inv.id}`}
                                                    type="number"
                                                    min="1"
                                                    max={available + (selectedInventory[inv.id] || 0)} // Allow keeping current value if re-editing (though simple creation validation is enough)
                                                    value={selectedInventory[inv.id]}
                                                    onChange={(e) => updateQuantity(inv.id, Number(e.target.value))}
                                                    className="w-20 h-8"
                                                    required={isSelected}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Scout Volunteers (earn profit)</Label>
                            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {scouts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No scouts available</p>
                                ) : (
                                    scouts.map((scout) => (
                                        <div key={scout.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`scout-${scout.id}`}
                                                checked={selectedScouts.includes(scout.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedScouts([...selectedScouts, scout.id])
                                                    } else {
                                                        setSelectedScouts(selectedScouts.filter(id => id !== scout.id))
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`scout-${scout.id}`}
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                {scout.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Selected: {selectedScouts.length}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Adult Volunteers (no profit)</Label>
                            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                                {adults.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No adults available</p>
                                ) : (
                                    adults.map((adult) => (
                                        <div key={adult.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`adult-${adult.id}`}
                                                checked={selectedAdults.includes(adult.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedAdults([...selectedAdults, adult.id])
                                                    } else {
                                                        setSelectedAdults(selectedAdults.filter(id => id !== adult.id))
                                                    }
                                                }}
                                            />
                                            <label
                                                htmlFor={`adult-${adult.id}`}
                                                className="text-sm font-medium leading-none cursor-pointer"
                                            >
                                                {adult.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Selected: {selectedAdults.length}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || Object.keys(selectedInventory).length === 0 || (selectedScouts.length === 0 && selectedAdults.length === 0)}
                        >
                            {isPending ? "Creating..." : "Create Group"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteInventoryButton({ inventoryId, campaignId, hasGroups }: { inventoryId: string, campaignId: string, hasGroups: boolean }) {
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string
    const router = useRouter()

    const handleDelete = () => {
        if (hasGroups) {
            toast.error("Cannot delete inventory with existing groups. Delete groups first.")
            return
        }

        if (!confirm("Delete this inventory? This cannot be undone.")) return

        startTransition(async () => {
            const res = await deleteDirectSalesInventory(campaignId, inventoryId, slug)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Inventory deleted")
                router.refresh()
            }
        })
    }

    return (
        <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={handleDelete}
            disabled={isPending || hasGroups}
            title={hasGroups ? "Delete groups first" : "Delete inventory"}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
