/**
 * Generate a stable anonymous fingerprint.
 * Hashed UA + language + timezone + screen resolution.
 * No IP (unavailable client-side) — server-side will augment.
 */
export async function generateFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
  ].join('|')

  try {
    const msgBuffer = new TextEncoder().encode(components)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
  } catch {
    // fallback: simple hash
    let hash = 0
    for (let i = 0; i < components.length; i++) {
      hash = ((hash << 5) - hash) + components.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}
