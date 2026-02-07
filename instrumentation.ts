import type { NextConfig } from 'next'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron')
        const { runGlobalEventExpiry } = await import('./app/actions/scheduler')

        // Run every hour to check for expired events
        // "0 * * * *" = at minute 0 of every hour
        cron.schedule('0 * * * *', async () => {
            try {
                await runGlobalEventExpiry()
            } catch (err) {
                console.error('[Scheduler] Error in global event expiry job:', err)
            }
        })

        // Run immediately on server start to catch anything missed while down
        // (Optional, but good for self-hosted consistency)
        runGlobalEventExpiry().catch(err => console.error(err))
    }
}
