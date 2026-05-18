// functions/api/_email.js — transactional email via Resend.
//
// Resend (resend.com) is the email transport: a small REST API, not a
// big-tech provider. Sending the API key once per signup is not a request
// hot path, so its free tier is fine here (cf. the no-free-tier-on-hot-path
// rule, which is about per-request quotas).
//
// Email is OPTIONAL. If RESEND_API_KEY is unset, sendKeyEmail() returns
// { ok:false, skipped:true } and the caller falls back to showing the key
// on the checkout success page. Underscore-prefixed: import-only.

function fromAddress(env) {
  return env.RESEND_FROM || 'TunnelMind <keys@tunnelmind.ai>'
}

/**
 * Email a freshly-issued Defender API key to the customer.
 * Returns { ok, skipped?, status?, error? }. Never throws.
 */
export async function sendKeyEmail(env, { to, key, prefix, tier }) {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return { ok: false, skipped: true }
  if (!to || !key) return { ok: false, error: 'missing_to_or_key' }

  const tierName = tier === 'team' ? 'Team' : 'Defender'
  const subject = `Your TunnelMind ${tierName} API key`
  const html = `
    <div style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:560px;margin:0 auto;color:#1e293b">
      <p style="font-size:14px;line-height:1.6">
        Thank you for subscribing to TunnelMind <strong>${tierName}</strong>.
        Your API key is below — it is shown once and cannot be recovered, so
        store it somewhere safe now.
      </p>
      <pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:6px;font-size:14px;overflow-wrap:anywhere;white-space:pre-wrap">${key}</pre>
      <p style="font-size:13px;line-height:1.6">
        Authenticate every request with the header
        <code>Authorization: Bearer ${key}</code>. The key unlocks the full
        corpus, complete campaign membership, bulk export, and unmetered
        access. It is tied to this subscription and is revoked if the
        subscription ends.
      </p>
      <p style="font-size:13px;line-height:1.6">
        Manage or cancel your subscription any time from the billing portal
        linked on your receipt. Lost the key or need it rotated? Reply to
        this email or write to support@tunnelmind.ai.
      </p>
      <p style="font-size:12px;color:#64748b">
        Key reference: ${prefix} · TunnelMind AI, LLC
      </p>
    </div>`

  let resp
  try {
    resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(env),
        to: [to],
        subject,
        html,
      }),
    })
  } catch {
    return { ok: false, error: 'resend_unreachable' }
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    return { ok: false, status: resp.status, error: detail.slice(0, 300) }
  }
  return { ok: true, status: resp.status }
}
