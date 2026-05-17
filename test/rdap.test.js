import { describe, it, expect } from 'vitest'
import { trim, vcard } from '../functions/api/rdap/[ip].js'

// A representative (abridged) RDAP response, shaped like what an RIR
// returns for an IP network — including an abuse contact nested one
// level down inside the registrant entity, which is the common case.
const SAMPLE = {
  handle: 'NET-45-141-56-0-1',
  name: 'EXAMPLE-HOSTING',
  type: 'DIRECT ALLOCATION',
  country: 'AT',
  startAddress: '45.141.56.0',
  endAddress: '45.141.56.255',
  port43: 'whois.ripe.net',
  events: [
    { eventAction: 'registration', eventDate: '2019-03-01T12:00:00Z' },
    { eventAction: 'last changed', eventDate: '2025-11-20T08:30:00Z' },
  ],
  entities: [
    {
      handle: 'ORG-EH1-RIPE',
      roles: ['registrant'],
      vcardArray: ['vcard', [['fn', {}, 'text', 'Example Hosting GmbH']]],
      entities: [
        {
          handle: 'ABUSE-EH',
          roles: ['abuse'],
          vcardArray: ['vcard', [['email', {}, 'text', 'abuse@example-hosting.at']]],
        },
      ],
    },
  ],
}

describe('vcard', () => {
  it('extracts fn and email from a jCard array', () => {
    const v = vcard(['vcard', [
      ['fn', {}, 'text', 'Jane Operator'],
      ['email', {}, 'text', 'jane@example.com'],
    ]])
    expect(v).toEqual({ fn: 'Jane Operator', email: 'jane@example.com' })
  })

  it('returns an empty object for non-vcard input', () => {
    expect(vcard(null)).toEqual({})
    expect(vcard(['notvcard', []])).toEqual({})
    expect(vcard(undefined)).toEqual({})
  })
})

describe('trim', () => {
  it('flattens a full RDAP payload to the inspector fields', () => {
    const t = trim(SAMPLE)
    expect(t).toEqual({
      handle: 'NET-45-141-56-0-1',
      name: 'EXAMPLE-HOSTING',
      type: 'DIRECT ALLOCATION',
      country: 'AT',
      range: '45.141.56.0 – 45.141.56.255',
      registry: 'whois.ripe.net',
      org: 'Example Hosting GmbH',
      abuse: 'abuse@example-hosting.at',
      registered: '2019-03-01T12:00:00Z',
      updated: '2025-11-20T08:30:00Z',
    })
  })

  it('finds an abuse contact at the top level too', () => {
    const t = trim({
      entities: [
        { roles: ['abuse'], vcardArray: ['vcard', [['email', {}, 'text', 'abuse@top.example']]] },
      ],
    })
    expect(t.abuse).toBe('abuse@top.example')
  })

  it('degrades to nulls when fields are absent', () => {
    const t = trim({})
    expect(t.handle).toBeNull()
    expect(t.range).toBeNull()
    expect(t.org).toBeNull()
    expect(t.abuse).toBeNull()
    expect(t.registered).toBeNull()
  })

  it('omits the range unless both start and end are present', () => {
    expect(trim({ startAddress: '1.2.3.0' }).range).toBeNull()
    expect(trim({ endAddress: '1.2.3.255' }).range).toBeNull()
  })
})
