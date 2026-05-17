// GET /api/recent — recent attacker IPs from the corpus. Cached 10s.
import { proxyToApi } from './_proxy.js'

export function onRequestGet(context) {
  return proxyToApi(context, '/v1/recent', 10)
}
