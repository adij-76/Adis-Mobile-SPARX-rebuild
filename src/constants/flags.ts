/**
 * Feature flags.
 *
 * BILLING_ENABLED — payments are not yet backed by a real processor (Stripe),
 * so the card-entry / saved-cards / free-trial flows are QUARANTINED behind this
 * (audit C-M5 / F-M5): never collect card numbers into a dead form, never claim
 * a trial started. Flip on with EXPO_PUBLIC_BILLING_ENABLED=true once billing is
 * real.
 */
export const BILLING_ENABLED = process.env.EXPO_PUBLIC_BILLING_ENABLED === 'true';
