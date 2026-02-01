"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { registerTroop } from "@/app/actions/register-troop"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { getSlugSuggestions } from "@/app/actions/slug-helper"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function SlugSuggestions({ name, council, district, onSelect }: { name: string, council: string, district?: string, onSelect: (s: string) => void }) {
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const handleGenerate = async () => {
        if (!name || !council) return toast.error("Please enter Troop Name and Council first")
        setLoading(true)
        try {
            const results = await getSlugSuggestions(name, council, district)
            setSuggestions(results)
            if (results.length === 0) toast.info("No suggestions available. Try entering a custom identifier.")
        } catch {
            toast.error("Failed to generate suggestions")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="text-sm">
            <div className="flex gap-2 items-center mb-2">
                <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={loading || !name || !council}>
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : "✨"}
                    Generate Suggestions
                </Button>
            </div>
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                    {suggestions.map(s => (
                        <Badge
                            key={s}
                            variant="secondary"
                            className="cursor-pointer hover:bg-green-100 hover:text-green-800 transition-colors"
                            onClick={() => onSelect(s)}
                        >
                            {s}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}

const formSchema = z.object({
    name: z.string().min(2, "Troop name must be at least 2 characters"),
    slug: z.string().min(3, "URL identifier must be at least 3 characters")
        .refine(val => /^[a-z0-9-]+$/.test(val), "Only lowercase letters, numbers, and hyphens allowed"),
    council: z.string().min(2, "Council name is required"),
    district: z.string().optional(),
    adminName: z.string().min(2, "Your name is required"),
    adminEmail: z.string().refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email address"),
    adminPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmMultipleTroops: z.boolean().optional(),
    promoCode: z.string().optional(),
})

export function RegisterTroopForm() {
    const [isPending, setIsPending] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [pendingData, setPendingData] = useState<z.infer<typeof formSchema> | null>(null)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            council: "",
            district: "",
            adminName: "",
            adminEmail: "",
            adminPassword: "",
            confirmMultipleTroops: false,
            promoCode: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsPending(true)
        try {
            const result = await registerTroop(values) as any

            if (result.success && result.redirectUrl) {
                toast.success("Troop registered successfully!")
                router.push(result.redirectUrl)
            } else if (result.requiresConfirmation) {
                // Show confirmation dialog
                setPendingData(values)
                setShowConfirmDialog(true)
                setIsPending(false)
            } else {
                toast.error(result.error || "Failed to register troop")
                setIsPending(false)
            }
        } catch {
            toast.error("Something went wrong. Please try again.")
            setIsPending(false)
        }
    }

    async function handleConfirmProceed() {
        if (!pendingData) return

        setShowConfirmDialog(false)
        setIsPending(true)

        try {
            // Submit again with confirmation flag
            const result = await registerTroop({ ...pendingData, confirmMultipleTroops: true }) as any

            if (result.success && result.redirectUrl) {
                toast.success("Troop registered successfully!")
                router.push(result.redirectUrl)
            } else {
                toast.error(result.error || "Failed to register troop")
            }
        } catch {
            toast.error("Something went wrong. Please try again.")
        } finally {
            setIsPending(false)
            setPendingData(null)
        }
    }

    function handleConfirmCancel() {
        setShowConfirmDialog(false)
        setPendingData(null)
    }

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Register Your Troop</CardTitle>
                <CardDescription>Create a dedicated space for your scout troop.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Troop Details</h3>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Troop Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Troop 79" className="min-h-[44px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="council"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Council</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Grand Canyon" className="min-h-[44px]" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="district"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>District (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Lost Dutchman" className="min-h-[44px]" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-3">
                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Troop URL Identifier</FormLabel>
                                            <FormControl>
                                                <div className="flex items-stretch">
                                                    <span className="hidden sm:flex bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm items-center whitespace-nowrap">
                                                        trooptreasury.com/dashboard
                                                    </span>
                                                    <Input placeholder="troop79-az" className="sm:rounded-l-none min-h-[44px]" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormDescription className="text-xs sm:text-sm">
                                                Your unique web address. <span className="sm:hidden">Will be: trooptreasury.com/dashboardyour-slug</span>
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Slug Suggestions */}
                                <SlugSuggestions
                                    name={form.watch("name")}
                                    council={form.watch("council")}
                                    district={form.watch("district")}
                                    onSelect={(slug) => form.setValue("slug", slug)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Admin Account</h3>
                            <FormField
                                control={form.control}
                                name="adminName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" className="min-h-[44px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="adminEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="john@example.com" className="min-h-[44px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="adminPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" className="min-h-[44px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="promoCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Promo Code (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. FREEFORLIFE" className="min-h-[44px] font-mono" {...field} />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            If you have a special promotion code for life-long free access.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Troop
                        </Button>
                    </form>
                </Form>

                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Email Already Registered</AlertDialogTitle>
                            <AlertDialogDescription>
                                This email address is already registered with another troop.
                                Do you want to continue and link this email to the new troop you're registering?
                                <br /><br />
                                <strong>Note:</strong> If you proceed, your existing account will be linked to the new troop,
                                and your password will be updated to the new password you entered above.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleConfirmCancel}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmProceed}>
                                Continue Registration
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}
