/**
 * Simple in-memory rate limiter for protecting sensitive endpoints
 * This is a basic implementation - for production, consider using Redis-based solution
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}

class RateLimiter {
    private attempts: Map<string, RateLimitEntry> = new Map()
    private cleanupInterval: NodeJS.Timeout

    constructor() {
        // Clean up old entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            const now = Date.now()
            for (const [key, entry] of this.attempts.entries()) {
                if (now > entry.resetTime) {
                    this.attempts.delete(key)
                }
            }
        }, 5 * 60 * 1000)
    }

    /**
     * Check if request should be rate limited
     * @param identifier - Unique identifier (e.g., email, IP address)
     * @param maxAttempts - Maximum attempts allowed in the window
     * @param windowMs - Time window in milliseconds
     * @returns true if rate limit exceeded, false otherwise
     */
    isRateLimited(identifier: string, maxAttempts: number, windowMs: number): boolean {
        const now = Date.now()
        const entry = this.attempts.get(identifier)

        if (!entry || now > entry.resetTime) {
            // First attempt or window expired
            this.attempts.set(identifier, {
                count: 1,
                resetTime: now + windowMs
            })
            return false
        }

        if (entry.count >= maxAttempts) {
            return true
        }

        entry.count++
        return false
    }

    /**
     * Reset rate limit for an identifier
     */
    reset(identifier: string): void {
        this.attempts.delete(identifier)
    }

    /**
     * Get remaining attempts
     */
    getRemaining(identifier: string, maxAttempts: number): number {
        const entry = this.attempts.get(identifier)
        if (!entry || Date.now() > entry.resetTime) {
            return maxAttempts
        }
        return Math.max(0, maxAttempts - entry.count)
    }

    /**
     * Get time until reset in seconds
     */
    getResetTime(identifier: string): number {
        const entry = this.attempts.get(identifier)
        if (!entry) return 0
        return Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000))
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()

// Rate limit configurations
export const RATE_LIMITS = {
    LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    USER_CREATION: { maxAttempts: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
    PASSWORD_RESET: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
} as const
