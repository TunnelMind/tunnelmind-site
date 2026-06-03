import { describe, it, expect } from 'vitest'
import { parseMx, parseSpf, parseDmarc, parseDkim } from '../functions/api/corpus/mail/[domain].js'
import { trim as trimSubdomains } from '../functions/api/corpus/subdomains/[domain].js'
import { trimRipe, mergeRows } from '../functions/api/corpus/asn/[host].js'

describe('mail/parseMx', () => {
  it('extracts preference + host', () => {
    expect(parseMx({ Answer: [{ data: '10 mail.example.com.' }] })).toEqual([
      { preference: 10, host: 'mail.example.com' },
    ])
  })
  it('handles no Answer / no MX', () => {
    expect(parseMx(null)).toEqual([])
    expect(parseMx({})).toEqual([])
    expect(parseMx({ Answer: [{ data: 'garbage' }] })).toEqual([])
  })
})

describe('mail/parseSpf', () => {
  it('classifies hard-fail, soft-fail, neutral, pass-all', () => {
    const wrap = (rec) => ({ Answer: [{ data: '"' + rec + '"' }] })
    expect(parseSpf(wrap('v=spf1 include:_spf.google.com -all'))).toMatchObject({ present: true, policy: 'hard-fail' })
    expect(parseSpf(wrap('v=spf1 a mx ~all'))).toMatchObject({ present: true, policy: 'soft-fail' })
    expect(parseSpf(wrap('v=spf1 ?all'))).toMatchObject({ present: true, policy: 'neutral' })
    expect(parseSpf(wrap('v=spf1 +all'))).toMatchObject({ present: true, policy: 'pass-all' })
  })
  it('returns present:false on missing record', () => {
    expect(parseSpf({ Answer: [{ data: '"v=DKIM1; p=..."' }] })).toEqual({ present: false, policy: null, record: null })
    expect(parseSpf(null)).toEqual({ present: false, policy: null, record: null })
  })
})

describe('mail/parseDmarc', () => {
  it('reads the p= tag', () => {
    expect(parseDmarc({ Answer: [{ data: '"v=DMARC1; p=reject; rua=mailto:r@x.com"' }] })).toMatchObject({
      present: true,
      policy: 'reject',
    })
    expect(parseDmarc({ Answer: [{ data: '"v=DMARC1; p=quarantine"' }] })).toMatchObject({ policy: 'quarantine' })
    expect(parseDmarc({ Answer: [{ data: '"v=DMARC1; p=none"' }] })).toMatchObject({ policy: 'none' })
  })
  it('handles missing or unrelated TXT records', () => {
    expect(parseDmarc({ Answer: [{ data: '"unrelated"' }] })).toEqual({ present: false, policy: null, record: null })
    expect(parseDmarc(null)).toEqual({ present: false, policy: null, record: null })
  })
})

describe('mail/parseDkim', () => {
  it('reports which selectors had records', () => {
    const sels = ['default', 'google', 'k1']
    const results = [
      { Answer: [{ data: '"v=DKIM1; p=ABC"' }] }, // default hits
      { Answer: [] },                              // google empty
      null,                                        // k1 lookup failed
    ]
    expect(parseDkim(sels, results)).toEqual({ present: true, selectors_found: ['default'] })
  })
  it('returns present:false when nothing hits', () => {
    expect(parseDkim(['a', 'b'], [null, { Answer: [] }])).toEqual({ present: false, selectors_found: [] })
  })
})

describe('subdomains trim', () => {
  it('extracts unique subdomain names, strips wildcards, drops the apex', () => {
    const arr = [
      { name_value: 'www.example.com\nexample.com' },
      { name_value: '*.api.example.com' },
      { name_value: 'api.example.com\nwww.example.com' },
      { name_value: 'other.com' },              // wrong suffix, dropped
      { name_value: 'staging.example.com' },
    ]
    const out = trimSubdomains(arr, 'example.com')
    // 3 unique: api (the *.api wildcard collapses into the bare api),
    // staging, www. The apex example.com is excluded; other.com is
    // wrong-suffix and dropped.
    expect(out.total).toBe(3)
    expect(out.subdomains).toEqual([
      'api.example.com',
      'staging.example.com',
      'www.example.com',
    ])
    expect(out.subdomains.includes('other.com')).toBe(false)
    expect(out.subdomains.includes('example.com')).toBe(false)
  })
  it('caps shown to 200', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ name_value: `sub${i}.example.com` }))
    const out = trimSubdomains(many, 'example.com')
    expect(out.total).toBe(300)
    expect(out.shown).toBe(200)
    expect(out.subdomains.length).toBe(200)
  })
})

describe('asn/trimRipe', () => {
  // Shapes mirror the RIPEstat data-call payloads (the `.data` body).
  const PARTS = {
    ni:    { asns: ['213373'], prefix: '45.141.56.0/24' },
    abuse: { abuse_contacts: ['abuse@ipconnect.example', 'noc@ipconnect.example'] },
    rir:   { rirs: [{ rir: 'RIPE NCC' }] },
    over:  { holder: 'IPCONNECT IP Connect Inc', announced: true },
  }
  it('assembles a routing row from the four data calls', () => {
    expect(trimRipe('45.141.56.49', PARTS)).toEqual({
      ip: '45.141.56.49',
      asn: '213373',
      org: 'IPCONNECT IP Connect Inc',
      prefix: '45.141.56.0/24',
      country: null,
      rir: 'RIPE NCC',
      abuse: ['abuse@ipconnect.example', 'noc@ipconnect.example'],
      announced: true,
    })
  })
  it('surfaces a not-announced prefix', () => {
    const out = trimRipe('1.2.3.4', { ni: { asns: ['64500'], prefix: '1.2.3.0/24' }, over: { holder: 'X', announced: false } })
    expect(out.announced).toBe(false)
    expect(out.asn).toBe('64500')
  })
  it('degrades gracefully when calls are missing', () => {
    expect(trimRipe('1.2.3.4', {})).toEqual({
      ip: '1.2.3.4', asn: null, org: null, prefix: null,
      country: null, rir: null, abuse: [], announced: null,
    })
  })
})

describe('asn/mergeRows', () => {
  const scry = { asn: '213373', org: 'IPCONNECT', country: 'AT' }
  const ripe = { asn: '213373', org: 'IPCONNECT IP Connect Inc', prefix: '45.141.56.0/24', rir: 'RIPE NCC', abuse: ['abuse@x'], announced: true }
  it('prefers our iptoasn view for asn/org/country, RIPEstat for routing', () => {
    expect(mergeRows('45.141.56.49', scry, ripe)).toEqual({
      ip: '45.141.56.49',
      asn: '213373',
      org: 'IPCONNECT',          // scry wins
      country: 'AT',             // scry-only
      prefix: '45.141.56.0/24',  // RIPEstat-only
      rir: 'RIPE NCC',
      abuse: ['abuse@x'],
      announced: true,
    })
  })
  it('falls back to RIPEstat holder when scry has no org', () => {
    const out = mergeRows('45.141.56.49', null, ripe)
    expect(out.org).toBe('IPCONNECT IP Connect Inc')
    expect(out.country).toBeNull()
  })
  it('tolerates both sources failing', () => {
    expect(mergeRows('1.2.3.4', null, null)).toEqual({
      ip: '1.2.3.4', asn: null, org: null, country: null,
      prefix: null, rir: null, abuse: [], announced: null,
    })
  })
})
