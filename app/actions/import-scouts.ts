"use server"

import { prisma } from "@/lib/prisma"
import { Decimal } from "decimal.js"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const scoutImportSchema = z.object({
    name: z.string().min(1),
    balance: z.number().optional(),
    email: z.string().refine(val => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email").optional().or(z.literal("")),
})

import { getTroopContext } from "./tenant-context"

export async function importScouts(prevState: any, formData: FormData) {
    const slug = "troop-1"
    const file = formData.get("file") as File

    if (!slug) return { error: "Missing troop context" }
    if (!file) return { error: "No file provided" }

    let troop;
    try {
        const context = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])
        troop = context.troop
    } catch (e: any) {
        return { error: e.message }
    }

    const text = await file.text()
    const lines = text.split(/\r?\n/)

    // Basic CSV parsing
    // Check if first line is likely a header
    const firstLineLower = lines[0].toLowerCase().trim()
    const headerKeywords = ["name", "scout", "scout name", "full name"]
    // It's a header if it strictly equals one of the keywords OR starts with "keyword," (indicating multiple columns)
    const isHeader = headerKeywords.some(k => firstLineLower === k || firstLineLower.startsWith(k + ","))
    const startIndex = isHeader ? 1 : 0

    let createdCount = 0
    let updatedCount = 0
    let errors: string[] = []

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(",")
        if (parts.length < 1) continue

        const name = parts[0].trim()
        const balanceStr = parts[1]?.trim()
        const email = parts[2]?.trim()

        // Validate
        const dataToValidate = {
            name,
            balance: balanceStr ? parseFloat(balanceStr) : 0,
            email: email || "",
        }

        const validation = scoutImportSchema.safeParse(dataToValidate)

        if (!validation.success) {
            errors.push(`Row ${i + 1}: Invalid data for ${name || "Unknown"}`)
            continue
        }

        try {
            const { name, balance, email } = validation.data
            const ibaBalance = new Decimal(balance || 0)

            // 1. Check if Scout exists
            let existingScout = null

            // Check by Email first if provided (Global check, but ensure troop match)
            if (email) {
                const foundByEmail = await prisma.scout.findUnique({
                    where: { email }
                })
                if (foundByEmail) {
                    if (foundByEmail.troopId === troop.id) {
                        existingScout = foundByEmail
                    } else {
                        // Email exists in another troop
                        throw new Error("Email already registered in another troop")
                    }
                }
            }

            // If not found by email, check by Name within THIS TROOP only
            if (!existingScout) {
                existingScout = await prisma.scout.findFirst({
                    where: {
                        troopId: troop.id,
                        name: {
                            equals: name,
                            mode: 'insensitive' // Postgres only
                        }
                    }
                })
            }

            if (existingScout) {
                // UPDATE
                await prisma.scout.update({
                    where: { id: existingScout.id },
                    data: {
                        ibaBalance: ibaBalance,
                        email: (email && !existingScout.email) ? email : undefined,
                        status: 'ACTIVE'
                    }
                })
                updatedCount++
            } else {
                // CREATE
                await prisma.scout.create({
                    data: {
                        troopId: troop.id, // CRITICAL FIX
                        name: name,
                        status: 'ACTIVE',
                        ibaBalance: ibaBalance,
                        // @ts-ignore
                        email: email || null
                    }
                })
                createdCount++
            }

        } catch (e: any) {
            console.error(`Import Error Row ${i + 1}:`, e)
            errors.push(`Row ${i + 1}: Failed to save ${name} - ${e.message}`)
        }
    }

    revalidatePath(`/dashboard/scouts`)

    const messages = []
    if (createdCount > 0) messages.push(`${createdCount} newly added`)
    if (updatedCount > 0) messages.push(`${updatedCount} already exists`)

    if (messages.length === 0) {
        return {
            success: true,
            count: 0,
            errors: errors.length > 0 ? errors : undefined,
            message: `No scouts imported.${errors.length > 0 ? ` ${errors.length} failed.` : ""}`
        }
    }

    const successMessage = `Import complete: ${messages.join(", ")}.`

    return {
        success: true,
        count: createdCount + updatedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${successMessage}${errors.length > 0 ? ` ${errors.length} failed.` : ""}`
    }
}
