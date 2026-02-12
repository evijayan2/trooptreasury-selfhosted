import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.prod' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const connectionString = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL || process.env.PROD_POSTGRES_PRISMA_URL
console.log("Hard Resetting DB:", connectionString?.replace(/:([^:@]+)@/, ':****@'))

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })

async function main() {
    const client = await pool.connect()
    try {
        console.log("Dropping public schema...")
        await client.query('DROP SCHEMA public CASCADE')
        console.log("Recreating public schema...")
        await client.query('CREATE SCHEMA public')
        await client.query('GRANT ALL ON SCHEMA public TO public')
        console.log("Database schema reset successfully.")
    } catch (e) {
        console.error("Error during hard reset:", e)
    } finally {
        client.release()
        await pool.end()
    }
}

main()
