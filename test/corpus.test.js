import { describe, it, expect } from 'vitest'
import { normalizeDomain, normalizeIp, normalizeHost } from '../functions/api/corpus/_lib.js'
import { trim as trimRdapDomain, vcard } from '../functions/api/corpus/rdap-domain/[domain].js'
import { trim as trimDns } from '../functions/api/corpus/dns/[name].js'
import { trim as trimCert } from '../functions/api/corpus/cert/[domain].js'
import { trim as trimTracker } from '../functions/api/corpus/tracker/[domain].js'
import { trimUrlhaus, trimScryCheck } from '../functions/api/corpus/reputation/[host].js'

// These trims sit on a CSP that forces every external lookup through
// our own edge — getting the shape right matters more than any other
// untyped boundary in the codebase.

describe('corpus/_lib normalizers', () => {
  it('accepts valid domains and IPs, lowercases / strips trailing dot', () => {
    expect(normalizeDomain('Example.COM.')).toBe('example.com')
    expect(normalizeDomain('a.b.example.co.uk')).toBe('a.b.example.co.uk')
    expect(normalizeIp('1.2.3.4')).toBe('1.2.3.4')
    expect(normalizeIp('2606:4700:4700::1111')).toBe('2606:4700:4700::1111')
    expect(normalizeHost('Example.com')).toBe('example.com')
    expect(normalizeHost('8.8.8.8')).toBe('8.8.8.8')
  })

  it('rejects obvious garbage and SSRF-shaped input', () => {
    expect(normalizeDomain('http://example.com/path')).toBeNull()
    expect(normalizeDomain('example')).toBeNull()
    expect(normalizeDomain('-bad.example.com')).toBeNull()
    expect(normalizeDomain('a'.repeat(254) + '.com')).toBeNull()
    expect(normalizeIp('999.999.999.999')).toBeNull()
    expect(normalizeIp('1.2.3.4:80')).toBeNull()
    expect(normalizeHost('')).toBeNull()
    expect(normalizeHost(null)).toBeNull()
  })
})

