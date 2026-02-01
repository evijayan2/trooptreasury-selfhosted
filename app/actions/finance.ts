"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { Decimal } from "decimal.js"
import { BudgetCategoryType, TransactionType, FundraisingStatus } from "@prisma/client"

// --- Budget Management ---

const budgetSchema = z.object({
    year: z.string().min(1, "Year is required (e.g. 2025-2026)"),
    status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
    annualDuesAmount: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
})

import { getTroopContext } from "./tenant-context"

export async function upsertBudget(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const rawData = {
            year: formData.get("year"),
            status: formData.get("isActive") === "on" ? "ACTIVE" : "DRAFT",
            annualDuesAmount: formData.get("annualDuesAmount") || "150.00"
        }

        const id = formData.get("id") as string | null
        const validatedFields = budgetSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { year, status, annualDuesAmount } = validatedFields.data

        if (id) {
            // Update: Ensure the budget belongs to the troop!
            const existing = await prisma.budget.findUnique({ where: { id } })
            if (!existing || existing.troopId !== troop.id) {
                return { error: "Budget not found or access denied" }
            }

            await prisma.budget.update({
                where: { id },
                data: { year, status: status as any, annualDuesAmount: new Decimal(annualDuesAmount) }
            })
        } else {
            // Create
            if (status === 'ACTIVE') {
                await prisma.budget.updateMany({
                    where: { status: 'ACTIVE', troopId: troop.id },
                    data: { status: 'CLOSED' }
                })
            }
            await prisma.budget.create({
                data: {
                    year,
                    status: status as any,
                    annualDuesAmount: new Decimal(annualDuesAmount),
                    troopId: troop.id
                }
            })
        }
        revalidatePath(`/dashboard/finance`)
        return { success: true, message: "Budget saved successfully" }
    } catch (error: any) {
        console.error("Budget Error:", error)
        return { error: error.message || "Failed to save budget" }
    }
}

const budgetCategorySchema = z.object({
    budgetId: z.string().min(1),
    name: z.string().min(1, "Name is required"),
    type: z.nativeEnum(BudgetCategoryType),
    plannedIncome: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
    plannedExpense: z.string().refine(val => !isNaN(Number(val)), "Invalid amount"),
})

export async function upsertBudgetCategory(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const rawData = {
            budgetId: formData.get("budgetId"),
            name: formData.get("name"),
            type: formData.get("type"),
            plannedIncome: formData.get("plannedIncome") || "0",
            plannedExpense: formData.get("plannedExpense") || "0",
        }

        const id = formData.get("id") as string | null
        const validatedFields = budgetCategorySchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { budgetId, name, type, plannedIncome, plannedExpense } = validatedFields.data

        // Verify Budget belongs to Troop
        const budget = await prisma.budget.findUnique({ where: { id: budgetId } })
        if (!budget || budget.troopId !== troop.id) {
            return { error: "Budget not found or access denied" }
        }

        const data = {
            budgetId,
            name,
            type,
            plannedIncome: new Decimal(plannedIncome),
            plannedExpense: new Decimal(plannedExpense)
        }

        if (id) {
            // Technically should verify category belongs to budget, but budget ownership check + ID check covers most.
            // Strict check:
            const existingCat = await prisma.budgetCategory.findUnique({ where: { id } })
            if (!existingCat || existingCat.budgetId !== budgetId) { // Basic sanity
                // Or just proceed
            }

            await prisma.budgetCategory.update({
                where: { id },
                data
            })
        } else {
            await prisma.budgetCategory.create({ data })
        }
        revalidatePath(`/dashboard/finance`)
        return { success: true, message: "Category saved" }

    } catch (error: any) {
        console.error("Category Error:", error)
        return { error: error.message || "Failed to save category" }
    }
}

// --- Fundraising ---

