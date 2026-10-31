# Runbook

Laptop demo. OpenCRVS **v2.1.2**. Identity is a **stub**, not MOSIP. Kafka is compose KRaft **plaintext**. Country config is scaffolded; core is not forked.

Diary of what actually broke: `LEARNING_LOG.md`. Why 202 / accept / reverse: `docs/design-note.md`. Helm detail: `charts/civreg-bridge/INSTALL.md`.

## Start (what I actually run)

OpenCRVS:

```bash
cd nigeria-countryconfig
tilt up
```

Tilt UI: http://localhost:10350. When group `1.OpenCRVS` is green, under `2.Data-tasks` run **`data-seed` once**. You can seed only once. To wipe and seed again use **`clean-&-seed`**.

- Login: http://login.opencrvs.localhost
- App: http://register.opencrvs.localhost
- Password `test`. 2FA `000000`.

Bridge, stub, Postgres, Kafka (needed for intercept):

```bash
cd services
docker compose up --build
```

| Thing | Port |
|---|---|
| stub-identity-api | 3041 |
| civreg-bridge | 3042 |
| civreg Postgres | **5433** (OpenCRVS Postgres stays in-cluster) |
| Kafka host | 9092 (`PLAINTEXT_HOST`). Compose services use `broker:19092` |

Countryconfig in the cluster calls compose at `http://host.docker.internal:3042` (`nigeria-countryconfig/tilt/helm/opencrvs-services/values.yaml`). Helm in namespace `civreg` is optional and is **not** what intercept uses unless you change that URL.

Health:

```bash
curl -sS http://localhost:3041/health/live
curl -sS http://localhost:3042/health/ready
```

Ready on the bridge checks Postgres. If it is 503, compose Postgres is not up yet.

## DEMO users (after Nigeria reseed)

All password `test`, 2FA `000000`. Role ids are underscores (`nimc_civreg_*`). Dots in the id make Team show **Unknown**.

| Username | Role | Office |
|---|---|---|
| `k.mweene` | registrar | DEMO FCT Municipal Registry (Abuja) `CRVS_OFFICE_OFF15006` |
| `f.katongo` | registration agent | same office |
| `k.bwalya` | hospital clerk | DEMO hospital `CRVS_OFFICE_HOS15006` (same LGA, **not** the CRVS office) |
| `d.checker` | checker | CRVS office — OpenCRVS login only. Approve/reverse is **curl against the bridge**, not this UI |
| `c.lungu` | field agent | CRVS office |
| `m.musonda` | maker | CRVS office |
| `l.admin` | local admin | CRVS office |
| `j.campbell` | national admin | `CRVS_OFFICE_NGAHQ` |

Day-1 Ibombo users were the Farajaland scaffold. After GRID3 + `clean-&-seed`, Kennedy is Abuja.

Phone on forms: Nigeria **11 digits**, `07` / `08` / `09` (`^0[789][0-9]{9}$`). Farajaland 10-digit numbers fail. NIN is 11 digits. Stub DEMO NINs start with `000`.

GRID3 spellings we kept: **`Fct`**, **`Port-Harcourt`**. 774 LGAs. Do not invent LGA names.

## Birth intercept

Registrar (`k.mweene`) can DECLARE+REGISTER in one transaction. Assign is still required before a mutating action (Register, Print, Validate).

What you should see:

1. Browser tRPC `event.actions.register.request` is **HTTP 200**. That is not the intercept.
2. Core → countryconfig `POST /trigger/events/birth/actions/REGISTER` is **202**. Action stays **Requested**. Core **UNASSIGN**s the user. Assigned-to-you empty is expected.
3. Bridge asks the stub for a NIN-at-birth, publishes `civreg.birth.registered.v1` to `civreg.registry.events.v1` (key = OpenCRVS `eventId`), then **accepts with the system client**.
4. Search the tracking id. Status should become **Registered**.

Human tokens cannot accept or reject. `record.action.accept` / `record.action.reject` sit on the `civreg-bridge` integration only. Token is `client_credentials` in the **POST body**, never the query string.

Marriage REGISTER is still **200** (not intercepted).

Reject path we actually ran: `docker stop` the stub container, register a birth, bridge rejects. Countryconfig log `outcome=rejected`. Start the stub again with compose.

## Death maker-checker

Death REGISTER also 202s and stays pending. Bridge opens `deceased_status_requests` as `PENDING_APPROVAL`. There is **no approve UI** in OpenCRVS. Checker is curl + a demo HS256 JWT (Keycloak stand-in).

