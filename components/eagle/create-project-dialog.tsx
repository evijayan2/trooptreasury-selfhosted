'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createEagleProject } from "@/lib/actions/eagle-project"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const formSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    beneficiary: z.string().optional(),
    description: z.string().optional(),
})

interface CreateProjectDialogProps {
    troopSlug: string
    scoutId: string
    trigger?: React.ReactNode
}

export function CreateProjectDialog({ troopSlug, scoutId, trigger }: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            beneficiary: "",
            description: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const result = await createEagleProject(troopSlug, scoutId, values)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Eagle Project created successfully!")
                setOpen(false)
                form.reset()
                router.refresh()
            }
        } catch (error) {
            toast.error("An unexpected error occurred.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>Start Eagle Project</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Start Eagle Scout Project</DialogTitle>
                    <DialogDescription>
                        Enter the basic details of your project. You can add more information later.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Project Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Community Garden Bench" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="beneficiary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Beneficiary (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. City Parks Dept" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brief description of the project..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Project"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
