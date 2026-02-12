import 'dotenv/config'
import { prisma } from "../lib/prisma"

async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log(`Database accessible. User count: ${userCount}`);
    } catch (e) {
        console.error("Database connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
