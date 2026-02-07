/**
 * Database Restore Script
 * Restores a database from a backup file
 * Usage: node scripts/restore-database.js <backup-file-path>
 */

import { execSync } from 'child_process'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })
config({ path: path.join(__dirname, '..', '.env') })

const DATABASE_URL = process.env.DATABASE_URL
const backupFilePath = process.argv[2]

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables')
    process.exit(1)
}

if (!backupFilePath) {
    console.error('❌ Please provide a backup file path')
    console.error('Usage: node scripts/restore-database.js <backup-file-path>')
    process.exit(1)
}

if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found: ${backupFilePath}`)
    process.exit(1)
}

// Parse database URL
const url = new URL(DATABASE_URL)
const dbName = url.pathname.slice(1)
const dbHost = url.hostname
const dbPort = url.port || '5432'
const dbUser = url.username
const dbPassword = url.password

console.log('🔄 Restoring database from backup...')
console.log(`Database: ${dbName}`)
console.log(`Backup file: ${backupFilePath}`)
console.log('')
console.log('⚠️  WARNING: This will DROP and recreate the database!')
console.log('⚠️  All current data will be lost!')
console.log('')

// For safety, require manual confirmation
console.log('Please confirm you want to proceed with the restore.')
console.log('To proceed, set the environment variable CONFIRM_RESTORE=yes')

if (process.env.CONFIRM_RESTORE !== 'yes') {
    console.log('❌ Restore cancelled. Set CONFIRM_RESTORE=yes to proceed.')
    process.exit(0)
}

try {
    const env = { ...process.env, PGPASSWORD: dbPassword }

    console.log('📋 Dropping existing database...')
    execSync(
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`,
        { env }
    )

    console.log('🔨 Creating new database...')
    execSync(
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName};"`,
        { env }
    )

    console.log('📥 Restoring data from backup...')
    execSync(
        `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFilePath}"`,
        { env, stdio: 'inherit' }
    )

    console.log('✅ Database restored successfully!')

} catch (error) {
    console.error('❌ Restore failed:', error.message)
    process.exit(1)
}
