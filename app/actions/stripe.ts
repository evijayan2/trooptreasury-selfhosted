"use server"

import Stripe from "stripe"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

import { getStripe } from "@/lib/stripe"

// Remove local initialization


const PRICE_ID = process.env.STRIPE_PRICE_ID

export async function createCheckoutSession({
    pendingRegistrationId,
    email,
    troopName,
    promoCode
}: {
    pendingRegistrationId: string,
    email: string,
    troopName: string,
    promoCode?: string
}) {
    const stripe = getStripe()
    const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    let appliedPromoCodeId: string | undefined

    if (promoCode) {
        try {
            const results = await stripe.promotionCodes.list({
                code: promoCode,
                active: true,
                limit: 1
            })
            if (results.data.length > 0) {
                appliedPromoCodeId = results.data[0].id
            }
        } catch (e) {
            console.error("Failed to resolve promo code:", e)
        }
    }

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
        customer_email: email,
        client_reference_id: pendingRegistrationId,
        line_items: [
            {
                price: PRICE_ID || "price_fake_id_for_dev",
                quantity: 1,
            },
        ],
        mode: 'subscription',
        discounts: appliedPromoCodeId ? [{
            promotion_code: appliedPromoCodeId
        }] : undefined,
        subscription_data: {
            trial_period_days: 15,
            metadata: {
                pendingRegistrationId // Also on subscription for easy access
            }
        },
        payment_method_collection: 'if_required', // Collect payment method only if amount due > 0
        allow_promotion_codes: true,
        success_url: `${origin}/register/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/register?canceled=true`,
        metadata: {
            action: 'register_troop',
            pendingRegistrationId,
            troopName
        },
    })


    // Return the URL to the caller (register-troop action) so it can handle the redirect
    // This avoids "NEXT_REDIRECT" error when called inside a try/catch block
    return session.url
}

export async function getCheckoutSession(sessionId: string) {
    const stripe = getStripe()
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'subscription.plan.product']
        })
        return session
    } catch (e) {
        console.error("Failed to fetch session:", e)
        return null
    }
}




export async function createPortalSession(troopId: string) {
    const stripe = getStripe()
    const origin = (await headers()).get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const troop = await prisma.troop.findUnique({
        where: { id: troopId },
        include: { subscription: true }
    })

    if (!troop?.subscription?.stripeCustomerId) {
        throw new Error("No subscription found for this troop")
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: troop.subscription.stripeCustomerId,
        return_url: `${origin}/dashboard/admin/billing`,
    })

    if (session.url) {
        redirect(session.url)
    }
}

export async function getUpcomingInvoice(customerId: string) {
    const stripe = getStripe()
    try {
        // Since retrieveUpcoming is having issues at runtime, we'll get the most recent invoice
        // as a fallback to show billing history/info
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: 1,
        })
        return JSON.parse(JSON.stringify(invoices.data[0] || null))
    } catch (e: any) {
        console.error("Failed to fetch invoices:", e)
        return null
    }
}

