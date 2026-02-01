"use server"

import { prisma } from "@/lib/prisma"

export async function getSlugSuggestions(name: string, council: string, district?: string) {
    if (!name || !council) return []

    // Helper to get numbers only (e.g., "Troop 79" -> "79")
    const getNumbers = (str: string) => str.replace(/[^0-9]/g, '')

    // Helper to get initials (e.g., "Grand Canyon" -> "gc")
    const getInitials = (str: string) => str.split(/[\s-]+/).map(w => w[0]).join('').toLowerCase().substring(0, 3)

    // Helper to sanitize partial strings
    const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 6)

    const num = getNumbers(name) || sanitize(name).substring(0, 3) // "79" or "tro"
    const cInit = getInitials(council) // "gc"
    const dInit = district ? getInitials(district) : "" // "ld"

    let candidates: string[] = []

    // 1. Very short: t{number}{council_initials} -> "t79gc"
    if (num) {
        candidates.push(`t${num}${cInit}`)
        candidates.push(`t${num}-${cInit}`)
    }

    // 2. Short: {council_initials}{number} -> "gc79"
    if (num) {
        candidates.push(`${cInit}${num}`)
    }

    // 3. With District: t{number}{district_initials} -> "t79ld"
    if (num && dInit) {
        candidates.push(`t${num}${dInit}`)
    }

    // 4. Fallbacks if name has no numbers
    if (!getNumbers(name)) {
        candidates.push(`${sanitize(name)}${cInit}`)
        candidates.push(`${cInit}${sanitize(name)}`)
    }

    // Ensure all are < 10 chars (strict enforcement)
    // If a candidate is too long, we truncate it slightly or skip it
    candidates = candidates.map(c => c.substring(0, 10)).filter(c => c.length >= 3)

    // Remove duplicates
    candidates = Array.from(new Set(candidates))

    // Check availability
    console.log('Prisma client keys:', Object.keys(prisma))
    console.log('Checking if prisma.troop exists:', typeof prisma.troop)

    const existing = await prisma.troop.findMany({
        where: {
            slug: { in: candidates }
        },
        select: { slug: true }
    })

    const existingSlugs = new Set(existing.map(e => e.slug))
    const available = candidates.filter(c => !existingSlugs.has(c))

    // If ran out of short options, generate random short suffix
    if (available.length < 3) {
        const fallbackBase = `t${num || sanitize(name).substring(0, 3)}`.substring(0, 6)
        // Add random 2-digit number
        const random = Math.floor(10 + Math.random() * 90)
        const fallback = `${fallbackBase}${random}`
        if (!existingSlugs.has(fallback)) {
            available.push(fallback)
        }
    }

    return available.slice(0, 5)
}
