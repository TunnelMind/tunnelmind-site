# tunnelmind-site

Web frontend for [TunnelMind](https://tunnelmind.ai) — adversarial intelligence and observability for the agentic internet.

**Stack:** Vite + React 18, Cloudflare Pages, Supabase

## What this is

TunnelMind is an observability layer for the agentic internet — a single chat-and-API surface where humans and AI agents get sourced, real-time answers about domains, networks, and threats. This repo is the frontend for that surface.

## Live

- `tunnelmind.ai` — main site (this repo, CF Pages)
- `data.tunnelmind.ai` — Tracker Data API (separate repo: `tunnelmind-data-api`)
- `radar.tunnelmind.ai` — Surveillance Radar (separate repo: `tunnelmind-radar`)

## Deploy

Push to `main` triggers CI deploy to Cloudflare Pages via `wrangler-action`.
