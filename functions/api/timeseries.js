// GET /api/timeseries — hourly corpus volume for the radar's 24h pulse.
// Proxies /v1/stats/timeseries. Cached 60s.
import { proxyToApi } from './_proxy.js'

export function onRequestGet(context) {
  return proxyToApi(context, '/v1/stats/timeseries', 60)
}
