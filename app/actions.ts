"use server"

import { prisma } from "@/lib/prisma"
import { Role, TransactionType, CampoutStatus, ScoutStatus, CampoutAdultRole } from "@prisma/client"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth, signIn } from "@/auth"
import { Resend } from "resend"
import { AuthError } from "next-auth"
import { Decimal } from "decimal.js"
import { isTroopAdmin, canManageFinances, canManageExpense, getTroopContext, checkTroopPermission } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Initialize Resend (requires env var RESEND_API_KEY)
const resendApiKey = process.env.RESEND_API_KEY
if (!resendApiKey) {
    console.error("CRITICAL: RESEND_API_KEY environment variable is not set")
}
const resend = resendApiKey ? new Resend(resendApiKey) : null

const createUserSchema = z.object({
    email: z.string().refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email"),
    name: z.string().min(1),
    role: z.nativeEnum(Role),
    childScouts: z.array(z.string()).optional(),
})

const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Invalid token"),
    password: z.string()
        .min(12, "Password must be at least 12 characters")
        .refine(val => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
        .refine(val => /[a-z]/.test(val), "Password must contain at least one lowercase letter")
        .refine(val => /[0-9]/.test(val), "Password must contain at least one number")
        .refine(val => /[^A-Za-z0-9]/.test(val), "Password must contain at least one special character"),
    confirmPassword: z.string().min(12, "Confirm password must be at least 12 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export async function createUser(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    // Check Authorization
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    if (!membership || !["ADMIN", "LEADER"].includes(membership.role)) {
        return { error: "Unauthorized: Admins only" }
    }

    const email = formData.get("email") as string

    // Rate limiting
    const { rateLimiter, RATE_LIMITS } = await import("@/lib/rate-limiter")
    if (rateLimiter.isRateLimited(`user-creation-${session.user.id}`, RATE_LIMITS.USER_CREATION.maxAttempts, RATE_LIMITS.USER_CREATION.windowMs)) {
        return { error: "Too many user creation attempts. Please try again later." }
    }

    const validatedFields = createUserSchema.safeParse({
        email: formData.get("email"),
        name: formData.get("name"),
        role: formData.get("role"),
        childScouts: formData.getAll("childScouts").map(s => s.toString()).filter(s => s.trim() !== ""),
    })

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, role } = validatedFields.data

    try {
        const newUser = await prisma.$transaction(async (tx) => {
            // Check if user exists
            let user = await tx.user.findUnique({ where: { email } })

            // Generate token
            const invitationToken = crypto.randomUUID()
            const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000)

            if (!user) {
                user = await tx.user.create({
                    data: {
                        email,
                        name,
                        // role is REMOVED from User model
                        invitationToken,
                        invitationExpires,
                    }
                })
            }

            // Create Troop Membership
            // Check if already member
            const existingMember = await tx.troopMember.findUnique({
                where: { troopId_userId: { troopId: troop.id, userId: user!.id } }
            })

            if (existingMember) {
                // Update role? Or throw? Let's update role if needed or skip.
                if (existingMember.role !== role) {
                    await tx.troopMember.update({
                        where: { id: existingMember.id },
                        data: { role }
                    })
                }
            } else {
                await tx.troopMember.create({
                    data: {
                        troopId: troop.id,
                        userId: user!.id,
                        role
                    }
                })
            }

            // Auto-create Scout record if role is SCOUT
            if (role === "SCOUT") {
                // Check if scout profile exists for this user in this troop
                const existingScout = await tx.scout.findFirst({
                    where: { userId: user!.id, troopId: troop.id }
                })

                if (!existingScout) {
                    await tx.scout.create({
                        data: {
                            name,
                            status: 'ACTIVE',
                            userId: user!.id,
                            troopId: troop.id
                        }
                    })
                }
            }

            // Auto-create Child Scouts if role is PARENT
            if (role === "PARENT" && validatedFields.data.childScouts && validatedFields.data.childScouts.length > 0) {
                for (const childName of validatedFields.data.childScouts) {
                    // Create new scout
                    const child = await tx.scout.create({
                        data: {
                            name: childName,
                            status: 'ACTIVE',
                            ibaBalance: new Decimal(0),
                            troopId: troop.id
                        }
                    })
                    // Link to parent
                    await tx.parentScout.create({
                        data: {
                            parentId: user!.id,
                            scoutId: child.id
                        }
                    })
                }
            }

            return user
        })

        if (!newUser) throw new Error("Failed to create user")

        // Send email via Resend
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const inviteUrl = `${appUrl}/invite?token=${(newUser as any).invitationToken}` // Assuming user was created with token

        console.log(`Sending invite to ${email} with url: ${inviteUrl}`)

        if (!resend) {
            revalidatePath(`/dashboard/users`)
            return { success: true, message: "User created/added but invitation email could not be sent (email service not configured)" }
        }

        const data = await resend.emails.send({
            from: 'TroopTreasury <onboarding@vpillai.online>',
            to: email,
            subject: `Welcome to ${troop.name} - Complete Setup`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>${troop.name}</h1>
                    <p>Hello ${name},</p>
                    <p>You have been invited to join <strong>${troop.name}</strong> on TroopTreasury.</p>
                    <p>Please click the link below to accept the invitation:</p>
                    <p style="margin: 20px 0;">
                        <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Accept Invitation
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">This link will expire in 48 hours.</p>
                </div>
            `
        })

        revalidatePath(`/dashboard/users`)
        return { success: true, message: "Invitation sent successfully", inviteUrl }

    } catch (error) {
        console.error("Create User Error:", error)
        return { error: "Failed to create user" }
    }
}



export async function acceptInvitation(prevState: any, formData: FormData) {
    const rawData = {
        token: formData.get("token"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
    }

    const validatedFields = acceptInvitationSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { token, password } = validatedFields.data
    console.log(`[AUTH-DEBUG] acceptInvitation called with token: ${token}`);

    try {
        const user = await prisma.user.findUnique({
            where: { invitationToken: token }
        })

        if (!user) {
            console.log(`[AUTH-DEBUG] User NOT found for token: ${token}`);
            return { error: "Invalid or expired invitation token" }
        }

        if (!user.invitationExpires || user.invitationExpires < new Date()) {
            console.log(`[AUTH-DEBUG] Token EXPIRED for user: ${user.email}, expires at: ${user.invitationExpires}`);
            return { error: "Invalid or expired invitation token" }
        }

        console.log(`[AUTH-DEBUG] Token Valid for user: ${user.email}`);

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                invitationToken: null,
                invitationExpires: null,
                isActive: true, // Ensure they are active upon acceptance
            }
        })

        return { success: true, message: "Password set successfully" }
    } catch (error) {
        console.error("Accept Invitation Error:", error)
        return { error: "Failed to set password" }
    }
}
export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    try {
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        // Import rate limiter dynamically
        const { rateLimiter, RATE_LIMITS } = await import("@/lib/rate-limiter")

        // Check rate limit
        if (rateLimiter.isRateLimited(email, RATE_LIMITS.LOGIN.maxAttempts, RATE_LIMITS.LOGIN.windowMs)) {
            const resetTime = rateLimiter.getResetTime(email)
            return `Too many login attempts. Please try again in ${Math.ceil(resetTime / 60)} minutes.`
        }

        // Explicitly pass credentials and redirectTo
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/dashboard"
        })

    } catch (error: any) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials."
                default:
                    return "Something went wrong."
            }
        }
        // Very important: Next.js redirect() and signIn() work by throwing an error.
        // We MUST rethrow it so Next.js can handle the redirection.
        throw error
    }
}

const transactionSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1, "Description is required"),
    date: z.string(), // ISO string from date picker
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
})

export async function createTransaction(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    // Check Permissions
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    if (!membership) return { error: "Unauthorized" }
    const userRole = membership.role

    if (!["ADMIN", "FINANCIER", "PARENT", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    // Parent security check
    const scoutId = formData.get("scoutId") as string

    if (userRole === "PARENT") {
        if (!scoutId) {
            return { error: "Parents must select a scout." }
        }
        // Verify ownership
        const isLinked = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!isLinked) {
            return { error: "You are not authorized to manage this scout." }
        }
    }

    const rawData = {
        amount: formData.get("amount"),
        type: formData.get("type"),
        description: formData.get("description"),
        date: formData.get("date"),
        scoutId: scoutId || undefined,
        campoutId: formData.get("campoutId") || undefined,
    }

    const validatedFields = transactionSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { amount, type, description: desc, date: txDate, scoutId: validatedScoutId, campoutId } = validatedFields.data

    try {
        await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
                data: {
                    troopId: troop.id,
                    amount: new Decimal(amount),
                    type,
                    description: desc,
                    createdAt: new Date(txDate),
                    scoutId: validatedScoutId || null,
                    campoutId: campoutId || null,
                    approvedBy: ["ADMIN", "FINANCIER", "LEADER"].includes(userRole) ? session.user.id : null,
                    status: ["ADMIN", "FINANCIER", "LEADER"].includes(userRole) ? "APPROVED" : "PENDING",
                }
            })

            // Update Scout Balance if applicable AND Approved
            const isApproved = ["ADMIN", "FINANCIER", "LEADER"].includes(userRole)

            if (validatedScoutId && isApproved) {
                const decimalAmount = new Decimal(amount)

                // Credit Types
                if (["IBA_DEPOSIT", "FUNDRAISING_INCOME", "SCOUT_CASH_TURN_IN"].includes(type)) {
                    await tx.scout.update({
                        where: { id: validatedScoutId },
                        data: { ibaBalance: { increment: decimalAmount } }
                    })
                }
                // Debit Types
                else if (["DUES", "CAMP_TRANSFER"].includes(type)) {
                    await tx.scout.update({
                        where: { id: validatedScoutId },
                        data: { ibaBalance: { decrement: decimalAmount } }
                    })
                }
            }
        })

        revalidatePath(`/dashboard/finance/transactions`)
        revalidatePath(`/dashboard`)
        if (validatedScoutId) revalidatePath(`/dashboard/scouts/${validatedScoutId}`)

        return { success: true, message: "Transaction recorded" }
    } catch (error) {
        console.error("Transaction Create Error:", error)
        return { error: "Failed to create transaction" }
    }
}



const scoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.string().optional(),
    status: z.nativeEnum(ScoutStatus),
    email: z.string().refine(val => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email").optional().or(z.literal('')),
    parentId: z.string().optional(),
    initialBalance: z.string().optional(),
})

export async function createScout(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    if (!membership || !["ADMIN", "FINANCIER", "LEADER"].includes(membership.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        name: formData.get("name"),
        age: formData.get("age"),
        status: formData.get("status"),
        email: formData.get("email"),
        parentId: formData.get("parentId"),
        initialBalance: formData.get("initialBalance"),
    }

    const validatedFields = scoutSchema.safeParse(rawData)

    if (!validatedFields.success) {
        console.error("Scout Validation Error:", validatedFields.error.flatten())
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, age, status, email, parentId, initialBalance } = validatedFields.data

    try {
        await prisma.$transaction(async (tx) => {
            const scout = await tx.scout.create({
                data: {
                    name,
                    age: age ? parseInt(age) : null,
                    status,
                    troopId: troop.id,
                    // @ts-ignore
                    email: email || null,
                    ibaBalance: initialBalance ? new Decimal(initialBalance) : new Decimal(0),
                }
            })

            if (parentId) {
                await tx.parentScout.create({
                    data: {
                        parentId,
                        scoutId: scout.id
                    }
                })
            }
        })

        revalidatePath(`/dashboard/scouts`)
        return { success: true, message: "Scout added successfully" }
    } catch (error) {
        console.error("Scout Create Error:", error)
        return { error: "Failed to create scout" }
    }
}

export async function registerScoutForCampout(campoutId: string, scoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }

    // Fetch actual troop role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    // If Parent, verify ownership
    if (userRole === "PARENT") {
        const isLinked = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!isLinked) return { error: "Unauthorized: You can only register your own scouts." }
    } else if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campoutScout.create({
            data: {
                campoutId,
                scoutId,
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Scout registered" }
    } catch (error) {
        console.error("Registration Error:", error)
        return { error: "Failed to register scout (may already be registered)" }
    }
}

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string()
        .min(12, "Password must be at least 12 characters")
        .refine(val => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
        .refine(val => /[a-z]/.test(val), "Password must contain at least one lowercase letter")
        .refine(val => /[0-9]/.test(val), "Password must contain at least one number")
        .refine(val => /[^A-Za-z0-9]/.test(val), "Password must contain at least one special character"),
    confirmPassword: z.string().min(12, "Confirm password must be at least 12 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

export async function changePassword(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session || !session.user?.email) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    }

    const validatedFields = changePasswordSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { currentPassword, newPassword } = validatedFields.data

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user || !user.passwordHash) {
            return { error: "User not found or invalid state" }
        }

        const passwordsMatch = await bcrypt.compare(currentPassword, user.passwordHash)

        if (!passwordsMatch) {
            return { error: "Incorrect current password" }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { email: session.user.email },
            data: { passwordHash: hashedPassword }
        })

        return { success: true, message: "Password updated successfully" }
    } catch (error) {
        console.error("Change Password Error:", error)
        return { error: "Failed to update password" }
    }
}

const setupAdminSchema = z.object({
    email: z.string().refine(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email"),
    name: z.string().min(1, "Name is required"),
    password: z.string()
        .min(12, "Password must be at least 12 characters")
        .refine(val => /[A-Z]/.test(val), "Password must contain at least one uppercase letter")
        .refine(val => /[a-z]/.test(val), "Password must contain at least one lowercase letter")
        .refine(val => /[0-9]/.test(val), "Password must contain at least one number")
        .refine(val => /[^A-Za-z0-9]/.test(val), "Password must contain at least one special character"),
})

export async function setupInitialAdmin(prevState: any, formData: FormData) {
    try {
        const userCount = await prisma.user.count()
        if (userCount > 0) {
            return { error: "Setup already completed. Please login." }
        }

        const rawData = {
            email: formData.get("email"),
            name: formData.get("name"),
            password: formData.get("password"),
        }

        const validatedFields = setupAdminSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { email, name, password } = validatedFields.data
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create User (No Role)
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash: hashedPassword,
                // role: "ADMIN", // Removed
            }
        })

        // Create Default Troop
        const troop = await prisma.troop.create({
            data: {
                name: "TroopTreasury Demo",
                slug: "demo",
                status: "ACTIVE"
            }
        })

        // Make Admin
        await prisma.troopMember.create({
            data: {
                troopId: troop.id,
                userId: user.id,
                role: "ADMIN"
            }
        })

        return { success: true, message: "Admin created successfully" }
    } catch (error) {
        console.error("Setup Error:", error)
        return { error: `Failed to create admin user: ${error instanceof Error ? error.message : "Unknown error"}` }
    }
}

const updateUserSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required"),
    role: z.nativeEnum(Role),
    scoutId: z.string().optional(), // For manual linking
})

export async function updateUser(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing slug" }

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    // Check Auth
    const membership = await prisma.troopMember.findUnique({
        where: { troopId_userId: { troopId: troop.id, userId: session.user.id } }
    })
    if (!membership || membership.role !== "ADMIN") return { error: "Unauthorized" }

    const rawData = {
        userId: formData.get("userId"),
        name: formData.get("name"),
        role: formData.get("role"),
        scoutId: formData.get("scoutId") || undefined,
    }

    const validatedFields = updateUserSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { userId, name, role, scoutId } = validatedFields.data

    try {
        await prisma.$transaction(async (tx) => {
            // Update User Name
            await tx.user.update({
                where: { id: userId },
                data: { name }
            })

            // Update Troop Role
            // Check if member exists
            const member = await tx.troopMember.findUnique({
                where: { troopId_userId: { troopId: troop.id, userId } }
            })

            if (member) {
                await tx.troopMember.update({
                    where: { id: member.id },
                    data: { role }
                })
            } else {
                // Add to troop if not there?
                await tx.troopMember.create({
                    data: { troopId: troop.id, userId, role }
                })
            }

            // Sync or Link Scout (Logic kept but scoped)
            if (role === "SCOUT") {
                if (scoutId) {
                    const targetScout = await tx.scout.findUnique({ where: { id: scoutId } })
                    if (targetScout && targetScout.troopId === troop.id) {
                        // ... existing linking logic ...
                        await tx.scout.update({
                            where: { id: scoutId },
                            data: { userId }
                        })
                    }
                }
            }
        })

        revalidatePath(`/dashboard/users`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}



export async function linkParentToScout(parentId: string, scoutId: string, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get troop from scout to check admin permissions
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true }
    })
    if (!scout) return { error: "Scout not found" }

    const isAdmin = await isTroopAdmin(session.user.id, scout.troopId)
    if (!isAdmin) {
        return { error: "Unauthorized - Admin role required" }
    }

    try {
        await prisma.parentScout.create({
            data: {
                parentId,
                scoutId,
            }
        })
        revalidatePath(`/dashboard/users`)
        return { success: true, message: "Parent linked to scout" }
    } catch (error) {
        console.error("Link Error:", error)
        return { error: "Failed to link (may already be linked)" }
    }
}

export async function unlinkParentFromScout(parentId: string, scoutId: string, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get troop from scout to check admin permissions
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true }
    })
    if (!scout) return { error: "Scout not found" }

    const isAdmin = await isTroopAdmin(session.user.id, scout.troopId)
    if (!isAdmin) {
        return { error: "Unauthorized - Admin role required" }
    }

    try {
        await prisma.parentScout.delete({
            where: {
                parentId_scoutId: {
                    parentId,
                    scoutId,
                }
            }
        })
        revalidatePath(`/dashboard/users`)
        return { success: true, message: "Parent unlinked from scout" }
    } catch (error) {
        console.error("Unlink Error:", error)
        return { error: "Failed to unlink" }
    }
}

export async function toggleUserStatus(userId: string, shouldDeactivate: boolean, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get troop context and verify admin role
    const troopContext = await getTroopContext(slug, session.user.id)
    if (!troopContext || troopContext.userRole !== "ADMIN") {
        return { error: "Unauthorized - Admin role required" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isActive: !shouldDeactivate,
                deactivatedAt: shouldDeactivate ? new Date() : null
            }
        })
        revalidatePath(`/dashboard/users`)
        return { success: true, message: `User ${shouldDeactivate ? 'deactivated' : 'activated'}` }
    } catch (error) {
        console.error("Toggle Status Error:", error)
        return { error: "Failed to update status" }
    }
}

const troopSettingsSchema = z.object({
    name: z.string().min(1, "Troop name is required"),
    council: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
    sessionTimeoutMinutes: z.string().refine((val) => {
        const num = Number(val)
        return !isNaN(num) && num >= 5 && num <= 1440
    }, "Session timeout must be between 5 and 1440 minutes"),
})

export async function updateTroopSettings(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get slug from formData
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop identifier" }

    // Verify admin role in this troop
    const troopContext = await getTroopContext(slug, session.user.id)
    if (!troopContext || troopContext.userRole !== "ADMIN") {
        return { error: "Unauthorized - Admin role required" }
    }

    const rawData = {
        name: formData.get("name"),
        council: formData.get("council"),
        district: formData.get("district"),
        address: formData.get("address"),
        sessionTimeoutMinutes: formData.get("sessionTimeoutMinutes"),
    }



    const validatedFields = troopSettingsSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { name, council, district, address, sessionTimeoutMinutes } = validatedFields.data

    try {
        const currentTroop = await prisma.troop.findUnique({ where: { slug } })
        if (!currentTroop) throw new Error("Troop not found")

        const currentSettings = (currentTroop.settings as any) || {}

        const newSettings = {
            ...currentSettings,
            address,
            sessionTimeoutMinutes: parseInt(sessionTimeoutMinutes)
        }

        await prisma.troop.update({
            where: { slug },
            data: {
                name,
                council,
                district,
                settings: newSettings
            }
        })

        revalidatePath(`/dashboard`)
        revalidatePath(`/dashboard/settings`)
        revalidatePath(`/dashboard/finance/dues`)
    } catch (error) {
        console.error("Troop Settings Error:", error)
        return { error: "Failed to save settings" }
    }

    redirect(`/dashboard/settings`)
}

export async function updateRolePermissions(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    // Verify Troop Admin
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    if (membership?.role !== "ADMIN") {
        return { error: "Unauthorized: Admins only" }
    }

    try {
        const permissionsJson = formData.get("permissions") as string
        const permissions = JSON.parse(permissionsJson)

        // Merge with existing settings
        const currentSettings = (troop.settings as any) || {}
        const newSettings = {
            ...currentSettings,
            rolePermissions: permissions
        }

        await prisma.troop.update({
            where: { id: troop.id },
            data: { settings: newSettings }
        })

        revalidatePath(`/dashboard`, "layout")
        return { success: true, message: "Permissions updated" }

    } catch (error) {
        console.error("RBAC Update Error:", error)
        return { error: "Failed to update permissions" }
    }
}


export async function assignAdultToCampout(campoutId: string, adultId: string, role: "ORGANIZER" | "ATTENDEE" = "ORGANIZER") {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get campout to find troopId for permission check
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await canManageFinances(session.user.id, campout.troopId)
    if (!canManage) {
        return { error: "Unauthorized - Admin, Financier, or Leader role required" }
    }

    try {
        await prisma.campoutAdult.upsert({
            where: {
                campoutId_adultId_role: {
                    campoutId,
                    adultId,
                    role: role as CampoutAdultRole
                }
            },
            update: {},
            create: {
                campoutId,
                adultId,
                role: role as CampoutAdultRole
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Adult assigned" }
    } catch (error: any) {
        console.error("Assign Adult Error:", error)
        return { error: error.message || "Failed to assign adult" }
    }
}

export async function recordAdultPayment(campoutId: string, adultId: string, amount: string, source: string = "CASH") {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }

    // Fetch actual troop role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    try {
        const paymentAmount = new Decimal(amount)
        if (paymentAmount.lte(0)) throw new Error("Invalid amount")

        // Smart Cash Allocation
        if (source === "CASH") {
            // 1. Calculate Troop Financial Position for this Campout
            const txs = await prisma.transaction.findMany({
                where: { campoutId: campoutId, status: "APPROVED" }
            })

            const troopDirectExpenses = txs
                .filter(t => t.type === "EXPENSE")
                .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

            const troopCollected = txs
                .filter(t => t.type === "REGISTRATION_INCOME")
                .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

            const troopDeficit = troopDirectExpenses.minus(troopCollected)

            // 2. Determine Split
            let depositAmount = new Decimal(0)
            let reimburseAmount = new Decimal(0)

            if (troopDeficit.gt(0)) {
                if (paymentAmount.lte(troopDeficit)) {
                    depositAmount = paymentAmount
                } else {
                    depositAmount = troopDeficit
                    reimburseAmount = paymentAmount.minus(troopDeficit)
                }
            } else {
                reimburseAmount = paymentAmount
            }

            // 3. Create Transactions
            if (depositAmount.gt(0)) {
                await prisma.transaction.create({
                    data: {
                        troopId: campout.troopId,
                        type: "REGISTRATION_INCOME",
                        amount: depositAmount,
                        description: "Adult Campout Fee Payment (Manual/Cash - Troop Deposit)",
                        campoutId: campoutId,
                        userId: adultId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }

            if (reimburseAmount.gt(0)) {
                await prisma.transaction.create({
                    data: {
                        troopId: campout.troopId,
                        type: "EVENT_PAYMENT",
                        amount: reimburseAmount,
                        description: "Adult Campout Fee Payment (Manual/Cash - Organizer Held)",
                        campoutId: campoutId,
                        userId: adultId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }

        } else {
            let type: TransactionType = "EVENT_PAYMENT"
            let description = "Adult Campout Fee Payment (Manual/Cash)"

            if (source === "TROOP") {
                type = "TROOP_PAYMENT"
                description = "Troop Subsidy / Incentive"
            } else if (source === "BANK_DIRECT") {
                type = "REGISTRATION_INCOME"
                description = "Adult Campout Fee Payment (Direct to Bank)"
            } else if (source === "CASH_DEPOSIT") {
                type = "REGISTRATION_INCOME"
                description = "Adult Campout Fee Payment (Cash to Deposit)"
            } else if (source === "CASH_REIMBURSE") {
                type = "EVENT_PAYMENT"
                description = "Adult Campout Fee Payment (Held by Organizer)"
            } else if (source === "BANK") {
                type = "REGISTRATION_INCOME"
                description = "Adult Campout Fee Payment (Direct to Bank)"
            }

            await prisma.transaction.create({
                data: {
                    troopId: campout.troopId,
                    type,
                    amount: paymentAmount,
                    description,
                    campoutId: campoutId,
                    userId: adultId,
                    approvedBy: session.user.id,
                    status: "APPROVED"
                }
            })
        }

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Payment recorded" }
    } catch (error) {
        console.error("Record Payment Error:", error)
        return { error: "Failed to record payment" }
    }
}

export async function recordScoutPayment(campoutId: string, scoutId: string, amount: string, source: string = "CASH") {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }

    // Fetch actual troop role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    try {
        const paymentAmount = new Decimal(amount)
        if (paymentAmount.lte(0)) throw new Error("Invalid amount")

        // Smart Cash Allocation
        if (source === "CASH") {
            // 1. Calculate Troop Financial Position for this Campout
            const txs = await prisma.transaction.findMany({
                where: { campoutId: campoutId, status: "APPROVED" }
            })

            const troopDirectExpenses = txs
                .filter(t => t.type === "EXPENSE")
                .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

            const troopCollected = txs
                .filter(t => t.type === "REGISTRATION_INCOME")
                .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

            const troopDeficit = troopDirectExpenses.minus(troopCollected)

            // 2. Determine Split
            let depositAmount = new Decimal(0)
            let reimburseAmount = new Decimal(0)

            if (troopDeficit.gt(0)) {
                if (paymentAmount.lte(troopDeficit)) {
                    depositAmount = paymentAmount
                } else {
                    depositAmount = troopDeficit
                    reimburseAmount = paymentAmount.minus(troopDeficit)
                }
            } else {
                reimburseAmount = paymentAmount
            }

            // 3. Create Transactions
            if (depositAmount.gt(0)) {
                await prisma.transaction.create({
                    data: {
                        troopId: campout.troopId,
                        type: "REGISTRATION_INCOME",
                        amount: depositAmount,
                        description: "Scout Campout Fee Payment (Manual/Cash - Troop Deposit)",
                        campoutId: campoutId,
                        scoutId: scoutId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }

            if (reimburseAmount.gt(0)) {
                await prisma.transaction.create({
                    data: {
                        troopId: campout.troopId,
                        type: "EVENT_PAYMENT",
                        amount: reimburseAmount,
                        description: "Scout Campout Fee Payment (Manual/Cash - Organizer Held)",
                        campoutId: campoutId,
                        scoutId: scoutId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }

        } else {
            let type: TransactionType = "EVENT_PAYMENT"
            let description = "Scout Campout Fee Payment (Manual/Cash)"

            if (source === "TROOP") {
                type = "TROOP_PAYMENT"
                description = "Troop Subsidy / Incentive"
            } else if (source === "BANK_DIRECT") {
                type = "REGISTRATION_INCOME"
                description = "Scout Campout Fee Payment (Direct to Bank)"
            } else if (source === "CASH_DEPOSIT") {
                type = "REGISTRATION_INCOME"
                description = "Scout Campout Fee Payment (Cash to Deposit)"
            } else if (source === "CASH_REIMBURSE") {
                type = "EVENT_PAYMENT"
                description = "Scout Campout Fee Payment (Held by Organizer)"
            } else if (source === "BANK") {
                type = "REGISTRATION_INCOME"
                description = "Scout Campout Fee Payment (Direct to Bank)"
            }

            await prisma.transaction.create({
                data: {
                    troopId: campout.troopId,
                    type,
                    amount: paymentAmount,
                    description,
                    campoutId: campoutId,
                    scoutId: scoutId,
                    approvedBy: session.user.id,
                    status: "APPROVED"
                }
            })
        }

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Payment recorded" }
    } catch (error) {
        console.error("Record Payment Error:", error)
        return { error: "Failed to record payment" }
    }
}

export async function finalizeCampoutCosts(campoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }

    // Fetch actual troop role authorization
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campout.update({
            where: { id: campoutId },
            data: { status: "READY_FOR_PAYMENT" }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout finalized and ready for payments" }
    } catch (error) {
        console.error("Finalize Error:", error)
        return { error: "Failed to finalize campout" }
    }
}

export async function logAdultExpense(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Check if user is assigned to this campout? Or just allow any adult to log?
    // Ideally check CampoutAdult.

    const campoutId = formData.get("campoutId") as string
    const description = formData.get("description") as string
    const amount = formData.get("amount") as string

    if (!campoutId || !description || !amount) {
        return { error: "Missing fields" }
    }

    try {
        // Create AdultExpense record (for tracking reimbursement)
        // AND maybe create a Transaction?
        // Proposal: Create AdultExpense.
        // Admin later "Approves" it which creates the Transaction (Reimbursement).
        // OR: Just create Transaction directly with status PENDING?
        // The requirement says: "Adults log upfront expenses... Admin approve."
        // Let's use Transaction with type EXPENSE or REIMBURSEMENT (Pending).
        // If they paid for supplies, it's an EXPENSE for the Troop (that the adult paid).
        // So we record it as EXPENSE?
        // But we owe them money.
        // Let's use a specific type or just use EXPENSE and mark it "Paid by X".
        // Schema has `AdultExpense` model (Step 11). Let's use that.

        await prisma.adultExpense.create({
            data: {
                campoutId,
                adultId: session.user.id,
                amount: new Decimal(amount),
                description,
            }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Expense logged" }

    } catch (error) {
        console.error("Log Expense Error:", error)
        return { error: "Failed to log expense" }
    }
}

const fundraisingSchema = z.object({
    campaignName: z.string().min(1),
    totalRaised: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0),
    allocations: z.string() // JSON string validation in logic
})

export async function distributeFundraising(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    // Resolve Troop and Check Permissions
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    if (!membership || !["ADMIN", "FINANCIER"].includes(membership.role)) {
        return { error: "Unauthorized" }
    }

    const rawData = {
        campaignName: formData.get("campaignName"),
        totalRaised: formData.get("totalRaised"),
        allocations: formData.get("allocations"),
    }

    const validatedFields = fundraisingSchema.safeParse(rawData)
    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { campaignName, totalRaised, allocations } = validatedFields.data
    const total = new Decimal(totalRaised)
    let parsedAllocations: any[] = []

    try {
        parsedAllocations = JSON.parse(allocations as string)
    } catch (e) {
        return { error: "Invalid allocations data" }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Record Total Income for Troop
            await tx.transaction.create({
                data: {
                    troopId: troop.id,
                    type: "FUNDRAISING_INCOME",
                    amount: total,
                    description: `${campaignName} - Total Raised`,
                    approvedBy: session.user.id,
                    status: "APPROVED",
                    createdAt: new Date(),
                }
            })

            // 2. Process Allocations
            let totalDistributedToScouts = new Decimal(0)

            for (const alloc of parsedAllocations) {
                const amount = new Decimal(alloc.amount)

                if (alloc.category === 'EXTERNAL') {
                    // Donation/Gift OUT
                    await tx.transaction.create({
                        data: {
                            troopId: troop.id,
                            type: "EXPENSE",
                            amount: amount,
                            description: `${campaignName} - ${alloc.description}`,
                            approvedBy: session.user.id,
                            status: "APPROVED"
                        }
                    })
                } else if (alloc.category === "SCOUT") {
                    // Credit to Scout
                    await tx.transaction.create({
                        data: {
                            troopId: troop.id,
                            type: "FUNDRAISING_INCOME",
                            amount: amount,
                            description: `${campaignName} - Share`,
                            scoutId: alloc.scoutId,
                            approvedBy: session.user.id,
                            status: "APPROVED"
                        }
                    })
                    // Add to batch sum for single withdrawal
                    totalDistributedToScouts = totalDistributedToScouts.plus(amount)
                }
            }

            // 3. Deduct Total Scout Distribution from Troop Pot
            if (totalDistributedToScouts.greaterThan(0)) {
                await tx.transaction.create({
                    data: {
                        troopId: troop.id,
                        type: "EXPENSE",
                        amount: totalDistributedToScouts,
                        description: `${campaignName} - Distribution to Scouts`,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })
            }
        })
        revalidatePath(`/dashboard/fundraising`)
        return { success: true, message: "Fundraising distributed successfully" }
    } catch (error) {
        console.error("Distribute Fundraising Error:", error)
        return { error: "Failed to distribute fundraising" }
    }
}

// Update individual scout balances? 
// We don't store balance explicitly in some designs, but schema has `ibaBalance`.
// We should update it.
// Wait, schema has `ibaBalance` on Scout model.
// DO WE NEED TO MANUALLY UPDATE IT?
// Yes, Prisma doesn't have triggers.
// We need to iterate again or do it in the loop.



export async function transferIBAToCampout(campoutId: string, scoutId: string, amount: string, beneficiaryUserId?: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }
    if (campout.status === 'CLOSED') return { error: "Campout is closed and cannot accept new transactions." }

    // Fetch actual troop role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    // Parent check
    if (userRole === "PARENT") {
        const link = await prisma.parentScout.findUnique({
            where: {
                parentId_scoutId: {
                    parentId: session.user.id,
                    scoutId: scoutId
                }
            }
        })
        if (!link) return { error: "Unauthorized" }
    } else if (userRole === "SCOUT") {
        const scout = await prisma.scout.findUnique({ where: { id: scoutId } })
        if (!scout || scout.userId !== session.user.id) return { error: "Unauthorized" }
    } else if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    const transferAmount = new Decimal(amount)

    try {
        await prisma.$transaction(async (tx) => {
            // Check Balance
            const scout = await tx.scout.findUnique({ where: { id: scoutId } })
            if (!scout || scout.ibaBalance.lessThan(transferAmount)) {
                throw new Error("Insufficient funds")
            }

            // Debit Scout, Credit Campout (Internal Transfer)
            // We use CAMP_TRANSFER type.
            // If beneficiaryUserId is set, it means the scout is paying for that Adult.
            // Otherwise, it implicitly pays for the scout (since scoutId is on record).

            await tx.transaction.create({
                data: {
                    troopId: campout.troopId,
                    type: "CAMP_TRANSFER",
                    amount: transferAmount,
                    description: beneficiaryUserId ? "Payment for Adult from IBA" : "Payment from IBA",
                    scoutId: scoutId,
                    userId: beneficiaryUserId, // Link to Adult if applicable
                    campoutId: campoutId,
                    approvedBy: session.user.id, // Auto-approved? Yes if sufficient funds.
                    status: "APPROVED"
                }
            })

            await tx.scout.update({
                where: { id: scoutId },
                data: { ibaBalance: { decrement: transferAmount } }
            })
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        revalidatePath(`/dashboard/scouts/${scoutId}`)
        return { success: true, message: "Transfer successful" }
    } catch (error: any) {
        console.error("Transfer Error:", error)
        return { error: error.message || "Transfer failed" }
    }
}

export async function approveAdultExpense(expenseId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.$transaction(async (tx) => {
            const expense = await tx.adultExpense.findUnique({
                where: { id: expenseId },
                include: { campout: true }
            })

            if (!expense) throw new Error("Expense not found")
            if (expense.isReimbursed) return

            // Verify Permissions via Troop Member
            const membership = await tx.troopMember.findUnique({
                where: {
                    troopId_userId: {
                        troopId: expense.campout.troopId,
                        userId: session.user.id
                    }
                }
            })

            if (!membership || !["ADMIN", "FINANCIER"].includes(membership.role)) {
                throw new Error("Unauthorized")
            }

            // Create Reimbursement Transaction
            await tx.transaction.create({
                data: {
                    troopId: expense.campout.troopId,
                    type: "REIMBURSEMENT",
                    amount: expense.amount,
                    description: `Reimbursement: ${expense.description}`,
                    campoutId: expense.campoutId,
                    approvedBy: session.user.id,
                    status: "APPROVED"
                }
            })

            // Mark as Paid
            await tx.adultExpense.update({
                where: { id: expenseId },
                data: { isReimbursed: true }
            })
        })

        // We can't revalidate specific slug path easily unless we fetch slug or pass it.
        // But we can revalidate based on referring page or just generic?
        // Ideally we should pass slug. For now, catch-all or no-op revalidate?
        // Or fetch slug from troop relation.
        revalidatePath("/dashboard/campouts")
        return { success: true, message: "Reimbursement approved" }
    } catch (error: any) {
        console.error("Approval Error:", error)
        return { error: error.message || "Failed to approve" }
    }
}

export async function switchAdultRole(campoutId: string, adultId: string, currentRole: CampoutAdultRole, newRole: CampoutAdultRole) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    // Allow self-switch or finance managers
    const canManage = await canManageFinances(session.user.id, campout.troopId)
    if (session.user.id !== adultId && !canManage) {
        return { error: "Unauthorized" }
    }

    try {
        // Since we can have multiple roles, we need to handle this carefully.
        // If we are switching FROM ORGANIZER TO ATTENDEE, we update the ORG record or part of it?
        // Actually, with the new ID, we can't just "update" the role because role is part of the ID.
        // We have to delete the old role and create the new one, OR check if the new one exists.

        await prisma.$transaction(async (tx) => {
            // Delete the old role
            await tx.campoutAdult.delete({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId,
                        role: currentRole as CampoutAdultRole
                    }
                }
            })

            // Upsert the new role
            await tx.campoutAdult.upsert({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId,
                        role: newRole as CampoutAdultRole
                    }
                },
                update: {},
                create: {
                    campoutId,
                    adultId,
                    role: newRole as CampoutAdultRole
                }
            })
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function removeAdultFromCampout(campoutId: string, adultId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await canManageFinances(session.user.id, campout.troopId)
    if (!canManage) {
        return { error: "Unauthorized - Admin, Financier, or Leader role required" }
    }

    try {
        await prisma.campoutAdult.deleteMany({
            where: {
                campoutId,
                adultId
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function removeScoutFromCampout(campoutId: string, scoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await canManageFinances(session.user.id, campout.troopId)
    if (!canManage) {
        return { error: "Unauthorized - Admin, Financier, or Leader role required" }
    }

    try {
        await prisma.campoutScout.delete({
            where: {
                campoutId_scoutId: {
                    campoutId,
                    scoutId
                }
            }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function logCampoutExpense(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const campoutId = formData.get("campoutId") as string
    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))
    const paidBy = formData.get("paidBy") as string

    if (!campoutId || !description || !amount || !paidBy) {
        return { error: "Missing required fields" }
    }

    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }
    if (campout.status === 'CLOSED') return { error: "Campout is closed and cannot accept new transactions." }

    try {
        // Auto-add the payer as an organizer if they're not already registered
        // (Skip if paidBy is "TROOP")
        if (paidBy !== "TROOP") {
            await prisma.campoutAdult.upsert({
                where: {
                    campoutId_adultId_role: {
                        campoutId,
                        adultId: paidBy,
                        role: "ORGANIZER"
                    }
                },
                update: {}, // Already an organizer, do nothing
                create: {
                    campoutId,
                    adultId: paidBy,
                    role: "ORGANIZER"
                }
            })
        }

        // Fetch actual troop role for authorization
        const membership = await prisma.troopMember.findUnique({
            where: {
                troopId_userId: {
                    troopId: campout.troopId,
                    userId: session.user.id
                }
            }
        })
        const userRole = membership?.role || "SCOUT"

        if (paidBy === "TROOP") {
            if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
                return { error: "Unauthorized: Only Leaders/Financiers can log Troop expenses." }
            }

            await prisma.transaction.create({
                data: {
                    troopId: campout.troopId,
                    type: "EXPENSE",
                    amount,
                    description: `${description} (Paid by Troop)`,
                    campoutId,
                    status: "APPROVED",
                    approvedBy: session.user.id
                }
            })
        } else {
            // Logging for an adult (Reimbursable)
            // Allow if paying for self OR if Admin/Leader logging for someone else
            const isSelf = paidBy === session.user.id
            const canLogForOthers = ["ADMIN", "FINANCIER", "LEADER"].includes(userRole)

            if (!isSelf && !canLogForOthers) {
                return { error: "Unauthorized: You can only log expenses for yourself." }
            }

            await prisma.adultExpense.create({
                data: {
                    campoutId,
                    adultId: paidBy,
                    amount,
                    description,
                    isReimbursed: false
                }
            })
        }

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteTransaction(id: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    // Get transaction to find troopId
    const transaction = await prisma.transaction.findUnique({
        where: { id },
        select: { troopId: true }
    })
    if (!transaction) return { error: "Transaction not found" }

    const canManage = await canManageFinances(session.user.id, transaction.troopId)
    if (!canManage) {
        return { error: "Unauthorized - Admin, Financier, or Leader role required" }
    }

    try {
        const tx = await prisma.transaction.delete({ where: { id } })
        if (tx.campoutId) revalidatePath(`/dashboard/campouts/${tx.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteAdultExpense(id: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const expense = await prisma.adultExpense.findUnique({ where: { id } })
    if (!expense) return { error: "Not found" }

    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: expense.campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await canManageExpense(session.user.id, campout.troopId, expense.adultId)
    if (!canManage) {
        return { error: "Unauthorized" }
    }

    if (expense.isReimbursed) {
        return { error: "Cannot delete an already reimbursed expense." }
    }

    try {
        await prisma.adultExpense.delete({ where: { id } })
        revalidatePath(`/dashboard/campouts/${expense.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateTransaction(id: string, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    // Get expense with campout to find troopId
    const expense = await prisma.adultExpense.findUnique({
        where: { id },
        include: { campout: { select: { troopId: true } } }
    })
    if (!expense?.campout) return { error: "Expense not found" }

    const canManage = await canManageFinances(session.user.id, expense.campout.troopId)
    if (!canManage) {
        return { error: "Unauthorized - Admin, Financier, or Leader role required" }
    }

    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    try {
        const tx = await prisma.transaction.update({
            where: { id },
            data: { description, amount }
        })
        if (tx.campoutId) revalidatePath(`/dashboard/campouts/${tx.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateAdultExpense(id: string, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    if (!session) return { error: "Unauthorized" }

    const description = formData.get("description") as string
    const amount = Number(formData.get("amount"))

    const expense = await prisma.adultExpense.findUnique({ where: { id } })
    if (!expense) return { error: "Not found" }

    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: expense.campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await canManageExpense(session.user.id, campout.troopId, expense.adultId)
    if (!canManage) {
        return { error: "Unauthorized" }
    }

    if (expense.isReimbursed) {
        return { error: "Cannot update a reimbursed expense." }
    }


    try {
        await prisma.adultExpense.update({
            where: { id },
            data: { description, amount }
        })
        revalidatePath(`/dashboard/campouts/${expense.campoutId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function clearAllData(formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const slug = "troop-1"
    if (!slug) return { error: "Missing slug" }

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return { error: "Troop not found" }

    // Check Troop Admin
    const membership = await prisma.troopMember.findUnique({
        where: { troopId_userId: { troopId: troop.id, userId: session.user.id } }
    })

    if (!membership || membership.role !== "ADMIN") {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete Troop Data Only
            await tx.transaction.deleteMany({ where: { troopId: troop.id } })
            await tx.adultExpense.deleteMany({ where: { campout: { troopId: troop.id } } })

            // Delete Troop Campouts
            await tx.campout.deleteMany({ where: { troopId: troop.id } })

            // Delete Troop Scouts
            await tx.scout.deleteMany({ where: { troopId: troop.id } })

            // Do NOT delete Users as they are global or multi-tenant
            // But maybe remove memberships? 
            // If clearAllData means "Reset Troop", then:
            /*
            await tx.troopMember.deleteMany({
                 where: { 
                     troopId: troop.id,
                     userId: { not: session.user.id } // Keep the caller as admin
                 }
            })
            */
            // For now, just clearing financial/campout data is safer.
        })

        revalidatePath(`/dashboard`)
        return { success: true, message: "Troop data reset successful." }
    } catch (error) {
        console.error("System Reset Error:", error)
        return { error: "Failed to reset system data" }
    }
}

export async function batchIBAPayout(campoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await checkTroopPermission(session.user.id, campout.troopId, ["ADMIN", "FINANCIER"])
    if (!canManage) {
        return { error: "Unauthorized - Admin or Financier role required" }
    }

    // Re-fetch campout with all needed relations
    const campoutDetails = await prisma.campout.findUnique({
        where: { id: campoutId },
        include: {
            scouts: { include: { scout: true } },
            adults: { include: { adult: true } },
            transactions: {
                where: {
                    status: "APPROVED",
                }
            },
            expenses: true
        }
    })

    if (!campoutDetails) return { error: "Campout not found" }
    if (campoutDetails.status === "CLOSED") return { error: "Campout is already closed" }

    // Calculate cost per person
    const directExpenses = campoutDetails.transactions.filter((t: any) => t.type === "EXPENSE")
    const transactionsCost = directExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const adultExpensesCost = campoutDetails.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const totalCampoutCost = transactionsCost + adultExpensesCost

    const attendees = campoutDetails.adults.filter((a: any) => a.role === "ATTENDEE")
    const totalPeople = campoutDetails.scouts.length + attendees.length
    if (totalPeople === 0) return { error: "No participants to collect from" }

    const costPerPerson = new Decimal(totalCampoutCost).dividedBy(totalPeople).toDecimalPlaces(2)

    try {
        const results = await prisma.$transaction(async (tx) => {
            const updates = []

            // Scouts
            for (const cs of campoutDetails.scouts) {
                const paidAmount = campoutDetails.transactions
                    .filter((t: any) => t.scoutId === cs.scoutId && !t.userId && ["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT"].includes(t.type))
                    .reduce((sum: Decimal, t: any) => sum.plus(new Decimal(t.amount)), new Decimal(0))

                const due = costPerPerson.minus(paidAmount)
                if (due.greaterThan(0)) {
                    if (cs.scout.ibaBalance.lessThan(due)) {
                        throw new Error(`Scout ${cs.scout.name} has insufficient IBA funds.`)
                    }

                    // Collect from IBA
                    await tx.transaction.create({
                        data: {
                            troopId: campoutDetails.troopId,
                            type: "CAMP_TRANSFER",
                            amount: due,
                            description: "Automated IBA Collection",
                            scoutId: cs.scoutId,
                            campoutId: campoutId,
                            status: "APPROVED",
                            approvedBy: session.user.id
                        }
                    })

                    await tx.scout.update({
                        where: { id: cs.scoutId },
                        data: { ibaBalance: { decrement: due } }
                    })
                    updates.push(`${cs.scout.name}: collected $${due}`)
                }
            }

            // Attendee Adults
            for (const ca of attendees) {
                const paidAmount = campoutDetails.transactions
                    .filter((t: any) => t.userId === ca.adultId && ["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT"].includes(t.type))
                    .reduce((sum: Decimal, t: any) => sum.plus(new Decimal(t.amount)), new Decimal(0))

                const due = costPerPerson.minus(paidAmount)
                if (due.greaterThan(0)) {
                    // find a scout linked to this parent that has funds
                    const parentScoutLinks = await tx.parentScout.findMany({
                        where: { parentId: ca.adultId },
                        include: { scout: true }
                    })
                    const fundingScout = parentScoutLinks.find(ps => ps.scout.ibaBalance.greaterThanOrEqualTo(due))

                    if (!fundingScout) {
                        throw new Error(`Adult ${ca.adult.name} has no linked scout with sufficient IBA funds.`)
                    }

                    await tx.transaction.create({
                        data: {
                            troopId: campoutDetails.troopId,
                            type: "CAMP_TRANSFER",
                            amount: due,
                            description: `Automated Payout for Adult (${ca.adult.name})`,
                            scoutId: fundingScout.scoutId,
                            userId: ca.adultId,
                            campoutId: campoutId,
                            status: "APPROVED",
                            approvedBy: session.user.id
                        }
                    })

                    await tx.scout.update({
                        where: { id: fundingScout.scoutId },
                        data: { ibaBalance: { decrement: due } }
                    })
                    updates.push(`${ca.adult.name}: collected $${due} from ${fundingScout.scout.name}`)
                }
            }
            return updates
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Batch IBA Collection Successful", details: results }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function payoutOrganizers(campoutId: string, payouts: Record<string, number>) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    // Get campout to find troopId
    const campout = await prisma.campout.findUnique({
        where: { id: campoutId },
        select: { troopId: true }
    })
    if (!campout) return { error: "Campout not found" }

    const canManage = await checkTroopPermission(session.user.id, campout.troopId, ["ADMIN", "FINANCIER"])
    if (!canManage) {
        return { error: "Unauthorized - Admin or Financier role required" }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const campout = await tx.campout.findUnique({ where: { id: campoutId } })
            if (!campout) throw new Error("Campout not found")

            // Verify Permissions via Troop Member
            const membership = await tx.troopMember.findUnique({
                where: {
                    troopId_userId: {
                        troopId: campout.troopId,
                        userId: session.user.id
                    }
                }
            })
            if (!membership || !["ADMIN", "FINANCIER"].includes(membership.role)) {
                throw new Error("Unauthorized")
            }

            const entries = Object.entries(payouts)
            if (entries.length === 0) return { message: "No payouts specified" }

            for (const [adultId, amount] of entries) {
                if (amount <= 0) continue

                const adult = await tx.user.findUnique({ where: { id: adultId } })
                const adultName = adult?.name || "Unknown Organizer"

                // Create Reimbursement Transaction
                await tx.transaction.create({
                    data: {
                        troopId: campout.troopId,
                        type: "REIMBURSEMENT",
                        amount: new Decimal(amount),
                        description: `Organizer Payout: ${adultName}`,
                        campoutId: campoutId,
                        userId: adultId,
                        approvedBy: session.user.id,
                        status: "APPROVED"
                    }
                })

                // Mark all pending expenses for this adult as reimbursed
                // Even if the payout amount differs, we consider their campout liability cleared
                await tx.adultExpense.updateMany({
                    where: {
                        campoutId,
                        adultId,
                        isReimbursed: false
                    },
                    data: { isReimbursed: true }
                })
            }
            return { message: `Processed ${entries.length} payouts` }
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: result.message }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function closeCampout(campoutId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }
    const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
    if (!campout) return { error: "Campout not found" }

    // Fetch actual troop role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })
    const userRole = membership?.role || "SCOUT"

    if (!["ADMIN", "FINANCIER", "LEADER"].includes(userRole)) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.campout.update({
            where: { id: campoutId },
            data: { status: "CLOSED" }
        })
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout closed" }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function updateUserAppearance(theme: string, color: string) {
    const session = await auth()
    if (!session || !session.user?.email) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                preferredTheme: theme,
                preferredColor: color
            }
        })
        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Update Appearance Error:", error)
        return { error: "Failed to update appearance" }
    }
}



export async function inviteUserForScout(scoutId: string, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get scout to find troopId for permission check
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true }
    })
    if (!scout) return { error: "Scout not found" }

    // Authorization: Admin/Leader OR Linked Parent
    const isTroopAdminOrLeader = await checkTroopPermission(session.user.id, scout.troopId, ["ADMIN", "LEADER"])
    const isGlobalAdmin = isTroopAdminOrLeader
    const isLinkedParent = !!(await prisma.parentScout.findUnique({
        where: { parentId_scoutId: { parentId: session.user.id, scoutId } }
    }))

    if (!isGlobalAdmin && !isLinkedParent) return { error: "Unauthorized" }



    try {
        const scout = await prisma.scout.findUnique({ where: { id: scoutId } })
        if (!scout) return { error: "Scout not found" }
        if (!scout.email) return { error: "Scout has no email" }
        if (scout.userId) return { error: "Scout already has a user account" }

        const invitationToken = crypto.randomUUID()
        const invitationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000)

        // Find or Create User? Since user shouldn't exist as Scout needs dedicated user logic usually.
        // But what if the user ALREADY exists (e.g. parent email used for scout)? 
        // Scout users should have unique emails.

        const existingUser = await prisma.user.findUnique({ where: { email: (scout as any).email } })
        if (existingUser) return { error: "User with this email already exists" }

        await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: scout.email!,
                    name: scout.name,
                    // role is REMOVED from User model
                    invitationToken,
                    invitationExpires,
                }
            })

            await tx.troopMember.create({
                data: {
                    troopId: scout.troopId,
                    userId: newUser.id,
                    role: "SCOUT"
                }
            })

            await tx.scout.update({
                where: { id: scoutId },
                data: { userId: newUser.id }
            })
        })

        // Fetch Troop Settings for Email
        const troopSettings = await prisma.troopSettings.findFirst()
        const troopName = troopSettings?.name || "TroopTreasury"
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const inviteUrl = `${appUrl}/invite?token=${invitationToken}`

        console.log(`Sending invite to ${(scout as any).email} with url: ${inviteUrl}`)

        if (resend) {
            await resend.emails.send({
                from: 'TroopTreasury <onboarding@vpillai.online>',
                to: (scout as any).email,
                subject: `Welcome to ${troopName} - Complete Setup`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1>${troopName}</h1>
                        <p>Hello ${scout.name},</p>
                        <p>An account has been created for you on <strong>${troopName}</strong>.</p>
                        <p>Please click the link below to set your password and activate your account:</p>
                        <p style="margin: 20px 0;">
                            <a href="${inviteUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Accept Invitation & Set Password
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">This link will expire in 48 hours.</p>
                    </div>
                `
            })
        } else {
            console.error("Email service not configured - RESEND_API_KEY missing")
        }

        console.log(`Invite URL for ${scout.name}: ${inviteUrl}`)

        revalidatePath(`/dashboard/scouts/${scoutId}`)
        return { success: true, message: "User account created and invite sent" }

    } catch (error) {
        console.error("Invite Error:", error)
        return { error: "Failed to invite user" }
    }
}

export async function updateScoutEmail(scoutId: string, email: string, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get scout to find troopId for permission check
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true }
    })
    if (!scout) return { error: "Scout not found" }

    // Authorization: Admin/Leader OR Linked Parent
    const isTroopAdminOrLeader = await checkTroopPermission(session.user.id, scout.troopId, ["ADMIN", "LEADER"])
    const isGlobalAdmin = isTroopAdminOrLeader
    const isLinkedParent = !!(await prisma.parentScout.findUnique({
        where: { parentId_scoutId: { parentId: session.user.id, scoutId } }
    }))

    if (!isGlobalAdmin && !isLinkedParent) return { error: "Unauthorized" }



    try {
        await prisma.scout.update({
            where: { id: scoutId },
            data: { email }
        })
        revalidatePath(`/dashboard/scouts/${scoutId}`)
        return { success: true, message: "Email updated" }
    } catch (e) {
        return { error: "Failed to update email" }
    }
}