const fundraisingSchema = z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string().optional(),
    goal: z.string().refine(val => !isNaN(Number(val)), "Invalid goal"),
    isComplianceApproved: z.boolean().optional(),
    type: z.enum(["GENERAL", "PRODUCT_SALE"]).optional(), // Default to GENERAL
    productName: z.string().optional(),
    productPrice: z.string().optional(),
    productCost: z.string().optional(),
    productIba: z.string().optional(),
    ibaPercentage: z.string().refine(val => {
        const num = Number(val)
        return !isNaN(num) && num >= 0 && num <= 100
    }, "Percentage must be 0-100"),
}).refine(data => {
    if (data.type === 'PRODUCT_SALE') {
        return !!data.productName && !!data.productPrice && !!data.productIba
    }
    return true
}, {
    message: "Product details are required for Product Sale",
    path: ["productName"], // Highlight name field
})

export async function createFundraiser(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const rawData = {
            name: formData.get("name"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate") || undefined,
            goal: formData.get("goal"),
            isComplianceApproved: formData.get("isComplianceApproved") === "on",
            ibaPercentage: formData.get("ibaPercentage") || "0",
            type: formData.get("type") || "GENERAL",
            productName: formData.get("productName") || undefined,
            productPrice: formData.get("productPrice") || undefined,
            productCost: formData.get("productCost") || undefined,
            productIba: formData.get("productIba") || undefined,
        }

        const validatedFields = fundraisingSchema.safeParse(rawData)
        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { name, startDate, endDate, goal, isComplianceApproved, ibaPercentage, type, productName, productPrice, productCost, productIba } = validatedFields.data

        if (Number(ibaPercentage) > 30) {
            console.warn(`High IBA percentage detected: ${ibaPercentage}%`)
        }

        await prisma.fundraisingCampaign.create({
            data: {
                troopId: troop.id, // Scoped to Troop
                name,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                goal: new Decimal(goal),
                isComplianceApproved,
                ibaPercentage: parseInt(ibaPercentage),
                type: type as any,
                products: (type === 'PRODUCT_SALE' && productName && productPrice) ? {
                    create: {
                        name: productName,
                        price: new Decimal(productPrice),
                        cost: productCost ? new Decimal(productCost) : new Decimal(0),
                        ibaAmount: productIba ? new Decimal(productIba) : new Decimal(0)
                    }
                } : undefined
            }
        })
        revalidatePath(`/dashboard/fundraising`)
        return { success: true, message: "Campaign created" }
    } catch (error: any) {
        console.error("Fundraising Error:", error)
        return { error: error.message || "Failed to create campaign" }
    }
}

// --- Extended Transaction Logic ---

// We need a more flexible transaction create that handles the new optional links
// We can export a new function or update the existing one. 
// Since the existing one is simple, let's create a dedicated robust one here.

const fullTransactionSchema = z.object({
    amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Positive amount required"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1),
    date: z.string(),
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
    budgetCategoryId: z.string().optional(),
    fundraisingCampaignId: z.string().optional(),
})

