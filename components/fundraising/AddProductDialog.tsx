"use client"

import { useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCampaignProduct } from "@/app/actions/fundraising"

export function AddProductDialog({ campaignId }: { campaignId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const params = useParams()
    const slug = params.slug as string
    const router = useRouter()

    const handleSubmit = (formData: FormData) => {
        formData.append("slug", slug)
        startTransition(async () => {
            const res = await createCampaignProduct(campaignId, null, formData)
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success("Product created successfully")
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
                    Add Product
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                        Define a new product for this campaign. This will be available for direct sales and orders.
                    </DialogDescription>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                            id="name"
                            name="name"
                            required
                            placeholder="e.g., Chocolate Bar"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Selling Price</Label>
                            <div className="relative">
                                <span className="absolute left-2.5 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="pl-6"
                                    placeholder="10.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cost">Unit Cost</Label>
                            <div className="relative">
                                <span className="absolute left-2.5 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    id="cost"
                                    name="cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="pl-6"
                                    placeholder="5.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ibaAmount">Scout Profit</Label>
                            <div className="relative">
                                <span className="absolute left-2.5 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    id="ibaAmount"
                                    name="ibaAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="pl-6"
                                    placeholder="2.00"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