Find the row (host Postgres is 5433):

```bash
psql postgres://civreg:civreg@localhost:5433/civreg \
  -c "SELECT id, event_id, status, maker_id FROM deceased_status_requests ORDER BY created_at DESC LIMIT 5;"
```

`maker_id` is OpenCRVS `createdBy` (**UUID**, not `k.mweene`). After a reseed that UUID changes. Checker JWT `sub` must be a **different** string. `d.checker` is fine.

Mint a checker token:

```bash
cd services/civreg-bridge
JWT_SECRET=demo-civreg-jwt-not-a-real-secret pnpm exec ts-node scripts/mint-dev-jwt.ts d.checker nimc_civreg_checker
```

```bash
export TOKEN='paste-the-jwt'
export ID='deceased-status-request-uuid'

curl -sS -X POST "http://localhost:3042/deceased-status-requests/$ID/approve" \
  -H "Authorization: Bearer $TOKEN"

# same-user 403: mint a JWT whose sub equals maker_id, then approve

curl -sS -X POST "http://localhost:3042/deceased-status-requests/$ID/reverse" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"DEMO reverse"}'

curl -sS "http://localhost:3042/deceased-status-requests/$ID/audit" \
  -H "Authorization: Bearer $TOKEN"
```

Reverse needs a non-empty `reason`. It only undoes the **identity-side** deceased flag. OpenCRVS stays **Registered**. Replay of the same approve is idempotent.

`GET .../audit` returns `chain.ok`. It verifies the **full** `audit_log` ledger, not just the three rows for that death. An earlier GET on the entity slice reported `chain.ok` false at sequence 8; that was a false alarm.

Tamper check (demo laptop only):

```bash
psql postgres://civreg:civreg@localhost:5433/civreg \
  -c "UPDATE audit_log SET row_hash = '00' WHERE id = '<a-row-id>';"
```

Then GET audit again. `chain.ok` should be false.

## Kafka

Topics created by `kafka-init`: `civreg.registry.events.v1`, `civreg.audit.v1`. Birth registry events go on the first. Death does **not** have a separate registry topic; checker audit goes to `civreg.audit.v1` via the outbox.

```bash
cd services
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

docker compose exec broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic civreg.registry.events.v1 \
  --from-beginning \
  --property print.key=true \
  --timeout-ms 5000
```

`--timeout-ms 5000` then `TimeoutException` is expected: the consumer exits. `print.key=true` is deprecated in Kafka 4.4 and still works.

If `KAFKA_BROKERS` is empty, outbox drain publishes nothing (returns 0). Compose sets `broker:19092`.

## Logs

```bash
kubectl -n opencrvs-dev logs deploy/countryconfig -f
# from services/
docker compose logs -f civreg-bridge
docker compose logs -f stub-identity-api
```

Without `-n opencrvs-dev` kubectl looks in `default` and you get nothing. Namespaces: `opencrvs-dev` (auth, client, countryconfig, documents, events, gateway, login), `opencrvs-deps-dev` (postgres, elasticsearch, minio, redis). No Mongo. No Influx.

OpenCRVS events live in cluster Postgres database `events`, schema `app`, tables `events` and `event_actions`. Column is `event_type`, not `type`. `\dt` with no schema looks empty because tables are not in `public`.

Client API I actually saw: **tRPC** `POST /api/events/<procedure>?batch=1`. Not GraphQL.

## Helm (optional)

Compose `:3042` is what intercept uses. In-cluster charts are a packaging demo.

```bash
cd services
docker compose build civreg-bridge stub-identity-api
docker tag services-civreg-bridge:latest services-civreg-bridge:0.1.0
docker tag services-stub-identity-api:latest services-stub-identity-api:0.1.0

kubectl create ns civreg
# Secret + helm upgrade --install: charts/civreg-bridge/INSTALL.md
```

To point intercept at the in-cluster Service you must set countryconfig `CIVREG_BRIDGE_URL=http://civreg-bridge.civreg.svc.cluster.local:3042`. That change is not automatic.

```bash
helm history civreg-bridge -n civreg
helm rollback civreg-bridge 1 -n civreg
```

Uninstall can leave the bundled Postgres PVC. Delete it if you want a clean DB.

Tag `v0.1.0` is what makes CI push images to GHCR and package the charts. Branch/main pushes skip `package-charts`. GHCR packages can still be private on a public repo — make them public if someone else must pull.

## Reseed

