// functions/api/_blocks.js — block-purchase math shared by the Stripe
// webhook and the checkout success page. Underscore-prefixed: import-only.
//
// `callsForPurchase` is imported from the frontend pricing config so the
// block sizes and the volume threshold have exactly one definition.

import { PRICING, callsForPurchase } from '../../src/config/pricing.js'

export { callsForPurchase }

// How many $20 blocks a completed Checkout Session bought. amount_subtotal
// is the pre-discount total in cents; promotion codes are disabled on
// block checkouts (see checkout.js), so subtotal == total == blocks × $20.
export function blocksFromSession(session) {
  const unitCents = PRICING.human.blockPriceUsd * 100
  const subtotal = Number(session?.amount_subtotal ?? session?.amount_total ?? 0)
  if (!Number.isFinite(subtotal) || subtotal < unitCents) return 0
  return Math.round(subtotal / unitCents)
}

// A buyer's lifetime spend in USD BEFORE the current purchase. Sums every
// succeeded charge on the Stripe customer (the current one included, since
// the webhook fires post-charge) and subtracts this session's total.
//
// v1 limitation: a single page of 100 charges. A customer with >100 paid
// charges would under-count prior spend — acceptable while volume is low;
// revisit with pagination before that is realistic.
export async function priorSpendUsd(stripeSecret, customerId, thisSessionTotalCents) {
  if (!stripeSecret || !customerId) return 0
  try {
    const resp = await fetch(
      `https://api.stripe.com/v1/charges?customer=${encodeURIComponent(customerId)}&limit=100`,
      { headers: { Authorization: `Bearer ${stripeSecret}` } }
    )
    const data = await resp.json().catch(() => null)
    if (!resp.ok || !data || !Array.isArray(data.data)) return 0

    const totalCents = data.data
      .filter(c => c && c.paid && c.status === 'succeeded')
      .reduce(
        (sum, c) =>
          sum + Number(c.amount_captured ?? c.amount ?? 0) - Number(c.amount_refunded ?? 0),
        0
      )
    const prior = totalCents - Number(thisSessionTotalCents || 0)
    return Math.max(0, prior) / 100
  } catch {
    return 0
  }
}
