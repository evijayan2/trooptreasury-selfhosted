
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { DEFAULT_PERMISSIONS } from '../lib/rbac-shared'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Syncing permissions...')

    const settings = await prisma.troopSettings.findFirst()
    if (!settings) {
        console.log('❌ No settings found.')
        return
    }

    // Force update with new defaults
    // Note: This overwrites custom permissions if any!
    // But strictly adding the new one is safer.

    let currentPerms = settings.rolePermissions as any || DEFAULT_PERMISSIONS

    // Add MANAGE_FUNDRAISING to ADMIN and FINANCIER if missing
    if (!currentPerms.ADMIN.includes("MANAGE_FUNDRAISING")) {
        currentPerms.ADMIN.push("MANAGE_FUNDRAISING")
    }
    if (!currentPerms.FINANCIER.includes("MANAGE_FUNDRAISING")) {
        currentPerms.FINANCIER.push("MANAGE_FUNDRAISING")
    }

    await prisma.troopSettings.update({
        where: { id: settings.id },
        data: { rolePermissions: currentPerms }
    })

    console.log('✅ Permissions updated!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
