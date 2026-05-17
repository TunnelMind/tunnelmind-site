// GET /api/stats — corpus-wide counters. Cached 60s.
import { proxyToApi } from './_proxy.js'

export function onRequestGet(context) {
  return proxyToApi(context, '/v1/stats', 60)
}