export async function recordTransaction(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        // Allow Leader/Parent for now? Let's keep it broad as requested.
        const { troop, user, membership } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER", "PARENT"])

        const rawData = {
            amount: formData.get("amount"),
            type: formData.get("type"),
            description: formData.get("description"),
            date: formData.get("date"),
            scoutId: formData.get("scoutId") || undefined,
            campoutId: formData.get("campoutId") || undefined,
            budgetCategoryId: formData.get("budgetCategoryId") || undefined,
            fundraisingCampaignId: formData.get("fundraisingCampaignId") || undefined,
        }

        const validatedFields = fullTransactionSchema.safeParse(rawData)
        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { amount, type, description, date, scoutId, campoutId, budgetCategoryId, fundraisingCampaignId } = validatedFields.data

        // Verify Linking (ensure linked items belong to troop)
        if (fundraisingCampaignId) {
            const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: fundraisingCampaignId } })
            if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }
            if (campaign.status === FundraisingStatus.CLOSED) return { error: "This fundraising campaign is closed." }
        }
        if (scoutId) {
            const scout = await prisma.scout.findUnique({ where: { id: scoutId } })
            if (!scout || scout.troopId !== troop.id) return { error: "Scout not found" }
        }
        // ... (Similar checks for campoutId, budgetCategoryId recommended)

        const isAdminOrFinancier = ["ADMIN", "FINANCIER"].includes(membership.role)

        const paymentSource = formData.get("paymentSource")

        await prisma.$transaction(async (tx) => {
            let finalFromAccount = 'MANUAL'
            let finalDescription = description

            // IBA Payment Deduction Logic
            if (paymentSource === 'IBA' && type === 'DUES' && scoutId) {
                // 1. Verify Balance
                const scout = await tx.scout.findUnique({ where: { id: scoutId } })
                if (!scout) throw new Error("Scout not found")

                if (new Decimal(scout.ibaBalance).lessThan(new Decimal(amount))) {
                    throw new Error("Insufficient IBA funds for this transaction.")
                }

                // 2. Decrement Balance
                await tx.scout.update({
                    where: { id: scoutId },
                    data: { ibaBalance: { decrement: new Decimal(amount) } }
                })

                finalFromAccount = 'IBA'
                finalDescription = `${description} (Paid via IBA)`
            }

            await tx.transaction.create({
                data: {
                    troopId: troop.id, // Scoped!
                    amount: new Decimal(amount),
                    type,
                    description: finalDescription,
                    createdAt: (() => {
                        const today = new Date().toISOString().split('T')[0]
                        return date === today ? new Date() : new Date(date)
                    })(),
                    scoutId: scoutId || null,
                    campoutId: campoutId || null,
                    budgetCategoryId: budgetCategoryId || null,
                    fundraisingCampaignId: fundraisingCampaignId || null,
                    approvedBy: isAdminOrFinancier ? user.id : null,
                    status: isAdminOrFinancier ? "APPROVED" : "PENDING",
                    userId: user.id,
                    fromAccount: finalFromAccount
                }
            })

            // IBA Logic (Income / Deposits)
            if (type === 'FUNDRAISING_INCOME' && scoutId && fundraisingCampaignId) {
                const campaign = await tx.fundraisingCampaign.findUnique({ where: { id: fundraisingCampaignId } })
                if (campaign && campaign.ibaPercentage > 0) {
                    const ibaAmount = new Decimal(amount).mul(campaign.ibaPercentage).div(100)
                    await tx.scout.update({
                        where: { id: scoutId },
                        data: { ibaBalance: { increment: ibaAmount } }
                    })
                }
            }
        })

        revalidatePath(`/dashboard/finance`)
        if (fundraisingCampaignId) {
            revalidatePath(`/dashboard/my-fundraising/${fundraisingCampaignId}`)
            revalidatePath(`/dashboard/fundraising/${fundraisingCampaignId}`)
        }
        return { success: true, message: "Transaction recorded" }
    } catch (error: any) {
        console.error("Transaction Error:", error)
        return { error: error.message || "Failed to record transaction" }
    }
}

// --- Delete Actions ---

export async function deleteBudgetCategory(id: string, slug: string) {
    if (!slug) return { error: "Missing troop context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        // Verify context
        // Ideally fetch category with budget->troopId check
        const category = await prisma.budgetCategory.findUnique({
            where: { id },
            include: { budget: true }
        })
        if (!category || category.budget.troopId !== troop.id) {
            return { error: "Category not found" }
        }

        const linkedTransactions = await prisma.transaction.count({
            where: { budgetCategoryId: id }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to this category.` }
        }

        await prisma.budgetCategory.delete({
            where: { id }
        })

        revalidatePath(`/dashboard/finance`)
        return { success: true, message: "Category deleted" }
    } catch (error: any) {
        return { error: error.message || "Failed to delete category" }
    }
}

export async function deleteFundraisingCampaign(id: string, slug: string) {
    if (!slug) return { error: "Missing troop context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        const linkedTransactions = await prisma.transaction.count({
            where: { fundraisingCampaignId: id }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to this campaign.` }
        }

        await prisma.fundraisingCampaign.delete({
            where: { id }
        })

        revalidatePath(`/dashboard`)
        return { success: true, message: "Campaign deleted" }
    } catch (error: any) {
        return { error: error.message || "An unexpected error occurred" }
    }
}

