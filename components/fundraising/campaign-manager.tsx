"use client"

import { useState, useTransition } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DataTableExport } from "@/components/ui/data-table-export"
import { formatCurrency } from "@/lib/utils"
import { DeleteTransactionButton } from "@/components/finance/DeleteTransactionButton"
import { useSession } from "next-auth/react"
import { publishCampaign, closeCampaign, deleteCampaign, toggleVolunteer, addCampaignTransaction, commitDistribution, calculateDistribution, deleteOrder } from "@/app/actions/fundraising"
import { Trash2, Archive, Play, Loader2, DollarSign, Users, Calculator, CheckCircle, Plus, RefreshCw } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import { ScoutPaymentForm } from "./ScoutPaymentForm"

// Types
type CampaignWithDetails = any
type Scout = { id: string, name: string }
type HeaderInfo = {
    troopName?: string
    council?: string
    district?: string
    address?: string
}

export function CampaignManager({ campaign, scouts, headerInfo }: { campaign: CampaignWithDetails, scouts: Scout[], headerInfo?: HeaderInfo }) {
    const [activeTab, setActiveTab] = useState("overview")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const isProductSale = campaign.type === 'PRODUCT_SALE'

    const handlePublish = () => {
        startTransition(async () => {
            const res = await publishCampaign(campaign.id, slug)
            if (res.error) toast.error(res.error)
            else toast.success("Campaign Published!")
        })
    }

    const handleClose = () => {
        startTransition(async () => {
            const res = await closeCampaign(campaign.id, slug)
            if (res.error) toast.error(res.error)
            else toast.success(res.message || "Campaign Closed")
        })
    }

    const handleDelete = () => {
        startTransition(async () => {
            const res = await deleteCampaign(campaign.id, slug)
            if (res.error) toast.error(res.error)
            else {
                toast.success("Campaign Deleted")
                router.push(`/dashboard/fundraising`)
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold truncate">{campaign.name}</h1>
                    <div className="flex gap-2 mt-2 items-center">
                        <Badge>{campaign.type}</Badge>
                        <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>{campaign.status}</Badge>
                    </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                    {campaign.status === "DRAFT" && (
                        <div className="flex gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" disabled={isPending}>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the campaign. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" disabled={isPending}>
                                        <Play className="w-4 h-4 mr-2" />
                                        Publish
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Start Campaign?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This makes the campaign visible to all Scouts and Parents. They will be able to view details and log sales.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                    {campaign.status === "ACTIVE" && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="secondary" disabled={isPending}>
                                    <Archive className="w-4 h-4 mr-2" />
                                    Close
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Close Campaign & Distribute Funds?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will calculate earnings, transfer funds to Scout accounts, and archive the event. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClose}>Close & Distribute</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <div className="text-right border-l pl-4 ml-2">
                        <p className="text-sm text-gray-500">Goal</p>
                        <p className="text-xl font-bold">{formatCurrency(campaign.goal)}</p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex w-full justify-start overflow-x-auto h-auto">
                    <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
                    <TabsTrigger value="settings" className="shrink-0">Settings</TabsTrigger>
                    <TabsTrigger value="sales" className="shrink-0">Sales & Tickets</TabsTrigger>
                    {!isProductSale && <TabsTrigger value="volunteers" className="shrink-0">Volunteers</TabsTrigger>}
                    <TabsTrigger value="transactions" className="shrink-0">Transactions</TabsTrigger>
                    <TabsTrigger value="distribution" className="shrink-0">Distribution</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <OverviewTab campaign={campaign} />
                </TabsContent>

                <TabsContent value="settings">
                    <SettingsTab campaign={campaign} />
                </TabsContent>

                <TabsContent value="sales">
                    <SalesTab campaign={campaign} scouts={scouts} />
                </TabsContent>

                {!isProductSale && (
                    <TabsContent value="volunteers">
                        <VolunteersTab campaign={campaign} scouts={scouts} />
                    </TabsContent>
                )}

                <TabsContent value="transactions">
                    <TransactionsTab campaign={campaign} headerInfo={headerInfo} />
                </TabsContent>

                <TabsContent value="distribution">
                    <DistributionTab campaign={campaign} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

import { updateCampaignSettings } from "@/app/actions/fundraising"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

function SettingsTab({ campaign }: { campaign: any }) {
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string
    const isProductSale = campaign.type === 'PRODUCT_SALE'

    const handleSubmit = (formData: FormData) => {
        formData.append("slug", slug)
        startTransition(async () => {
            const res = await updateCampaignSettings(campaign.id, null, formData)
            if (res.error) toast.error(res.error)
            else toast.success("Settings updated")
        })
    }

    return (
        <div className="space-y-6">
            {isProductSale && campaign.products && campaign.products.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Catalog Products</CardTitle>
                        <CardDescription>View the products configured for this campaign.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Our Cost</TableHead>
                                    <TableHead className="text-right">Scout Profit (IBA)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {campaign.products.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.price)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.cost)}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(p.ibaAmount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Campaign Settings</CardTitle>
                    <CardDescription>Configure notifications and automated emails.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-semibold text-sm">Financial Configuration</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Goal ($)</Label>
                                    <Input name="goal" type="number" defaultValue={Number(campaign.goal) || 0} />
                                </div>
                                {!isProductSale && (
                                    <div className="space-y-2">
                                        <Label>Ticket Price ($)</Label>
                                        <Input name="ticketPrice" type="number" step="0.01" defaultValue={Number(campaign.ticketPrice) || 0} />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>{isProductSale ? "Fallback Profit Share (%)" : "Troop Share (IBA %)"}</Label>
                                    <Input name="ibaPercentage" type="number" defaultValue={campaign.ibaPercentage || 0} />
                                    {isProductSale && <p className="text-[10px] text-muted-foreground mt-1">Total revenue percentage shared with scouts ONLY if individual product profit levels are not defined.</p>}
                                </div>
                                {!isProductSale && (
                                    <div className="space-y-2">
                                        <Label>Volunteer Share (%)</Label>
                                        <Input name="volunteerPercentage" type="number" step="0.01" defaultValue={Number(campaign.volunteerPercentage) || 0} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Send Thank You Emails</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically send a thank you email to customers when a purchase is logged.
                                </p>
                            </div>
                            <Switch name="sendThankYou" defaultChecked={campaign.sendThankYou} />
                        </div>

                        <div className="space-y-2">
                            <Label>Thank You Message Template</Label>
                            <Textarea
                                name="thankYouTemplate"
                                placeholder="Thank you for supporting our Troop! Your order details: {{ORDER_DETAILS}}"
                                defaultValue={campaign.thankYouTemplate || ""}
                                rows={4}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                You can use shortcuts like {"{{CUSTOMER_NAME}}"} and {"{{ORDER_DETAILS}}"}.
                            </p>
                        </div>

                        {!isProductSale && (
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Send Event Reminders</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Send automatic calendar invites or reminders before the event?
                                    </p>
                                </div>
                                <Switch name="sendEventInvite" defaultChecked={campaign.sendEventInvite} />
                            </div>
                        )}

                        <Button disabled={isPending}>
                            {isPending ? "Saving..." : "Save Settings"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

function OverviewTab({ campaign }: { campaign: any }) {
    // Quick Math for Overview
    // Note: This relies on passed data being up to date
    const income = campaign.transactions
        .filter((t: any) => ["DONATION_IN", "FUNDRAISING_INCOME"].includes(t.type))
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    // Virtual Sales Revenue
    const ticketRevenue = campaign.sales.reduce((sum: number, s: any) => sum + (s.quantity * Number(campaign.ticketPrice || 0)), 0)
    const orderRevenue = (campaign.orders || []).reduce((sum: number, o: any) => sum + (Number(o.amountPaid) || 0), 0)
    const totalRevenue = income + ticketRevenue + orderRevenue

    const expenses = campaign.transactions
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const netProfit = totalRevenue - expenses

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">Sales + Donations</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(expenses)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(netProfit)}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Participants</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{campaign.sales.length}</div>
                    <p className="text-xs text-muted-foreground">Scouts Selling / Volunteering</p>
                </CardContent>
            </Card>
        </div>
    )
}

function SalesTab({ campaign, scouts }: { campaign: any, scouts: Scout[] }) {
    const router = useRouter()
    const { data: session } = useSession()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")
    const [isPending, startTransition] = useTransition()

    // Note: Sales editing would typically be another action. For brevity, assuming readonly or separate component for now unless requested.
    // The user didn't explicitly ask for Sales Editing in this prompt, but implied "scouts sell tickets". 
    // I'll add a simple placeholder or readonly view for now as editing sales logic is standard.
    const hasSales = campaign.sales && campaign.sales.length > 0
    const hasOrders = campaign.orders && campaign.orders.length > 0

    // Calculate financial summary per scout
    const scoutFinancials = scouts.map(scout => {
        let sold = 0
        if (campaign.type === 'PRODUCT_SALE') {
            sold = campaign.orders
                ?.filter((o: any) => o.scoutId === scout.id)
                .reduce((sum: number, o: any) => {
                    const price = o.product?.price || 0
                    return sum + (Number(price) * o.quantity)
                }, 0) || 0
        } else {
            sold = campaign.sales
                ?.filter((s: any) => s.scoutId === scout.id)
                .reduce((sum: number, s: any) => {
                    const price = campaign.ticketPrice || 0
                    return sum + (Number(price) * s.quantity)
                }, 0) || 0
        }

        const paid = campaign.transactions
            ?.filter((t: any) => t.scoutId === scout.id && t.type === 'SCOUT_CASH_TURN_IN')
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0

        return { scout, sold, paid, remaining: sold - paid }
    }).filter(f => f.sold > 0 || f.paid > 0)

    const turnInTransactions = campaign.transactions?.filter((t: any) => t.type === 'SCOUT_CASH_TURN_IN') || []

    if (!hasSales && !hasOrders) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Sales & Tickets</CardTitle>
                            <CardDescription>Participation and order tracking.</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                startTransition(() => {
                                    router.refresh()
                                    toast.success("Data refreshed")
                                })
                            }}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <DollarSign className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg">No sales recorded yet</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Once scouts record their {campaign.type === 'PRODUCT_SALE' ? 'orders' : 'ticket sales'} in the "My Fundraising" dashboard, the details will appear here.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        startTransition(() => {
                            router.refresh()
                            toast.success("Data refreshed")
                        })
                    }}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Refresh Data
                </Button>
            </div>
            {campaign.type === 'PRODUCT_SALE' && hasOrders && (
                <Card>
                    <CardHeader>
                        <CardTitle>Product Sales Summary</CardTitle>
                        <CardDescription>Aggregate totals by product.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-center">Price</TableHead>
                                        <TableHead className="text-center">Sold</TableHead>
                                        <TableHead className="text-right">Total Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaign.products.map((product: any) => {
                                        const totalQty = campaign.orders
                                            .filter((o: any) => o.productId === product.id)
                                            .reduce((acc: number, o: any) => acc + o.quantity, 0);

                                        if (totalQty === 0) return null;

                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(product.price)}</TableCell>
                                                <TableCell className="text-center font-bold">{totalQty}</TableCell>
                                                <TableCell className="text-right font-bold text-green-600">
                                                    {formatCurrency(totalQty * Number(product.price))}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }).filter(Boolean)}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell colSpan={2}>Total</TableCell>
                                        <TableCell className="text-center">
                                            {campaign.orders.reduce((acc: number, o: any) => acc + o.quantity, 0)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(campaign.orders.reduce((acc: number, o: any) => acc + Number(o.amountPaid), 0))}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )
            }

            {
                campaign.type !== 'PRODUCT_SALE' && hasSales && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Ticket Sales (Participants)</CardTitle>
                            <CardDescription>Overall quantity sold by each scout.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Scout</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead className="text-right">Revenue (Est)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campaign.sales.map((sale: any) => (
                                            <TableRow key={sale.id}>
                                                <TableCell>{sale.scout.name}</TableCell>
                                                <TableCell>{sale.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(sale.quantity * Number(campaign.ticketPrice || 0))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {
                hasOrders && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Order Details</CardTitle>
                                <CardDescription>Individual product orders recorded by scouts.</CardDescription>
                            </div>
                            <DataTableExport
                                data={campaign.orders.map((o: any) => ({
                                    customer: o.customerName,
                                    product: o.product?.name || "Standard",
                                    quantity: o.quantity,
                                    paid: formatCurrency(o.amountPaid),
                                    scout: o.scout?.name || "Unknown",
                                    date: new Date(o.createdAt).toLocaleDateString()
                                }))}
                                columns={[
                                    { header: "Date", accessorKey: "date" },
                                    { header: "Customer", accessorKey: "customer" },
                                    { header: "Product", accessorKey: "product" },
                                    { header: "Qty", accessorKey: "quantity" },
                                    { header: "Paid", accessorKey: "paid" },
                                    { header: "Scout", accessorKey: "scout" }
                                ]}
                                filename={`${campaign.name.replace(/\s+/g, "_")}_orders`}
                                title={`${campaign.name} - Orders`}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Paid</TableHead>
                                            <TableHead>Scout</TableHead>
                                            {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campaign.orders.map((order: any) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.customerName}</TableCell>
                                                <TableCell>{order.product?.name || "Standard"}</TableCell>
                                                <TableCell>{order.quantity}</TableCell>
                                                <TableCell>{formatCurrency(order.amountPaid)}</TableCell>
                                                <TableCell>{order.scout?.name}</TableCell>
                                                {isAdmin && (
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => {
                                                                if (confirm("Delete this order?")) {
                                                                    startTransition(async () => {
                                                                        const params = useParams()
                                                                        const slug = params.slug as string
                                                                        const res = await deleteOrder(campaign.id, order.id, slug)
                                                                        if (res.error) toast.error(res.error)
                                                                        else toast.success("Order deleted")
                                                                    })
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {isAdmin && scoutFinancials.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cash Turn-in Summary</CardTitle>
                            <CardDescription>Status of cash collected from scouts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Scout</TableHead>
                                            <TableHead className="text-right">Sold</TableHead>
                                            <TableHead className="text-right">Turned In</TableHead>
                                            <TableHead className="text-right">Remaining</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {scoutFinancials.map((fin) => (
                                            <TableRow key={fin.scout.id}>
                                                <TableCell className="font-medium">{fin.scout.name}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(fin.sold)}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(fin.paid)}</TableCell>
                                                <TableCell className={`text-right font-bold ${fin.remaining > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                                    {formatCurrency(fin.remaining)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ScoutPaymentForm
                                                        campaignId={campaign.id}
                                                        scoutId={fin.scout.id}
                                                        scoutName={fin.scout.name}
                                                        onSuccess={() => router.refresh()}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Turn-in History</CardTitle>
                                <CardDescription>Recent cash payments from scouts.</CardDescription>
                            </div>
                            <DataTableExport
                                data={turnInTransactions.map((t: any) => ({
                                    date: new Date(t.createdAt).toLocaleString(),
                                    scout: t.scout?.name || "Unknown",
                                    amount: formatCurrency(t.amount),
                                    notes: t.description || ""
                                }))}
                                columns={[
                                    { header: "Date", accessorKey: "date" },
                                    { header: "Scout", accessorKey: "scout" },
                                    { header: "Amount", accessorKey: "amount" },
                                    { header: "Notes", accessorKey: "notes" }
                                ]}
                                filename={`${campaign.name.replace(/\s+/g, "_")}_turnins`}
                                title={`${campaign.name} - Cash Turn-ins`}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Scout</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {turnInTransactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                                    No turn-ins recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            turnInTransactions.map((t: any) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="text-xs">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell className="font-medium text-sm">{t.scout?.name}</TableCell>
                                                    <TableCell className="text-right font-bold">{formatCurrency(t.amount)}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div >
    )
}

function VolunteersTab({ campaign, scouts }: { campaign: any, scouts: Scout[] }) {
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string

    const handleToggle = (scoutId: string, currentStatus: boolean) => {
        startTransition(async () => {
            const result = await toggleVolunteer(campaign.id, scoutId, !currentStatus, slug)
            if (result.error) toast.error(result.error)
            else toast.success("Updated volunteer status")
        })
    }

    // Merge all scouts with their volunteer status
    const roster = scouts.map(scout => ({
        ...scout,
        isVolunteering: campaign.volunteers.some((v: any) => v.scoutId === scout.id)
    }))

    return (
        <Card>
            <CardHeader>
                <CardTitle>Volunteers</CardTitle>
                <CardDescription>Select scouts who volunteered for the event.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {roster.map(scout => (
                        <div key={scout.id}
                            className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${scout.isVolunteering ? "bg-green-50 border-green-200" : "hover:bg-gray-50"}`}
                            onClick={() => !isPending && handleToggle(scout.id, scout.isVolunteering)}
                        >
                            <span className="font-medium">{scout.name}</span>
                            {scout.isVolunteering && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

function TransactionsTab({ campaign, headerInfo }: { campaign: any, headerInfo?: HeaderInfo }) {
    const { data: session } = useSession()
    const isAdmin = ["ADMIN", "FINANCIER"].includes(session?.user?.role || "")
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string

    // Controlled Form State
    const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData()
        formData.append("type", type)
        formData.append("description", description)
        formData.append("amount", amount)
        formData.append("date", date)
        formData.append("slug", slug)

        startTransition(async () => {
            const res = await addCampaignTransaction(campaign.id, null, formData)
            if (res.error) toast.error(res.error)
            else {
                toast.success("Transaction recorded")
                // Reset Form
                setDescription("")
                setAmount("")
                setType("EXPENSE")
            }
        })
    }

    // Calculate summaries
    const transactions = campaign.transactions || []
    // Income = anything that's NOT expense and NOT IBA_DEPOSIT
    const totalIncome = transactions
        .filter((t: any) => t.type !== "EXPENSE" && t.type !== "IBA_DEPOSIT" && t.type !== "IBA_WITHDRAWAL")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const totalExpense = transactions
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const totalIbaDeposits = transactions
        .filter((t: any) => t.type === "IBA_DEPOSIT")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const netProfit = totalIncome - totalExpense
    const troopShare = netProfit - totalIbaDeposits

    // Get display info for transaction type
    const getTypeDisplay = (t: any) => {
        if (t.type === "IBA_DEPOSIT") {
            return { label: "SCOUT IBA", variant: "secondary" as const, className: "bg-green-100 text-green-700 border-green-200" }
        } else if (t.type === "EXPENSE") {
            return { label: "EXPENSE", variant: "destructive" as const, className: "" }
        } else {
            return { label: "INCOME", variant: "outline" as const, className: "bg-blue-50 text-blue-700 border-blue-200" }
        }
    }

    // Get description with scout name for IBA deposits
    const getDescription = (t: any) => {
        if (t.type === "IBA_DEPOSIT" && t.scout) {
            return `${t.description} → ${t.scout.name}`
        }
        return t.description
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(netProfit)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Paid to Scouts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(totalIbaDeposits)}</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Troop Share</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(troopShare > 0 ? troopShare : 0)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Add Transaction Form */}
            {isAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add Transaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select name="type" value={type} onValueChange={(val: any) => setType(val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EXPENSE">Expense</SelectItem>
                                        <SelectItem value="INCOME">Donation / Income</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2 flex-1">
                                <Label>Description</Label>
                                <Input
                                    name="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Gift Basket Items"
                                    required
                                />
                            </div>
                            <div className="grid gap-2 w-[150px]">
                                <Label>Amount</Label>
                                <Input
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="grid gap-2 w-[150px]">
                                <Label>Date</Label>
                                <Input
                                    name="date"
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Transaction History */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Transaction History</CardTitle>
                    <DataTableExport
                        data={transactions.map((t: any) => ({
                            date: new Date(t.createdAt).toLocaleDateString(),
                            description: getDescription(t),
                            type: t.type,
                            amount: Number(t.amount).toFixed(2)
                        }))}
                        columns={[
                            { header: "Date", accessorKey: "date" },
                            { header: "Description", accessorKey: "description" },
                            { header: "Type", accessorKey: "type" },
                            { header: "Amount", accessorKey: "amount" }
                        ]}
                        filename={`${campaign.name.replace(/\s+/g, "_")}_transactions`}
                        title={`${campaign.name} - Transactions`}
                        headerInfo={headerInfo}
                    />
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((t: any) => {
                                    const typeDisplay = getTypeDisplay(t)
                                    return (
                                        <TableRow key={t.id}>
                                            <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>{getDescription(t)}</TableCell>
                                            <TableCell>
                                                <Badge variant={typeDisplay.variant} className={typeDisplay.className}>
                                                    {typeDisplay.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(t.amount)}</TableCell>
                                            {isAdmin && (
                                                <TableCell className="text-right">
                                                    <DeleteTransactionButton id={t.id} description={t.description} slug={slug} />
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    )
                                })}
                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No transactions recorded yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function DistributionTab({ campaign }: { campaign: any }) {
    const [calcResult, setCalcResult] = useState<any>(null)
    const [isCalculating, startCalc] = useTransition()
    const [isCommitting, startCommit] = useTransition()
    const params = useParams()
    const slug = params.slug as string

    const handleCalculate = () => {
        startCalc(async () => {
            const res = await calculateDistribution(campaign.id)
            setCalcResult(res)
        })
    }

    const handleClose = () => {
        startCommit(async () => {
            const res = await closeCampaign(campaign.id, slug)
            if (res.error) toast.error(res.error)
            else toast.success(res.message || "Campaign Closed")
        })
    }

    if (campaign.status === "DRAFT") {
        return (
            <div className="p-8 text-center bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Campaign is a Draft</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Publish this campaign to start tracking sales and transactions. Distribution can be calculated once the campaign is active.
                </p>
            </div>
        )
    }

    if (campaign.status === "CLOSED") {
        // Show historical distribution data
        const distributions = (campaign.transactions || [])
            .filter((t: any) => t.type === "IBA_DEPOSIT")
            .map((t: any) => ({
                scout: t.scout?.name || "Unknown",
                amount: t.amount,
                date: new Date(t.createdAt).toLocaleDateString()
            }))

        const totalDistributed = distributions.reduce((sum: number, d: any) => sum + d.amount, 0)

        // Recalculate Net Profit simply for display context
        const income = (campaign.transactions || [])
            .filter((t: any) => ["DONATION_IN", "FUNDRAISING_INCOME"].includes(t.type))
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const ticketRevenue = (campaign.sales || []).reduce((sum: number, s: any) => sum + (s.quantity * Number(campaign.ticketPrice || 0)), 0)
        const orderRevenue = (campaign.orders || []).reduce((sum: number, o: any) => sum + (Number(o.amountPaid) || 0), 0)
        const totalRevenue = income + ticketRevenue + orderRevenue

        const expenses = (campaign.transactions || [])
            .filter((t: any) => t.type === "EXPENSE")
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const netProfit = totalRevenue - expenses
        const troopShare = netProfit - totalDistributed

        return (
            <div className="space-y-6">
                <div className="p-6 text-center bg-gray-50 dark:bg-slate-900/50 rounded-lg border">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Campaign Closed</h3>
                    <p className="text-gray-500 dark:text-gray-400">Funds have been distributed and the campaign is archived.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Final Net Profit</p>
                        <p className="text-2xl font-bold">{formatCurrency(netProfit)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border-2 border-green-100 dark:border-green-900">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Distributed to Scouts</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-500">{formatCurrency(totalDistributed)}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg border-2 border-blue-100 dark:border-blue-900">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Troop Share</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-500">{formatCurrency(troopShare > 0 ? troopShare : 0)}</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Distribution Record</CardTitle>
                        <CardDescription>Funds deposited into scout accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {distributions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">No funds were distributed for this campaign.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Scout</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {distributions.map((dist: any, idx: number) => (
                                        <TableRow key={idx}>
                                            <TableCell>{dist.date}</TableCell>
                                            <TableCell>{dist.scout}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(dist.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {!calcResult ? (
                <div className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Calculate the final profit distribution to preview earnings.</p>
                    <Button onClick={handleCalculate} disabled={isCalculating}>
                        {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Calculate Distribution
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid gap-4 md:grid-cols-4 text-center">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Net Profit</p>
                            <p className="text-2xl font-bold">{formatCurrency(calcResult.netProfit)}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Troop/IBA Share ({campaign.ibaPercentage}%)</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(calcResult.ibaTotal)}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg border-2 border-green-100">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Volunteer Pool</p>
                            <p className="text-xl font-bold text-green-700">{formatCurrency(calcResult.volunteerTotal)}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg border-2 border-orange-100">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Seller Pool</p>
                            <p className="text-xl font-bold text-orange-700">{formatCurrency(calcResult.sellerTotal)}</p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Scout Allocations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Scout</TableHead>
                                        <TableHead className="text-right">Share Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calcResult.shares.map((share: any) => (
                                        <TableRow key={share.scoutId}>
                                            <TableCell>{share.scoutName}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">
                                                {formatCurrency(share.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col items-end gap-2">
                        <p className="text-xs text-muted-foreground w-1/2 text-right">
                            Review the calculations above. When ready, click <b>Close Campaign</b> to distribute these funds and archive the event.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setCalcResult(null)}>Recalculate</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={isCommitting} variant="destructive">
                                        {isCommitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Close Campaign & Distribute
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Close Campaign & Distribute Funds?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will calculate earnings, transfer funds to Scout accounts, and archive the event. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClose}>Close & Distribute</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
