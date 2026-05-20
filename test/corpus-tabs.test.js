import { describe, it, expect } from 'vitest'
import { parseMx, parseSpf, parseDmarc, parseDkim } from '../functions/api/corpus/mail/[domain].js'
import { trim as trimSubdomains } from '../functions/api/corpus/subdomains/[domain].js'
import { trimBgpview } from '../functions/api/corpus/asn/[host].js'

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

describe('asn/trimBgpview', () => {
  const RESP = {
    prefixes: [
      { prefix: '8.0.0.0/9',  asn: { asn: 15169, name: 'GOOGLE', country_code: 'US' } },
      { prefix: '8.8.8.0/24', asn: { asn: 15169, name: 'GOOGLE', description: 'Google LLC', country_code: 'US' } },
    ],
    rir_allocation: { rir: 'ARIN', country_code: 'US', prefix: '8.0.0.0/8' },
    abuse_contacts: [{ email: 'network-abuse@google.com' }],
  }
  it('picks the most-specific prefix', () => {
    const out = trimBgpview('8.8.8.8', RESP)
    expect(out).toMatchObject({
      ip: '8.8.8.8',
      asn: 15169,
      org: 'GOOGLE',
      prefix: '8.8.8.0/24',
      country: 'US',
      rir: 'ARIN',
      abuse: ['network-abuse@google.com'],
    })
  })
  it('falls back to RIR allocation when no announced prefix matches', () => {
    const out = trimBgpview('1.2.3.4', { prefixes: [], rir_allocation: { rir: 'APNIC', country_code: 'JP', prefix: '1.0.0.0/8' } })
    expect(out.asn).toBeNull()
    expect(out.org).toBe('APNIC')
    expect(out.prefix).toBe('1.0.0.0/8')
    expect(out.rir).toBe('APNIC')
  })
  it('handles null payload', () => {
    expect(trimBgpview('1.2.3.4', null)).toMatchObject({ ip: '1.2.3.4', asn: null, org: null, abuse: [] })
  })
})