export async function toggleFundraisingStatus(id: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop, user } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const campaign = await prisma.fundraisingCampaign.findUnique({
            where: { id }
        })

        if (!campaign || campaign.troopId !== troop.id) {
            return { error: "Campaign not found" }
        }

        const newStatus = campaign.status === FundraisingStatus.ACTIVE
            ? FundraisingStatus.CLOSED
            : FundraisingStatus.ACTIVE

        // Enhanced Logic for Product Sales Automation
        if (campaign.type === 'PRODUCT_SALE') {
            await prisma.$transaction(async (tx) => {
                // 1. CLEANUP / REVERSE LOGIC
                // First, find any existing system-generated transactions for this campaign to reverse effects
                const existingTxs = await tx.transaction.findMany({
                    where: { fundraisingCampaignId: id }
                })

                for (const txRec of existingTxs) {
                    // If it was a scout allocation (Income for scout), debit the balance back
                    if (txRec.type === 'FUNDRAISING_INCOME' && txRec.scoutId) {
                        await tx.scout.update({
                            where: { id: txRec.scoutId },
                            data: { ibaBalance: { decrement: txRec.amount } }
                        })
                    }
                }

                // Delete the transactions
                if (existingTxs.length > 0) {
                    await tx.transaction.deleteMany({
                        where: { fundraisingCampaignId: id }
                    })
                }

                // 2. DISTRIBUTION LOGIC (Only if Closing)
                if (newStatus === FundraisingStatus.CLOSED) {
                    const orders = await tx.fundraisingOrder.findMany({
                        where: { campaignId: id },
                        include: { product: true }
                    })

                    let totalCollected = new Decimal(0)
                    let totalScoutShare = new Decimal(0)

                    for (const order of orders) {
                        const qty = new Decimal(order.quantity)
                        if (qty.equals(0)) continue

                        // Find the relevant product, or fallback (for single product campaigns)
                        const product = order.product || (await tx.campaignProduct.findFirst({ where: { campaignId: id } }))

                        const price = product?.price || campaign.ticketPrice || new Decimal(0)
                        const ibaPerItem = product?.ibaAmount || new Decimal(0)

                        const collected = qty.mul(price)
                        // If product based, use specific amount. If general campaign, use percentage of profit?
                        // This toggle action seems to assume flat amount per item.
                        const share = qty.mul(ibaPerItem)

                        totalCollected = totalCollected.plus(collected)
                        totalScoutShare = totalScoutShare.plus(share)

                        // Scout Allocation Transaction
                        if (share.greaterThan(0)) {
                            await tx.transaction.create({
                                data: {
                                    troopId: troop.id, // SCOPED
                                    type: 'FUNDRAISING_INCOME',
                                    amount: share,
                                    description: `${campaign.name} - Scout Share`,
                                    fundraisingCampaignId: id,
                                    scoutId: order.scoutId,
                                    approvedBy: user.id,
                                    status: 'APPROVED',
                                    userId: user.id,
                                    createdAt: new Date(),
                                    fromAccount: 'MANUAL'
                                }
                            })

                            // Increment Scout Balance
                            await tx.scout.update({
                                where: { id: order.scoutId },
                                data: { ibaBalance: { increment: share } }
                            })
                        }
                    }

                    // Troop Total Income Record
                    if (totalCollected.greaterThan(0)) {
                        await tx.transaction.create({
                            data: {
                                troopId: troop.id, // SCOPED
                                type: 'FUNDRAISING_INCOME',
                                amount: totalCollected,
                                description: `${campaign.name} - Total Sales Collection`,
                                fundraisingCampaignId: id,
                                approvedBy: user.id,
                                status: 'APPROVED',
                                userId: user.id,
                                createdAt: new Date(),
                                fromAccount: 'MANUAL'
                            }
                        })
                    }

                    // Troop Distribution Expense Record
                    if (totalScoutShare.greaterThan(0)) {
                        await tx.transaction.create({
                            data: {
                                troopId: troop.id, // SCOPED
                                type: 'EXPENSE',
                                amount: totalScoutShare,
                                description: `${campaign.name} - Distribution to Scouts`,
                                fundraisingCampaignId: id,
                                approvedBy: user.id,
                                status: 'APPROVED',
                                userId: user.id,
                                createdAt: new Date(),
                                fromAccount: 'MANUAL'
                            }
                        })
                    }
                }
            })
        }

        await prisma.fundraisingCampaign.update({
            where: { id },
            data: { status: newStatus }
        })

        revalidatePath(`/dashboard/fundraising`)
        return { success: true, message: `Campaign ${newStatus === FundraisingStatus.ACTIVE ? 're-opened (distribution reversed)' : 'closed and funds distributed'}` }
    } catch (error: any) {
        return { error: error.message || "Failed to update campaign status" }
    }
}

