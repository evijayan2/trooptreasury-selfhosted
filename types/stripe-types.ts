export interface StripeCheckoutMetadata {
    action: "register_troop"
    pendingRegistrationId: string
    [key: string]: string
}

export type SubscriptionStatus =
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired"
    | "paused"

export type StripeWebhookEventType = 
    | "checkout.session.completed"
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "customer.subscription.trial_will_end"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed"
    | "customer.subscription.paused"
    | "customer.subscription.resumed"