Tilt → `2.Data-tasks` → **`clean-&-seed`**. Use it when locations, roles, users, or certificates in seed data changed (GRID3, `nimc_civreg_*` roles, employees CSV, hospital clerk print template id). Form-only changes (phone regex, NIN fields, Pidgin CSV, coat of arms) live-sync; no reseed.

`data-seed` is once. Running it again on an already-seeded cluster is the wrong button.

Seeder logs can sit on `Seeding users` after the Job is already `Succeeded`. Check:

```bash
kubectl -n opencrvs-dev get jobs
kubectl -n opencrvs-dev get pods
```

## Rollback

| Layer | How |
|---|---|
| OpenCRVS on the laptop | `tilt down` from `nigeria-countryconfig`. Cluster data goes with a later `clean-&-seed` or a cluster reset. |
| Compose bridge/stub/Kafka | `docker compose down` in `services/`. Add `-v` only if you want the civreg Postgres volume gone. |
| Helm | `helm rollback` / `helm uninstall` as in INSTALL.md |
| Git | revert the commit. Do not force-push `main`. |

## Common errors (ones we hit)

**`clean-&-seed` 401 / super user.** Redis leftover from a previous seed. Restart Tilt (`tilt down` then `tilt up`), then seed again. Do not keep hammering seed.

**Login spinner never stops.** Stale JWT in the browser. Hard-refresh, or clear site data for `login.opencrvs.localhost` / `register.opencrvs.localhost`.

**Phone rejected** (`080…`). Pattern is 11 digits, `07`/`08`/`09`. Farajaland was 10 digits and no `08`.

**Pending approval / registration empty** after a hospital clerk declare. Workqueues filter `within` the user’s CRVS office. `k.bwalya` is on the **hospital** (`HEALTH_FACILITY`), Kennedy on the **CRVS office**. They share an LGA, they are not parent/child. **Search** finds the record. Queues will not.

**Only Assign is enabled.** Assign is a lock. Assign to yourself, then Validate / Register / Print. After Register, Core unassigns; Assign again to Print.

**Team shows ROLE Unknown.** Role ids with dots break ICU select keys. Current ids are `nimc_civreg_*`. Unquoted commas in the phone CSV also truncated `event.history.role`. If you still see Unknown, you are on an old seed: `clean-&-seed`.

**I registered and got HTTP 200, but it is not Registered.** tRPC 200 is expected. Watch countryconfig for **202**. Then wait for the bridge to accept. Search; do not sit on Assigned-to-you.

**Integrations page has no civreg-bridge.** Restart the **events** pod so `/trigger/system/ready` runs again (`kubectl -n opencrvs-dev rollout restart deploy/events`).

**Accept 400 Unexpected field `review.comment` / `review.signature`.** First Samuel Eli (L3YKU6) hit this. Accept payload is only `type`, `eventId`, `actionId`, `transactionId`, `registrationNumber`. Fixed in the bridge. That tracking id is the rejected first run.

**Stub down → reject.** That is the failure path. Start stub again before the next birth.

**`PRINT_CERTIFICATE` log `Invalid action type` but print 200.** Informant notification on print is a template gap. The PDF still printed.

**Audit tab blank in the UI.** The OpenCRVS Audit panel stayed empty. Action history is on the tRPC event (CREATE, ASSIGN, …). Hash-chain audit is `GET /deceased-status-requests/:id/audit` on the bridge.

**`kubectl logs` empty.** Missing `-n opencrvs-dev`.

**Kafka consumer `TimeoutException`.** `--timeout-ms` ended. Not a broker crash.

**Bridge container `Cannot find module dist/main.js`.** Nest was emitting `dist/src/main.js` because `scripts/` sat outside `src/`. `tsconfig.build.json` excludes `scripts`. Current image `CMD` is `node dist/main.js`.

**CI Trivy red with 0 CVEs in the table.** Trivy 0.69 `--exit-code 1` still failed on a clean package list. CI now writes JSON and fails only on HIGH/CRITICAL in that file.

**CI Trivy HIGH on `pnpm` / `tar` / `sigstore`.** Those were from `corepack prepare pnpm@10.19.0` in the **runtime** image, not app deps. Prod stage copies pruned `node_modules` + `dist` only.

**Port 5432 already in use.** Civreg compose maps **5433**. Leave the OpenCRVS Postgres port-forward alone if you opened one.

## Not in this demo

MOSIP, Keycloak OIDC (demo JWT), Strimzi mTLS, Vault, APISIX, ArgoCD, NPC seam, Identiko SMS/email, SIEM/Wazuh. Do not describe them as if they run here.
