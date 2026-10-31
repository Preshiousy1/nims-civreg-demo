# Services (Prompt 8 skeleton)

Two NestJS 11.2.8 apps (Nest 12 is ESM; Jest 29 cannot load `import.meta`). Node 22. TypeScript strict.

Compose also runs Apache Kafka **4.4.0** KRaft (no ZooKeeper), copied from the official single-node plaintext example. After a birth NIN is issued, civreg-bridge publishes to `civreg.registry.events.v1` via `src/kafka/producer.ts` (`kafkajs`). Strimzi mTLS is not in this demo.

## stub-identity-api (port 3041)

Stands in for the NIMS identity core. In-memory only.

- `POST /nin-requests` → 202 `{ requestId, status: "pending" }`. Fake NIN is issued later on GET.
- `GET /nin-requests/:id` → pending, or issued with a DEMO NIN (`000` + 8 digits from a hash of the id).
- `POST /deceased-status-events`
- `POST /deceased-status-reversals` (reason required)
- `GET /health/live`, `GET /health/ready`

Env flags: `STUB_FAIL_NIN_REQUESTS`, `STUB_FAIL_DECEASED_STATUS`, `STUB_DELAY_MS`.

## civreg-bridge (port 3042)

Postgres + TypeORM. Persist only.

- `POST /requests` body `{ eventId, actionId, kind, payload?, actorId? }`. Idempotent on `eventId` + `actionId`.
- `POST /intercept/register` — birth: persist, stub NIN, Kafka, then accept/reject. Death: persist as `PENDING_APPROVAL` and leave OpenCRVS pending.
- Death maker-checker (demo JWT, stands in for Keycloak OIDC — not production):
  - `POST /deceased-status-requests/:id/approve`
  - `POST /deceased-status-requests/:id/reject`
  - `POST /deceased-status-requests/:id/reverse` body `{ "reason": "..." }`
  - `GET /deceased-status-requests/:id/audit` (rows + `chain.ok`)
- `GET /requests/:id`
- `GET /health/live`, `GET /health/ready` (ready checks Postgres)
- `GET /metrics` Prometheus

Tables: `requests`, `audit_log` (hash chain), `deceased_status_requests`, `outbox`. Migrations in `civreg-bridge/src/database/migrations`.

### Outbox, in plain words

The business write (status + hash-chained audit row) and the Kafka send are not one step. The transaction writes an `outbox` row. After commit, a loop publishes those rows to `civreg.audit.v1` and marks `published_at`. If Kafka is down, the row stays. Retry cannot drop it. The CloudEvents `id` is the outbox id, so a retry is the same event, not a second one.

Mint a demo checker token (Keycloak stand-in):

```bash
cd services/civreg-bridge
JWT_SECRET=demo-civreg-jwt-not-a-real-secret pnpm exec ts-node scripts/mint-dev-jwt.ts d.checker nimc_civreg_checker
```

Use that as `Authorization: Bearer …`. Maker user id is OpenCRVS `createdBy` (the UUID of whoever registered — usually `k.mweene`, not the username). Checker `sub` must be a **different** string. `d.checker` is fine.

## Module layout

Each app is a Nest module tree. `AppModule` imports feature modules. HTTP lives in `*.controller.ts`. Rules live in `*.service.ts`. The hash function is a plain file (`audit-chain.ts`) with no Nest decorator so it can be tested without a database. The stub keeps a `Map` in the service. The bridge talks to Postgres through TypeORM entities and one transaction that writes `requests` and `audit_log` together.

## Run

```bash
cd services
docker compose up --build
```

Postgres is on host port **5433** so it does not clash with OpenCRVS. Kafka is on host port **9092** (`PLAINTEXT_HOST`). Other compose services use `broker:19092`. Tests: `pnpm test` in each service folder. In-cluster: `charts/civreg-bridge/INSTALL.md`.

## Kafka (Step A)

Image `apache/kafka:4.4.0`. Docs: Kafka 4.4.0 download page (22 Oct 2026) and [single-node plaintext compose](https://github.com/apache/kafka/blob/4.4.0/docker/examples/docker-compose-files/single-node/plaintext/docker-compose.yml). Topics `civreg.registry.events.v1` and `civreg.audit.v1` are created by `kafka-init`.

List topics:

```bash
docker compose exec broker /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

Produce one test line (Ctrl-D to finish):

```bash
echo 'demo-registry-ping' | docker compose exec -T broker /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic civreg.registry.events.v1
```

Consume from the start (add `--property print.key=true` after a UI birth so you can match the OpenCRVS eventId):

```bash
docker compose exec broker /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic civreg.registry.events.v1 --from-beginning --property print.key=true --timeout-ms 5000
```
