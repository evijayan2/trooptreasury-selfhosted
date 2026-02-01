import Stripe from "stripe";

export const getStripe = (): Stripe => {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey && process.env.NEXT_PUBLIC_IS_HOSTED === "true") {
        throw new Error("STRIPE_SECRET_KEY is missing but NEXT_PUBLIC_IS_HOSTED is true");
    }

    // Return a real Stripe instance (even if apiKey is empty, for type safety during build)
    // If apiKey is empty, real calls will fail at runtime, which is fine if we guard them
    return new Stripe(apiKey || "sk_test_mock", {
        apiVersion: "2024-12-18.acacia" as any, // Use any to avoid version mismatch issues during transition
    });
};
