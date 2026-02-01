"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import AdmZip from "adm-zip"

// Helper to convert array of objects to CSV string
function toCSV(data: any[]) {
    if (!data || data.length === 0) return ""
    const header = Object.keys(data[0]).join(",")
    const rows = data.map(obj =>
        Object.values(obj).map(val => {
            if (val === null || val === undefined) return ""
            if (val instanceof Date) return val.toISOString()
            if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""') // Escape quotes
            return `"${String(val).replace(/"/g, '""')}"`
        }).join(",")
    )
    return [header, ...rows].join("\n")
}

export async function exportTroopData(troopSlug: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Check Permissions
    const troop = await prisma.troop.findUnique({
        where: { slug: troopSlug },
        include: { members: true }
    })

    if (!troop) throw new Error("Troop not found")

    const member = troop.members.find(m => m.userId === session.user?.id)
    if (!member || !["ADMIN", "FINANCIER"].includes(member.role)) {
        throw new Error("Forbidden")
    }

    // Fetch Data
    const [scouts, transactions, budgets, campaigns] = await Promise.all([
        prisma.scout.findMany({ where: { troopId: troop.id } }),
        prisma.transaction.findMany({ where: { troopId: troop.id } }),
        prisma.budget.findMany({ where: { troopId: troop.id }, include: { categories: true } }),
        prisma.fundraisingCampaign.findMany({ where: { troopId: troop.id } })
    ])

    // Create Zip
    const zip = new AdmZip()

    zip.addFile("scouts.csv", Buffer.from(toCSV(scouts)))
    zip.addFile("transactions.csv", Buffer.from(toCSV(transactions)))
    zip.addFile("budgets.csv", Buffer.from(toCSV(budgets))) // Note: nested categories might look ugly in JSON column
    zip.addFile("campaigns.csv", Buffer.from(toCSV(campaigns)))

    // Create Metadata
    const meta = {
        troopName: troop.name,
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email
    }
    zip.addFile("metadata.json", Buffer.from(JSON.stringify(meta, null, 2)))

    const buffer = zip.toBuffer()

    return {
        success: true,
        filename: `troop-export-${troopSlug}-${new Date().toISOString().split('T')[0]}.zip`,
        data: buffer.toString('base64')
    }
}
