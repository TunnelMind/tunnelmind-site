// ip.js — zero-dep IPv4 + IPv6 primitive (SPA / client side).
//
// MIRROR: byte-for-byte logic-identical to functions/api/corpus/_ip.js and
// tunnelmind-data-api api/utils/ip.js. Kept as separate copies because the
// Functions bundle (wrangler/esbuild) and the Vite SPA bundle are distinct
// build contexts; if you change one, change all three. Pure, dependency-free.
//
// Replaces the prior weak `/^[0-9a-f:]+$/` sniff (which accepted `:::` and
// rejected v4-mapped `::ffff:1.2.3.4`). Out of scope: zone IDs, CIDR, ports.

/** Validate + split an IPv4 string into four octet numbers, or null. */
export function parseIpv4(raw) {
  if (typeof raw !== 'string') return null
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(raw.trim())
  if (!m) return null
  const octets = m.slice(1, 5).map(Number)
  for (let i = 0; i < 4; i++) {
    if (octets[i] > 255) return null
    if (m[i + 1].length > 1 && m[i + 1][0] === '0') return null
  }
  return octets
}

/**
 * Validate + parse an IPv6 string into eight 16-bit groups. Handles `::`
 * compression (at most once) and a trailing dotted-quad (v4-mapped). Returns
 * null for anything malformed.
 */
export function parseIpv6(raw) {
  if (typeof raw !== 'string') return null
  let s = raw.trim().toLowerCase()
  if (!s || s.indexOf(':') === -1) return null
  if (/[^0-9a-f:.]/.test(s)) return null
  if ((s.match(/::/g) || []).length > 1) return null
  if (/:::/.test(s)) return null

  let v4mapped = false
  const lastColon = s.lastIndexOf(':')
  const tail = s.slice(lastColon + 1)
  let tailGroups = []
  if (tail.indexOf('.') !== -1) {
    const v4 = parseIpv4(tail)
    if (!v4) return null
    v4mapped = true
    tailGroups = [(v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]]
    s = s.slice(0, lastColon + 1)
  }

  const hasCompression = s.indexOf('::') !== -1
  let head, tailPart
  if (hasCompression) {
    const [h, t] = s.split('::')
    head = h ? h.split(':') : []
    tailPart = t ? t.split(':').filter((x) => x !== '') : []
  } else {
    head = s.replace(/:$/, '').split(':')
    tailPart = []
  }

  const hexGroups = []
  for (const part of [...head, ...tailPart]) {
    if (part === '') return null
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null
    hexGroups.push(parseInt(part, 16))
  }

  const explicit = hexGroups.length + tailGroups.length
  let groups
  if (hasCompression) {
    const headLen = head.filter((x) => x !== '').length
    const fill = 8 - explicit
    if (fill < 1) return null
    const headVals = hexGroups.slice(0, headLen)
    const tailVals = hexGroups.slice(headLen)
    groups = [...headVals, ...new Array(fill).fill(0), ...tailVals, ...tailGroups]
  } else {
    if (explicit !== 8) return null
    groups = [...hexGroups, ...tailGroups]
  }
  if (groups.length !== 8) return null

  return { groups, canonical: canonicalizeGroups(groups), v4mapped }
}

/** RFC 5952 canonical text form for eight groups. */
function canonicalizeGroups(groups) {
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0
  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (curStart === -1) curStart = i
      curLen++
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart }
    } else {
      curStart = -1; curLen = 0
    }
  }
  const hex = groups.map((g) => g.toString(16))
  if (bestLen < 2) return hex.join(':')
  const before = hex.slice(0, bestStart).join(':')
  const after = hex.slice(bestStart + bestLen).join(':')
  return `${before}::${after}`
}

/** 4, 6, or null. The cheap validity gate. */
export function ipVersion(s) {
  if (typeof s !== 'string') return null
  if (parseIpv4(s)) return 4
  if (parseIpv6(s)) return 6
  return null
}

/** Canonical text form: IPv4 unchanged, IPv6 → RFC 5952, else null. */
export function canonicalizeIp(s) {
  const v4 = parseIpv4(s)
  if (v4) return v4.join('.')
  const v6 = parseIpv6(s)
  return v6 ? v6.canonical : null
}
