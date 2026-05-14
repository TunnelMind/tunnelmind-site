-- Migration 005b: JSON Schema validation for oai_registry.record
-- Closes the "schema-validated on insert" requirement in the P26 Phase 2 spec.
--
-- v1 schema is frozen at ship (per OAI Standard Section 11). A v2 record
-- shape requires a new migration that introduces a separate v2 validator
-- gated on `schema_version`; this migration locks v1 only.
--
-- Strategy: pg_jsonschema CHECK on record. Cross-reference patterns
-- (operator, data_sharing, attestations.sensor) match the canonical OAI
-- and OAI-SENSOR regexes from migrations 004 and 004b — keep them in
-- sync if those change.

CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;

-- ── v1 record schema CHECK ────────────────────────────────────────

ALTER TABLE oai_registry
  DROP CONSTRAINT IF EXISTS oai_registry_record_schema_v1;

ALTER TABLE oai_registry
  ADD CONSTRAINT oai_registry_record_schema_v1 CHECK (
    extensions.jsonb_matches_schema(
      '{
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "required": ["@context", "@type", "id", "status", "schema_version", "issued_at"],
        "properties": {
          "@context": { "const": "https://tunnelmind.ai/oai/context.jsonld" },
          "@type":    { "const": "ObservedActor" },
          "id": {
            "type": "string",
            "pattern": "^OAI-[0-9]{4}-[0-9]{7}$"
          },
          "aliases": {
            "type": "array",
            "uniqueItems": true,
            "items": {
              "type": "string",
              "pattern": "^oai:[a-z0-9][a-z0-9_-]*$"
            }
          },
          "name":     { "type": "string", "minLength": 1, "maxLength": 256 },
          "category": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$"
          },
          "operator": {
            "type": "string",
            "pattern": "^OAI-[0-9]{4}-[0-9]{7}$"
          },
          "first_observed":    { "type": "string", "format": "date-time" },
          "first_observed_by": { "type": "string", "minLength": 1 },
          "last_observed":     { "type": "string", "format": "date-time" },
          "last_observed_by": {
            "type": "string",
            "pattern": "^(OAI-[0-9]{4}-[0-9]{7}|OAI-SENSOR-[a-z]{2}-[0-9]{3}|public-corpus)$"
          },
          "domains": {
            "type": "array",
            "uniqueItems": true,
            "items": { "type": "string", "pattern": "^[a-z0-9.-]+\\.[a-z]{2,}$" }
          },
          "fingerprint_methods": {
            "type": "array",
            "uniqueItems": true,
            "items": { "type": "string", "pattern": "^[a-z][a-z0-9_]*$" }
          },
          "data_sharing": {
            "type": "array",
            "uniqueItems": true,
            "items": { "type": "string", "pattern": "^OAI-[0-9]{4}-[0-9]{7}$" }
          },
          "jurisdiction_notes": {
            "type": "object",
            "propertyNames": { "pattern": "^[a-z]{2}$" },
            "additionalProperties": { "type": "string", "minLength": 1 }
          },
          "attestations": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["sensor", "observed_at", "signature", "log_index"],
              "properties": {
                "sensor": {
                  "type": "string",
                  "pattern": "^OAI-SENSOR-[a-z]{2}-[0-9]{3}$"
                },
                "observed_at": { "type": "string", "format": "date-time" },
                "signature":   {
                  "type": "string",
                  "pattern": "^ed25519:0x[0-9a-fA-F]+$"
                },
                "log_index":   { "type": "integer", "minimum": 0 }
              }
            }
          },
          "status": {
            "type": "string",
            "enum": ["active", "deprecated", "superseded", "reserved"]
          },
          "schema_version": {
            "type": "string",
            "const": "1.0"
          },
          "issued_at": { "type": "string", "format": "date-time" }
        },
        "allOf": [
          {
            "if": {
              "required": ["status"],
              "properties": { "status": { "const": "active" } }
            },
            "then": {
              "required": ["attestations"],
              "properties": { "attestations": { "minItems": 1 } }
            }
          }
        ]
      }'::json,
      record
    )
  );

-- ── Notes on tradeoffs ────────────────────────────────────────────
-- * additionalProperties: false at top level. v1 is frozen. New fields
--   require v2 + a separate validator gated on schema_version.
-- * schema_version is locked to "1.0" by const — any record using a
--   different version fails THIS validator. v2 migration must drop
--   this constraint and add two: a v1-only validator gated on
--   `schema_version = "1.0"` and a v2-only validator gated on "2.0".
-- * status=active implies attestations[] non-empty (per standard
--   Section 7 prose). reserved/deprecated/superseded may have empty
--   attestations.
-- * The id/status fields are also validated against the row columns
--   by oai_registry_record_consistency (migration 004) — this schema
--   validates shape, that CHECK validates row/payload consistency.
