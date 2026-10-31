# civreg-bridge Helm chart

Helm 4.3. Chart `apiVersion: v2`. Laptop deploy onto Docker Desktop Kubernetes (same cluster as OpenCRVS `opencrvs-dev`).

Identity is a stub. Kafka in this demo is compose KRaft **plaintext** (`host.docker.internal:9092`). Strimzi mTLS is not installed.

The chart does **not** contain secret values. It mounts an existing Secret (`existingSecret`, default `civreg-bridge`). HashiCorp Vault or any secret manager can create that Secret later.

## Images

Build locally so `imagePullPolicy: IfNotPresent` can use Docker Desktop’s image store:

```bash
cd services
docker compose build civreg-bridge stub-identity-api
docker tag services-civreg-bridge:latest services-civreg-bridge:0.1.0
docker tag services-stub-identity-api:latest services-stub-identity-api:0.1.0
```

## Secret (DEMO values, same as compose)

```bash
kubectl create ns civreg

kubectl -n civreg create secret generic civreg-bridge \
  --from-literal=DATABASE_URL='postgres://civreg:civreg@civreg-bridge-postgres:5432/civreg' \
  --from-literal=postgres-password='civreg' \
  --from-literal=JWT_SECRET='demo-civreg-jwt-not-a-real-secret' \
  --from-literal=OPENCRVS_CLIENT_ID='a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' \
  --from-literal=OPENCRVS_CLIENT_SECRET='demo-civreg-bridge-not-a-real-secret'
```

`DATABASE_URL` host `civreg-bridge-postgres` matches the bundled StatefulSet when the release name is `civreg-bridge`. Change it if you use an external database (`postgres.devInstall: false`).

## Install

```bash
helm upgrade --install stub-identity-api charts/stub-identity-api \
  -n civreg --create-namespace \
  -f charts/stub-identity-api/values-dev.yaml

helm upgrade --install civreg-bridge charts/civreg-bridge \
  -n civreg \
  -f charts/civreg-bridge/values-dev.yaml
```

With `postgres.devInstall: true` the migrate Job is `post-install,pre-upgrade` (Helm pre-install runs before the StatefulSet exists). With an external database it is `pre-install,pre-upgrade`.

Point countryconfig at the in-cluster Service if you want intercept to use this deploy instead of compose `:3042`:

`CIVREG_BRIDGE_URL=http://civreg-bridge.civreg.svc.cluster.local:3042`

## Upgrade

```bash
helm upgrade civreg-bridge charts/civreg-bridge -n civreg -f charts/civreg-bridge/values-dev.yaml
```

## Rollback

```bash
helm history civreg-bridge -n civreg
helm rollback civreg-bridge 1 -n civreg
```

## Uninstall

```bash
helm uninstall civreg-bridge -n civreg
helm uninstall stub-identity-api -n civreg
# PVC from the bundled Postgres may remain:
kubectl -n civreg delete pvc -l app.kubernetes.io/name=civreg-bridge
```

CI (`.github/workflows/ci.yml`) lints, tests, builds, and Trivy-scans on pull requests. Images go to GHCR only when you push a `v*.*.*` tag.

## Lint / render (no cluster)

```bash
helm lint charts/civreg-bridge charts/stub-identity-api
helm template civreg-bridge charts/civreg-bridge -f charts/civreg-bridge/values-dev.yaml
```

## 12-factor checklist

1. **Codebase** — this repo. Chart version `0.1.0`.
2. **Dependencies** — image is built; chart does not vendor node_modules.
3. **Config** — non-secret env in a ConfigMap; secrets only via `existingSecret`.
4. **Backing services** — Postgres, Kafka, stub, OpenCRVS as URLs.
5. **Build, release, run** — `docker compose build` then `helm upgrade --install`.
6. **Processes** — stateless Deployment. Postgres is optional and separate.
7. **Port binding** — container port 3042, Service ClusterIP.
8. **Concurrency** — scale `replicaCount` (one writer process per pod; audit lock is in Postgres).
9. **Disposability** — `/health/live` and `/health/ready`; migrate Job retries Postgres.
10. **Dev/prod parity** — `values-dev.yaml` for the laptop; production would drop `postgres.devInstall` and use Vault + Strimzi.
11. **Logs** — stdout. No log files.
12. **Admin processes** — TypeORM migrate Job (`node dist/database/run-migrations.js`).

## Not in this chart

- Strimzi / Kafka mTLS
- Keycloak OIDC (bridge still uses `JWT_SECRET`)
- MOSIP
- Vault injector (only a Secret name)
- Changing OpenCRVS countryconfig `CIVREG_BRIDGE_URL` for you