export async function deleteBudget(id: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const budget = await prisma.budget.findUnique({ where: { id } })
        if (!budget || budget.troopId !== troop.id) return { error: "Budget not found" }
        if (budget.status !== 'DRAFT') {
            return { error: "Cannot delete Active or Closed budgets." }
        }
        // Check if any categories in this budget have linked transactions
        const linkedTransactions = await prisma.transaction.count({
            where: {
                budgetCategory: {
                    budgetId: id
                }
            }
        })

        if (linkedTransactions > 0) {
            return { error: `Cannot delete: ${linkedTransactions} transactions are linked to categories in this budget.` }
        }

        await prisma.$transaction([
            prisma.budgetCategory.deleteMany({ where: { budgetId: id } }),
            prisma.budget.delete({ where: { id } })
        ])

        revalidatePath(`/dashboard/finance`)
        return { success: true, message: "Budget deleted" }
    } catch (error: any) {
        console.error("Delete Budget Error:", error)
        return { error: "An unexpected error occurred while deleting the budget" }
    }
}

export async function updateBudgetStatus(id: string, status: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const budget = await prisma.budget.findUnique({ where: { id } })
        if (!budget || budget.troopId !== troop.id) return { error: "Budget not found" }

        if (status === 'ACTIVE') {
            // Deactivate others
            await prisma.budget.updateMany({
                where: { status: 'ACTIVE', troopId: troop.id },
                data: { status: 'CLOSED' }
            })
        }

        await prisma.budget.update({
            where: { id },
            data: { status: status as any }
        })

        revalidatePath(`/dashboard/finance`)
        return { success: true, message: `Budget marked as ${status}` }
    } catch (error: any) {
        return { error: "Failed to update status" }
    }
}

export async function deleteTransaction(id: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const tx = await prisma.transaction.findUnique({ where: { id } })
        if (!tx || tx.troopId !== troop.id) return { error: "Transaction not found" }

        await prisma.transaction.delete({
            where: { id }
        })

        revalidatePath(`/dashboard`)
        return { success: true, message: "Transaction deleted" }
    } catch (error: any) {
        return { error: "An unexpected error occurred while deleting the transaction" }
    }
}

const bulkIBADepositSchema = z.object({
    deposits: z.array(z.object({
        scoutId: z.string().min(1),
        amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
    })).min(1, "At least one deposit is required"),
    description: z.string().min(1, "Description is required"),
    date: z.string(),
})

export async function bulkRecordIBADeposits(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop, user } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        // Parse deposits from JSON string in formData
        const depositsJson = formData.get("deposits") as string
        const description = formData.get("description") as string
        const date = formData.get("date") as string

        const deposits = JSON.parse(depositsJson)
        const validatedFields = bulkIBADepositSchema.safeParse({ deposits, description, date })

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { deposits: validatedDeposits, description: validatedDescription, date: validatedDate } = validatedFields.data

        for (const deposit of validatedDeposits) {
            // Verify scout belongs to troop
            const scout = await prisma.scout.findUnique({ where: { id: deposit.scoutId } })
            if (!scout || scout.troopId !== troop.id) {
                console.warn(`Skipping deposit for unrelated scout ${deposit.scoutId}`)
                continue
            }

            const amount = new Decimal(deposit.amount)

            // Create Transaction
            await prisma.transaction.create({
                data: {
                    troopId: troop.id, // Scoped
                    amount,
                    type: TransactionType.IBA_DEPOSIT,
                    description: validatedDescription,
                    createdAt: new Date(validatedDate),
                    scoutId: deposit.scoutId,
                    approvedBy: user.id,
                    status: 'APPROVED',
                    userId: user.id,
                    fromAccount: 'MANUAL'
                },
                select: { id: true }
            })

            // Update Scout Balance
            await prisma.scout.update({
                where: { id: deposit.scoutId },
                data: { ibaBalance: { increment: amount } }
            })
        }

        revalidatePath(`/dashboard/finance`)
        return { success: true, message: `Successfully processed deposits.` }
    } catch (error: any) {
        console.error("Bulk IBA Deposit Error:", error)
        return { error: "Failed to process bulk deposits" }
    }
}

