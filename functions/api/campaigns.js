// GET /api/campaigns — active threat campaigns from the corpus. Cached 60s.
import { proxyToApi } from './_proxy.js'

export function onRequestGet(context) {
  return proxyToApi(context, '/v1/campaigns', 60)
}
