const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const settings = await prisma.troopSettings.findFirst()
    console.log('Settings found:', !!settings)
    if (settings) {
        console.log('Has logoBase64:', !!settings.logoBase64)
        if (settings.logoBase64) {
            console.log('Logo length:', settings.logoBase64.length)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
