
'use server'

export async function getDbDiagnosticInfo() {
    const dbUrl = process.env.PREVIEW_DATABASE_URL || process.env.DATABASE_URL || "NOT SET";
    const host = dbUrl.split('@')[1]?.split('/')[0] || "Unknown Host";
    const env = process.env.VERCEL_ENV || "local";

    return {
        env,
        host: host.replace(/:[^:@]+@/, ':****@'), // Masking user/pass if any remained 
        timestamp: new Date().toISOString()
    };
}
