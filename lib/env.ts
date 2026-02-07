import { z } from "zod";

const envSchema = z.object({
  // Database - supports Vercel environment-specific URLs
  DATABASE_URL: z.string().url("Invalid DATABASE_URL format").optional(),
  PREVIEW_DATABASE_URL: z.string().url("Invalid PREVIEW_DATABASE_URL format").optional(),
  PROD_DATABASE_URL: z.string().url("Invalid PROD_DATABASE_URL format").optional(),

  // Authentication
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_TRUST_HOST: z.string().transform((val) => val === "true").optional(),

  // Application Settings
  NEXT_PUBLIC_IS_HOSTED: z.string().transform((val) => val === "true").optional(),

  // Web Push Notifications (VAPID)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1, "NEXT_PUBLIC_VAPID_PUBLIC_KEY is required"),
  VAPID_PRIVATE_KEY: z.string().min(1, "VAPID_PRIVATE_KEY is required").optional(),

  // Email Service
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required").optional(),
}).refine(
  (data) => data.DATABASE_URL || data.PREVIEW_DATABASE_URL || data.PROD_DATABASE_URL,
  {
    message: "At least one database URL must be provided (DATABASE_URL, PREVIEW_DATABASE_URL, or PROD_DATABASE_URL)",
  }
);

// Validate environment variables
export function validateEnv() {
  if (process.env.SKIP_ENV_VALIDATION === "true" || process.env.SKIP_ENV_VALIDATION === "1") {
    return process.env as any;
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment variables:");
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();