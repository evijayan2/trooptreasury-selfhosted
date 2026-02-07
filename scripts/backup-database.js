/**
 * Database Backup Script
 * Creates a timestamped backup of the PostgreSQL database
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

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables')
    process.exit(1)
}

// Parse database URL
const url = new URL(DATABASE_URL)
const dbName = url.pathname.slice(1)
const dbHost = url.hostname
const dbPort = url.port || '5432'
const dbUser = url.username
const dbPassword = url.password

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, '..', 'backups')
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
}

// Generate timestamp for backup file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
const backupFile = path.join(backupsDir, `${dbName}_${timestamp}.sql`)

console.log('📦 Creating database backup...')
console.log(`Database: ${dbName}`)
console.log(`Backup file: ${backupFile}`)

try {
    // Set password environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: dbPassword }

    // Run pg_dump
    execSync(
        `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFile}"`,
        { env, stdio: 'inherit' }
    )

    console.log('✅ Backup created successfully!')
    console.log(`📁 Location: ${backupFile}`)

    // Show file size
    const stats = fs.statSync(backupFile)
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log(`📊 Size: ${fileSizeMB} MB`)

} catch (error) {
    console.error('❌ Backup failed:', error.message)
    process.exit(1)
}
