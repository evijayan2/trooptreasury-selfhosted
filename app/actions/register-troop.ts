"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

const registerSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(3).refine(val => /^[a-z0-9-]+$/.test(val), "Only lowercase letters, numbers, and hyphens allowed"),
    council: z.string().min(2),
    district: z.string().optional(),
    adminName: z.string().min(2),
    adminEmail: z.string().refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email"),
    adminPassword: z.string().min(8),
    confirmMultipleTroops: z.boolean().optional(),
    promoCode: z.string().optional(),
})



export async function registerTroop(data: z.infer<typeof registerSchema>) {

    // 1. Hosted Mode Check
    const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true"

    // Check if we have Stripe keys. If NOT, proceed to direct creation (Dev Bypass).
    const hasStripe = false

    // Validate and process registration
    // Validate form data first
    // 2. Validation
    const validated = registerSchema.safeParse(data)
    if (!validated.success) {
        return { success: false, error: "Invalid form data" }
    }

    const { name, slug, council, district, adminName, adminEmail, adminPassword } = validated.data

    try {
        // 3. Check Uniqueness
        const slugExists = await prisma.troop.findUnique({ where: { slug } })
        if (slugExists) {
            return { success: false, error: "Troop URL identifier is already taken." }
        }

        // Check if slug is reserved in pending registrations
        const pendingSlug = await prisma.pendingRegistration.findFirst({
            where: {
                troopSlug: slug,
                expiresAt: { gt: new Date() }
            }
        })
        if (pendingSlug) {
            return { success: false, error: "Troop URL identifier is currently reserved." }
        }

        const lowercaseEmail = adminEmail.toLowerCase()
        const emailExists = await prisma.user.findUnique({ where: { email: lowercaseEmail } })

        // If email exists and user hasn't confirmed, require confirmation
        if (emailExists && !validated.data.confirmMultipleTroops) {
            return {
                success: false,
                error: "This email is already registered with another troop. Do you want to continue?",
                requiresConfirmation: true
            }
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10)

        // 4. Hosted Mode with Stripe
        // Direct Creation (Dev/Self-hosted)
        const result = await prisma.$transaction(async (tx) => {
            let user;

            const lowercaseEmail = adminEmail.toLowerCase()
            if (emailExists) {
                // Update existing user with new password
                user = await tx.user.update({
                    where: { id: emailExists.id },
                    data: {
                        passwordHash: hashedPassword,
                        name: adminName, // Also update name in case it changed
                    }
                })
            } else {
                // Create new user
                user = await tx.user.create({
                    data: {
                        name: adminName,
                        email: lowercaseEmail,
                        passwordHash: hashedPassword,
                        isActive: true
                    }
                })
            }

            // Create Troop
            const troop = await tx.troop.create({
                data: {
                    name,
                    slug,
                    council,
                    district,
                    settings: {
                        annualDuesAmount: 150 // Default
                    }
                }
            })

            // Link as Admin
            await tx.troopMember.create({
                data: {
                    troopId: troop.id,
                    userId: user.id,
                    role: Role.ADMIN
                }
            })

            return troop
        })

        return {
            success: true,
            redirectUrl: `/dashboard`
        }

    } catch (error) {
        console.error("Registration failed:", error)
        return JSON.parse(JSON.stringify({ success: false, error: "Database error occurred during registration." }))
    }
}
