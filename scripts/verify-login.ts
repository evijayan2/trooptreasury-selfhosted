import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.prod' })

const connectionString = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL
const email = 'system@trooptreasury.com'
const password = process.env.ADMIN_PASSWORD || 'TroopTreasury2026!' // Fallback for safety, but should be env

async function main() {
    console.log("=== Start Login Verification ===")
    console.log("Checking login for:", email)
    console.log("Connection string exists:", !!connectionString)
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
    console.log("Pool created")
    const client = await pool.connect()

    try {
        const res = await client.query('SELECT * FROM "User" WHERE email = $1', [email])
        if (res.rows.length === 0) {
            console.log("User NOT found")
            return
        }

        const user = res.rows[0]
        console.log("User found:", user.email)
        console.log("Has password hash:", !!user.passwordHash)

        if (user.passwordHash) {
            const match = await bcrypt.compare(password, user.passwordHash)
            console.log("Password match:", match)

            // Generate a NEW hash and compare it
            const newHash = await bcrypt.hash(password, 10)
            const matchNew = await bcrypt.compare(password, newHash)
            console.log("New hash match:", matchNew)

            console.log("Stored hash:", user.passwordHash)
            console.log("New hash example:", newHash)
        }

    } catch (e) {
        console.error("Error:", e)
    } finally {
        client.release()
        await pool.end()
    }
}

main()
