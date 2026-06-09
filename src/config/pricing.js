// Pricing — single source of truth for the /pricing page (P34).
//
// Two rails over the same endpoints:
//   - Humans  → Stripe, prepaid $20 blocks of API calls, stackable.
//   - Agents  → x402, per-query stablecoin micropayments, no signup.
//
// Tune any number here without touching JSX. Block sizes and the volume
// threshold are deliberately generous — per-call cost is a Worker hit and
// a Supabase read; the corpus is the product, not the compute.
//
// `checkoutEnabled` gates the block-purchase CTA. It stays false until:
//   1. a $20 "API call block" price exists in Stripe and its id is set as
//      STRIPE_PRICE_BLOCK on the Pages project, and
//   2. scry-server exposes POST /api/v1/keys/credit (see functions/api/
//      _scry-keys.js) so a paid block actually credits calls to a key.
// /api/checkout itself already sells blocks. Flip to true once 1 + 2 ship.

export const PRICING = {
  human: {
    blockPriceUsd: 20,
    callsPerBlock: 25000,
    volume: {
      // Cumulative spend that unlocks the volume rate. 100 = 5 blocks.
      thresholdUsd: 100,
      // Calls per $20 block once past the threshold — twice the base rate.
      callsPerBlock: 50000,
    },
    checkoutEnabled: true,
  },
  agent: {
    settlementAsset: 'USDC',
    // Per-query prices, USD. Endpoint complexity sets the price; this is
    // the agent rail only — the human block tier is flat (1 call = 1 call).
    queries: [
      { label: 'Domain / IP check',        priceUsd: 0.001 },
      { label: 'Supply-chain verification', priceUsd: 0.01 },
      { label: 'Full attestation receipt', priceUsd: 0.05 },
    ],
  },
}

// Calls credited for `blocks` newly-bought $20 blocks, given the buyer's
// prior lifetime spend in USD. Each block is rated by the cumulative spend
// at the moment it is bought: a block bought once cumulative spend has
// reached the volume threshold credits the volume rate, and that rate is
// permanent. A single multi-block purchase can therefore straddle the
// threshold — the blocks before it credit the base rate, the rest credit
// the volume rate. Pure function; imported by both the page and the
// Cloudflare Pages Functions, so the math has exactly one definition.
export function callsForPurchase(blocks, priorSpendUsd = 0) {
  const { blockPriceUsd, callsPerBlock, volume } = PRICING.human
  let calls = 0
  let spend = priorSpendUsd
  for (let i = 0; i < blocks; i++) {
    calls += spend >= volume.thresholdUsd ? volume.callsPerBlock : callsPerBlock
    spend += blockPriceUsd
  }
  return calls
}
