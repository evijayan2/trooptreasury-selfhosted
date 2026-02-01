"use client"

import { useTransition, useState } from "react"
import { createFundraisingCampaign } from "@/app/actions/fundraising"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Gift, Package, Plus, Trash2 } from "lucide-react"

const campaignTypes = [
    {
        value: "GENERAL",
        label: "Event / General Fundraiser",
        description: "Car washes, bake sales, dinners, raffles, or any event where volunteers help and profits are shared.",
        icon: Gift
    },
    {
        value: "PRODUCT_SALE",
        label: "Product Sale",
        description: "Selling items like popcorn, cookie dough, or gift wrap. Track individual scout sales and deposits.",
        icon: Package
    }
]

export function CreateCampaignForm({ slug }: { slug: string }) {
    const [isPending, startTransition] = useTransition()
    const [type, setType] = useState("GENERAL")
    const [products, setProducts] = useState([{ name: "", price: "", cost: "", ibaAmount: "" }])
    const router = useRouter()

    const handleSubmit = (formData: FormData) => {
        formData.append("slug", slug) // Add Tenant Context
        startTransition(async () => {
            const res = await createFundraisingCampaign(null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Campaign created!")
                router.push(`/dashboard/fundraising`)
            }
        })
    }

    return (
        <form action={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Campaign Name</Label>
                        <Input name="name" placeholder="Summer Car Wash" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Goal ($)</Label>
                        <Input name="goal" type="number" required />
                    </div>
                </div>

                {/* Campaign Type - Radio Button Style */}
                <div className="space-y-3">
                    <Label>Campaign Type</Label>
                    <input type="hidden" name="type" value={type} />
                    <div className="grid gap-3">
                        {campaignTypes.map((campaignType) => {
                            const Icon = campaignType.icon
                            const isSelected = type === campaignType.value
                            return (
                                <button
                                    key={campaignType.value}
                                    type="button"
                                    onClick={() => setType(campaignType.value)}
                                    className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${isSelected
                                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                        : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{campaignType.label}</span>
                                            {isSelected && (
                                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                                    Selected
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {campaignType.description}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input name="startDate" type="date" required />
                    </div>
                    <div className="space-y-2">
                        <Label>End Date (Optional)</Label>
                        <Input name="endDate" type="date" />
                    </div>
                </div>
            </div>

            {/* Conditional Fields based on Type */}
            <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="pt-6 space-y-4">
                    {type === "GENERAL" ? (
                        <>
                            <h3 className="font-semibold text-sm">Event Configuration</h3>
                            <div className="space-y-2">
                                <Label>Split Mode</Label>
                                <p className="text-xs text-muted-foreground">Define how profits are shared.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IBA % (Total Troop Share)</Label>
                                    <Input name="ibaPercentage" type="number" placeholder="e.g. 30" />
                                    <p className="text-[10px] text-muted-foreground">Amount kept by Troop/IBA combined.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Volunteer %</Label>
                                    <Input name="volunteerPercentage" type="number" step="0.01" placeholder="e.g. 5" />
                                    <p className="text-[10px] text-muted-foreground">% of Profit shared equally by volunteers.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Ticket Price (If Selling Tickets)</Label>
                                <Input name="ticketPrice" type="number" step="0.01" />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-sm">Product Configuration</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setProducts([...products, { name: "", price: "", cost: "", ibaAmount: "" }])}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Product
                                </Button>
                            </div>

                            <input type="hidden" name="products" value={JSON.stringify(products.filter(p => p.name))} />

                            <div className="space-y-4">
                                {products.map((product, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4 last:border-0 last:pb-0">
                                        <div className="col-span-4 space-y-1.5">
                                            <Label className="text-[10px] uppercase">Name</Label>
                                            <Input
                                                placeholder="e.g. Popcorn"
                                                value={product.name}
                                                onChange={(e) => {
                                                    const newProducts = [...products]
                                                    newProducts[index].name = e.target.value
                                                    setProducts(newProducts)
                                                }}
                                                required={index === 0}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <Label className="text-[10px] uppercase">Price</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={product.price}
                                                onChange={(e) => {
                                                    const newProducts = [...products]
                                                    newProducts[index].price = e.target.value
                                                    setProducts(newProducts)
                                                }}
                                                required={index === 0}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <Label className="text-[10px] uppercase">Cost</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={product.cost}
                                                onChange={(e) => {
                                                    const newProducts = [...products]
                                                    newProducts[index].cost = e.target.value
                                                    setProducts(newProducts)
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-3 space-y-1.5">
                                            <Label className="text-[10px] uppercase">Scout Profit</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={product.ibaAmount}
                                                onChange={(e) => {
                                                    const newProducts = [...products]
                                                    newProducts[index].ibaAmount = e.target.value
                                                    setProducts(newProducts)
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={products.length === 1}
                                                onClick={() => {
                                                    const newProducts = products.filter((_, i) => i !== index)
                                                    setProducts(newProducts)
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Campaign"}
            </Button>
        </form>
    )
}