describe('rdap-domain trim', () => {
  const SAMPLE = {
    ldhName: 'example.com',
    handle: '1-EXAMPLE',
    status: ['client transfer prohibited', 'server transfer prohibited'],
    events: [
      { eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' },
      { eventAction: 'last changed', eventDate: '2024-08-14T07:01:38Z' },
      { eventAction: 'expiration',  eventDate: '2025-08-13T04:00:00Z' },
    ],
    nameservers: [
      { ldhName: 'A.IANA-SERVERS.NET' },
      { ldhName: 'B.IANA-SERVERS.NET' },
    ],
    secureDNS: { delegationSigned: true },
    entities: [
      {
        roles: ['registrar'],
        handle: 'TEST-REG',
        vcardArray: ['vcard', [['fn', {}, 'text', 'Test Registrar Inc.']]],
        publicIds: [{ type: 'IANA Registrar ID', identifier: '376' }],
      },
      {
        roles: ['registrant'],
        vcardArray: ['vcard', [
          ['fn', {}, 'text', 'IANA Reservations'],
          ['org', {}, 'text', 'Internet Assigned Numbers Authority'],
        ]],
        entities: [{
          roles: ['abuse'],
          vcardArray: ['vcard', [['email', {}, 'text', 'abuse@example.com']]],
        }],
      },
    ],
  }

  it('pulls the fields the inspector renders', () => {
    const out = trimRdapDomain(SAMPLE, 'example.com')
    expect(out.domain).toBe('example.com')
    expect(out.registrar).toBe('Test Registrar Inc.')
    expect(out.registrar_iana).toBe('376')
    expect(out.registrant_org).toBe('Internet Assigned Numbers Authority')
    expect(out.abuse).toBe('abuse@example.com')
    expect(out.nameservers).toEqual(['a.iana-servers.net', 'b.iana-servers.net'])
    expect(out.registered).toBe('1995-08-14T04:00:00Z')
    expect(out.expires).toBe('2025-08-13T04:00:00Z')
    expect(out.secure_dns).toBe(true)
    expect(out.status).toContain('client transfer prohibited')
  })

  it('vcard extracts fn / email / org without crashing on garbage', () => {
    expect(vcard(null)).toEqual({})
    expect(vcard(['nope'])).toEqual({})
    expect(vcard(['vcard', [['fn', {}, 'text', 'X']]])).toEqual({ fn: 'X' })
  })
})

describe('dns trim', () => {
  it('flattens DoH Answer arrays into {value, ttl} per type', () => {
    const a = trimDns({ Answer: [
      { name: 'example.com', type: 1, TTL: 300, data: '93.184.216.34' },
    ] }, 'A')
    expect(a).toEqual({ type: 'A', values: [{ value: '93.184.216.34', ttl: 300 }] })

    const mx = trimDns({ Answer: [
      { name: 'example.com', type: 15, TTL: 3600, data: '10 mail.example.com.' },
    ] }, 'MX')
    expect(mx.values[0].value).toBe('10 mail.example.com')

    const txt = trimDns({ Answer: [
      { name: 'example.com', type: 16, TTL: 60, data: '"v=spf1 -all"' },
    ] }, 'TXT')
    expect(txt.values[0].value).toBe('v=spf1 -all')
  })

  it('returns empty values when Answer is missing', () => {
    expect(trimDns({}, 'A')).toEqual({ type: 'A', values: [] })
    expect(trimDns(null, 'A')).toEqual({ type: 'A', values: [] })
  })
})

describe('cert trim', () => {
  const ROWS = [
    { id: 1, serial_number: 'aa', issuer_name: 'C=US, O=Let\'s Encrypt, CN=R3', common_name: 'example.com', name_value: 'example.com\nwww.example.com', not_before: '2024-01-01T00:00:00', not_after: '2024-04-01T00:00:00' },
    { id: 2, serial_number: 'aa', issuer_name: 'C=US, O=Let\'s Encrypt, CN=R3', common_name: 'example.com', name_value: 'example.com', not_before: '2024-01-01T00:00:00', not_after: '2024-04-01T00:00:00' },
    { id: 3, serial_number: 'bb', issuer_name: 'O="DigiCert Inc", C=US', common_name: 'example.com', name_value: 'example.com', not_before: '2023-06-01T00:00:00', not_after: '2024-06-01T00:00:00' },
  ]
  it('deduplicates by serial and short-issuers to O=', () => {
    const out = trimCert(ROWS, 'example.com')
    expect(out.total).toBe(2)
    expect(out.shown).toBe(2)
    expect(out.certs[0].issuer).toBe('Let\'s Encrypt')
    expect(out.certs[1].issuer).toBe('DigiCert Inc')
    expect(out.certs[0].sans).toEqual(['example.com', 'www.example.com'])
  })
  it('sorts most-recent first', () => {
    const out = trimCert(ROWS, 'example.com')
    expect(out.certs[0].not_before).toBe('2024-01-01T00:00:00')
  })
})

describe('tracker trim', () => {
  it('lifts fields out of the data-api payload', () => {
    const out = trimTracker({
      score: 0.42,
      entity: 'Acme Trackers',
      entity_slug: 'acme-trackers',
      categories: ['Advertising', 'Analytics'],
      prevalence: 0.12,
      first_seen: '2020-01-01T00:00:00Z',
      last_seen: '2025-01-01T00:00:00Z',
      cookies: [{ name: 'x' }, { name: 'y' }],
      fingerprinting: true,
    }, 'ads.example.com')
    expect(out.score).toBe(0.42)
    expect(out.entity).toBe('Acme Trackers')
    expect(out.entity_slug).toBe('acme-trackers')
    expect(out.cookies).toBe(2)
    expect(out.fingerprinting).toBe(true)
  })

  it('coerces stringy numbers and rejects garbage', () => {
    const out = trimTracker({ score: '0.5', prevalence: 'NaN' }, 'x.example.com')
    expect(out.score).toBe(0.5)
    expect(out.prevalence).toBeNull()
  })
})

describe('urlhaus trim', () => {
  it('compresses URL list into counts + tags', () => {
    const out = trimUrlhaus({
      query_status: 'ok',
      firstseen: '2024-01-01 00:00:00',
      urls: [
        { url_status: 'online', tags: ['exe', 'emotet'], dateadded: '2025-01-02 12:00:00' },
        { url_status: 'offline', tags: ['emotet'], dateadded: '2025-01-01 12:00:00' },
      ],
    })
    expect(out.listed).toBe(true)
    expect(out.total_urls).toBe(2)
    expect(out.online).toBe(1)
    expect(out.tags).toEqual(expect.arrayContaining(['exe', 'emotet']))
    expect(out.most_recent).toBe('2025-01-02 12:00:00')
  })

  it('returns not-listed for no_results', () => {
    expect(trimUrlhaus({ query_status: 'no_results' })).toEqual({ listed: false, status: 'no_results' })
    expect(trimUrlhaus(null)).toEqual({ listed: false, status: 'no_results' })
  })
})

describe('scry-check trim (Reputation IP path)', () => {
  it('flattens enrichment fields + flags listed when enrichment_count > 0', () => {
    const out = trimScryCheck({
      ip: '147.185.132.40',
      status: 'observed',
      observation_count: 12,
      enrichment_count: 3,
      enrichment_promoted: 2,
      enrichment_sources: ['urlhaus', 'threatfox', 'tor_exit'],
      actor_class: 'hostile_opportunistic',
      actor_class_label: 'Hostile (opportunistic)',
      actor_class_trust: 'low',
      first_seen_ms: 1715000000000,
      last_seen_ms: 1716000000000,
    })
    expect(out.listed).toBe(true)
    expect(out.enrichment_count).toBe(3)
    expect(out.enrichment_promoted).toBe(2)
    expect(out.sources).toEqual(['urlhaus', 'threatfox', 'tor_exit'])
    expect(out.actor_class_label).toBe('Hostile (opportunistic)')
    expect(out.actor_class_trust).toBe('low')
  })

  it('returns not-listed when enrichment_count is 0', () => {
    const out = trimScryCheck({
      ip: '1.1.1.1',
      status: 'not_observed',
      observation_count: 0,
      enrichment_count: 0,
      enrichment_promoted: 0,
      enrichment_sources: [],
      asn: '13335',
      org: 'CLOUDFLARENET',
    })
    expect(out.listed).toBe(false)
    expect(out.enrichment_count).toBe(0)
    expect(out.sources).toEqual([])
    expect(out.status).toBe('not_observed')
  })

  it('coerces null/garbage to a safe not-listed shape', () => {
    expect(trimScryCheck(null)).toEqual({ listed: false, status: 'no_results' })
    expect(trimScryCheck('nope')).toEqual({ listed: false, status: 'no_results' })
  })
})