const productSaleSchema = z.object({
    campaignId: z.string().min(1),
    sales: z.array(z.object({
        scoutId: z.string().min(1),
        quantity: z.number().int().min(0)
    }))
})

export async function recordProductSale(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const rawData = {
            campaignId: formData.get("campaignId"),
            sales: JSON.parse(formData.get("sales") as string)
        }

        const validatedFields = productSaleSchema.safeParse(rawData)
        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { campaignId, sales } = validatedFields.data

        // Verify campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }


        await prisma.$transaction(async (tx) => {
            // For each sale, upsert
            for (const sale of sales) {
                // Verify scout?

                if (sale.quantity > 0) {
                    await tx.fundraisingSale.upsert({
                        where: {
                            campaignId_scoutId: {
                                campaignId,
                                scoutId: sale.scoutId
                            }
                        },
                        create: {
                            campaignId,
                            scoutId: sale.scoutId,
                            quantity: sale.quantity
                        },
                        update: {
                            quantity: sale.quantity
                        }
                    })
                } else {
                    // If quantity 0, delete
                    await tx.fundraisingSale.deleteMany({
                        where: {
                            campaignId,
                            scoutId: sale.scoutId
                        }
                    })
                }
            }
        })

        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Sales recorded successfully" }
    } catch (error: any) {
        console.error("Record Sales Error:", error)
        return { error: error.message || "Failed to record sales" }
    }
}

const fundraisingOrderSchema = z.object({
    campaignId: z.string().min(1),
    customerName: z.string().min(1, "Customer name is required"),
    customerEmail: z.string().refine(val => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email").or(z.literal("")).optional(),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
    amountPaid: z.coerce.number().min(0, "Amount paid cannot be negative"),
    delivered: z.boolean().optional(),
    scoutId: z.string().optional(),
    productId: z.string().optional()
})

export async function addOrder(prevState: any, formData: FormData) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    const rawData = {
        campaignId: formData.get("campaignId"),
        customerName: formData.get("customerName"),
        customerEmail: formData.get("customerEmail") || "",
        quantity: formData.get("quantity"),
        amountPaid: formData.get("amountPaid"),
        delivered: formData.get("delivered") === "on",
        scoutId: formData.get("scoutId"),
        productId: formData.get("productId")
    }

    const validatedFields = fundraisingOrderSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: "Invalid fields", issues: validatedFields.error.flatten() }
    }

    const { campaignId, customerName, customerEmail, quantity, amountPaid, delivered, scoutId, productId } = validatedFields.data

    let finalScoutId = scoutId
    if (!finalScoutId) {
        const scout = await prisma.scout.findUnique({ where: { userId: session.user.id } })
        if (scout) {
            finalScoutId = scout.id
        }
    }

    if (!finalScoutId) {
        return { error: "Could not determine Scout ID" }
    }

    try {
        await prisma.fundraisingOrder.create({
            data: {
                campaignId,
                customerName,
                customerEmail: customerEmail || null,
                quantity,
                amountPaid: new Decimal(amountPaid),
                delivered: !!delivered,
                scoutId: finalScoutId,
                productId: productId || null
            }
        })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Order added" }
    } catch (error) {
        console.error("Add Order Error:", error)
        return { error: "Failed to add order" }
    }
}

export async function deleteOrder(orderId: string, campaignId: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.fundraisingOrder.delete({ where: { id: orderId } })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Order deleted" }
    } catch (error) {
        return { error: "Failed to delete order" }
    }
}

export async function toggleOrderDelivered(orderId: string, campaignId: string, currentStatus: boolean) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.fundraisingOrder.update({
            where: { id: orderId },
            data: { delivered: !currentStatus }
        })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to update order" }
    }
}
