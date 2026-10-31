# Event envelope (v1)

CloudEvents-style fields. Topic names end with `.v1`. Compose Kafka creates the topics. After a birth NIN is issued, civreg-bridge publishes `civreg.birth.registered.v1` to `civreg.registry.events.v1`, then accepts the OpenCRVS action.

## Envelope

| Field | Meaning |
|---|---|
| `specversion` | `1.0` |
| `id` | UUID of this event (not the OpenCRVS eventId) |
| `source` | `civreg-bridge` |
| `type` | event type, versioned, e.g. `civreg.birth.registered.v1` |
| `time` | ISO-8601 UTC |
| `subject` | OpenCRVS `eventId` |
| `data` | payload; **no PII in logs**. Demo NIN values may appear in `data` only, marked `demo: true` |

## Topics (created by `kafka-init` in `services/docker-compose.yml`)

| Topic | What goes on it |
|---|---|
| `civreg.registry.events.v1` | registry facts (`civreg.birth.registered.v1`, later death types) |
| `civreg.audit.v1` | `civreg.audit.appended.v1` from the outbox (one row per `audit_log` append) |

`.v1` on the topic is the wire contract. A breaking change gets a new topic, not a silent field add.

## `data` for `civreg.birth.registered.v1`

```json
{
  "eventId": "opencrvs-event-id",
  "actionId": "opencrvs-action-id",
  "ninRequestId": "stub-request-id",
  "nin": "00012345678",
  "demo": true
}
```

The NIN is a **DEMO** value from `stub-identity-api` (always 11 digits, prefix `000`). It is not a real National Identification Number.
