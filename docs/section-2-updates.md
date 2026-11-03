# Section 2 updates (plain words)

What changed after going through every weak point in the Round 2 prep, section 2.

## Code fixes

### 2.1 Stuck birth after 202
**Problem:** After countryconfig answers 202, Core stops calling. If the bridge died mid-work, the birth stayed pending forever.

**Change:** A background loop runs every 5 seconds. It finds birth requests still `pending` and older than 30 seconds, and runs `resolve` again. Safe to repeat because each request is keyed on eventId + actionId.

**Files:** `pending-request.reconciler.ts`, `requests.service.ts` (`listPendingBirthOlderThan`), env `RECONCILE_OLDER_THAN_MS`.

### 2.2 Anyone could call `/intercept/register`
**Problem:** No password on the intercept URL. Highest-privilege path.

**Change:** Shared secret header `x-civreg-intercept-secret`. Bridge checks it. Countryconfig sends it. Same DEMO value in compose and Tilt env.

**Files:** `intercept-secret.guard.ts`, `intercept.controller.ts`, countryconfig `intercept.ts`, `INTERCEPT_SHARED_SECRET` / `CIVREG_BRIDGE_INTERCEPT_SECRET`, Helm INSTALL secret example.

### 2.3 Accept was not safe to retry
**Problem:** Every accept made a new random `transactionId` and registration number. A retry could look like a new request to Core.

**Change:** `transactionId` is a stable hash of eventId + actionId + "accept". Registration number is created once, saved on the request row, then reused.

**Files:** `opencrvs/ids.ts`, `events-client.ts`, `requests` columns `registration_number` / `accept_transaction_id`.

### 2.4 Death approve could leave identity and CRS out of sync
**Problem:** Stub ran, then Core accept, then DB. If Core failed, identity was already marked deceased. Also a missing NIN became `00000000000`.

**Change:**
- Death without a NIN is refused (no default).
- Row tracks `stub_done` and `core_done`.
- If stub already done, skip stub.
- If Core fails after stub, call stub reverse to undo, clear `stub_done`, then fail so the checker can try again.
- Stub call carries an idempotency key (the deceased request id).

**Files:** `deceased.service.ts`, entity columns, migration `1700000000004`, `stub-client.ts`.

### 2.5 Birth Kafka ran before Core accept
**Problem:** Consumers could see “birth registered” even if Core later failed.

**Change:** Accept Core first. Then write the birth event to the outbox. Drain publishes to Kafka. Same pattern as audit.

**Files:** `intercept.service.ts`, `outbox.service.ts` (`enqueueBirthRegistered`).

### 2.6 Two bridge pods could send the same outbox row
**Problem:** Drain had no row lock.

**Change:** Drain selects with `FOR UPDATE SKIP LOCKED`. Still at-least-once if the process crashes after send and before mark-published. Consumers should dedupe on the envelope `id` (outbox row id).

**Files:** `outbox.service.ts`.

### 2.7 Maker and checker ids from different systems
**Problem:** OpenCRVS maker UUID vs Keycloak `sub` would never match, so self-approve checks could fail open.

**Change:** Optional JWT claim `staffId`. Optional row field `maker_staff_id`. When both exist, compare those. Demo still works with `sub` === `makerId`.

**Files:** `auth/jwt.ts`, `deceased/rules.ts`, deceased entity.

### 2.9 PII in the bridge database
**Problem:** Full declaration (names, NINs) was stored on `requests.payload`.

**Change:** Persist only event type and a small action slice (type, id, createdBy, role). Declaration is dropped before save. Kafka birth events still carry a DEMO NIN for this demo (called out in the design note).

**Files:** `sanitize-payload.ts`, `requests.service.ts`.

## Docs and honesty (2.8, 2.10, 2.11, 2.12, 2.13, 2.14)

### 2.8 Demo JWT
Written in `docs/design-note.md`: HS256 demo only. Production = Keycloak RS256 + JWKS.

### 2.10 Audit chain
Written: tamper-evident, not tamper-proof against a DB admin. Kafka audit topic is the outside copy.

### 2.11 Kafka
Written: one plaintext broker; Strimzi mTLS not built; kafkajs unmaintained note already in the learning log.

### 2.12 Packaging
Written: charts are a packaging demo; countryconfig still hits compose `:3042`; mutable `0.1.0` tag; no NetworkPolicy/PDB/HPA; Helm rollback does not undo migrations.

### 2.13 Telemetry line
`LEARNING_LOG.md` now says you answered **y** during scaffold, and that for government ID you would likely turn telemetry off after reading `ANALYTICS.md`.

### 2.14 Core behaviour on 503
Not run live here. Added to README “what is not done”: stop the bridge, register a birth, write down what the user sees and whether Core retries. Do that once before the interview so you can answer from observation.

## How to verify

```bash
cd services/civreg-bridge
pnpm test:ci
```

Rebuild compose so the new env and migration apply:

```bash
cd services
docker compose up --build
```

Countryconfig needs the new secret env (Tilt values already set). Restart countryconfig / Tilt if it was already running so it sends `x-civreg-intercept-secret`.

## Migration

`1700000000004-Section2Hardening` adds columns on `requests` and `deceased_status_requests`. Compose with `RUN_MIGRATIONS=true` runs it on start.
